using Microsoft.AspNetCore.Mvc;
using System.Net.Http.Headers;
using System.Text;

namespace BackendApi.Controllers;


[ApiController]
[Route("api/[controller]")]
public class ProxyController : ControllerBase
{
    private static readonly HashSet<string> AllowedMethods = new(StringComparer.OrdinalIgnoreCase)
    {
        "GET","POST","PUT","PATCH","DELETE"
    };

    [HttpGet("ping")]
    public IActionResult Ping() => Ok("pong");

    // Example:
    // /api/proxy?method=GET&target=https://example.com/api/weather
    // For body:
    // /api/proxy?method=POST&target=https://example.com/path
    // with JSON body forwarded (raw)
    [HttpGet("forward")]
    public async Task<IActionResult> ForwardGet([FromQuery] string target, [FromQuery] string method = "GET")
    {
        return await ForwardInternal(target, method, bodyBytes: null);
    }

    [HttpPost("forward")]
    public async Task<IActionResult> Forward([FromQuery] string target, [FromQuery] string method = "POST")
    {
        using var ms = new MemoryStream();
        await Request.Body.CopyToAsync(ms);
        return await ForwardInternal(target, method, ms.ToArray());
    }


    private async Task<IActionResult> ForwardInternal(string target, string method, byte[]? bodyBytes)
    {
        if (string.IsNullOrWhiteSpace(target)) return BadRequest("Missing target");
        if (string.IsNullOrWhiteSpace(method)) return BadRequest("Missing method");

        if (!AllowedMethods.Contains(method)) return BadRequest("Unsupported method");

        // Basic allowlist: prevent javascript/data/file style targets.
        if (!Uri.TryCreate(target, UriKind.Absolute, out var targetUri))
            return BadRequest("Invalid target URI");

        var scheme = targetUri.Scheme?.ToLowerInvariant();
        if (scheme is not ("http" or "https"))
            return BadRequest("Only http/https targets are allowed");

        // Optional: prevent proxying to localhost/loopback (common SSRF mitigation).
        if (targetUri.IsLoopback) return BadRequest("Loopback targets are not allowed");

        using var http = new HttpClient();

        // Forward request headers (only those that are safe/relevant)
        // Do NOT forward Host header.
        using var outgoingRequest = new HttpRequestMessage(new HttpMethod(method), targetUri);
        // Forward selected headers from the incoming request.
        // (Avoid forwarding Cookie/Authorization/etc. to reduce leakage.)
        foreach (var h in Request.Headers)
        {
            var name = h.Key;
            if (name.Equals("host", StringComparison.OrdinalIgnoreCase)) continue;
            if (name.Equals("content-length", StringComparison.OrdinalIgnoreCase)) continue;
            if (name.Equals("connection", StringComparison.OrdinalIgnoreCase)) continue;
            if (name.Equals("cookie", StringComparison.OrdinalIgnoreCase)) continue;
            if (name.Equals("authorization", StringComparison.OrdinalIgnoreCase)) continue;
            if (name.Equals("referer", StringComparison.OrdinalIgnoreCase)) continue;
            if (name.Equals("user-agent", StringComparison.OrdinalIgnoreCase)) continue;

            if (!outgoingRequest.Headers.TryAddWithoutValidation(name, (string[])h.Value))
            {
                // ignore invalid/special headers
            }
        }


        // Forward Content-Type if provided
        if (Request.ContentType is not null)
        {
            outgoingRequest.Content = bodyBytes is null ? null : new ByteArrayContent(bodyBytes);
            outgoingRequest.Content.Headers.ContentType = new MediaTypeHeaderValue(Request.ContentType);
        }
        else
        {
            if (bodyBytes is not null)
                outgoingRequest.Content = new ByteArrayContent(bodyBytes);
        }

        if (bodyBytes is not null && outgoingRequest.Content is null)
            outgoingRequest.Content = new ByteArrayContent(bodyBytes);

        // Execute
        using var upstreamResponse = await http.SendAsync(outgoingRequest, HttpCompletionOption.ResponseHeadersRead, HttpContext.RequestAborted);

        var responseBody = await upstreamResponse.Content.ReadAsByteArrayAsync();

        // Return status + body; rely on CORS from our server.
        var contentType = upstreamResponse.Content.Headers.ContentType?.ToString();
        if (!string.IsNullOrWhiteSpace(contentType))
            return Content(new UTF8Encoding(false).GetString(responseBody), contentType, Encoding.UTF8);

        // If no content-type, return raw as text.
        return StatusCode((int)upstreamResponse.StatusCode, new UTF8Encoding(false).GetString(responseBody));
    }
}


using Microsoft.AspNetCore.Mvc;

namespace BackendApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AiChatController : ControllerBase
{
    public record ChatRequest(string? prompt);
    public record ChatResponse(string? reply);

    [HttpPost("chat")]
    public ActionResult<ChatResponse> Chat([FromBody] ChatRequest request, [FromServices] IConfiguration config)
    {
        var prompt = request?.prompt?.Trim();
        if (string.IsNullOrWhiteSpace(prompt))
            return BadRequest(new ChatResponse("Prompt is required"));

        // Return the plain prompt as the reply.
        // CustomMiddleware will handle the double-encryption of responses.
        return Ok(new ChatResponse(prompt));

    }
}



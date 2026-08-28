using BackendApi.Models;
using System.Text;
using System.Text.Json;

namespace BackendApi.Helper
{
    public class CustomMiddleware
    {
        private readonly RequestDelegate _next;

        public CustomMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task InvokeAsync(HttpContext context, IConfiguration config)
        {
            var masterKey = config["CryptoSettings:MasterKey"];
            var crypto = new Cryptography.Cryptography(masterKey);
            var originalBodyStream = context.Response.Body;

            try
            {
                //var path = context.Request.Path.Value?.ToLower();

                //// Skip encryption/decryption for specific APIs
                //if (path != null && (
                //    path.Contains("/api/crypto/encrypt") ||
                //    path.Contains("/api/crypto/decrypt")
                //))
                //{
                //    await _next(context);
                //    return;
                //}

                // =========================
                // REQUEST DECRYPTION
                // =========================

                context.Request.EnableBuffering();

                string encryptedBody = string.Empty;

                using (var reader = new StreamReader(
                    context.Request.Body,
                    Encoding.UTF8,
                    leaveOpen: true))
                {
                    encryptedBody = await reader.ReadToEndAsync();

                    context.Request.Body.Position = 0;
                }

                if (!string.IsNullOrWhiteSpace(encryptedBody)
                    && encryptedBody.Contains("\"data\""))
                {
                    try
                    {
                        var wrapper = JsonSerializer.Deserialize<DecryptModels>(encryptedBody);

                        if (wrapper != null &&
                            !string.IsNullOrWhiteSpace(wrapper.data))
                        {
                            var decryptedObject =
                                crypto.DoubleDecrypt<object>(wrapper.data);

                            var decryptedJson =
                                JsonSerializer.Serialize(decryptedObject);

                            var bytes =
                                Encoding.UTF8.GetBytes(decryptedJson);

                            context.Request.Body =
                                new MemoryStream(bytes);
                        }
                    }
                    catch
                    {
                        // Ignore invalid encrypted payload
                    }
                }

                // =========================
                // RESPONSE CAPTURE
                // =========================

                await using var responseBody = new MemoryStream();

                context.Response.Body = responseBody;

                await _next(context);

                // =========================
                // READ RESPONSE
                // =========================

                responseBody.Seek(0, SeekOrigin.Begin);

                string responseText =
                    await new StreamReader(responseBody)
                    .ReadToEndAsync();

                // =========================
                // ENCRYPT RESPONSE
                // =========================

                var encryptedResponse =
                    crypto.DoubleEncrypt(responseText);

                var responseWrapper = new DecryptModels
                {
                    data = encryptedResponse
                };

                var finalJson =
                    JsonSerializer.Serialize(responseWrapper);

                var finalBytes =
                    Encoding.UTF8.GetBytes(finalJson);

                // IMPORTANT
                context.Response.Body = originalBodyStream;

                context.Response.ContentType = "application/json";

                context.Response.ContentLength = finalBytes.Length;

                await context.Response.Body.WriteAsync(finalBytes);
            }
            catch (Exception ex)
            {
                // RESTORE ORIGINAL STREAM
                context.Response.Body = originalBodyStream;

                context.Response.StatusCode = 500;

                context.Response.ContentType = "application/json";

                var errorJson = JsonSerializer.Serialize(new
                {
                    message = "Error",
                    detail = ex.Message
                });

                await context.Response.WriteAsync(errorJson);
            }
            finally
            {
                // VERY IMPORTANT
                context.Response.Body = originalBodyStream;
            }
        }

    }
}

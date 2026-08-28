using BackendApi.Models;
using BackendApi.Repository;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace BackendApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CryptoController(ICryptoService crypto) : ControllerBase
    {
        private readonly ICryptoService _crypto = crypto;

        [HttpPost("encrypt")]
        public IActionResult Encrypt(EncryptModels data)
        {
            var result = crypto.Encrypt(data);
            return Ok(new { data = result });
        }

        [HttpPost("decrypt")]
        public IActionResult Decrypt(decryptModels encrypted)
        {
            try
            {
                var jsonString = crypto.Decrypt<object>(encrypted);
                return Ok(jsonString);
            }
            catch (Exception ex)
            {
                return BadRequest(new
                {
                    message = "Decrypt failed. Check the master key and encrypted text.",
                    detail = ex.Message
                });
            }
        }
    }
}

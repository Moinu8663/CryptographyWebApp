using System.Text.Json;

namespace BackendApi.Models
{
    public class DecryptModels
    {
        public string data { get; set; }
    }
    public class EncryptModels
    {
        public string masterKey { get; set; }
        public JsonElement data { get; set; }
    }
    public class decryptModels
    {
        public string masterKey { get; set; }
        public string data { get; set; }
    }
}

using BackendApi.Models;
using BackendApi.Repository;
using System.Text.Json;

namespace BackendApi.Service
{
    public class CryptoService:ICryptoService
    {
        public T Decrypt<T>(decryptModels data)
        {
            var _crypto = new Cryptography.Cryptography(data.masterKey);
            var result = _crypto.DoubleDecrypt<T>(data.data);
            return result;
        }

        public string Encrypt(EncryptModels data)
        {
            var _crypto = new Cryptography.Cryptography(data.masterKey);
            var jsonString = data.data.GetRawText();
            var result = _crypto.DoubleEncrypt(jsonString);
            return result;

        }

    }
}

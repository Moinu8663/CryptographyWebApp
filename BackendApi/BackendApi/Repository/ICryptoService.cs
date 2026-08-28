using BackendApi.Models;
using System.Text.Json;

namespace BackendApi.Repository
{
    public interface ICryptoService
    {
        string Encrypt(EncryptModels data);
        T Decrypt<T>(decryptModels data);
    }
}

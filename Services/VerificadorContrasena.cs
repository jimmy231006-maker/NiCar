using System.Security.Cryptography;

namespace NiCar.Services;

public static class VerificadorContrasena
{
    private const int Iteraciones = 210000;

    public static (string Hash, string Salt) Crear(string contrasena)
    {
        byte[] salt = RandomNumberGenerator.GetBytes(16);
        byte[] hash = Rfc2898DeriveBytes.Pbkdf2(
            contrasena, salt, Iteraciones, HashAlgorithmName.SHA256, 32);
        return (Convert.ToBase64String(hash), Convert.ToBase64String(salt));
    }

    public static bool Verificar(string contrasena, string saltBase64, string hashBase64)
    {
        try
        {
            byte[] salt = Convert.FromBase64String(saltBase64);
            byte[] esperado = Convert.FromBase64String(hashBase64);
            byte[] calculado = Rfc2898DeriveBytes.Pbkdf2(
                contrasena, salt, Iteraciones, HashAlgorithmName.SHA256, esperado.Length);
            return CryptographicOperations.FixedTimeEquals(calculado, esperado);
        }
        catch (FormatException)
        {
            return false;
        }
    }
}

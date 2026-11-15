using System.ComponentModel.DataAnnotations;
using NiCar.Validation;

namespace NiCar.Models;

public class RegistroCliente
{
    [Required, StringLength(100), NombrePersona]
    public string Nombre { get; set; } = "";

    [Required, EmailAddress, StringLength(50)]
    public string Correo { get; set; } = "";

    [Required, StringLength(16), CedulaNicaraguense]
    public string Cedula { get; set; } = "";

    [Required, StringLength(100, MinimumLength = 12), DataType(DataType.Password)]
    public string Contrasena { get; set; } = "";

    [Compare(nameof(Contrasena), ErrorMessage = "Las contraseñas deben coincidir."), DataType(DataType.Password)]
    public string Confirmacion { get; set; } = "";
}

using NiCar.Validation;
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc.Rendering;

namespace NiCar.Models;

public class UsuarioCrearViewModel
{
    [Required, StringLength(100)]
    [Display(Name = "Nombre completo")]
    [NombrePersona]
    public string NombreCompleto { get; set; } = "";

    [Required, EmailAddress, StringLength(50)]
    [Display(Name = "Correo de acceso")]
    public string Correo { get; set; } = "";

    [Required, MinLength(12), StringLength(100)]
    [DataType(DataType.Password)]
    public string Contrasena { get; set; } = "";

    [Required]
    public string Rol { get; set; } = "Vendedor";

    public IEnumerable<SelectListItem> Roles { get; set; } = [];
}

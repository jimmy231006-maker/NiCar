using System.ComponentModel.DataAnnotations;

namespace NiCar.Models;

public class CambiarContrasenaViewModel
{
    [Required, DataType(DataType.Password)]
    [Display(Name = "Contraseña actual")]
    public string ContrasenaActual { get; set; } = "";

    [Required, MinLength(12), StringLength(100), DataType(DataType.Password)]
    [Display(Name = "Nueva contraseña")]
    public string ContrasenaNueva { get; set; } = "";

    [Required, Compare(nameof(ContrasenaNueva)), DataType(DataType.Password)]
    [Display(Name = "Confirmar contraseña")]
    public string ConfirmarContrasena { get; set; } = "";
}

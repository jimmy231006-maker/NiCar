using System.ComponentModel.DataAnnotations;
using NiCar.Validation;

namespace NiCar.Models;

public class SolicitudVisita
{
    [Required(ErrorMessage = "Ingresá un teléfono de contacto.")]
    [RegularExpression(@"^[+]?[0-9]{8,15}$", ErrorMessage = "Ingresá de 8 a 15 dígitos, con + si usás código de país.")]
    public string Telefono { get; set; } = "";

    [Required(ErrorMessage = "Elegí una fecha y una hora.")]
    public DateTime? Inicio { get; set; }
}

public class VisitaAgendada
{
    public string Vehiculo { get; set; } = "";
    public string Nombre { get; set; } = "";
    public string Telefono { get; set; } = "";
    public DateTime Inicio { get; set; }
}

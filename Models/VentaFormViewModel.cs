using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc.Rendering;

namespace NiCar.Models;

public class VentaFormViewModel
{
    public int IdVenta { get; set; }
    [Required(ErrorMessage = "Seleccione un vehículo.")]
    public int IdVehiculo { get; set; }
    [Required(ErrorMessage = "Seleccione un cliente.")]
    public int IdCliente { get; set; }
    [Required, Range(typeof(decimal), "0.01", "999999999999", ErrorMessage = "El precio debe ser mayor que cero.")]
    public decimal PrecioVenta { get; set; }
    [Range(typeof(decimal), "0", "999999999999", ErrorMessage = "El descuento no puede ser negativo.")]
    public decimal Descuento { get; set; }
    [Required] public string Moneda { get; set; } = "NIO";
    [Required] public string MetodoPago { get; set; } = "Transferencia";
    [StringLength(80)] public string? ReferenciaPago { get; set; }
    [StringLength(500)] public string? Observaciones { get; set; }
    public IEnumerable<SelectListItem> Vehiculos { get; set; } = [];
    public IEnumerable<SelectListItem> Clientes { get; set; } = [];
}

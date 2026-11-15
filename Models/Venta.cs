using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NiCar.Models;

public class Venta
{
    [Key] public int IdVenta { get; set; }

    [Required] public int IdVehiculo { get; set; }
    [Required] public int IdCliente { get; set; }

    [Required, StringLength(30)]
    public string NumeroComprobante { get; set; } = string.Empty;

    [Required, Column(TypeName = "date")]
    public DateTime FechaVenta { get; set; } = DateTime.Today;

    [Required, Range(typeof(decimal), "0.01", "999999999999")]
    [Column(TypeName = "decimal(18,2)")]
    public decimal PrecioVenta { get; set; }

    [Range(typeof(decimal), "0", "999999999999")]
    [Column(TypeName = "decimal(18,2)")]
    public decimal Descuento { get; set; }

    [DatabaseGenerated(DatabaseGeneratedOption.Computed)]
    [Column(TypeName = "decimal(18,2)")]
    public decimal Total { get; set; }

    [Required, StringLength(3)]
    public string Moneda { get; set; } = "NIO";

    [Required, StringLength(30)]
    public string MetodoPago { get; set; } = "Transferencia";

    [StringLength(80)]
    public string? ReferenciaPago { get; set; }

    [StringLength(500)]
    public string? Observaciones { get; set; }

    [StringLength(80)]
    public string? UsuarioRegistro { get; set; }

    public bool Activa { get; set; } = true;

    public Vehiculo? Vehiculo { get; set; }
    public Cliente? Cliente { get; set; }
}

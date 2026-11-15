
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NiCar.Models
{
    public class AdquisicionVehiculo
    {
        [Key]
        public int IdAdquisicion { get; set; }

        [Required]
        public int IdVehiculo { get; set; }

        [Required]
        public int IdProveedor { get; set; }

        [Column(TypeName = "date")]
        public DateTime FechaAdquisicion { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal PrecioCompra { get; set; }

        [Required]
        [StringLength(3)]
        public string Moneda { get; set; } = "USD";

        [Column(TypeName = "decimal(18,6)")]
        public decimal TasaCambio { get; set; }

        [DatabaseGenerated(DatabaseGeneratedOption.Computed)]
        [Column(TypeName = "decimal(18,2)")]
        public decimal PrecioCompraNIO { get; private set; }

        // Relaciones
        public Vehiculo? Vehiculo { get; set; }

        public Proveedor? Proveedor { get; set; }
    }
}

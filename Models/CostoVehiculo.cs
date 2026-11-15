
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NiCar.Models
{
    public class CostoVehiculo
    {
        [Key]
        public int IdCosto { get; set; }

        [Required]
        public int IdVehiculo { get; set; }

        [Required]
        public int IdTipoCosto { get; set; }

        [Required]
        [StringLength(200)]
        [Column(TypeName = "varchar(200)")]
        public string Descripcion { get; set; } = string.Empty;

        [Column(TypeName = "date")]
        public DateTime FechaCosto { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal Monto { get; set; }

        [Required]
        [StringLength(3)]
        [Column(TypeName = "varchar(3)")]
        public string Moneda { get; set; } = "USD";

        [Column(TypeName = "decimal(18,6)")]
        public decimal TasaCambio { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal? MontoNIO { get; set; }

        [StringLength(80)]
        [Column(TypeName = "varchar(80)")]
        public string? NumeroDocumento { get; set; }

        [StringLength(300)]
        [Column(TypeName = "varchar(300)")]
        public string? Observaciones { get; set; }

        public bool Activo { get; set; } = true;

        // Relaciones
        public Vehiculo? Vehiculo { get; set; }

        public TipoCosto? TipoCosto { get; set; }
    }
}

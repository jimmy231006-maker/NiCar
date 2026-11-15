using NiCar.Validation;

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NiCar.Models
{
    public class Vehiculo
    {
        [Key]
        public int IdVehiculo { get; set; }

        [Required]
        public int IdModelo { get; set; }

        [Required]
        [StringLength(50)]
        public string IdentificadorUnico { get; set; } = string.Empty;

        [StringLength(17)]
        [RegularExpression(@"[A-HJ-NPR-Za-hj-npr-z0-9]{17}", ErrorMessage = "El VIN requiere 17 caracteres y excluye I, O y Q.")]
        public string? VIN { get; set; }

        [StringLength(50)]
        public string? NumeroChasis { get; set; }

        [StringLength(10)]
        public string? Placa { get; set; }

        [Required]
        [StringLength(20)]
        public string EstadoMatricula { get; set; } = "Pendiente";

        [Range(1950, 2100)]
        public short Anio { get; set; }

        [StringLength(80)]
        public string? Version { get; set; }

        [Required]
        [StringLength(40)]
        [ConLetras]
        public string ColorExterior { get; set; } = string.Empty;

        [StringLength(40)]
        [ConLetras]
        public string? ColorInterior { get; set; }

        [Required]
        [StringLength(20)]
        [AllowedValues("Automática", "Manual", "CVT", ErrorMessage = "Seleccioná una opción válida.")]
        public string Transmision { get; set; } = string.Empty;

        [Required]
        [StringLength(15)]
        [AllowedValues("4x2", "4x4", "AWD", "FWD", "RWD", ErrorMessage = "Seleccioná una opción válida.")]
        public string Traccion { get; set; } = string.Empty;

        [Required]
        [StringLength(20)]
        [AllowedValues("Gasolina", "Diésel", "Híbrido", "Eléctrico", "Híbrido enchufable", ErrorMessage = "Seleccioná una opción válida.")]
        public string Combustible { get; set; } = string.Empty;

        [Range(0, long.MaxValue)]
        public long Kilometraje { get; set; }

        [Required]
        [StringLength(30)]
        [AllowedValues("Sedán", "SUV", "Pickup", "Hatchback", "Camioneta", "Coupe", "Van", ErrorMessage = "Seleccioná una opción válida.")]
        public string TipoCarroceria { get; set; } = string.Empty;

        [Required]
        [StringLength(25)]
        public string Estado { get; set; } = "Disponible";

        public DateTime FechaRegistro { get; set; }

        [StringLength(500)]
        public string? Observaciones { get; set; }

        [Range(0, 999999999)]
        [Column(TypeName = "decimal(18,2)")]
        public decimal? PrecioOferta { get; set; }

        [StringLength(500)]
        [RegularExpression(@"https?://[^\s/]+(?:/[^\s]*)?", ErrorMessage = "Ingresá una URL de imagen HTTP o HTTPS.")]
        public string? ImagenUrl { get; set; }

        [StringLength(80)]
        [ConLetras]
        public string? Ubicacion { get; set; }

        public bool Activo { get; set; } = true;

        // Relaciones
        public Modelo? Modelo { get; set; }

        public ICollection<CostoVehiculo> Costos { get; set; }
            = new List<CostoVehiculo>();

        public ICollection<AdquisicionVehiculo> Adquisiciones { get; set; }
            = new List<AdquisicionVehiculo>();
    }
}

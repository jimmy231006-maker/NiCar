using NiCar.Validation;

using System.ComponentModel.DataAnnotations;

namespace NiCar.Models
{
    public class TipoCosto
    {
        [Key]
        public int IdTipoCosto { get; set; }

        [Required]
        [StringLength(80)]
        [ConLetras]
        public string Nombre { get; set; } = string.Empty;

        [StringLength(200)]
        public string? Descripcion { get; set; }

        public bool Activo { get; set; } = true;

        public ICollection<CostoVehiculo> Costos { get; set; }
            = new List<CostoVehiculo>();
    }
}

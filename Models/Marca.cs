using NiCar.Validation;

using System.ComponentModel.DataAnnotations;

namespace NiCar.Models
{
    public class Marca
    {
        public int IdMarca { get; set; }

        [Required(ErrorMessage = "El nombre de la marca es obligatorio.")]
        [StringLength(60)]
        [ConLetras]
        public string Nombre { get; set; } = string.Empty;

        [StringLength(60)]
        [ConLetras]
        public string? PaisOrigen { get; set; }

        public bool Activo { get; set; } = true;

        public ICollection<Modelo> Modelos { get; set; }
            = new List<Modelo>();
    }
}

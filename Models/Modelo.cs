using NiCar.Validation;

using System.ComponentModel.DataAnnotations;

namespace NiCar.Models
{
    public class Modelo
    {
        public int IdModelo { get; set; }

        [Required(ErrorMessage = "Debe seleccionar una marca.")]
        public int IdMarca { get; set; }

        [Required(ErrorMessage = "El nombre del modelo es obligatorio.")]
        [StringLength(80)]
        [ConLetras]
        public string Nombre { get; set; } = string.Empty;

        public bool Activo { get; set; } = true;

        // Relación con Marca
        public Marca? Marca { get; set; }

        // Relación con vehículos
        public ICollection<Vehiculo> Vehiculos { get; set; }
            = new List<Vehiculo>();
    }
}

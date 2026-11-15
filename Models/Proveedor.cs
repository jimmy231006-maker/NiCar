
using System.ComponentModel.DataAnnotations;
using NiCar.Validation;

namespace NiCar.Models
{
    public class Proveedor
    {
        public int IdProveedor { get; set; }

        [Required]
        [StringLength(30)]
        [AllowedValues("Empresa", "Persona", ErrorMessage = "Seleccioná Empresa o Persona.")]
        public string TipoProveedor { get; set; } = string.Empty;

        [Required]
        [StringLength(150)]
        [ConLetras]
        public string NombreProveedor { get; set; } = string.Empty;

        [StringLength(30)]
        public string? IdentificacionFiscal { get; set; }

        [Required]
        [StringLength(60)]
        [ConLetras]
        public string Pais { get; set; } = string.Empty;

        [StringLength(80)]
        [ConLetras]
        public string? Ciudad { get; set; }

        [StringLength(250)]
        public string? Direccion { get; set; }

        [StringLength(20)]
        [Phone(ErrorMessage = "Ingresá un teléfono válido.")]
        public string? Telefono { get; set; }

        [EmailAddress]
        [StringLength(120)]
        public string? Correo { get; set; }

        [StringLength(120)]
        [NombrePersona(ErrorMessage = "El nombre del contacto solo debe contener letras.")]
        public string? Contacto { get; set; }

        public DateTime FechaRegistro { get; set; }

        [StringLength(500)]
        public string? Observaciones { get; set; }

        public bool Activo { get; set; } = true;

        public ICollection<AdquisicionVehiculo> Adquisiciones { get; set; }
            = new List<AdquisicionVehiculo>();
    }
}

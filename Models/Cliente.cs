
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.RegularExpressions;
using NiCar.Validation;

namespace NiCar.Models
{
    public class Cliente
    {
        [Key]
        public int IdCliente { get; set; }

        [Required]
        [StringLength(20)]
        [Column(TypeName = "varchar(20)")]
        public string TipoCliente { get; set; } = "Natural";

        [StringLength(100)]
        [NombrePersona(ErrorMessage = "Los nombres solo deben contener letras.")]
        [Column(TypeName = "varchar(100)")]
        public string? Nombres { get; set; }

        [StringLength(100)]
        [NombrePersona(ErrorMessage = "Los apellidos solo deben contener letras.")]
        [Column(TypeName = "varchar(100)")]
        public string? Apellidos { get; set; }

        [StringLength(150)]
        [Column(TypeName = "varchar(150)")]
        [ConLetras]
        public string? RazonSocial { get; set; }

        [Required]
        [StringLength(10)]
        [Column(TypeName = "varchar(10)")]
        public string TipoIdentificacion { get; set; }
            = string.Empty;

        [Required]
        [StringLength(30)]
        [Column(TypeName = "varchar(30)")]
        public string NumeroIdentificacion { get; set; }
            = string.Empty;

        [StringLength(20)]
        [Column(TypeName = "varchar(20)")]
        [Phone(ErrorMessage = "Ingresá un teléfono válido.")]
        public string? Telefono { get; set; }

        [EmailAddress]
        [StringLength(120)]
        [Column(TypeName = "varchar(120)")]
        public string? Correo { get; set; }

        [StringLength(300)]
        [Column(TypeName = "varchar(300)")]
        public string? Direccion { get; set; }

        [Column(TypeName = "timestamp without time zone")]
        public DateTime FechaRegistro { get; set; }

        public bool Activo { get; set; } = true;
    }
}

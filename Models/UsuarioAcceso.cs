namespace NiCar.Models;

public class UsuarioAcceso
{
    public int IdUsuario { get; set; }
    public string NombreUsuario { get; set; } = "";
    public string NombreCompleto { get; set; } = "";
    public string HashContrasena { get; set; } = "";
    public string Salt { get; set; } = "";
    public string Rol { get; set; } = "Administrador";
    public bool Activo { get; set; }
    public bool DebeCambiarContrasena { get; set; }
    public int IntentosFallidos { get; set; }
    public DateTime? BloqueadoHasta { get; set; }
}

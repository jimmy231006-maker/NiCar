namespace NiCar.Models;

public sealed class CatalogoVehiculoViewModel
{
    public int IdVehiculo { get; set; }
    public string Marca { get; set; } = "";
    public string Modelo { get; set; } = "";
    public short Anio { get; set; }
    public long Kilometraje { get; set; }
    public string? Ubicacion { get; set; }
    public decimal? PrecioOferta { get; set; }
    public string? ImagenUrl { get; set; }
    public string? Transmision { get; set; }
    public string? Combustible { get; set; }
}

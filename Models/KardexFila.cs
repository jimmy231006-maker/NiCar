namespace NiCar.Models;

public sealed class KardexFila
{
    public DateTime Fecha { get; set; }
    public string Movimiento { get; set; } = "";
    public string Referencia { get; set; } = "";
    public string Vehiculo { get; set; } = "";
    public decimal? Monto { get; set; }
    public string? Moneda { get; set; }
}

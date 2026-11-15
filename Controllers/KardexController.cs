using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NiCar.Data;
using NiCar.Models;

namespace NiCar.Controllers;

[Authorize(Roles = "SuperAdministrador,Administrador,Bodega")]
public class KardexController : Controller
{
    private readonly NiCarContext _db;
    public KardexController(NiCarContext db) => _db = db;

    public async Task<IActionResult> Index()
    {
        const string sql = """
SELECT "Fecha", "Movimiento", "Referencia", "Vehiculo", "Monto", "Moneda"
FROM (
    SELECT CAST(a."FechaAdquisicion" AS timestamp) "Fecha", CAST('Entrada' AS varchar(20)) "Movimiento",
           CAST(CONCAT('Compra #', a."IdAdquisicion") AS varchar(80)) "Referencia",
           CAST(CONCAT(v."Anio", ' ', ma."Nombre", ' ', mo."Nombre") AS varchar(220)) "Vehiculo",
           CAST(a."PrecioCompra" AS decimal(18,2)) "Monto", CAST(a."Moneda" AS varchar(3)) "Moneda"
    FROM nicar."AdquisicionVehiculo" a
    INNER JOIN nicar."Vehiculo" v ON v."IdVehiculo" = a."IdVehiculo"
    INNER JOIN nicar."Modelo" mo ON mo."IdModelo" = v."IdModelo"
    INNER JOIN nicar."Marca" ma ON ma."IdMarca" = mo."IdMarca"
    UNION ALL
    SELECT CAST(ve."FechaVenta" AS timestamp), CAST('Salida' AS varchar(20)),
           CAST(CONCAT('Venta ', ve."NumeroComprobante") AS varchar(80)),
           CAST(CONCAT(v."Anio", ' ', ma."Nombre", ' ', mo."Nombre") AS varchar(220)),
           CAST(ve."Total" AS decimal(18,2)), CAST(ve."Moneda" AS varchar(3))
    FROM nicar."Venta" ve
    INNER JOIN nicar."Vehiculo" v ON v."IdVehiculo" = ve."IdVehiculo"
    INNER JOIN nicar."Modelo" mo ON mo."IdModelo" = v."IdModelo"
    INNER JOIN nicar."Marca" ma ON ma."IdMarca" = mo."IdMarca"
) movimientos
ORDER BY "Fecha" DESC
""";
        return View(await _db.Database.SqlQueryRaw<KardexFila>(sql).ToListAsync());
    }
}

using NiCar.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace NiCar.Controllers;

[Authorize(Roles = "SuperAdministrador")]
public class SeguridadController : Controller
{
    private readonly NiCarContext _db;
    public SeguridadController(NiCarContext db) => _db = db;

    public async Task<IActionResult> Logs()
    {
        var logs = await _db.Database.SqlQueryRaw<LogAccesoFila>(
            "SELECT \"IdLog\", \"IdUsuario\", \"NombreIngresado\", \"Evento\", \"FechaHora\" " +
            "FROM nicar.\"LogAcceso\" ORDER BY \"FechaHora\" DESC LIMIT 500").ToListAsync();
        return View(logs);
    }

    public sealed class LogAccesoFila
    {
        public long IdLog { get; set; }
        public int? IdUsuario { get; set; }
        public string? NombreIngresado { get; set; }
        public string Evento { get; set; } = "";
        public DateTime FechaHora { get; set; }
    }
}

using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NiCar.Data;
using NiCar.Models;

namespace NiCar.Controllers;

public class CitasController(NiCarContext db) : Controller
{
    private static readonly TimeZoneInfo Zona = TimeZoneInfo.FindSystemTimeZoneById("America/Managua");
    private static DateTime Ahora => TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, Zona);

    private async Task<bool> PrepararFormulario(int id)
    {
        var titulo = await db.Vehiculos.AsNoTracking()
            .Where(v => v.IdVehiculo == id && v.Activo && v.Estado == "Disponible"
                && v.Modelo!.Activo && v.Modelo.Marca!.Activo)
            .Select(v => v.Modelo!.Marca!.Nombre + " " + v.Modelo.Nombre + " " + v.Anio)
            .SingleOrDefaultAsync();
        ViewBag.Vehiculo = titulo;
        ViewBag.IdVehiculo = id;
        ViewBag.Minimo = Ahora.Date.AddHours(Ahora.Hour + 1).ToString("yyyy-MM-ddTHH:mm");
        return titulo != null;
    }

    [Authorize(Roles = "Cliente"), HttpGet]
    public async Task<IActionResult> Agendar(int id)
    {
        if (!await PrepararFormulario(id)) return NotFound();
        return View(new SolicitudVisita());
    }

    [Authorize(Roles = "Cliente"), HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> Agendar(int id, SolicitudVisita solicitud)
    {
        if (!await PrepararFormulario(id)) return NotFound();
        var ahora = Ahora;
        if (solicitud.Inicio is DateTime fecha && (fecha <= ahora || fecha.Ticks % TimeSpan.TicksPerHour != 0))
            ModelState.AddModelError(nameof(solicitud.Inicio), "Elegí una fecha futura y una hora en punto.");
        if (!ModelState.IsValid) return View(solicitud);

        var inicio = DateTime.SpecifyKind(solicitud.Inicio!.Value, DateTimeKind.Unspecified);
        if (!int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var usuario)) return Challenge();
        int filas;
        try
        {
            filas = await db.Database.ExecuteSqlInterpolatedAsync($"""
            WITH disponible AS (
                SELECT v."IdVehiculo" FROM nicar."Vehiculo" v
                JOIN nicar."Modelo" m ON m."IdModelo" = v."IdModelo"
                JOIN nicar."Marca" b ON b."IdMarca" = m."IdMarca"
                WHERE v."IdVehiculo" = {id} AND v."Activo" AND v."Estado" = 'Disponible'
                  AND m."Activo" AND b."Activo" FOR SHARE OF v, m, b
            )
            INSERT INTO nicar."Cita" ("IdVehiculo", "IdUsuario", "Telefono", "Inicio")
            SELECT "IdVehiculo", {usuario}, {solicitud.Telefono.Trim()}, CAST({inicio.ToString("yyyy-MM-dd HH:mm:ss", System.Globalization.CultureInfo.InvariantCulture)} AS timestamp)
            FROM disponible ON CONFLICT ("IdVehiculo", "Inicio") DO NOTHING
            """);
        }
        catch (Npgsql.PostgresException ex) when (ex.SqlState is "P1810" or "P1801" or "P1802")
        {
            ModelState.AddModelError("", ex.SqlState switch
            {
                "P1810" => "Ese día ya tiene diez citas. Elegí otra fecha.",
                "P1801" => "La hora seleccionada ya pasó.",
                _ => "Necesitás una cuenta de cliente activa y mayor de edad."
            });
            return View(solicitud);
        }
        if (filas == 0)
        {
            ModelState.AddModelError("", "Ese vehículo u horario ya no está disponible. Elegí otro.");
            return View(solicitud);
        }

        TempData["Mensaje"] = $"Visita agendada para {ViewBag.Vehiculo} el {inicio:dd/MM/yyyy} a las {inicio:HH:mm} (hora de Nicaragua).";
        return RedirectToAction("Index", "Home");
    }

    [Authorize(Roles = "SuperAdministrador,Administrador,Vendedor,Recepcionista")]
    public async Task<IActionResult> Index()
    {
        var visitas = await db.Database.SqlQuery<VisitaAgendada>($"""
            SELECT b."Nombre" || ' ' || m."Nombre" || ' ' || v."Anio" AS "Vehiculo",
                   c."Nombre", c."Telefono", c."Inicio"
            FROM nicar."Cita" c JOIN nicar."Vehiculo" v USING ("IdVehiculo")
            JOIN nicar."Modelo" m USING ("IdModelo")
            JOIN nicar."Marca" b USING ("IdMarca")
            WHERE c."Inicio" >= CAST({Ahora.ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture)} AS date)
            ORDER BY c."Inicio", c."IdCita"
            """).ToListAsync();
        return View(visitas);
    }
}

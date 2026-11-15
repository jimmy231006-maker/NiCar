using System.Diagnostics;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NiCar.Data;
using NiCar.Models;

namespace NiCar.Controllers;

public class HomeController : Controller
{
    private readonly NiCarContext _db;
    private readonly ILogger<HomeController> _logger;

    public HomeController(NiCarContext db, ILogger<HomeController> logger)
    {
        _db = db;
        _logger = logger;
    }

    [AllowAnonymous]
    public async Task<IActionResult> Index(string? q)
    {
        q = q?.Trim();
        var query = _db.Vehiculos.AsNoTracking()
            .Include(v => v.Modelo).ThenInclude(m => m!.Marca)
            .Where(v => v.Activo && v.Estado == "Disponible" && v.Modelo != null && v.Modelo.Activo && v.Modelo.Marca != null && v.Modelo.Marca.Activo);

        if (!string.IsNullOrWhiteSpace(q))
            query = query.Where(v => v.Modelo!.Nombre.Contains(q) || v.Modelo.Marca!.Nombre.Contains(q) || v.Anio.ToString().Contains(q));

        var vehiculos = await query.OrderByDescending(v => v.FechaRegistro)
            .Select(v => new CatalogoVehiculoViewModel
            {
                IdVehiculo = v.IdVehiculo,
                Marca = v.Modelo!.Marca!.Nombre,
                Modelo = v.Modelo.Nombre,
                Anio = v.Anio,
                Kilometraje = v.Kilometraje,
                Ubicacion = v.Ubicacion,
                PrecioOferta = v.PrecioOferta,
                ImagenUrl = v.ImagenUrl,
                Transmision = v.Transmision,
                Combustible = v.Combustible
            }).ToListAsync();

        ViewBag.Busqueda = q;
        return View(vehiculos);
    }

    [AllowAnonymous]
    public IActionResult Privacy() => View();

    [AllowAnonymous]
    [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
    public IActionResult Error() => View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
}

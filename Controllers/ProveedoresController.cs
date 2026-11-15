using Microsoft.AspNetCore.Authorization;
using NiCar.Data;
using NiCar.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace NiCar.Controllers;

[Authorize(Roles = "SuperAdministrador,Administrador")]

public class ProveedoresController : Controller
{
    private readonly NiCarContext _db;
    public ProveedoresController(NiCarContext db) => _db = db;

    public async Task<IActionResult> Index(string filtro = "Todos")
    {
        var q = _db.Proveedores.AsNoTracking();
        if (filtro == "Activos") q = q.Where(x => x.Activo);
        if (filtro == "Inactivos") q = q.Where(x => !x.Activo);
        ViewBag.Filtro = filtro;
        return View(await q.OrderBy(x => x.NombreProveedor).ToListAsync());
    }

    public IActionResult Create() => View(new Proveedor { Pais = "Nicaragua" });

    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> Create(Proveedor p)
    {
        Normalizar(p);
        if (!ModelState.IsValid) return View(p);
        if (!string.IsNullOrWhiteSpace(p.IdentificacionFiscal) &&
            await _db.Proveedores.AnyAsync(x => x.IdentificacionFiscal == p.IdentificacionFiscal))
        {
            ModelState.AddModelError(nameof(p.IdentificacionFiscal), "La identificación fiscal ya existe.");
            return View(p);
        }
        p.FechaRegistro = DateTime.Now; p.Activo = true;
        _db.Proveedores.Add(p);
        await _db.SaveChangesAsync();
        TempData["Mensaje"] = "Proveedor registrado.";
        return RedirectToAction(nameof(Index));
    }

    public async Task<IActionResult> Edit(int? id)
    {
        if (id == null) return NotFound();
        var p = await _db.Proveedores.FindAsync(id);
        return p == null ? NotFound() : View(p);
    }

    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> Edit(int id, Proveedor datos)
    {
        if (id != datos.IdProveedor) return NotFound();
        Normalizar(datos);
        if (!ModelState.IsValid) return View(datos);
        if (!string.IsNullOrWhiteSpace(datos.IdentificacionFiscal) &&
            await _db.Proveedores.AnyAsync(x => x.IdProveedor != id &&
                x.IdentificacionFiscal == datos.IdentificacionFiscal))
        {
            ModelState.AddModelError(nameof(datos.IdentificacionFiscal), "La identificación fiscal ya existe.");
            return View(datos);
        }
        var p = await _db.Proveedores.FindAsync(id);
        if (p == null) return NotFound();
        p.TipoProveedor=datos.TipoProveedor; p.NombreProveedor=datos.NombreProveedor;
        p.IdentificacionFiscal=datos.IdentificacionFiscal; p.Pais=datos.Pais;
        p.Ciudad=datos.Ciudad; p.Direccion=datos.Direccion; p.Telefono=datos.Telefono;
        p.Correo=datos.Correo; p.Contacto=datos.Contacto; p.Observaciones=datos.Observaciones;
        await _db.SaveChangesAsync();
        TempData["Mensaje"] = "Proveedor actualizado.";
        return RedirectToAction(nameof(Index));
    }

    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> CambiarEstado(int id)
    {
        var p = await _db.Proveedores.FindAsync(id);
        if (p == null) return NotFound();
        p.Activo = !p.Activo;
        await _db.SaveChangesAsync();
        TempData["Mensaje"] = p.Activo ? "Proveedor reactivado." : "Proveedor desactivado.";
        return RedirectToAction(nameof(Index));
    }

    private static string? Clean(string? s) => string.IsNullOrWhiteSpace(s) ? null : s.Trim();
    private void Normalizar(Proveedor p)
    {
        p.TipoProveedor=p.TipoProveedor?.Trim() ?? "";
        p.NombreProveedor=p.NombreProveedor?.Trim() ?? "";
        if (p.TipoProveedor == "Persona" && !new NiCar.Validation.NombrePersonaAttribute().IsValid(p.NombreProveedor))
            ModelState.AddModelError(nameof(p.NombreProveedor), "Ingresá un nombre de persona válido.");
        p.IdentificacionFiscal=Clean(p.IdentificacionFiscal);
        p.Pais=p.Pais?.Trim() ?? "";
        p.Ciudad=Clean(p.Ciudad); p.Direccion=Clean(p.Direccion);
        p.Telefono=Clean(p.Telefono); p.Correo=Clean(p.Correo);
        p.Contacto=Clean(p.Contacto); p.Observaciones=Clean(p.Observaciones);
    }
}

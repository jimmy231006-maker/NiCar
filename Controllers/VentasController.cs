using Microsoft.AspNetCore.Authorization;
using NiCar.Data;
using NiCar.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;
using NiCar.Validation;

namespace NiCar.Controllers;

[Authorize(Roles = "SuperAdministrador,Administrador,Vendedor")]

public class VentasController : Controller
{
    private readonly NiCarContext _db;
    public VentasController(NiCarContext db) => _db = db;

    public async Task<IActionResult> Index(string? buscar, DateTime? desde, DateTime? hasta)
    {
        var q = _db.Ventas.AsNoTracking()
            .Include(v => v.Cliente).Include(v => v.Vehiculo)
            .ThenInclude(v => v!.Modelo).ThenInclude(m => m!.Marca)
            .Where(v => v.Activa);
        if (!string.IsNullOrWhiteSpace(buscar))
            q = q.Where(v => v.NumeroComprobante.Contains(buscar) ||
                (v.Cliente!.Nombres ?? "").Contains(buscar) ||
                (v.Cliente!.Apellidos ?? "").Contains(buscar) ||
                v.Cliente!.RazonSocial!.Contains(buscar) ||
                v.Vehiculo!.IdentificadorUnico.Contains(buscar));
        if (desde.HasValue) q = q.Where(v => v.FechaVenta >= desde.Value.Date);
        if (hasta.HasValue) q = q.Where(v => v.FechaVenta <= hasta.Value.Date);
        ViewBag.Buscar = buscar; ViewBag.Desde = desde?.ToString("yyyy-MM-dd");
        ViewBag.Hasta = hasta?.ToString("yyyy-MM-dd");
        return View(await q.OrderByDescending(v => v.IdVenta).ToListAsync());
    }

    public async Task<IActionResult> Create()
    {
        var vm = new VentaFormViewModel();
        await CargarListas(vm);
        return View(vm);
    }

    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> Create(VentaFormViewModel vm)
    {
        if (vm.Descuento > vm.PrecioVenta)
            ModelState.AddModelError(nameof(vm.Descuento), "El descuento no puede superar el precio.");
        if (vm.Moneda is not ("NIO" or "USD"))
            ModelState.AddModelError(nameof(vm.Moneda), "Seleccione una moneda válida.");
        if (vm.MetodoPago is not ("Efectivo" or "Transferencia" or "Tarjeta" or "Financiamiento"))
            ModelState.AddModelError(nameof(vm.MetodoPago), "Seleccione una forma de pago válida.");

        var vehiculo = await _db.Vehiculos.SingleOrDefaultAsync(v => v.IdVehiculo == vm.IdVehiculo);
        var cliente = await _db.Clientes.SingleOrDefaultAsync(c => c.IdCliente == vm.IdCliente && c.Activo);
        if (vehiculo == null || !vehiculo.Activo || !string.Equals(vehiculo.Estado, "Disponible", StringComparison.OrdinalIgnoreCase))
            ModelState.AddModelError(nameof(vm.IdVehiculo), "El vehículo no está disponible para la venta.");
        if (cliente == null)
            ModelState.AddModelError(nameof(vm.IdCliente), "Seleccione un cliente activo.");
        else if (cliente.TipoCliente == "Natural" &&
                 string.Equals(cliente.TipoIdentificacion, "Cedula", StringComparison.OrdinalIgnoreCase))
        {
            var edad = CedulaNicaraguenseAttribute.ObtenerEdad(cliente.NumeroIdentificacion);
            if (edad == null)
                ModelState.AddModelError(nameof(vm.IdCliente),
                    "No se puede comprobar la edad desde la cédula del cliente. Actualice su identificación antes de registrar la venta.");
            else if (edad < 18)
                ModelState.AddModelError(nameof(vm.IdCliente),
                    "NiCar no permite registrar una venta directa a nombre de una persona menor de 18 años. El Art. 21 del Código de Familia contempla excepciones de capacidad legal; deben verificarse y documentarse fuera de este flujo. Si no aplica una excepción, registre al representante legal.");
        }
        if (ModelState.IsValid && vehiculo != null && cliente != null)
        {
            await using var tx = await _db.Database.BeginTransactionAsync();
            try
            {
                var comprobante = $"V-{DateTime.Now:yyyyMMddHHmmss}-{Guid.NewGuid().ToString("N")[..4].ToUpperInvariant()}";
                var venta = new Venta
                {
                    IdVehiculo = vm.IdVehiculo, IdCliente = vm.IdCliente,
                    NumeroComprobante = comprobante, FechaVenta = DateTime.Today,
                    PrecioVenta = vm.PrecioVenta, Descuento = vm.Descuento,
                    Total = vm.PrecioVenta - vm.Descuento, Moneda = vm.Moneda,
                    MetodoPago = vm.MetodoPago, ReferenciaPago = Limpiar(vm.ReferenciaPago),
                    Observaciones = Limpiar(vm.Observaciones),
                    UsuarioRegistro = User.Identity?.Name, Activa = true
                };
                vehiculo.Estado = "Vendido";
                _db.Ventas.Add(venta);
                await _db.SaveChangesAsync();
                await tx.CommitAsync();
                TempData["Mensaje"] = $"Venta registrada. Comprobante: {comprobante}";
                return RedirectToAction(nameof(Details), new { id = venta.IdVenta });
            }
            catch (DbUpdateException)
            {
                await tx.RollbackAsync();
                ModelState.AddModelError("", "No se pudo registrar la venta. Verifique que el vehículo no haya sido vendido previamente.");
            }
        }
        await CargarListas(vm);
        return View(vm);
    }

    public async Task<IActionResult> Details(int? id)
    {
        if (id == null) return NotFound();
        var venta = await _db.Ventas.AsNoTracking().Include(v => v.Cliente)
            .Include(v => v.Vehiculo).ThenInclude(v => v!.Modelo).ThenInclude(m => m!.Marca)
            .FirstOrDefaultAsync(v => v.IdVenta == id);
        return venta == null ? NotFound() : View(venta);
    }

    private async Task CargarListas(VentaFormViewModel vm)
    {
        vm.Vehiculos = await _db.Vehiculos.AsNoTracking()
            .Where(v => v.Activo && v.Estado == "Disponible")
            .Include(v => v.Modelo).ThenInclude(m => m!.Marca)
            .OrderBy(v => v.IdentificadorUnico)
            .Select(v => new SelectListItem(
                v.IdentificadorUnico + " | " + v.Modelo!.Marca!.Nombre + " " +
                v.Modelo.Nombre + " " + v.Anio, v.IdVehiculo.ToString()))
            .ToListAsync();
        vm.Clientes = await _db.Clientes.AsNoTracking().Where(c => c.Activo)
            .OrderBy(c => c.TipoCliente == "Natural" ? c.Apellidos : c.RazonSocial)
            .Select(c => new SelectListItem(
                c.TipoCliente == "Natural" ? c.Nombres + " " + c.Apellidos : c.RazonSocial,
                c.IdCliente.ToString())).ToListAsync();
    }

    private static string? Limpiar(string? s) => string.IsNullOrWhiteSpace(s) ? null : s.Trim();
}

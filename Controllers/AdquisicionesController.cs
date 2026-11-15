
using Microsoft.AspNetCore.Authorization;
using NiCar.Data;
using NiCar.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;

namespace NiCar.Controllers
{
    [Authorize(Roles = "SuperAdministrador,Administrador")]
    public class AdquisicionesController : Controller
    {
        private readonly NiCarContext _context;

        public AdquisicionesController(NiCarContext context)
        {
            _context = context;
        }

        // LISTAR ADQUISICIONES
        public async Task<IActionResult> Index()
        {
            var adquisiciones = await _context.AdquisicionesVehiculo
                .Include(a => a.Vehiculo)
                    .ThenInclude(v => v!.Modelo)
                        .ThenInclude(m => m!.Marca)
                .Include(a => a.Proveedor)
                .AsNoTracking()
                .OrderByDescending(a => a.FechaAdquisicion)
                .ToListAsync();

            return View(adquisiciones);
        }

        // CARGAR VEHICULOS Y PROVEEDORES
        private async Task CargarListas(
            int? idVehiculo = null,
            int? idProveedor = null)
        {
            var vehiculos = await _context.Vehiculos
                .Where(v => v.Activo)
                .OrderBy(v => v.IdentificadorUnico)
                .Select(v => new
                {
                    v.IdVehiculo,
                    Nombre = v.IdentificadorUnico
                })
                .ToListAsync();

            var proveedores = await _context.Proveedores
                .Where(p => p.Activo)
                .OrderBy(p => p.NombreProveedor)
                .ToListAsync();

            ViewBag.IdVehiculo = new SelectList(
                vehiculos, "IdVehiculo", "Nombre", idVehiculo);

            ViewBag.IdProveedor = new SelectList(
                proveedores, "IdProveedor",
                "NombreProveedor", idProveedor);
        }

        // FORMULARIO DE REGISTRO
        public async Task<IActionResult> Create()
        {
            await CargarListas();
            return View();
        }

        // GUARDAR ADQUISICION
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Create(
            AdquisicionVehiculo adquisicion)
        {
            ValidarDatos(adquisicion);

            if (!ModelState.IsValid)
            {
                await CargarListas(
                    adquisicion.IdVehiculo,
                    adquisicion.IdProveedor);

                return View(adquisicion);
            }

            bool vehiculoValido = await _context.Vehiculos
                .AnyAsync(v => v.IdVehiculo == adquisicion.IdVehiculo
                            && v.Activo);

            bool proveedorValido = await _context.Proveedores
                .AnyAsync(p => p.IdProveedor == adquisicion.IdProveedor
                            && p.Activo);

            if (!vehiculoValido || !proveedorValido)
            {
                ModelState.AddModelError(
                    "", "Seleccione un vehículo y proveedor activos.");

                await CargarListas(
                    adquisicion.IdVehiculo,
                    adquisicion.IdProveedor);

                return View(adquisicion);
            }

            adquisicion.FechaAdquisicion =
                adquisicion.FechaAdquisicion.Date;

            _context.AdquisicionesVehiculo.Add(adquisicion);
            await _context.SaveChangesAsync();

            return RedirectToAction(nameof(Index));
        }

        // MOSTRAR FORMULARIO DE EDICION
        public async Task<IActionResult> Edit(int? id)
        {
            if (id == null)
                return NotFound();

            var adquisicion = await _context.AdquisicionesVehiculo
                .AsNoTracking()
                .FirstOrDefaultAsync(a => a.IdAdquisicion == id);

            if (adquisicion == null)
                return NotFound();

            await CargarListas(
                adquisicion.IdVehiculo,
                adquisicion.IdProveedor);

            return View(adquisicion);
        }

        // GUARDAR CAMBIOS DE EDICION
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Edit(
            int id, AdquisicionVehiculo datos)
        {
            if (id != datos.IdAdquisicion)
                return NotFound();

            ValidarDatos(datos);

            if (!ModelState.IsValid)
            {
                await CargarListas(
                    datos.IdVehiculo,
                    datos.IdProveedor);

                return View(datos);
            }

            bool vehiculoValido = await _context.Vehiculos
                .AnyAsync(v => v.IdVehiculo == datos.IdVehiculo
                            && v.Activo);

            bool proveedorValido = await _context.Proveedores
                .AnyAsync(p => p.IdProveedor == datos.IdProveedor
                            && p.Activo);

            if (!vehiculoValido || !proveedorValido)
            {
                ModelState.AddModelError(
                    "", "Seleccione un vehículo y proveedor activos.");

                await CargarListas(
                    datos.IdVehiculo,
                    datos.IdProveedor);

                return View(datos);
            }

            var adquisicion = await _context.AdquisicionesVehiculo
                .FirstOrDefaultAsync(a => a.IdAdquisicion == id);

            if (adquisicion == null)
                return NotFound();

            adquisicion.IdVehiculo = datos.IdVehiculo;
            adquisicion.IdProveedor = datos.IdProveedor;
            adquisicion.FechaAdquisicion =
                datos.FechaAdquisicion.Date;
            adquisicion.PrecioCompra = datos.PrecioCompra;
            adquisicion.Moneda = datos.Moneda;
            adquisicion.TasaCambio = datos.TasaCambio;

            // PrecioCompraNIO se calcula en PostgreSQL.
            await _context.SaveChangesAsync();

            return RedirectToAction(nameof(Index));
        }

        // VALIDACIONES COMPARTIDAS
        private void ValidarDatos(AdquisicionVehiculo adquisicion)
        {
            if (adquisicion.FechaAdquisicion == default || adquisicion.FechaAdquisicion.Date > DateTime.Today)
                ModelState.AddModelError(nameof(adquisicion.FechaAdquisicion), "Ingresá una fecha válida hasta hoy.");

            const decimal maximoImporte = 9999999999999999.99m;
            if (adquisicion.PrecioCompra > maximoImporte || decimal.Round(adquisicion.PrecioCompra, 2) != adquisicion.PrecioCompra)
                ModelState.AddModelError(nameof(adquisicion.PrecioCompra), "El importe supera el límite o tiene más de dos decimales.");
            if (adquisicion.Moneda == "USD" && adquisicion.TasaCambio > 0 &&
                (adquisicion.TasaCambio > 999999999999.999999m || decimal.Round(adquisicion.TasaCambio, 6) != adquisicion.TasaCambio ||
                 (adquisicion.TasaCambio >= 1 && adquisicion.PrecioCompra > maximoImporte / adquisicion.TasaCambio)))
                ModelState.AddModelError(nameof(adquisicion.TasaCambio), "Revisá la precisión de la tasa y el total convertido.");

            if (adquisicion.PrecioCompra <= 0)
                ModelState.AddModelError(
                    "PrecioCompra",
                    "El precio debe ser mayor que cero.");

            if (adquisicion.TasaCambio <= 0)
                ModelState.AddModelError(
                    "TasaCambio",
                    "La tasa debe ser mayor que cero.");

            if (adquisicion.Moneda == "NIO")
                adquisicion.TasaCambio = 1;

            if (adquisicion.Moneda != "NIO" &&
                adquisicion.Moneda != "USD")
            {
                ModelState.AddModelError(
                    "Moneda", "Seleccione USD o NIO.");
            }
        }
    }
}

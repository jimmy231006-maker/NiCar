
using Microsoft.AspNetCore.Authorization;
using NiCar.Data;
using NiCar.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;

namespace NiCar.Controllers
{
    [Authorize(Roles = "SuperAdministrador,Administrador")]
    public class CostosVehiculoController : Controller
    {
        private readonly NiCarContext _context;

        public CostosVehiculoController(NiCarContext context)
        {
            _context = context;
        }

        // LISTAR COSTOS
        public async Task<IActionResult> Index()
        {
            var costos = await _context.CostosVehiculo
                .Include(c => c.Vehiculo)
                    .ThenInclude(v => v!.Modelo)
                        .ThenInclude(m => m!.Marca)
                .Include(c => c.TipoCosto)
                .AsNoTracking()
                .OrderByDescending(c => c.FechaCosto)
                .ToListAsync();

            return View(costos);
        }

        // CARGAR LISTAS
        private async Task CargarListas(
            int? idVehiculo = null,
            int? idTipoCosto = null)
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

            var tipos = await _context.TiposCosto
                .Where(t => t.Activo)
                .OrderBy(t => t.Nombre)
                .ToListAsync();

            ViewBag.IdVehiculo = new SelectList(
                vehiculos, "IdVehiculo", "Nombre", idVehiculo);

            ViewBag.IdTipoCosto = new SelectList(
                tipos, "IdTipoCosto", "Nombre", idTipoCosto);
        }

        // FORMULARIO DE REGISTRO
        public async Task<IActionResult> Create()
        {
            await CargarListas();

            return View(new CostoVehiculo
            {
                FechaCosto = DateTime.Today,
                Moneda = "USD",
                TasaCambio = 1,
                Activo = true
            });
        }

        // GUARDAR COSTO
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Create(CostoVehiculo costo)
        {
            ValidarCosto(costo);

            if (!ModelState.IsValid)
            {
                await CargarListas(
                    costo.IdVehiculo, costo.IdTipoCosto);

                return View(costo);
            }

            bool vehiculoValido = await _context.Vehiculos
                .AnyAsync(v => v.IdVehiculo == costo.IdVehiculo
                            && v.Activo);

            bool tipoValido = await _context.TiposCosto
                .AnyAsync(t => t.IdTipoCosto == costo.IdTipoCosto
                            && t.Activo);

            if (!vehiculoValido || !tipoValido)
            {
                ModelState.AddModelError(
                    "", "Seleccione un vehículo y tipo de costo activos.");

                await CargarListas(
                    costo.IdVehiculo, costo.IdTipoCosto);

                return View(costo);
            }

            CalcularMontoNIO(costo);

            costo.FechaCosto = costo.FechaCosto.Date;
            costo.Descripcion = costo.Descripcion.Trim();
            costo.NumeroDocumento = LimpiarTexto(costo.NumeroDocumento);
            costo.Observaciones = LimpiarTexto(costo.Observaciones);
            costo.Activo = true;

            _context.CostosVehiculo.Add(costo);
            await _context.SaveChangesAsync();

            return RedirectToAction(nameof(Index));
        }

        // MOSTRAR EDICION
        public async Task<IActionResult> Edit(int? id)
        {
            if (id == null)
                return NotFound();

            var costo = await _context.CostosVehiculo
                .FirstOrDefaultAsync(c => c.IdCosto == id);

            if (costo == null)
                return NotFound();

            await CargarListas(costo.IdVehiculo, costo.IdTipoCosto);

            return View(costo);
        }

        // GUARDAR EDICION
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Edit(int id, CostoVehiculo datos)
        {
            if (id != datos.IdCosto)
                return NotFound();

            ValidarCosto(datos);

            if (!ModelState.IsValid)
            {
                await CargarListas(
                    datos.IdVehiculo, datos.IdTipoCosto);

                return View(datos);
            }

            bool vehiculoValido = await _context.Vehiculos
                .AnyAsync(v => v.IdVehiculo == datos.IdVehiculo
                            && v.Activo);

            bool tipoValido = await _context.TiposCosto
                .AnyAsync(t => t.IdTipoCosto == datos.IdTipoCosto
                            && t.Activo);

            if (!vehiculoValido || !tipoValido)
            {
                ModelState.AddModelError(
                    "", "Seleccione un vehículo y tipo de costo activos.");

                await CargarListas(
                    datos.IdVehiculo, datos.IdTipoCosto);

                return View(datos);
            }

            var costo = await _context.CostosVehiculo
                .FirstOrDefaultAsync(c => c.IdCosto == id);

            if (costo == null)
                return NotFound();

            CalcularMontoNIO(datos);

            costo.IdVehiculo = datos.IdVehiculo;
            costo.IdTipoCosto = datos.IdTipoCosto;
            costo.Descripcion = datos.Descripcion.Trim();
            costo.FechaCosto = datos.FechaCosto.Date;
            costo.Monto = datos.Monto;
            costo.Moneda = datos.Moneda;
            costo.TasaCambio = datos.TasaCambio;
            costo.MontoNIO = datos.MontoNIO;
            costo.NumeroDocumento = LimpiarTexto(datos.NumeroDocumento);
            costo.Observaciones = LimpiarTexto(datos.Observaciones);

            await _context.SaveChangesAsync();

            return RedirectToAction(nameof(Index));
        }

        // ACTIVAR / DESACTIVAR COSTO
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> CambiarEstado(int id)
        {
            var costo = await _context.CostosVehiculo
                .FirstOrDefaultAsync(c => c.IdCosto == id);

            if (costo == null)
                return NotFound();

            costo.Activo = !costo.Activo;

            await _context.SaveChangesAsync();

            return RedirectToAction(nameof(Index));
        }

        // VALIDACIONES
        private void ValidarCosto(CostoVehiculo costo)
        {
            if (string.IsNullOrWhiteSpace(costo.Descripcion))
                ModelState.AddModelError(
                    "Descripcion", "La descripción es obligatoria.");

            if (costo.FechaCosto == default || costo.FechaCosto.Date > DateTime.Today)
                ModelState.AddModelError(nameof(costo.FechaCosto), "Ingresá una fecha válida hasta hoy.");

            const decimal maximoImporte = 9999999999999999.99m;
            if (costo.Monto > maximoImporte || decimal.Round(costo.Monto, 2) != costo.Monto)
                ModelState.AddModelError(nameof(costo.Monto), "El importe supera el límite o tiene más de dos decimales.");
            if (costo.Moneda == "USD" && costo.TasaCambio > 0 &&
                (costo.TasaCambio > 999999999999.999999m || decimal.Round(costo.TasaCambio, 6) != costo.TasaCambio ||
                 (costo.TasaCambio >= 1 && costo.Monto > maximoImporte / costo.TasaCambio)))
                ModelState.AddModelError(nameof(costo.TasaCambio), "Revisá la precisión de la tasa y el total convertido.");

            if (costo.Monto <= 0)
                ModelState.AddModelError(
                    "Monto", "El monto debe ser mayor que cero.");

            if (costo.TasaCambio <= 0)
                ModelState.AddModelError(
                    "TasaCambio", "La tasa debe ser mayor que cero.");

            if (costo.Moneda != "USD" && costo.Moneda != "NIO")
                ModelState.AddModelError(
                    "Moneda", "Seleccione USD o NIO.");

            if (costo.Moneda == "NIO")
                costo.TasaCambio = 1;
        }

        // CONVERSION A CORDOBAS
        private void CalcularMontoNIO(CostoVehiculo costo)
        {
            costo.MontoNIO = costo.Moneda == "USD"
                ? Math.Round(
                    costo.Monto * costo.TasaCambio,
                    2,
                    MidpointRounding.AwayFromZero)
                : costo.Monto;
        }

        private string? LimpiarTexto(string? texto)
        {
            return string.IsNullOrWhiteSpace(texto)
                ? null
                : texto.Trim();
        }
    }
}

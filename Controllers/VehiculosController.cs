using NiCar.Data;
using NiCar.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
namespace NiCar.Controllers
{
    [Authorize(Roles = "SuperAdministrador,Administrador,Vendedor,Bodega")]
    public class VehiculosController : Controller
    {
        private readonly NiCarContext _context;

        public VehiculosController(NiCarContext context)
        {
            _context = context;
        }
        // LISTAR VEHICULOS
        [AllowAnonymous]
        public async Task<IActionResult> Details(int? id)
        {
            if (id == null) return NotFound();
            var vehicle = await _context.Vehiculos.AsNoTracking()
                .Include(v => v.Modelo).ThenInclude(m => m!.Marca)
                .FirstOrDefaultAsync(v => v.IdVehiculo == id && v.Activo && v.Estado == "Disponible" && v.Modelo!.Activo && v.Modelo.Marca!.Activo);
            return vehicle == null ? NotFound() : View(vehicle);
        }

        public async Task<IActionResult> Index()
        {
            var vehiculos = await _context.Vehiculos
                .Include(v => v.Modelo)
                    .ThenInclude(m => m!.Marca)
                .AsNoTracking()
                .OrderByDescending(v => v.FechaRegistro)
                .ToListAsync();

            return View(vehiculos);
        }

        // ==========================================
        // CARGAR MODELOS ACTIVOS
        // ==========================================

        private async Task CargarModelos(int? idModelo = null)
        {
            var modelos = await _context.Modelos
                .Include(m => m.Marca)
                .Where(m => m.Activo && m.Marca != null && m.Marca.Activo)
                .OrderBy(m => m.Marca!.Nombre)
                .ThenBy(m => m.Nombre)
                .Select(m => new
                {
                    m.IdModelo,
                    NombreCompleto = m.Marca!.Nombre + " - " + m.Nombre
                })
                .ToListAsync();

            ViewBag.IdModelo = new SelectList(
                modelos,
                "IdModelo",
                "NombreCompleto",
                idModelo
            );
        }
        // REGISTRAR VEHICULO
        [Authorize(Roles = "SuperAdministrador,Administrador")]
        public async Task<IActionResult> Create()
        {
            await CargarModelos();

            return View();
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        [Authorize(Roles = "SuperAdministrador,Administrador")]
        public async Task<IActionResult> Create(Vehiculo vehiculo)
        {
            if (!ModelState.IsValid)
            {
                await CargarModelos(vehiculo.IdModelo);
                return View(vehiculo);
            }

            bool modeloValido = await _context.Modelos
                .AnyAsync(m =>
                    m.IdModelo == vehiculo.IdModelo &&
                    m.Activo &&
                    m.Marca != null &&
                    m.Marca.Activo
                );

            if (!modeloValido)
            {
                ModelState.AddModelError(
                    "IdModelo",
                    "Seleccione un modelo de una marca activa."
                );

                await CargarModelos(vehiculo.IdModelo);
                return View(vehiculo);
            }

            if (await IdentificadorDuplicado(vehiculo))
            {
                ModelState.AddModelError(
                    "IdentificadorUnico",
                    "Este identificador interno ya está registrado."
                );

                await CargarModelos(vehiculo.IdModelo);
                return View(vehiculo);
            }

            if (await VINDuplicado(vehiculo.VIN))
            {
                ModelState.AddModelError(
                    "VIN",
                    "Este VIN ya está registrado."
                );

                await CargarModelos(vehiculo.IdModelo);
                return View(vehiculo);
            }

            if (await ChasisDuplicado(vehiculo.NumeroChasis))
            {
                ModelState.AddModelError(
                    "NumeroChasis",
                    "Este número de chasis ya está registrado."
                );

                await CargarModelos(vehiculo.IdModelo);
                return View(vehiculo);
            }

            if (!string.IsNullOrWhiteSpace(vehiculo.Placa) &&
                await PlacaDuplicada(vehiculo.Placa))
            {
                ModelState.AddModelError(
                    "Placa",
                    "Esta placa ya está registrada."
                );

                await CargarModelos(vehiculo.IdModelo);
                return View(vehiculo);
            }

            vehiculo.IdentificadorUnico =
                vehiculo.IdentificadorUnico.Trim();

            vehiculo.VIN = Normalizar(vehiculo.VIN);
            vehiculo.NumeroChasis = Normalizar(vehiculo.NumeroChasis);
            vehiculo.Placa = Normalizar(vehiculo.Placa);

            vehiculo.EstadoMatricula =
                string.IsNullOrWhiteSpace(vehiculo.Placa)
                ? "Pendiente"
                : "Matriculado";

            vehiculo.Estado = "Disponible";
            vehiculo.Activo = true;
            vehiculo.FechaRegistro = DateTime.Now;

            _context.Vehiculos.Add(vehiculo);

            await _context.SaveChangesAsync();

            return RedirectToAction(nameof(Index));
        }
        // EDITAR VEHICULO
        [Authorize(Roles = "SuperAdministrador,Administrador")]
        public async Task<IActionResult> Edit(int? id)
        {
            if (id == null)
                return NotFound();

            var vehiculo = await _context.Vehiculos.FindAsync(id);

            if (vehiculo == null)
                return NotFound();

            await CargarModelos(vehiculo.IdModelo);

            return View(vehiculo);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        [Authorize(Roles = "SuperAdministrador,Administrador")]
        public async Task<IActionResult> Edit(int id, Vehiculo vehiculo)
        {
            if (id != vehiculo.IdVehiculo)
                return NotFound();

            if (!ModelState.IsValid)
            {
                await CargarModelos(vehiculo.IdModelo);
                return View(vehiculo);
            }

            var existente = await _context.Vehiculos.FindAsync(id);

            if (existente == null)
                return NotFound();

            bool modeloValido = await _context.Modelos
                .AnyAsync(m =>
                    m.IdModelo == vehiculo.IdModelo &&
                    m.Activo &&
                    m.Marca != null &&
                    m.Marca.Activo
                );

            if (!modeloValido)
            {
                ModelState.AddModelError(
                    "IdModelo",
                    "Seleccione un modelo de una marca activa."
                );

                await CargarModelos(vehiculo.IdModelo);
                return View(vehiculo);
            }

            if (await IdentificadorDuplicado(vehiculo, id))
            {
                ModelState.AddModelError(
                    "IdentificadorUnico",
                    "Este identificador interno ya está registrado."
                );

                await CargarModelos(vehiculo.IdModelo);
                return View(vehiculo);
            }

            if (await VINDuplicado(vehiculo.VIN, id))
            {
                ModelState.AddModelError(
                    "VIN",
                    "Este VIN ya pertenece a otro vehículo."
                );

                await CargarModelos(vehiculo.IdModelo);
                return View(vehiculo);
            }

            if (await ChasisDuplicado(vehiculo.NumeroChasis, id))
            {
                ModelState.AddModelError(
                    "NumeroChasis",
                    "Este número de chasis ya pertenece a otro vehículo."
                );

                await CargarModelos(vehiculo.IdModelo);
                return View(vehiculo);
            }

            if (!string.IsNullOrWhiteSpace(vehiculo.Placa) &&
                await PlacaDuplicada(vehiculo.Placa, id))
            {
                ModelState.AddModelError(
                    "Placa",
                    "Esta placa ya pertenece a otro vehículo."
                );

                await CargarModelos(vehiculo.IdModelo);
                return View(vehiculo);
            }

            existente.IdModelo = vehiculo.IdModelo;
            existente.IdentificadorUnico =
                vehiculo.IdentificadorUnico.Trim();

            existente.VIN = Normalizar(vehiculo.VIN);
            existente.NumeroChasis = Normalizar(vehiculo.NumeroChasis);
            existente.Placa = Normalizar(vehiculo.Placa);

            existente.EstadoMatricula =
                string.IsNullOrWhiteSpace(existente.Placa)
                ? "Pendiente"
                : "Matriculado";

            existente.Anio = vehiculo.Anio;
            existente.Version = vehiculo.Version;
            existente.ColorExterior = vehiculo.ColorExterior;
            existente.ColorInterior = vehiculo.ColorInterior;
            existente.Transmision = vehiculo.Transmision;
            existente.Traccion = vehiculo.Traccion;
            existente.Combustible = vehiculo.Combustible;
            existente.Kilometraje = vehiculo.Kilometraje;
            existente.TipoCarroceria = vehiculo.TipoCarroceria;
            existente.Observaciones = vehiculo.Observaciones;
            existente.PrecioOferta = vehiculo.PrecioOferta;
            existente.ImagenUrl = string.IsNullOrWhiteSpace(vehiculo.ImagenUrl) ? null : vehiculo.ImagenUrl.Trim();
            existente.Ubicacion = string.IsNullOrWhiteSpace(vehiculo.Ubicacion) ? null : vehiculo.Ubicacion.Trim();

            await _context.SaveChangesAsync();

            return RedirectToAction(nameof(Index));
        }
        // CAMBIAR ESTADO ACTIVO
        [HttpPost]
        [ValidateAntiForgeryToken]
        [Authorize(Roles = "SuperAdministrador,Administrador")]
        public async Task<IActionResult> CambiarEstado(int id)
        {
            var vehiculo = await _context.Vehiculos.FindAsync(id);

            if (vehiculo == null)
                return NotFound();

            vehiculo.Activo = !vehiculo.Activo;

            await _context.SaveChangesAsync();

            return RedirectToAction(nameof(Index));
        }
        // VALIDACIONES DE DUPLICADOS
        private async Task<bool> IdentificadorDuplicado(
            Vehiculo vehiculo, int? id = null)
        {
            string valor = vehiculo.IdentificadorUnico.Trim();

            return await _context.Vehiculos.AnyAsync(v =>
                v.IdentificadorUnico == valor &&
                v.IdVehiculo != id
            );
        }

        private async Task<bool> VINDuplicado(
            string? vin, int? id = null)
        {
            if (string.IsNullOrWhiteSpace(vin))
                return false;

            string valor = vin.Trim();

            return await _context.Vehiculos.AnyAsync(v =>
                v.VIN == valor &&
                v.IdVehiculo != id
            );
        }

        private async Task<bool> ChasisDuplicado(
            string? chasis, int? id = null)
        {
            if (string.IsNullOrWhiteSpace(chasis))
                return false;

            string valor = chasis.Trim();

            return await _context.Vehiculos.AnyAsync(v =>
                v.NumeroChasis == valor &&
                v.IdVehiculo != id
            );
        }

        private async Task<bool> PlacaDuplicada(
            string? placa, int? id = null)
        {
            if (string.IsNullOrWhiteSpace(placa))
                return false;

            string valor = placa.Trim();

            return await _context.Vehiculos.AnyAsync(v =>
                v.Placa == valor &&
                v.IdVehiculo != id
            );
        }
        private static string? Normalizar(string? valor)
        {
            return string.IsNullOrWhiteSpace(valor)
                ? null
                : valor.Trim().ToUpperInvariant();
        }
    }
}

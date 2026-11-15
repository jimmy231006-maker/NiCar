
using Microsoft.AspNetCore.Authorization;
using NiCar.Data;
using NiCar.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;

namespace NiCar.Controllers
{
    [Authorize(Roles = "SuperAdministrador,Administrador")]
    public class ModelosController : Controller
    {
        private readonly NiCarContext _context;

        public ModelosController(NiCarContext context)
        {
            _context = context;
        }

        // LISTAR MODELOS
        public async Task<IActionResult> Index()
        {
            var modelos = await _context.Modelos
                .Include(m => m.Marca)
                .AsNoTracking()
                .OrderBy(m => m.Marca.Nombre)
                .ThenBy(m => m.Nombre)
                .ToListAsync();

            return View(modelos);
        }

        // CARGAR MARCAS EN LISTA DESPLEGABLE
        private async Task CargarMarcas()
        {
            var marcas = await _context.Marcas
                .Where(m => m.Activo)
                .OrderBy(m => m.Nombre)
                .ToListAsync();

            ViewBag.IdMarca = new SelectList(
                marcas,
                "IdMarca",
                "Nombre"
            );
        }

        // FORMULARIO DE REGISTRO
        public async Task<IActionResult> Create()
        {
            await CargarMarcas();
            return View();
        }

        // GUARDAR MODELO
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Create(Modelo modelo)
        {
            modelo.Nombre = modelo.Nombre?.Trim() ?? "";
            if (!ModelState.IsValid)
            {
                await CargarMarcas();
                return View(modelo);
            }

            bool existe = await _context.Modelos.AnyAsync(m =>
                m.IdMarca == modelo.IdMarca &&
                m.Nombre.ToLower() == modelo.Nombre.ToLower()
            );

            if (existe)
            {
                ModelState.AddModelError(
                    "Nombre",
                    "Este modelo ya está registrado para la marca seleccionada."
                );

                await CargarMarcas();
                return View(modelo);
            }

            bool marcaValida = await _context.Marcas.AnyAsync(m =>
                m.IdMarca == modelo.IdMarca && m.Activo
            );

            if (!marcaValida)
            {
                ModelState.AddModelError(
                    "IdMarca",
                    "Seleccione una marca activa."
                );

                await CargarMarcas();
                return View(modelo);
            }

            modelo.Activo = true;

            _context.Modelos.Add(modelo);
            try { await _context.SaveChangesAsync(); }
            catch (DbUpdateException ex) when (ex.InnerException is Npgsql.PostgresException { SqlState: "23505" })
            {
                ModelState.AddModelError("Nombre", "Ese nombre ya está registrado.");
                await CargarMarcas();
                return View(modelo);
            }

            return RedirectToAction(nameof(Index));
        }

        // FORMULARIO DE EDICIÓN
        public async Task<IActionResult> Edit(int? id)
        {
            if (id == null)
                return NotFound();

            var modelo = await _context.Modelos.FindAsync(id);

            if (modelo == null)
                return NotFound();

            await CargarMarcas();

            return View(modelo);
        }

        // ACTUALIZAR MODELO
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Edit(int id, Modelo modelo)
        {
            if (id != modelo.IdModelo)
                return NotFound();

            modelo.Nombre = modelo.Nombre?.Trim() ?? "";
            if (!ModelState.IsValid)
            {
                await CargarMarcas();
                return View(modelo);
            }

            bool existe = await _context.Modelos.AnyAsync(m =>
                m.IdMarca == modelo.IdMarca &&
                m.Nombre.ToLower() == modelo.Nombre.ToLower() &&
                m.IdModelo != id
            );

            if (existe)
            {
                ModelState.AddModelError(
                    "Nombre",
                    "Este modelo ya existe para la marca seleccionada."
                );

                await CargarMarcas();
                return View(modelo);
            }

            bool marcaValida = await _context.Marcas.AnyAsync(m =>
                m.IdMarca == modelo.IdMarca && m.Activo
            );

            if (!marcaValida)
            {
                ModelState.AddModelError(
                    "IdMarca",
                    "Seleccione una marca activa."
                );

                await CargarMarcas();
                return View(modelo);
            }

            var modeloExistente = await _context.Modelos.FindAsync(id);

            if (modeloExistente == null)
                return NotFound();

            modeloExistente.Nombre = modelo.Nombre;
            modeloExistente.IdMarca = modelo.IdMarca;

            try { await _context.SaveChangesAsync(); }
            catch (DbUpdateException ex) when (ex.InnerException is Npgsql.PostgresException { SqlState: "23505" })
            {
                ModelState.AddModelError("Nombre", "Ese nombre ya está registrado.");
                await CargarMarcas();
                return View(modelo);
            }

            return RedirectToAction(nameof(Index));
        }

        // ACTIVAR / DESACTIVAR
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> CambiarEstado(int id)
        {
            var modelo = await _context.Modelos.FindAsync(id);

            if (modelo == null)
                return NotFound();

            modelo.Activo = !modelo.Activo;

            await _context.SaveChangesAsync();

            return RedirectToAction(nameof(Index));
        }
    }
}


using Microsoft.AspNetCore.Authorization;
using NiCar.Data;
using NiCar.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace NiCar.Controllers
{
    [Authorize(Roles = "SuperAdministrador,Administrador")]
    public class MarcasController : Controller
    {
        private readonly NiCarContext _context;

        public MarcasController(NiCarContext context)
        {
            _context = context;
        }

        // LISTAR
        public async Task<IActionResult> Index()
        {
            var marcas = await _context.Marcas
                .AsNoTracking()
                .OrderBy(m => m.Nombre)
                .ToListAsync();

            return View(marcas);
        }

        // MOSTRAR FORMULARIO DE REGISTRO
        public IActionResult Create()
        {
            return View();
        }

        // GUARDAR NUEVA MARCA
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Create(Marca marca)
        {
            marca.Nombre = marca.Nombre?.Trim() ?? "";
            if (!ModelState.IsValid)
                return View(marca);

            bool existe = await _context.Marcas
                .AnyAsync(m => m.Nombre.ToLower() == marca.Nombre.ToLower());

            if (existe)
            {
                ModelState.AddModelError(
                    "Nombre",
                    "Esta marca ya se encuentra registrada."
                );

                return View(marca);
            }

            marca.Activo = true;

            _context.Marcas.Add(marca);
            try { await _context.SaveChangesAsync(); }
            catch (DbUpdateException ex) when (ex.InnerException is Npgsql.PostgresException { SqlState: "23505" })
            {
                ModelState.AddModelError("Nombre", "Ese nombre ya está registrado.");
                return View(marca);
            }

            return RedirectToAction(nameof(Index));
        }

        // MOSTRAR FORMULARIO DE EDICIÓN
        public async Task<IActionResult> Edit(int? id)
        {
            if (id == null)
                return NotFound();

            var marca = await _context.Marcas.FindAsync(id);

            if (marca == null)
                return NotFound();

            return View(marca);
        }

        // GUARDAR CAMBIOS
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Edit(int id, Marca marca)
        {
            if (id != marca.IdMarca)
                return NotFound();

            marca.Nombre = marca.Nombre?.Trim() ?? "";
            if (!ModelState.IsValid)
                return View(marca);

            bool existe = await _context.Marcas.AnyAsync(m =>
                m.Nombre.ToLower() == marca.Nombre.ToLower() &&
                m.IdMarca != id
            );

            if (existe)
            {
                ModelState.AddModelError(
                    "Nombre",
                    "Otra marca ya utiliza este nombre."
                );

                return View(marca);
            }

            _context.Update(marca);
            try { await _context.SaveChangesAsync(); }
            catch (DbUpdateException ex) when (ex.InnerException is Npgsql.PostgresException { SqlState: "23505" })
            {
                ModelState.AddModelError("Nombre", "Ese nombre ya está registrado.");
                return View(marca);
            }

            return RedirectToAction(nameof(Index));
        }

        // ACTIVAR / DESACTIVAR
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> CambiarEstado(int id)
        {
            var marca = await _context.Marcas.FindAsync(id);

            if (marca == null)
                return NotFound();

            marca.Activo = !marca.Activo;

            await _context.SaveChangesAsync();

            return RedirectToAction(nameof(Index));
        }
    }
}

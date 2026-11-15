
using Microsoft.AspNetCore.Authorization;
using NiCar.Data;
using NiCar.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace NiCar.Controllers
{
    [Authorize(Roles = "SuperAdministrador,Administrador")]
    public class TipoCostosController : Controller
    {
        private readonly NiCarContext _context;

        public TipoCostosController(NiCarContext context)
        {
            _context = context;
        }

        // LISTAR TIPOS DE COSTOS
        public async Task<IActionResult> Index()
        {
            var tipos = await _context.TiposCosto
                .AsNoTracking()
                .OrderBy(t => t.Nombre)
                .ToListAsync();

            return View(tipos);
        }

        // FORMULARIO DE REGISTRO
        public IActionResult Create()
        {
            return View();
        }

        // GUARDAR TIPO DE COSTO
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Create(TipoCosto tipo)
        {
            if (string.IsNullOrWhiteSpace(tipo.Nombre))
            {
                ModelState.AddModelError(
                    "Nombre", "El nombre es obligatorio.");
            }

            string nombre = tipo.Nombre.Trim();

            bool duplicado = await _context.TiposCosto
                .AnyAsync(t => t.Nombre.ToLower() == nombre.ToLower());

            if (duplicado)
            {
                ModelState.AddModelError(
                    "Nombre", "Ya existe un tipo de costo con ese nombre.");
            }

            if (!ModelState.IsValid)
                return View(tipo);

            tipo.Nombre = nombre;
            tipo.Descripcion = string.IsNullOrWhiteSpace(tipo.Descripcion)
                ? null
                : tipo.Descripcion.Trim();

            tipo.Activo = true;

            _context.TiposCosto.Add(tipo);
            await _context.SaveChangesAsync();

            return RedirectToAction(nameof(Index));
        }

        // FORMULARIO DE EDICION
        public async Task<IActionResult> Edit(int? id)
        {
            if (id == null)
                return NotFound();

            var tipo = await _context.TiposCosto
                .FirstOrDefaultAsync(t => t.IdTipoCosto == id);

            if (tipo == null)
                return NotFound();

            return View(tipo);
        }

        // GUARDAR EDICION
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Edit(
            int id, TipoCosto datos)
        {
            if (id != datos.IdTipoCosto)
                return NotFound();

            if (string.IsNullOrWhiteSpace(datos.Nombre))
            {
                ModelState.AddModelError(
                    "Nombre", "El nombre es obligatorio.");
            }

            string nombre = datos.Nombre.Trim();

            bool duplicado = await _context.TiposCosto
                .AnyAsync(t => t.IdTipoCosto != id &&
                    t.Nombre.ToLower() == nombre.ToLower());

            if (duplicado)
            {
                ModelState.AddModelError(
                    "Nombre", "Ya existe otro tipo de costo con ese nombre.");
            }

            if (!ModelState.IsValid)
                return View(datos);

            var tipo = await _context.TiposCosto
                .FirstOrDefaultAsync(t => t.IdTipoCosto == id);

            if (tipo == null)
                return NotFound();

            tipo.Nombre = nombre;
            tipo.Descripcion = string.IsNullOrWhiteSpace(datos.Descripcion)
                ? null
                : datos.Descripcion.Trim();

            await _context.SaveChangesAsync();

            return RedirectToAction(nameof(Index));
        }

        // ACTIVAR / DESACTIVAR
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> CambiarEstado(int id)
        {
            var tipo = await _context.TiposCosto
                .FirstOrDefaultAsync(t => t.IdTipoCosto == id);

            if (tipo == null)
                return NotFound();

            tipo.Activo = !tipo.Activo;

            await _context.SaveChangesAsync();

            return RedirectToAction(nameof(Index));
        }
    }
}

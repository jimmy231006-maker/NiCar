using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NiCar.Data;
using NiCar.Models;
using NiCar.Services;

namespace NiCar.Controllers;

[Authorize]
public class UsuariosController : Controller
{
    private readonly NiCarContext _db;
    public UsuariosController(NiCarContext db) => _db = db;

    [Authorize(Roles = "SuperAdministrador,Administrador")]
    public async Task<IActionResult> Index()
    {
        const string baseSql = "SELECT \"IdUsuario\", \"NombreUsuario\", \"NombreCompleto\", \"Rol\", \"Activo\", " +
            "\"IntentosFallidos\", \"BloqueadoHasta\", \"FechaCreacion\" FROM nicar.\"Usuario\" ";
        var sql = User.IsInRole("SuperAdministrador")
            ? baseSql + "ORDER BY \"NombreCompleto\""
            : baseSql + "WHERE \"Rol\" IN ('Vendedor','Bodega','Recepcionista') ORDER BY \"NombreCompleto\"";
        return View(await _db.Database.SqlQueryRaw<UsuarioListaFila>(sql).ToListAsync());
    }

    [HttpGet]
    [Authorize(Roles = "SuperAdministrador,Administrador")]
    public IActionResult Create()
    {
        var vm = new UsuarioCrearViewModel();
        CargarRoles(vm);
        return View(vm);
    }

    [HttpPost, ValidateAntiForgeryToken]
    [Authorize(Roles = "SuperAdministrador,Administrador")]
    public async Task<IActionResult> Create(UsuarioCrearViewModel vm)
    {
        vm.NombreCompleto = vm.NombreCompleto?.Trim() ?? "";
        vm.Correo = vm.Correo?.Trim().ToLowerInvariant() ?? "";
        var rolesPermitidos = User.IsInRole("SuperAdministrador")
            ? new[] { "Administrador", "Vendedor", "Bodega", "Recepcionista" }
            : new[] { "Vendedor", "Bodega", "Recepcionista" };

        if (!rolesPermitidos.Contains(vm.Rol, StringComparer.Ordinal))
            ModelState.AddModelError(nameof(vm.Rol), "No tiene permiso para asignar ese rol.");

        if (ModelState.IsValid)
        {
            var existe = await _db.Database.SqlQueryRaw<int>(
                "SELECT COUNT(1)::integer AS \"Value\" FROM nicar.\"Usuario\" WHERE \"NombreUsuario\" = {0}",
                vm.Correo).SingleAsync();

            if (existe > 0)
                ModelState.AddModelError(nameof(vm.Correo), "Ya existe una cuenta con ese correo.");
        }

        if (!ModelState.IsValid)
        {
            CargarRoles(vm);
            return View(vm);
        }

        var credencial = VerificadorContrasena.Crear(vm.Contrasena);
        await _db.Database.ExecuteSqlRawAsync(
            "INSERT INTO nicar.\"Usuario\" " +
            "(\"NombreUsuario\", \"NombreCompleto\", \"HashContrasena\", \"Salt\", \"Rol\", \"Activo\", " +
            "\"IntentosFallidos\", \"DebeCambiarContrasena\", \"FechaCreacion\") " +
            "VALUES ({0}, {1}, {2}, {3}, {4}, true, 0, true, LOCALTIMESTAMP)",
            vm.Correo, vm.NombreCompleto, credencial.Hash, credencial.Salt, vm.Rol);

        TempData["Mensaje"] = $"Cuenta creada para {vm.NombreCompleto}. La persona deberá cambiar la contraseña al ingresar.";
        return RedirectToAction(nameof(Index));
    }

    [HttpPost, ValidateAntiForgeryToken]
    [Authorize(Roles = "SuperAdministrador,Administrador")]
    public async Task<IActionResult> CambiarEstado(int id)
    {
        var target = await _db.Database.SqlQueryRaw<UsuarioListaFila>(
            "SELECT \"IdUsuario\", \"NombreUsuario\", \"NombreCompleto\", \"Rol\", \"Activo\", " +
            "\"IntentosFallidos\", \"BloqueadoHasta\", \"FechaCreacion\" " +
            "FROM nicar.\"Usuario\" WHERE \"IdUsuario\" = {0}", id).FirstOrDefaultAsync();

        if (target == null) return NotFound();
        if (string.Equals(target.NombreUsuario, User.FindFirstValue(ClaimTypes.Email), StringComparison.OrdinalIgnoreCase))
        {
            TempData["Error"] = "No puede desactivar su propia cuenta.";
            return RedirectToAction(nameof(Index));
        }
        if (!User.IsInRole("SuperAdministrador") && target.Rol is "Administrador" or "SuperAdministrador")
            return Forbid();

        await _db.Database.ExecuteSqlRawAsync(
            "UPDATE nicar.\"Usuario\" SET \"Activo\" = NOT \"Activo\" " +
            "WHERE \"IdUsuario\" = {0}", id);
        TempData["Mensaje"] = target.Activo ? "Cuenta desactivada." : "Cuenta reactivada.";
        return RedirectToAction(nameof(Index));
    }

    [HttpGet]
    public IActionResult CambiarContrasena() => View(new CambiarContrasenaViewModel());

    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> CambiarContrasena(CambiarContrasenaViewModel vm)
    {
        int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id);
        var usuario = await _db.Database.SqlQueryRaw<UsuarioLogin>(
            "SELECT \"IdUsuario\", \"NombreUsuario\", \"NombreCompleto\", \"HashContrasena\", \"Salt\", \"Rol\", \"Activo\", " +
            "\"IntentosFallidos\", \"BloqueadoHasta\", \"DebeCambiarContrasena\" " +
            "FROM nicar.\"Usuario\" WHERE \"IdUsuario\" = {0}", id).FirstOrDefaultAsync();

        if (usuario == null) return Challenge();
        if (!VerificadorContrasena.Verificar(vm.ContrasenaActual, usuario.Salt, usuario.HashContrasena))
            ModelState.AddModelError(nameof(vm.ContrasenaActual), "La contraseña actual no es correcta.");

        if (!ModelState.IsValid)
            return View(vm);

        var credencial = VerificadorContrasena.Crear(vm.ContrasenaNueva);
        await _db.Database.ExecuteSqlRawAsync(
            "UPDATE nicar.\"Usuario\" SET \"HashContrasena\" = {0}, \"Salt\" = {1}, \"DebeCambiarContrasena\" = false " +
            "WHERE \"IdUsuario\" = {2}", credencial.Hash, credencial.Salt, id);

        var claims = User.Claims.Where(c => c.Type != "NiCar.DebeCambiarContrasena").ToList();
        claims.Add(new Claim("NiCar.DebeCambiarContrasena", "false"));
        var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
        await HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme,
            new ClaimsPrincipal(identity));

        TempData["Mensaje"] = "Contraseña actualizada correctamente.";
        return RedirectToAction("Index", "Home");
    }

    private void CargarRoles(UsuarioCrearViewModel vm)
    {
        var roles = User.IsInRole("SuperAdministrador")
            ? new[] { "Administrador", "Vendedor", "Bodega", "Recepcionista" }
            : new[] { "Vendedor", "Bodega", "Recepcionista" };
        vm.Roles = roles.Select(rol => new Microsoft.AspNetCore.Mvc.Rendering.SelectListItem(rol, rol));
    }
}

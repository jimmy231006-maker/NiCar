using System.Security.Claims;
using NiCar.Data;
using NiCar.Services;
using NiCar.Validation;
using NiCar.Models;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;

namespace NiCar.Controllers;

public class AccesoController : Controller
{
    private readonly NiCarContext _db;
    public AccesoController(NiCarContext db) => _db = db;

    [AllowAnonymous]
    [HttpGet]
    public IActionResult Login(string? returnUrl = null)
    {
        ViewBag.ReturnUrl = returnUrl;
        return View();
    }

    [AllowAnonymous]
    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Login(string nombreUsuario, string contrasena,
        string? returnUrl = null)
    {
        ViewBag.ReturnUrl = returnUrl;
        if (string.IsNullOrWhiteSpace(nombreUsuario) ||
            string.IsNullOrWhiteSpace(contrasena))
        {
            ModelState.AddModelError("", "Ingrese usuario y contraseña.");
            return View();
        }

        await using var tx = await _db.Database.BeginTransactionAsync();
        var usuario = await _db.Database
            .SqlQueryRaw<UsuarioLogin>(
                "SELECT \"IdUsuario\", \"NombreUsuario\", \"NombreCompleto\", \"HashContrasena\", \"Salt\", \"Rol\", \"Activo\", " +
                "\"IntentosFallidos\", \"BloqueadoHasta\", \"DebeCambiarContrasena\" " +
                "FROM nicar.\"Usuario\" WHERE \"NombreUsuario\" = {0} FOR UPDATE",
                nombreUsuario.Trim().ToLowerInvariant())
            .FirstOrDefaultAsync();

        var bloqueado = usuario?.BloqueadoHasta > DateTime.UtcNow;
        if (usuario == null || !usuario.Activo || bloqueado ||
            !VerificadorContrasena.Verificar(contrasena, usuario.Salt, usuario.HashContrasena))
        {
            if (usuario is { Activo: true } && !bloqueado)
            {
                var intentos = usuario.BloqueadoHasta.HasValue ? 1 : usuario.IntentosFallidos + 1;
                await _db.Database.ExecuteSqlInterpolatedAsync($"""
                    UPDATE nicar."Usuario" SET "IntentosFallidos"={intentos},
                        "BloqueadoHasta"=CASE WHEN {intentos} >= 5 THEN
                            (clock_timestamp() AT TIME ZONE 'UTC') + interval '15 minutes' END
                    WHERE "IdUsuario"={usuario.IdUsuario}
                    """);
            }
            await RegistrarIntentoFallido(nombreUsuario.Trim());
            await tx.CommitAsync();
            ModelState.AddModelError("", "Acceso denegado. Revisá tus datos o intentá más tarde.");
            return View();
        }

        await _db.Database.ExecuteSqlInterpolatedAsync($"""
            UPDATE nicar."Usuario" SET "IntentosFallidos"=0, "BloqueadoHasta"=NULL
            WHERE "IdUsuario"={usuario.IdUsuario}
            """);
        await RegistrarEvento(usuario.IdUsuario, "Inicio de sesión", usuario.NombreUsuario);
        await tx.CommitAsync();

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, usuario.IdUsuario.ToString()),
            new(ClaimTypes.Name, usuario.NombreCompleto),
            new(ClaimTypes.Email, usuario.NombreUsuario),
            new(ClaimTypes.Role, usuario.Rol),
            new("NiCar.DebeCambiarContrasena", usuario.DebeCambiarContrasena ? "true" : "false")
        };
        var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
        await HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme,
            new ClaimsPrincipal(identity));


        if (usuario.DebeCambiarContrasena)
            return RedirectToAction("CambiarContrasena", "Usuarios");
        if (!string.IsNullOrWhiteSpace(returnUrl) && Url.IsLocalUrl(returnUrl))
            return Redirect(returnUrl);
        return RedirectToAction("Index", "Home");
    }

    [HttpGet, AllowAnonymous]
    public IActionResult Registro(string? returnUrl = null)
    {
        ViewBag.ReturnUrl = returnUrl;
        return View(new RegistroCliente());
    }

    [HttpPost, AllowAnonymous, ValidateAntiForgeryToken]
    public async Task<IActionResult> Registro(RegistroCliente datos, string? returnUrl = null)
    {
        ViewBag.ReturnUrl = returnUrl;
        var nacimiento = CedulaNicaraguenseAttribute.ObtenerNacimiento(datos.Cedula);
        if (CedulaNicaraguenseAttribute.ObtenerEdad(datos.Cedula) is not >= 18)
            ModelState.AddModelError(nameof(datos.Cedula), "Para crear tu cuenta debés tener al menos 18 años cumplidos.");
        if (!ModelState.IsValid || nacimiento == null) return View(datos);

        var clave = VerificadorContrasena.Crear(datos.Contrasena);
        var correo = datos.Correo.Trim().ToLowerInvariant();
        var cedula = datos.Cedula.Trim().Replace("-", "").ToUpperInvariant();
        var filas = await _db.Database.ExecuteSqlInterpolatedAsync($"""
            INSERT INTO nicar."Usuario" ("NombreUsuario","NombreCompleto","Rol","Cedula","Nacimiento",
                "HashContrasena","Salt","DebeCambiarContrasena")
            VALUES ({correo},{datos.Nombre.Trim()},'Cliente',{cedula},{DateOnly.FromDateTime(nacimiento.Value)},
                {clave.Hash},{clave.Salt},false)
            ON CONFLICT DO NOTHING
            """);
        if (filas == 0)
        {
            ModelState.AddModelError("", "El correo o la cédula ya están registrados.");
            return View(datos);
        }
        TempData["Mensaje"] = "Tu cuenta está lista. Iniciá sesión para continuar.";
        return RedirectToAction(nameof(Login), new { returnUrl = Url.IsLocalUrl(returnUrl) ? returnUrl : null });
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Logout()
    {
        int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out int id);
        if (id > 0) await RegistrarEvento(id, "Cierre de sesion", User.FindFirstValue(ClaimTypes.Email));
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return RedirectToAction(nameof(Login));
    }

    [AllowAnonymous]
    public IActionResult Denegado() => View();

    private async Task RegistrarEvento(int id, string evento, string? usuario)
    {
        await _db.Database.ExecuteSqlRawAsync(
            "INSERT INTO nicar.\"LogAcceso\" (\"IdUsuario\", \"NombreIngresado\", \"Evento\", \"FechaHora\") " +
            "VALUES ({0}, {1}, {2}, LOCALTIMESTAMP)", id, usuario, evento);
    }

    private async Task RegistrarIntentoFallido(string nombre)
    {
        await _db.Database.ExecuteSqlRawAsync(
            "INSERT INTO nicar.\"LogAcceso\" (\"IdUsuario\", \"NombreIngresado\", \"Evento\", \"FechaHora\") " +
            "VALUES (NULL, {0}, {1}, LOCALTIMESTAMP)", nombre, "Intento de inicio fallido");
    }
}

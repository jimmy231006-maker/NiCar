using Microsoft.AspNetCore.Authorization;
using NiCar.Data;
using NiCar.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NiCar.Validation;
using System.ComponentModel.DataAnnotations;

namespace NiCar.Controllers;

[Authorize(Roles = "SuperAdministrador,Administrador,Vendedor,Recepcionista")]

public class ClientesController : Controller
{
    private readonly NiCarContext _db;
    public ClientesController(NiCarContext db) => _db = db;

    public async Task<IActionResult> Index(string filtro = "Todos")
    {
        var query = _db.Clientes.AsNoTracking();
        if (filtro == "Activos") query = query.Where(x => x.Activo);
        if (filtro == "Inactivos") query = query.Where(x => !x.Activo);
        ViewBag.Filtro = filtro;
        return View(await query.OrderBy(x => x.TipoCliente).ThenBy(x => x.IdCliente).ToListAsync());
    }

    public IActionResult Create() => View(new Cliente { FechaRegistro = DateTime.Now });

    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> Create(Cliente model)
    {
        Normalizar(model);
        ValidarTipo(model);
        ValidarIdentificacion(model);
        if (await _db.Clientes.AnyAsync(x =>
            x.TipoIdentificacion == model.TipoIdentificacion &&
            x.NumeroIdentificacion == model.NumeroIdentificacion))
            ModelState.AddModelError(nameof(model.NumeroIdentificacion), "La identificación ya está registrada.");
        if (!ModelState.IsValid) return View(model);
        model.FechaRegistro = DateTime.Now;
        model.Activo = true;
        _db.Clientes.Add(model);
        await _db.SaveChangesAsync();
        TempData["Mensaje"] = "Cliente registrado correctamente.";
        return RedirectToAction(nameof(Index));
    }

    public async Task<IActionResult> Edit(int? id)
    {
        if (id == null) return NotFound();
        var model = await _db.Clientes.FindAsync(id);
        return model == null ? NotFound() : View(model);
    }

    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> Edit(int id, Cliente datos)
    {
        if (id != datos.IdCliente) return NotFound();
        Normalizar(datos);
        ValidarTipo(datos);
        ValidarIdentificacion(datos);
        if (await _db.Clientes.AnyAsync(x => x.IdCliente != id &&
            x.TipoIdentificacion == datos.TipoIdentificacion &&
            x.NumeroIdentificacion == datos.NumeroIdentificacion))
            ModelState.AddModelError(nameof(datos.NumeroIdentificacion), "La identificación ya está registrada.");
        if (!ModelState.IsValid) return View(datos);
        var actual = await _db.Clientes.FindAsync(id);
        if (actual == null) return NotFound();
        actual.TipoCliente = datos.TipoCliente;
        actual.Nombres = datos.Nombres;
        actual.Apellidos = datos.Apellidos;
        actual.RazonSocial = datos.RazonSocial;
        actual.TipoIdentificacion = datos.TipoIdentificacion;
        actual.NumeroIdentificacion = datos.NumeroIdentificacion;
        actual.Telefono = datos.Telefono;
        actual.Correo = datos.Correo;
        actual.Direccion = datos.Direccion;
        await _db.SaveChangesAsync();
        TempData["Mensaje"] = "Cliente actualizado.";
        return RedirectToAction(nameof(Index));
    }

    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> CambiarEstado(int id)
    {
        var cliente = await _db.Clientes.FindAsync(id);
        if (cliente == null) return NotFound();
        cliente.Activo = !cliente.Activo;
        await _db.SaveChangesAsync();
        TempData["Mensaje"] = cliente.Activo ? "Cliente reactivado." : "Cliente desactivado.";
        return RedirectToAction(nameof(Index));
    }

    private void Normalizar(Cliente c)
    {
        c.TipoCliente = c.TipoCliente?.Trim() ?? "";
        c.TipoIdentificacion = c.TipoIdentificacion?.Trim() ?? "";
        c.NumeroIdentificacion = c.NumeroIdentificacion?.Trim().ToUpperInvariant() ?? "";
        c.Nombres = Limpio(c.Nombres); c.Apellidos = Limpio(c.Apellidos);
        c.RazonSocial = Limpio(c.RazonSocial); c.Telefono = Limpio(c.Telefono);
        c.Correo = Limpio(c.Correo); c.Direccion = Limpio(c.Direccion);
    }

    private void ValidarTipo(Cliente c)
    {
        if (c.TipoCliente == "Natural")
        {
            if (string.IsNullOrWhiteSpace(c.Nombres) || string.IsNullOrWhiteSpace(c.Apellidos))
                ModelState.AddModelError("", "El cliente natural requiere nombres y apellidos.");
            if (c.RazonSocial != null)
                ModelState.AddModelError(nameof(c.RazonSocial), "No use razón social para persona natural.");
        }
        else if (c.TipoCliente == "Juridica")
        {
            if (string.IsNullOrWhiteSpace(c.RazonSocial))
                ModelState.AddModelError(nameof(c.RazonSocial), "La razón social es obligatoria.");
            if (c.Nombres != null || c.Apellidos != null)
                ModelState.AddModelError("", "Para persona jurídica no se ingresan nombres ni apellidos.");
            if (string.Equals(c.TipoIdentificacion, "Cedula", StringComparison.OrdinalIgnoreCase))
                ModelState.AddModelError(nameof(c.TipoIdentificacion), "Una persona jurídica debe identificarse con RUC, no con cédula personal.");
        }
        else ModelState.AddModelError(nameof(c.TipoCliente), "Seleccione Natural o Juridica.");
    }


    private void ValidarIdentificacion(Cliente c)
    {
        var tiposPermitidos = new[] { "Cedula", "RUC", "Pasaporte", "Otro" };
        if (!tiposPermitidos.Contains(c.TipoIdentificacion, StringComparer.OrdinalIgnoreCase))
        {
            ModelState.AddModelError(nameof(c.TipoIdentificacion), "Seleccione Cédula, RUC, Pasaporte u Otro.");
            return;
        }

        if (string.Equals(c.TipoIdentificacion, "Cedula", StringComparison.OrdinalIgnoreCase))
        {
            var atributo = new CedulaNicaraguenseAttribute();
            if (!atributo.IsValid(c.NumeroIdentificacion))
            {
                var compacta = c.NumeroIdentificacion.Replace("-", "");
                var codigo = compacta.Length >= 3 ? compacta[..3] : "";
                var departamento = CedulaNicaraguenseAttribute.ObtenerDepartamento(codigo);
                var edad = CedulaNicaraguenseAttribute.ObtenerEdad(c.NumeroIdentificacion);
                var mensaje = edad is < 16
                    ? $"La cédula indica {edad} años. La cédula de identidad se entrega a partir de los 16 años."
                    : departamento == null
                    ? $"El código inicial {codigo} no corresponde a un municipio/departamento reconocido de Nicaragua."
                    : "La cédula no tiene formato válido. Revise que la fecha DDMMYY exista y no sea futura, además de los 4 dígitos consecutivos y la letra.";
                ModelState.AddModelError(nameof(c.NumeroIdentificacion), mensaje);
            }
        }
        else
        {
            // RUC, pasaporte y otras identificaciones tienen reglas distintas a la cédula.
            if (string.IsNullOrWhiteSpace(c.NumeroIdentificacion))
                ModelState.AddModelError(nameof(c.NumeroIdentificacion), "La identificación es obligatoria.");
            if (string.Equals(c.TipoIdentificacion, "RUC", StringComparison.OrdinalIgnoreCase) &&
                !string.IsNullOrWhiteSpace(c.NumeroIdentificacion) &&
                !System.Text.RegularExpressions.Regex.IsMatch(c.NumeroIdentificacion, @"^[0-9A-Za-z\-]+$"))
                ModelState.AddModelError(nameof(c.NumeroIdentificacion), "El RUC solo admite letras, números y guiones.");
        }
    }

    private static string? Limpio(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}

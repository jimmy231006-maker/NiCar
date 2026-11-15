using System.ComponentModel.DataAnnotations;
using System.Text.RegularExpressions;

namespace NiCar.Validation;

/// <summary>
/// Valida la estructura de una cédula nicaragüense y que su prefijo
/// corresponda a un código municipal conocido.
/// </summary>
[AttributeUsage(AttributeTargets.Property | AttributeTargets.Field)]
public sealed class CedulaNicaraguenseAttribute : ValidationAttribute
{
    // La cédula se representa como 3 dígitos, 6 de fecha, 4 consecutivos y letra.
    // Se aceptan guiones opcionales. I, O y Z se omiten en la letra de la forma usual.
    private static readonly Regex Patron = new(
        @"^(?<codigo>[0-9]{3})-?(?<fecha>[0-9]{6})-?[0-9]{4}[A-HJ-NP-Y]$",
        RegexOptions.Compiled | RegexOptions.CultureInvariant | RegexOptions.IgnoreCase);

    // Códigos municipales agrupados por departamento/región. 888 corresponde
    // a personas registradas con código de extranjero, no a un municipio.
    private static readonly IReadOnlyDictionary<string, string[]> CodigosPorDepartamento =
        new Dictionary<string, string[]>
        {
            ["Managua"] = ["001", "002", "003", "004", "005", "006", "007", "008", "009"],
            ["Carazo"] = ["041", "042", "043", "044", "045", "046", "047", "048"],
            ["Chinandega"] = ["081", "082", "083", "084", "085", "086", "087", "088", "089", "090", "091", "092", "093"],
            ["Chontales"] = ["121", "122", "123", "124", "125", "126", "127", "128", "129", "130"],
            ["Estelí"] = ["161", "162", "163", "164", "165", "166"],
            ["Granada"] = ["201", "202", "203", "204"],
            ["Jinotega"] = ["241", "242", "243", "244", "246", "247", "248", "492"],
            ["León"] = ["281", "283", "284", "285", "286", "287", "288", "289", "290", "291"],
            ["Madriz"] = ["321", "322", "323", "324", "325", "326", "327", "328", "329"],
            ["Boaco"] = ["361", "362", "363", "364", "365", "366"],
            ["Masaya"] = ["401", "402", "403", "404", "405", "406", "407", "408", "409"],
            ["Matagalpa"] = ["441", "442", "443", "444", "445", "446", "447", "448", "449", "450", "451", "452", "453"],
            ["Región Autónoma de la Costa Caribe Norte"] = ["454", "606", "607", "608", "610", "611", "612", "629"],
            ["Nueva Segovia"] = ["481", "482", "483", "484", "485", "486", "487", "488", "489", "490", "491", "493"],
            ["Río San Juan"] = ["521", "522", "523", "524", "525", "526"],
            ["Rivas"] = ["561", "562", "563", "564", "565", "566", "567", "568", "569", "570"],
            ["Región Autónoma de la Costa Caribe Sur"] = ["601", "602", "603", "604", "605", "615", "616", "619", "624", "626", "627", "628"]
        };

    private static readonly HashSet<string> CodigosMunicipales =
        CodigosPorDepartamento.Values.SelectMany(codigos => codigos).ToHashSet();

    public override bool IsValid(object? value)
    {
        if (value is null || string.IsNullOrWhiteSpace(value.ToString()))
            return true; // [Required] se encarga de exigir el valor.

        var coincidencia = Patron.Match(value.ToString()!.Trim().ToUpperInvariant());
        if (!coincidencia.Success)
            return false;

        var codigo = coincidencia.Groups["codigo"].Value;
        if (codigo != "888" && !CodigosMunicipales.Contains(codigo))
            return false;

        // El CSE entrega la cédula al cumplir 16 años. La edad se obtiene
        // del bloque DDMMAA; no se acepta una fecha futura ni edad menor de 16.
        return ObtenerEdad(value.ToString()) is >= 16;
    }

    /// <summary>Devuelve la edad calculada desde DDMMYY, o null si la fecha no es válida.</summary>
    public static int? ObtenerEdad(string? cedula)
    {
        var fecha = ObtenerNacimiento(cedula);
        if (fecha is null) return null;
        var hoy = Hoy;
        var edad = hoy.Year - fecha.Value.Year;
        return fecha.Value.AddYears(edad) > hoy ? edad - 1 : edad;
    }

    private static DateTime Hoy => TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow,
        TimeZoneInfo.FindSystemTimeZoneById("America/Managua")).Date;

    public static DateTime? ObtenerNacimiento(string? cedula)
    {
        if (string.IsNullOrWhiteSpace(cedula)) return null;
        var match = Patron.Match(cedula.Trim().ToUpperInvariant());
        if (!match.Success || ObtenerDepartamento(match.Groups["codigo"].Value) == null) return null;
        var fecha = match.Groups["fecha"].Value;
        var hoy = Hoy;
        var anio = hoy.Year / 100 * 100 + int.Parse(fecha[4..]);
        if (anio > hoy.Year) anio -= 100;
        var mes = int.Parse(fecha.Substring(2, 2));
        var dia = int.Parse(fecha[..2]);
        if (mes is < 1 or > 12 || dia < 1 || dia > DateTime.DaysInMonth(anio, mes)) return null;
        var nacimiento = new DateTime(anio, mes, dia);
        return nacimiento <= hoy ? nacimiento : null;
    }

    public static string? ObtenerDepartamento(string codigo)
    {
        if (codigo == "888")
            return "Extranjero";

        return CodigosPorDepartamento
            .FirstOrDefault(grupo => grupo.Value.Contains(codigo)).Key;
    }

    public override string FormatErrorMessage(string name) =>
        $"{name} debe tener el formato 000-DDMMYY-0000A, una fecha válida, edad mínima de 16 años y un código municipal nicaragüense reconocido (o 888 para extranjero).";
}

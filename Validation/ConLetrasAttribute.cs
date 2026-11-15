using System.ComponentModel.DataAnnotations;

namespace NiCar.Validation;

public sealed class ConLetrasAttribute : ValidationAttribute
{
    public ConLetrasAttribute() : base("El campo {0} debe contener al menos una letra y no admite caracteres de control.") { }

    public override bool IsValid(object? value) =>
        value is null || value is string texto &&
        (texto.Length == 0 || texto.Any(char.IsLetter) && !texto.Any(char.IsControl));
}

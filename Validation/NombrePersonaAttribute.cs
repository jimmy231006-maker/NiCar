
using System;
using System.ComponentModel.DataAnnotations;
using System.Text.RegularExpressions;

namespace NiCar.Validation
{
    public sealed class NombrePersonaAttribute : ValidationAttribute
    {
        private static readonly Regex Patron = new Regex(
            @"^[\p{L}]+(?:[ '\-][\p{L}]+)*$"
        );

        public override bool IsValid(object? value)
        {
            if (value == null ||
                string.IsNullOrWhiteSpace(value.ToString()))
                return true;

            string texto = value.ToString()!.Trim();

            return Patron.IsMatch(texto);
        }

        public override string FormatErrorMessage(string name)
        {
            return $"{name} solo puede contener letras.";
        }
    }
}

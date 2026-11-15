using NiCar.Data;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

var connection = builder.Configuration.GetConnectionString("DefaultConnection");
if (string.IsNullOrWhiteSpace(connection))
    throw new InvalidOperationException("Configure ConnectionStrings:DefaultConnection para el proyecto NiCar de Supabase.");

builder.Services.AddDbContext<NiCarContext>(options =>
    options.UseNpgsql(connection));

builder.Services.AddControllersWithViews();
builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.LoginPath = "/Acceso/Login";
        options.AccessDeniedPath = "/Acceso/Denegado";
        options.Cookie.Name = "NiCar.Auth";
        options.Cookie.HttpOnly = true;
        options.Cookie.SameSite = SameSiteMode.Lax;
        options.ExpireTimeSpan = TimeSpan.FromMinutes(30);
        options.SlidingExpiration = true;
    });
builder.Services.AddAuthorization(options =>
{
    options.FallbackPolicy = new AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser().Build();
});

var app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseRouting();
app.UseAuthentication();
app.UseAuthorization();
app.Use(async (context, next) =>
{
    var principal = context.User;
    var debeCambiar = principal.Identity?.IsAuthenticated == true &&
        principal.FindFirst("NiCar.DebeCambiarContrasena")?.Value == "true";
    var rutaCambio = context.Request.Path.StartsWithSegments(
        "/Usuarios/CambiarContrasena", StringComparison.OrdinalIgnoreCase);
    var rutaSalida = context.Request.Path.StartsWithSegments(
        "/Acceso/Logout", StringComparison.OrdinalIgnoreCase);

    if (debeCambiar && !rutaCambio && !rutaSalida)
    {
        context.Response.Redirect("/Usuarios/CambiarContrasena");
        return;
    }

    await next();
});

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

app.Run();

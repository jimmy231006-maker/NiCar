
using Microsoft.EntityFrameworkCore;
using NiCar.Models;

namespace NiCar.Data
{
    public class NiCarContext : DbContext
    {
        public NiCarContext(
            DbContextOptions<NiCarContext> options)
            : base(options)
        {
        }

        // TABLAS
        public DbSet<Marca> Marcas => Set<Marca>();
        public DbSet<Modelo> Modelos => Set<Modelo>();
        public DbSet<Vehiculo> Vehiculos => Set<Vehiculo>();
        public DbSet<Proveedor> Proveedores => Set<Proveedor>();
        public DbSet<TipoCosto> TiposCosto => Set<TipoCosto>();
        public DbSet<CostoVehiculo> CostosVehiculo => Set<CostoVehiculo>();
        public DbSet<AdquisicionVehiculo> AdquisicionesVehiculo
            => Set<AdquisicionVehiculo>();
        public DbSet<Cliente> Clientes => Set<Cliente>();
        public DbSet<Venta> Ventas => Set<Venta>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            modelBuilder.HasDefaultSchema("nicar");

            // MARCA
            modelBuilder.Entity<Marca>(entity =>
            {
                entity.ToTable("Marca");
                entity.HasKey(e => e.IdMarca);

                entity.Property(e => e.Nombre)
                    .HasMaxLength(60).IsRequired();

                entity.Property(e => e.PaisOrigen)
                    .HasMaxLength(60);

                entity.HasIndex(e => e.Nombre).IsUnique();
            });

            // MODELO
            modelBuilder.Entity<Modelo>(entity =>
            {
                entity.ToTable("Modelo");
                entity.HasKey(e => e.IdModelo);

                entity.Property(e => e.Nombre)
                    .HasMaxLength(80).IsRequired();

                entity.HasOne(e => e.Marca)
                    .WithMany(e => e.Modelos)
                    .HasForeignKey(e => e.IdMarca)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(e => new { e.IdMarca, e.Nombre })
                    .IsUnique();
            });

            // VEHICULO
            modelBuilder.Entity<Vehiculo>(entity =>
            {
                entity.ToTable("Vehiculo");
                entity.HasKey(e => e.IdVehiculo);

                entity.Property(e => e.IdentificadorUnico)
                    .HasMaxLength(50).IsRequired();

                entity.Property(e => e.VIN).HasMaxLength(17);
                entity.Property(e => e.NumeroChasis).HasMaxLength(50);
                entity.Property(e => e.Placa).HasMaxLength(10);

                entity.Property(e => e.EstadoMatricula)
                    .HasMaxLength(20).IsRequired();

                entity.Property(e => e.Version).HasMaxLength(80);

                entity.Property(e => e.ColorExterior)
                    .HasMaxLength(40).IsRequired();

                entity.Property(e => e.ColorInterior).HasMaxLength(40);

                entity.Property(e => e.Transmision)
                    .HasMaxLength(20).IsRequired();

                entity.Property(e => e.Traccion)
                    .HasMaxLength(15).IsRequired();

                entity.Property(e => e.Combustible)
                    .HasMaxLength(20).IsRequired();

                entity.Property(e => e.TipoCarroceria)
                    .HasMaxLength(30).IsRequired();

                entity.Property(e => e.Estado)
                    .HasMaxLength(25).IsRequired();

                entity.Property(e => e.FechaRegistro)
                    .HasColumnType("timestamp without time zone");

                entity.Property(e => e.Observaciones).HasMaxLength(500);
                entity.Property(e => e.PrecioOferta).HasColumnType("decimal(18,2)");
                entity.Property(e => e.ImagenUrl).HasMaxLength(500);
                entity.Property(e => e.Ubicacion).HasMaxLength(80);

                entity.HasOne(e => e.Modelo)
                    .WithMany(e => e.Vehiculos)
                    .HasForeignKey(e => e.IdModelo)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(e => e.IdentificadorUnico).IsUnique();

                entity.HasIndex(e => e.VIN)
                    .IsUnique();

                entity.HasIndex(e => e.NumeroChasis)
                    .IsUnique();

                entity.HasIndex(e => e.Placa)
                    .IsUnique();

                entity.HasIndex(e => e.Estado);
            });

            // PROVEEDOR
            modelBuilder.Entity<Proveedor>(entity =>
            {
                entity.ToTable("Proveedor");
                entity.HasKey(e => e.IdProveedor);

                entity.Property(e => e.TipoProveedor)
                    .HasMaxLength(30).IsRequired();

                entity.Property(e => e.NombreProveedor)
                    .HasMaxLength(150).IsRequired();

                entity.Property(e => e.IdentificacionFiscal)
                    .HasMaxLength(30);

                entity.Property(e => e.Pais)
                    .HasMaxLength(60).IsRequired();

                entity.Property(e => e.Ciudad).HasMaxLength(80);
                entity.Property(e => e.Direccion).HasMaxLength(250);
                entity.Property(e => e.Telefono).HasMaxLength(20);
                entity.Property(e => e.Correo).HasMaxLength(120);
                entity.Property(e => e.Contacto).HasMaxLength(120);

                entity.Property(e => e.FechaRegistro)
                    .HasColumnType("timestamp without time zone");

                entity.Property(e => e.Observaciones).HasMaxLength(500);

                entity.HasIndex(e => e.IdentificacionFiscal)
                    .IsUnique();
            });

            // TIPO COSTO
            modelBuilder.Entity<TipoCosto>(entity =>
            {
                entity.ToTable("TipoCosto");
                entity.HasKey(e => e.IdTipoCosto);

                entity.Property(e => e.Nombre)
                    .HasColumnType("varchar(80)")
                    .HasMaxLength(80)
                    .IsRequired();

                entity.Property(e => e.Descripcion)
                    .HasColumnType("varchar(200)")
                    .HasMaxLength(200);

                entity.Property(e => e.Activo).IsRequired();
            });

            // COSTO VEHICULO
            modelBuilder.Entity<CostoVehiculo>(entity =>
            {
                entity.ToTable("CostoVehiculo");
                entity.HasKey(e => e.IdCosto);

                entity.Property(e => e.Descripcion)
                    .HasColumnType("varchar(200)")
                    .HasMaxLength(200)
                    .IsRequired();

                entity.Property(e => e.FechaCosto)
                    .HasColumnType("date");

                entity.Property(e => e.Monto)
                    .HasColumnType("decimal(18,2)");

                entity.Property(e => e.Moneda)
                    .HasColumnType("varchar(3)")
                    .HasMaxLength(3)
                    .IsRequired();

                entity.Property(e => e.TasaCambio)
                    .HasColumnType("decimal(18,6)");

                entity.Property(e => e.MontoNIO)
                    .HasColumnType("decimal(18,2)");

                entity.Property(e => e.NumeroDocumento)
                    .HasColumnType("varchar(80)")
                    .HasMaxLength(80);

                entity.Property(e => e.Observaciones)
                    .HasColumnType("varchar(300)")
                    .HasMaxLength(300);

                entity.HasOne(e => e.Vehiculo)
                    .WithMany(e => e.Costos)
                    .HasForeignKey(e => e.IdVehiculo)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.TipoCosto)
                    .WithMany(e => e.Costos)
                    .HasForeignKey(e => e.IdTipoCosto)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // ADQUISICION VEHICULO
            modelBuilder.Entity<AdquisicionVehiculo>(entity =>
            {
                entity.ToTable("AdquisicionVehiculo");
                entity.HasKey(e => e.IdAdquisicion);

                entity.Property(e => e.FechaAdquisicion)
                    .HasColumnType("date");

                entity.Property(e => e.PrecioCompra)
                    .HasColumnType("decimal(18,2)");

                entity.Property(e => e.Moneda)
                    .HasMaxLength(3).IsFixedLength();

                entity.Property(e => e.TasaCambio)
                    .HasColumnType("decimal(18,6)");

                entity.Property(e => e.PrecioCompraNIO)
                    .HasColumnType("decimal(18,2)")
                    .ValueGeneratedOnAddOrUpdate();

                entity.HasOne(e => e.Vehiculo)
                    .WithMany(e => e.Adquisiciones)
                    .HasForeignKey(e => e.IdVehiculo)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.Proveedor)
                    .WithMany(e => e.Adquisiciones)
                    .HasForeignKey(e => e.IdProveedor)
                    .OnDelete(DeleteBehavior.Restrict);
            });


            // CLIENTE
            modelBuilder.Entity<Cliente>(entity =>
            {
                entity.ToTable("Cliente");
                entity.HasKey(e => e.IdCliente);

                entity.Property(e => e.TipoCliente)
                    .HasColumnType("varchar(20)")
                    .HasMaxLength(20)
                    .IsRequired();

                entity.Property(e => e.Nombres)
                    .HasColumnType("varchar(100)")
                    .HasMaxLength(100);

                entity.Property(e => e.Apellidos)
                    .HasColumnType("varchar(100)")
                    .HasMaxLength(100);

                entity.Property(e => e.RazonSocial)
                    .HasColumnType("varchar(150)")
                    .HasMaxLength(150);

                entity.Property(e => e.TipoIdentificacion)
                    .HasColumnType("varchar(10)")
                    .HasMaxLength(10)
                    .IsRequired();

                entity.Property(e => e.NumeroIdentificacion)
                    .HasColumnType("varchar(30)")
                    .HasMaxLength(30)
                    .IsRequired();

                entity.Property(e => e.Telefono)
                    .HasColumnType("varchar(20)")
                    .HasMaxLength(20);

                entity.Property(e => e.Correo)
                    .HasColumnType("varchar(120)")
                    .HasMaxLength(120);

                entity.Property(e => e.Direccion)
                    .HasColumnType("varchar(300)")
                    .HasMaxLength(300);

                entity.Property(e => e.FechaRegistro)
                    .HasColumnType("timestamp without time zone")
                    .IsRequired();

                entity.Property(e => e.Activo)
                    .IsRequired();

                entity.HasIndex(e => new { e.TipoIdentificacion, e.NumeroIdentificacion })
                    .IsUnique();
            });

            // VENTAS
            modelBuilder.Entity<Venta>(entity =>
            {
                entity.ToTable("Venta");
                entity.HasKey(e => e.IdVenta);
                entity.Property(e => e.NumeroComprobante).HasMaxLength(30).IsRequired();
                entity.Property(e => e.FechaVenta).HasColumnType("date");
                entity.Property(e => e.PrecioVenta).HasColumnType("decimal(18,2)");
                entity.Property(e => e.Descuento).HasColumnType("decimal(18,2)");
                entity.Property(e => e.Total).HasColumnType("decimal(18,2)").ValueGeneratedOnAddOrUpdate();
                entity.Property(e => e.Moneda).HasMaxLength(3).IsRequired();
                entity.Property(e => e.MetodoPago).HasMaxLength(30).IsRequired();
                entity.Property(e => e.ReferenciaPago).HasMaxLength(80);
                entity.Property(e => e.Observaciones).HasMaxLength(500);
                entity.Property(e => e.UsuarioRegistro).HasMaxLength(80);
                entity.HasIndex(e => e.NumeroComprobante).IsUnique();
                entity.HasIndex(e => e.IdVehiculo).IsUnique();
                entity.HasIndex(e => e.FechaVenta);
                entity.HasOne(e => e.Vehiculo).WithMany()
                    .HasForeignKey(e => e.IdVehiculo).OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.Cliente).WithMany()
                    .HasForeignKey(e => e.IdCliente).OnDelete(DeleteBehavior.Restrict);
            });
        }
    }
}

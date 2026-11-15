# NiCar web

Aplicación en HTML, CSS y JavaScript con servidor Node.js y PostgreSQL de Supabase. Abrí esta carpeta NiCarWeb en VS Code.

## Ejecutar

1. Instalá Node.js 22 LTS.
2. Copiá .env.example a .env.
3. Configurá DATABASE_URL con la conexión de Session pooler del proyecto NiCar de MediRed y su contraseña. Usá APP_ORIGIN=http://localhost:3000 para desarrollo.
4. Ejecutá npm install y npm start.
5. Abrí http://localhost:3000. También podés iniciar el servidor con F5 en VS Code.

El catálogo funciona sin cuenta. El registro exige cédula válida y 18 años cumplidos. Las citas requieren sesión de cliente, una hora futura de Nicaragua y disponibilidad del vehículo. Supabase impide más de diez citas por día y horarios duplicados. La fecha de la cédula utiliza año de dos dígitos, con la misma inferencia de siglo del sistema anterior.

Las credenciales existentes de Víctor y Jimmy utilizan el mismo hash PBKDF2. Los accesos fallidos bloquean la cuenta 15 minutos desde el quinto intento. La sesión dura 30 minutos y se guarda en Supabase. La aplicación crea únicamente la tabla privada SesionWeb al arrancar.

Los módulos incluyen marcas, modelos, inventario, clientes, proveedores, adquisiciones, costos, ventas, agenda, cuentas y auditoría. Las ventas son registros internos del personal autorizado y conservan su comprobante. Desactivar registros conserva su historial y referencias.

## Render

El render.yaml despliega un servicio Node en el plan gratuito. Configurá DATABASE_URL como secreto y APP_ORIGIN con el origen HTTPS exacto asignado por Render, sin barra final. El servidor escucha PORT y sirve public/index.html, CSS, JavaScript y la API en el mismo dominio.

La base existente requiere los scripts PostgreSQL ya aplicados al proyecto NiCar. El código C# anterior se encuentra en otra carpeta local. Esta versión usa exclusivamente JavaScript para interfaz y servidor.

Ejecutá npm test para comprobar las reglas de validación. Nunca publiques .env ni credenciales en el frontend.

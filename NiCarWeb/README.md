# NiCar Web

Sistema web para una agencia de vehículos en Nicaragua. El navegador usa HTML, CSS y JavaScript; una API en Node.js aplica las reglas y consulta PostgreSQL en Supabase. La conexión a la base de datos nunca se expone al navegador.

## Abrir y ejecutar en VS Code

Abre **la carpeta `NiCarWeb`** en VS Code. Necesitas Node.js 22 o superior.

```powershell
Copy-Item .env.example .env
npm install
npm start
```

Completa `DATABASE_URL` en `.env` con la cadena del **Session Pooler** de Supabase. En producción, configura `DATABASE_SSL_CERT` con el certificado raíz PEM descargado desde Supabase; Render verificará la CA y el nombre del servidor y no iniciará si falta. Para uso local, define `APP_ORIGIN=http://localhost:3000`. Después visita http://localhost:3000. No subas `.env`, contraseñas ni llaves a GitHub.

## Supabase

El esquema privado `nicar` tiene migraciones versionadas en `supabase/migrations`. El historial contiene el esquema, citas, validaciones, financiamiento, comisiones, contratos, pagos y avisos de cancelación. El archivo `supabase/seed.sql` inserta datos ficticios de muestra de forma repetible.

Para enlazar GitHub desde Supabase, selecciona el repositorio `jimmy231006-maker/NiCar` y usa `NiCarWeb` como **Working directory**. Revisa las migraciones antes de activar los cambios automáticos de producción. Para la aplicación, usa el Session Pooler en `DATABASE_URL`; nunca pongas la contraseña de PostgreSQL en archivos públicos.

## Datos de demostración y cuentas

La base incluye 8 marcas, 16 modelos, 20 vehículos, 10 clientes ficticios, 3 proveedores y 6 tipos de costo. Las fichas de muestra llevan nombres/correos identificados como ficticios; confirma siempre inventario, kilometraje y documentos antes de ofrecer una unidad real. Las fotos del catálogo se muestran como referencias.

Hay tres vendedores: `salajimmy2@gmail.com`, `salajimmy3@gmail.com` y `salajimmy4@gmail.com`. `jennzmunoz8@gmail.com` y `jimmy231006@gmail.com` son administradores; `leivavictor220503@gmail.com` es superadministrador. La cuenta de Víctor `fcobusts@gmail.com` permanece como administrador. Las cuentas nuevas deben cambiar su contraseña temporal al iniciar sesión.

El registro público de un cliente guarda la ficha y la cuenta vinculada en una sola transacción; exige cédula nicaragüense y mayoría de edad. El cliente es un rol independiente del vendedor.

## Reglas principales

- El catálogo permite consultar vehículos, pero no comparar ni comprar en línea. La venta se registra con personal de la agencia.
- Autos, camionetas, camiones y motos tienen sus datos técnicos; una moto no lleva puertas. Un vehículo nuevo queda sin placa y con cero kilómetros.
- Una cita puede reservarse con o sin cuenta, solicita los datos necesarios y valida que la persona tenga 18 años. Solo se agenda a futuro, de lunes a sábado, de 08:00 a 16:15 en bloques de 45 minutos, con vendedor disponible y hasta 12 citas por vendedor al día.
- La administración puede cancelar una cita indicando el motivo. Cuando el cliente inicia sesión, el aviso de cancelación aparece primero.
- Las ventas se registran en USD; la conversión a córdobas usa C$36.60 y la comisión fija del vendedor es 5%.
- Los contratos y pagos quedan con historial. La tabla de amortización es para administración y no se presenta al cliente como una tabla oficial del banco.
- El acceso se organiza por roles. Los vendedores consultan sus citas, ventas, pagos y comisiones; clientes ven sus citas y datos propios; administración gestiona los módulos; superadministración incluye auditoría.
- Cada módulo aplica permisos CRUD en el servidor, además de ocultar acciones no permitidas en la pantalla:

  | Perfil | Acceso principal |
  | --- | --- |
  | Superadministrador | Administra catálogos, inventario, clientes, proveedores, usuarios, contratos y operaciones; consulta auditoría y todos los registros. |
  | Administrador | Administra los módulos del negocio y las citas; no crea ni modifica cuentas administrativas. |
  | Vendedor | Consulta inventario, sus citas/clientes/ventas/créditos; registra ventas, contratos y pagos de sus ventas. Puede corregir datos de los clientes que atiende. |
  | Bodega | Administra inventario y adquisiciones para el control de existencias. |
  | Recepcionista | Consulta clientes y gestiona agenda; no administra ventas ni cuentas. |
  | Cliente | Consulta catálogo, sus citas y sus créditos; reserva/cancela sus citas y reporta pagos de su crédito. No accede a administración. |

  Los pagos, ventas firmadas, contratos firmados, bitácoras y cuotas bancarias conservan su historial o son de solo lectura; el botón de eliminar no sustituye el control contable. El servidor verifica el rol y el alcance del registro en cada solicitud, no depende solo de ocultar botones.
- Las validaciones se centralizan en la clase `Validaciones`. Las interfaces comienzan por `I`; clases, servicios y módulos están separados por responsabilidad.

## Render

El `render.yaml` de la raíz del repositorio ya configura el servicio web `nicar` y usa `NiCarWeb` como directorio raíz. Render necesita las variables privadas `DATABASE_URL`, `APP_ORIGIN` y `DATABASE_SSL_CERT` (certificado raíz PEM de Supabase); el valor de `APP_ORIGIN` debe ser exactamente la URL del servicio, por ejemplo `https://nicar.onrender.com`, sin una barra al final. El servicio usa `npm install --omit=dev`, `npm start` y revisa `/api/health`.

## Organización

- `publico/`: HTML, hojas CSS con media queries, imágenes y JavaScript del navegador.
- `servidor/`: API, clases, interfaces, validaciones, servicios y repositorios.
- `supabase/migrations/`: historial completo de cambios del esquema.
- `supabase/seed.sql`: datos de demostración ficticios.
- `base-datos/`: scripts SQL legibles para revisión académica.
- `pruebas/`: pruebas automatizadas del proyecto.

Para ejecutar las pruebas existentes: `npm test`.

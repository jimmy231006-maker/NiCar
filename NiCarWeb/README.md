# NiCar Web

Sistema web para una agencia de veh�culos en Nicaragua. El navegador usa HTML, CSS y JavaScript; una API en Node.js aplica las reglas y consulta PostgreSQL en Supabase. La conexi�n a la base de datos nunca se expone al navegador.

## Abrir y ejecutar en VS Code

Abre **la carpeta `NiCarWeb`** en VS Code. Necesitas Node.js 22 o superior.

```powershell
Copy-Item .env.example .env
npm install
npm start
```

Completa `DATABASE_URL` en `.env` con la cadena del **Session Pooler** de Supabase. En producci�n, configura `DATABASE_SSL_CERT` con el certificado ra�z PEM de Supabase; el servidor valida CA y nombre de host y no inicia si falta el certificado. Para uso local, define `APP_ORIGIN=http://localhost:3000`. Despu�s visita http://localhost:3000. No subas `.env`, contrase�as ni llaves a GitHub.

## Supabase

El esquema privado `nicar` tiene migraciones versionadas en `supabase/migrations`. El historial contiene el esquema, citas, validaciones, financiamiento, comisiones, contratos, pagos y avisos de cancelaci�n. El archivo `supabase/seed.sql` inserta datos ficticios de muestra de forma repetible.

Para enlazar GitHub desde Supabase, selecciona el repositorio `jimmy231006-maker/NiCar` y usa `NiCarWeb` como **Working directory**. Revisa las migraciones antes de activar los cambios autom�ticos de producci�n. Para la aplicaci�n, usa el Session Pooler en `DATABASE_URL`; nunca pongas la contrase�a de PostgreSQL en archivos p�blicos.

## Datos de demostraci�n y cuentas

La base incluye 8 marcas, 16 modelos, 20 veh�culos, 10 clientes ficticios, 3 proveedores y 6 tipos de costo. Las fichas de muestra llevan nombres/correos identificados como ficticios; confirma siempre inventario, kilometraje y documentos antes de ofrecer una unidad real. Las fotos del cat�logo se muestran como referencias.

Hay tres vendedores: `salajimmy2@gmail.com`, `salajimmy3@gmail.com` y `salajimmy4@gmail.com`. `jennzmunoz8@gmail.com` y `jimmy231006@gmail.com` son administradores; `leivavictor220503@gmail.com` es superadministrador. La cuenta de V�ctor `fcobusts@gmail.com` permanece como administrador. Las cuentas nuevas deben cambiar su contrase�a temporal al iniciar sesi�n.

El registro p�blico de un cliente guarda la ficha y la cuenta vinculada en una sola transacci�n; exige c�dula nicarag�ense y mayor�a de edad. El cliente es un rol independiente del vendedor.

## Reglas principales

- El cat�logo permite consultar veh�culos, pero no comparar ni comprar en l�nea. La venta se registra con personal de la agencia.
- Autos, camionetas, camiones y motos tienen sus datos t�cnicos; una moto no lleva puertas. Un veh�culo nuevo queda sin placa y con cero kil�metros.
- Una cita puede reservarse con o sin cuenta, solicita los datos necesarios y valida que la persona tenga 18 a�os. Solo se agenda a futuro, de lunes a s�bado, de 08:00 a 16:15 en bloques de 45 minutos, con vendedor disponible y hasta 12 citas por vendedor al d�a.
- La administraci�n puede cancelar una cita indicando el motivo. Cuando el cliente inicia sesi�n, el aviso de cancelaci�n aparece primero.
- Las ventas se registran en USD; la conversi�n a c�rdobas usa C$36.60 y la comisi�n fija del vendedor es 5%.
- Los contratos y pagos quedan con historial. La tabla de amortizaci�n es para administraci�n y no se presenta al cliente como una tabla oficial del banco.
- El acceso se organiza por roles. Los vendedores consultan sus citas, ventas, pagos y comisiones; clientes ven sus citas y datos propios; administraci�n gestiona los m�dulos; superadministraci�n incluye auditor�a.
- Cada m�dulo aplica permisos CRUD en el servidor, adem�s de ocultar acciones no permitidas en la pantalla:

  | Perfil | Acceso principal |
  | --- | --- |
  | Superadministrador | Administra cat�logos, inventario, clientes, proveedores, usuarios, contratos y operaciones; consulta auditor�a y todos los registros. |
  | Administrador | Administra los m�dulos del negocio y las citas; no crea ni modifica cuentas administrativas. |
  | Vendedor | Consulta inventario, sus citas/clientes/ventas/cr�ditos; registra ventas, contratos y pagos de sus ventas. Puede corregir datos de los clientes que atiende. |
  | Bodega | Administra inventario y adquisiciones para el control de existencias. |
  | Recepcionista | Consulta clientes y gestiona agenda; no administra ventas ni cuentas. |
  | Cliente | Consulta cat�logo, sus citas y sus cr�ditos; reserva/cancela sus citas y reporta pagos de su cr�dito. No accede a administraci�n. |

  Los pagos, ventas firmadas, contratos firmados, bit�coras y cuotas bancarias conservan su historial o son de solo lectura; el bot�n de eliminar no sustituye el control contable. El servidor verifica el rol y el alcance del registro en cada solicitud, no depende solo de ocultar botones.
- Las validaciones se centralizan en la clase `Validaciones`. Las interfaces comienzan por `I`; clases, servicios y m�dulos est�n separados por responsabilidad.

## Render

El `render.yaml` de la ra�z del repositorio ya configura el servicio web `nicar` y usa `NiCarWeb` como directorio ra�z. Render necesita las variables privadas `DATABASE_URL`, `APP_ORIGIN` y `DATABASE_SSL_CERT` (certificado ra�z PEM de Supabase). El valor de `APP_ORIGIN` debe ser exactamente la URL del servicio, por ejemplo `https://nicar.onrender.com`, sin una barra al final. El servicio usa `npm install --omit=dev`, `npm start` y revisa `/api/health`.

## Organizaci�n

- `publico/`: HTML, hojas CSS con media queries, im�genes y JavaScript del navegador.
- `servidor/`: API, clases, interfaces, validaciones, servicios y repositorios.
- `supabase/migrations/`: historial completo de cambios del esquema.
- `supabase/seed.sql`: datos de demostraci�n ficticios.
- `base-datos/`: scripts SQL legibles para revisi�n acad�mica.
- `pruebas/`: pruebas automatizadas del proyecto.

Para ejecutar las pruebas existentes: `npm test`.
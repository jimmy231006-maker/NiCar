# NiCar Web

Aplicación independiente en HTML, CSS y JavaScript para consultar vehículos, registrar clientes y citas presenciales, y administrar la operación de la agencia. El backend es Node.js y la base de datos PostgreSQL de Supabase.

## Abrir en VS Code

Abre esta carpeta `NiCarWeb` desde VS Code. Requiere Node.js 22.

```powershell
Copy-Item .env.example .env
npm install
npm start
```

Completa `DATABASE_URL` en `.env` con el Session Pooler de Supabase. Para desarrollo local, usa `APP_ORIGIN=http://localhost:3000`. Después abre http://localhost:3000. Pulsa F5 en VS Code para iniciar el servidor con la configuración incluida.

No subas `.env` ni contraseñas a GitHub. El navegador no se conecta directamente a Supabase: las consultas pasan por el servidor.

## Configurar Supabase

En SQL Editor, aplica los scripts en este orden:

1. `base-datos/NiCar_PostgreSQL.sql`
2. `base-datos/08_Citas_PostgreSQL.sql`
3. `base-datos/09_Clientes_y_cupos_PostgreSQL.sql`
4. `base-datos/10_Vehiculos_pagos_comisiones.sql`
5. `base-datos/11_Horarios_marcas_fotografias.sql`
6. `base-datos/12_Citas_45_minutos_clientes.sql`
7. `base-datos/13_Condicion_vehiculos.sql`
8. `base-datos/14_Financiamiento_credex.sql`
9. `base-datos/15_comision_fija_5_por_ciento.sql`
10. `base-datos/16_contratos_y_pagos_colaboradores.sql`

Configura Supabase antes de desplegar el servicio. No guardes claves de servicio en el frontend.

## Funciones

- Catálogo público con información de autos, camionetas y motocicletas; no se compra ni se compara en línea.
- Registro de clientes mayores de edad con cédula nicaragüense y teléfono local de ocho dígitos que comienza por 5, 7 u 8.
- Citas presenciales de lunes a sábado, de 08:00 a 17:00, de 45 minutos y hasta diez por día, asignadas a vendedores disponibles.
- Administración de clientes, vehículos, marcas, modelos, proveedores, adquisiciones, ventas, citas, contratos y pagos.
- Vehículos nuevos sin placa y con cero kilómetros; los usados muestran kilometraje y sus características.
- Financiamiento externo, incluido CREDEX si la financiera acepta la operación. NiCar muestra las condiciones registradas del contrato; la tabla oficial, el saldo y los pagos se confirman con la entidad financiera.
- Comisión de vendedor fija del 5% de la venta neta. Los módulos de nómina calculan INSS laboral e IR por separado; la parte patronal del INSS no se resta del salario.
- La clase de cálculos de nómina usa INSS laboral del 7% y la tabla progresiva de IR configurada en el proyecto. Revisar y mantener estos porcentajes conforme a las reglas vigentes antes de usarlo en nómina real.

## Diseño adaptable

Las hojas CSS incluyen media queries para escritorio, tabletas y celulares, con ajustes de navegación, formularios, tablas, fichas y catálogo.

## Ejecutar comprobaciones

```powershell
npm test
```

## Desplegar en Render

Crea o configura el servicio de Render con `NiCarWeb` como directorio raíz. Usa `npm install --omit=dev` como comando de compilación y `npm start` como comando de inicio. Configura `DATABASE_URL`, `APP_ORIGIN` y `NODE_ENV=production` en las variables privadas del servicio. El servidor escucha el puerto asignado por Render y comprueba la conexión en `/api/health`.

## Organización

- `publico/`: HTML, estilos y JavaScript del navegador.
- `servidor/`: API, modelos, interfaces, servicios, pagos y repositorios.
- `base-datos/`: esquema inicial y migraciones SQL.
- `pruebas/`: pruebas automatizadas del proyecto.

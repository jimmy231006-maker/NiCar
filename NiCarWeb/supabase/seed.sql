-- Datos de muestra totalmente ficticios; no representan clientes ni inventario real.
INSERT INTO nicar."Marca" ("Nombre","PaisOrigen","Activo") VALUES
  ('Toyota','Japón',true),('Nissan','Japón',true),('Honda','Japón',true),
  ('Hyundai','Corea del Sur',true),('Suzuki','Japón',true),('Yamaha','Japón',true),
  ('Chevrolet','Estados Unidos',true),('Isuzu','Japón',true)
ON CONFLICT ("Nombre") DO NOTHING;

INSERT INTO nicar."Modelo" ("IdMarca","Nombre","Activo")
SELECT m."IdMarca",v.modelo,true
FROM (VALUES
  ('Toyota','Corolla'),('Toyota','RAV4'),('Toyota','Hilux'),('Toyota','Yaris'),
  ('Nissan','Versa'),('Nissan','Frontier'),('Honda','Civic'),('Honda','CR-V'),
  ('Honda','XR150L'),('Hyundai','Tucson'),('Hyundai','Elantra'),
  ('Suzuki','Vitara'),('Yamaha','FZ-S'),('Yamaha','MT-03'),
  ('Chevrolet','Colorado'),('Isuzu','D-Max')
) AS v(marca,modelo)
JOIN nicar."Marca" m ON m."Nombre"=v.marca
ON CONFLICT ("IdMarca","Nombre") DO NOTHING;

INSERT INTO nicar."Vehiculo" (
  "IdModelo","IdentificadorUnico","EstadoMatricula","Anio","Version",
  "ColorExterior","ColorInterior","Transmision","Traccion","Combustible",
  "Kilometraje","TipoCarroceria","Estado","FechaRegistro","Observaciones",
  "PrecioOferta","ImagenUrl","Ubicacion","Activo","NumeroPuertas","CilindrajeCc",
  "PotenciaKw","NumeroAsientos","FuenteImagen","AutorImagen","LicenciaImagen",
  "FotoReferencia","Condicion"
)
SELECT mo."IdModelo",v.codigo,
  CASE WHEN v.condicion='Nuevo' THEN 'Pendiente' ELSE 'Matriculado' END,
  v.anio,v.version,v.color,'Negro',v.transmision,v.traccion,v.combustible,
  CASE WHEN v.condicion='Nuevo' THEN 0 ELSE v.km END,
  v.carroceria,'Disponible',now() AT TIME ZONE 'America/Managua',
  'DEMO FICTICIO: confirme disponibilidad, kilometraje, documentos y condiciones antes de ofrecerlo.',
  v.precio,v.imagen,'Managua, Nicaragua',true,
  CASE WHEN v.carroceria='Motocicleta' THEN NULL ELSE v.puertas END,
  v.cc,NULL,v.asientos,'https://unsplash.com',
  'Imagen de referencia de Unsplash','Unsplash License',true,v.condicion
FROM (VALUES
 ('Toyota','Corolla','DEMO-NI-001',2022,'LE','Blanco','Automática','FWD','Gasolina',38500,'Sedán',5,1800,5,18900,'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?auto=format&fit=crop&w=1200&q=80','Usado'),
 ('Toyota','RAV4','DEMO-NI-002',2025,'XLE','Gris','Automática','AWD','Gasolina',0,'SUV',5,2500,5,32900,'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=1200&q=80','Nuevo'),
 ('Toyota','Hilux','DEMO-NI-003',2023,'4x4 Doble Cabina','Plata','Manual','4x4','Diésel',27100,'Pickup',4,2800,5,31900,'https://images.unsplash.com/photo-1551830820-330a71b99659?auto=format&fit=crop&w=1200&q=80','Usado'),
 ('Toyota','Yaris','DEMO-NI-004',2021,'XLE','Azul','Automática','FWD','Gasolina',49200,'Hatchback',5,1500,5,15900,'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=1200&q=80','Usado'),
 ('Toyota','Hilux','DEMO-NI-005',2026,'4x4 Doble Cabina','Rojo','Manual','4x4','Diésel',0,'Pickup',4,2800,5,38900,'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=80','Nuevo'),
 ('Nissan','Versa','DEMO-NI-006',2022,'Advance','Gris','Automática','FWD','Gasolina',31600,'Sedán',4,1600,5,16900,'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1200&q=80','Usado'),
 ('Nissan','Frontier','DEMO-NI-007',2024,'Pro-4X','Negro','Automática','4x4','Diésel',12800,'Pickup',4,2500,5,36900,'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80','Usado'),
 ('Honda','Civic','DEMO-NI-008',2020,'EX','Blanco','CVT','FWD','Gasolina',58300,'Sedán',4,2000,5,18400,'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=80','Usado'),
 ('Honda','CR-V','DEMO-NI-009',2025,'EX-L','Gris','CVT','AWD','Gasolina',0,'SUV',5,1500,5,35900,'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=1200&q=80','Nuevo'),
 ('Honda','XR150L','DEMO-NI-010',2024,'XR150L','Rojo','Manual','RWD','Gasolina',6200,'Motocicleta',0,150,2,2450,'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1200&q=80','Usado'),
 ('Hyundai','Tucson','DEMO-NI-011',2023,'Limited','Verde','Automática','AWD','Gasolina',22400,'SUV',5,2000,5,28900,'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=80','Usado'),
 ('Hyundai','Elantra','DEMO-NI-012',2022,'SEL','Plata','Automática','FWD','Gasolina',34100,'Sedán',4,2000,5,17900,'https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=1200&q=80','Usado'),
 ('Suzuki','Vitara','DEMO-NI-013',2024,'GLX','Azul','Automática','AWD','Gasolina',9100,'SUV',5,1600,5,25400,'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=1200&q=80','Usado'),
 ('Yamaha','FZ-S','DEMO-NI-014',2023,'FI ABS','Negro','Manual','RWD','Gasolina',7400,'Motocicleta',0,150,2,2100,'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1200&q=80','Usado'),
 ('Yamaha','MT-03','DEMO-NI-015',2025,'ABS','Gris','Manual','RWD','Gasolina',0,'Motocicleta',0,321,2,6200,'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=1200&q=80','Nuevo'),
 ('Chevrolet','Colorado','DEMO-NI-016',2022,'LT Crew Cab','Rojo','Automática','4x4','Gasolina',46200,'Pickup',4,2500,5,27900,'https://images.unsplash.com/photo-1551830820-330a71b99659?auto=format&fit=crop&w=1200&q=80','Usado'),
 ('Isuzu','D-Max','DEMO-NI-017',2024,'LS 4x4','Blanco','Manual','4x4','Diésel',15300,'Pickup',4,3000,5,34900,'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=80','Usado'),
 ('Nissan','Frontier','DEMO-NI-018',2026,'SE Doble Cabina','Plata','Automática','4x4','Diésel',0,'Pickup',4,2500,5,37900,'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80','Nuevo'),
 ('Honda','XR150L','DEMO-NI-019',2025,'XR150L','Rojo','Manual','RWD','Gasolina',0,'Motocicleta',0,150,2,2850,'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1200&q=80','Nuevo'),
 ('Toyota','Corolla','DEMO-NI-020',2024,'SE','Negro','CVT','FWD','Gasolina',9400,'Sedán',4,1800,5,22900,'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?auto=format&fit=crop&w=1200&q=80','Usado')
) AS v(marca,modelo,codigo,anio,version,color,transmision,traccion,combustible,km,carroceria,puertas,cc,asientos,precio,imagen,condicion)
JOIN nicar."Marca" ma ON ma."Nombre"=v.marca
JOIN nicar."Modelo" mo ON mo."IdMarca"=ma."IdMarca" AND mo."Nombre"=v.modelo
ON CONFLICT ("IdentificadorUnico") DO NOTHING;

INSERT INTO nicar."Cliente" (
  "TipoCliente","Nombres","Apellidos","TipoIdentificacion","NumeroIdentificacion",
  "Telefono","Correo","Direccion","FechaRegistro","Activo"
)
SELECT 'Natural',p.nombres,p.apellidos,'Cedula',
  '888'||to_char(p.nacimiento,'DDMMYY')||lpad(p.numero::text,4,'0')||'A',
  p.telefono,'cliente'||lpad(p.numero::text,2,'0')||'@example.invalid',
  p.direccion,now() AT TIME ZONE 'America/Managua',true
FROM (VALUES
 (1,'María Elena','López García',date '1988-03-14','75810001','Managua'),
 (2,'Carlos Andrés','Méndez Ruiz',date '1984-07-22','85810002','León'),
 (3,'Ana Lucía','Gutiérrez Mora',date '1991-11-05','57810003','Masaya'),
 (4,'José Manuel','Pérez Castillo',date '1980-01-29','75810004','Managua'),
 (5,'Rosa Isabel','Navarro Díaz',date '1993-05-18','85810005','Granada'),
 (6,'Luis Alberto','Torres Rivas',date '1986-09-09','57810006','Chinandega'),
 (7,'Karla Sofía','Hernández Cruz',date '1990-02-11','75810007','Matagalpa'),
 (8,'Miguel Ángel','Rivera López',date '1982-12-03','85810008','Managua'),
 (9,'Daniela Beatriz','Castro Reyes',date '1995-04-27','57810009','Estelí'),
 (10,'Ernesto Javier','Flores Pineda',date '1987-08-16','75810010','Rivas')
) AS p(numero,nombres,apellidos,nacimiento,telefono,direccion)
WHERE NOT EXISTS (
  SELECT 1 FROM nicar."Cliente" c WHERE c."Correo"=
    'cliente'||lpad(p.numero::text,2,'0')||'@example.invalid'
);

INSERT INTO nicar."Proveedor" (
  "TipoProveedor","NombreProveedor","IdentificacionFiscal","Pais","Ciudad","Telefono","Correo",
  "Contacto","FechaRegistro","Observaciones","Activo"
) VALUES
  ('Empresa','Importadora Demo Norte','DEMO-PROV-001','Nicaragua','Managua','75820001','ventas1@example.invalid','Contacto de demostración',now(),'Proveedor ficticio para capacitación.',true),
  ('Empresa','Vehículos del Pacífico Demo','DEMO-PROV-002','Nicaragua','León','85820002','ventas2@example.invalid','Contacto de demostración',now(),'Proveedor ficticio para capacitación.',true),
  ('Empresa','Motocicletas Centro Demo','DEMO-PROV-003','Nicaragua','Masaya','57820003','ventas3@example.invalid','Contacto de demostración',now(),'Proveedor ficticio para capacitación.',true)
ON CONFLICT DO NOTHING;

INSERT INTO nicar."TipoCosto" ("Nombre","Descripcion","Activo")
SELECT v.nombre,v.descripcion,true FROM (VALUES
  ('Inspección','Inspección mecánica previa a la adquisición.'),
  ('Transporte','Traslado de la unidad al patio.'),
  ('Mantenimiento','Mantenimiento preventivo documentado.'),
  ('Repuestos','Repuestos asociados al vehículo.'),
  ('Limpieza','Preparación y limpieza de la unidad.'),
  ('Trámite','Gestión documental de la unidad.')
) v(nombre,descripcion)
WHERE NOT EXISTS (SELECT 1 FROM nicar."TipoCosto" t WHERE t."Nombre"=v.nombre);

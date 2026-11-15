ALTER TABLE nicar."Cliente"
  ADD COLUMN IF NOT EXISTS "EdadDeclarada" smallint;

ALTER TABLE nicar."Usuario"
  ADD COLUMN IF NOT EXISTS "TipoDocumento" varchar(15),
  ADD COLUMN IF NOT EXISTS "NumeroDocumento" varchar(30),
  ADD COLUMN IF NOT EXISTS "EdadDeclarada" smallint;

UPDATE nicar."Usuario"
SET "TipoDocumento"='Cedula',
    "NumeroDocumento"="Cedula",
    "EdadDeclarada"=extract(year FROM age(
      (now() AT TIME ZONE 'America/Managua')::date,"Nacimiento"
    ))::smallint
WHERE "Rol"='Cliente' AND "Cedula" IS NOT NULL AND "Nacimiento" IS NOT NULL;

ALTER TABLE nicar."Usuario" DROP CONSTRAINT IF EXISTS "Usuario_check";
ALTER TABLE nicar."Usuario" ADD CONSTRAINT "Usuario_check"
CHECK (
  "Rol" <> 'Cliente' OR (
    "TipoDocumento" IS NOT NULL AND "NumeroDocumento" IS NOT NULL
    AND "EdadDeclarada" BETWEEN 18 AND 120
    AND (
      ("TipoDocumento"='Cedula' AND "Cedula"="NumeroDocumento"
        AND "Nacimiento" IS NOT NULL
        AND "Cedula" ~ '^[0-9]{13}[A-HJ-NP-Y]$'
        AND substr("Cedula",4,6)=to_char("Nacimiento",'DDMMYY'))
      OR
      ("TipoDocumento"='Pasaporte' AND "Cedula" IS NULL AND "Nacimiento" IS NULL
        AND length("NumeroDocumento") BETWEEN 5 AND 20
        AND "NumeroDocumento" ~ '^[A-Z0-9]+(-[A-Z0-9]+)*$')
      OR
      ("TipoDocumento"='Residencia' AND "Cedula" IS NULL AND "Nacimiento" IS NULL
        AND length("NumeroDocumento") BETWEEN 6 AND 20
        AND "NumeroDocumento" ~ '^[A-Z0-9]+(-[A-Z0-9]+)*$')
    )
  )
);

CREATE OR REPLACE FUNCTION nicar.validar_edad_cuenta()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  hoy date := (now() AT TIME ZONE 'America/Managua')::date;
BEGIN
  IF NEW."Rol"='Cliente' THEN
    IF NEW."TipoDocumento"='Cedula' THEN
      IF NEW."Nacimiento" IS NULL OR NEW."Nacimiento"+interval '18 years'>hoy THEN
        RAISE EXCEPTION USING ERRCODE='P1800', MESSAGE='Se requieren 18 anos cumplidos.';
      END IF;
      NEW."EdadDeclarada" := extract(year FROM age(hoy,NEW."Nacimiento"))::smallint;
    ELSIF NEW."TipoDocumento" IN ('Pasaporte','Residencia') THEN
      IF NEW."EdadDeclarada" IS NULL OR NEW."EdadDeclarada" NOT BETWEEN 18 AND 120 THEN
        RAISE EXCEPTION USING ERRCODE='P1800', MESSAGE='Se requiere una edad entre 18 y 120 anos.';
      END IF;
      NEW."Cedula" := NULL;
      NEW."Nacimiento" := NULL;
    ELSE
      RAISE EXCEPTION USING ERRCODE='P1800', MESSAGE='Selecciona cedula, pasaporte o residencia.';
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION nicar.validar_reserva()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  dia date := NEW."Inicio"::date;
  nacimiento date;
BEGIN
  IF NEW."Estado"='Cancelada' THEN RETURN NEW; END IF;
  IF NEW."Inicio"<=clock_timestamp() AT TIME ZONE 'America/Managua' THEN
    RAISE EXCEPTION USING ERRCODE='P1801', MESSAGE='La fecha u hora ya paso.';
  END IF;
  IF extract(isodow FROM NEW."Inicio")=7 OR NEW."Inicio"::time<time '08:00'
    OR NEW."Inicio"::time>time '16:15'
    OR mod(extract(epoch FROM (NEW."Inicio"::time-time '08:00'))::integer,2700)<>0 THEN
    RAISE EXCEPTION USING ERRCODE='P1811', MESSAGE='Atencion de lunes a sabado, de 8 a 17 horas, en turnos de 45 minutos.';
  END IF;

  IF NEW."IdUsuario" IS NOT NULL THEN
    SELECT u."Nacimiento",u."NombreCompleto" INTO nacimiento,NEW."Nombre"
    FROM nicar."Usuario" u
    WHERE u."IdUsuario"=NEW."IdUsuario" AND u."Activo" AND u."Rol"='Cliente'
      AND (
        (u."TipoDocumento"='Cedula' AND u."Nacimiento"+interval '18 years' <= (now() AT TIME ZONE 'America/Managua')::date)
        OR (u."TipoDocumento" IN ('Pasaporte','Residencia') AND u."EdadDeclarada" BETWEEN 18 AND 120)
      )
    FOR SHARE;
    IF NOT FOUND THEN
      RAISE EXCEPTION USING ERRCODE='P1802', MESSAGE='La cuenta debe ser de un cliente activo y mayor de edad.';
    END IF;
    NEW."FechaNacimientoReserva" := nacimiento;
  ELSIF NEW."FechaNacimientoReserva" IS NULL
    OR NEW."FechaNacimientoReserva"+interval '18 years'>(now() AT TIME ZONE 'America/Managua')::date THEN
    RAISE EXCEPTION USING ERRCODE='P1802', MESSAGE='La cita requiere una persona mayor de edad.';
  END IF;

  PERFORM pg_advisory_xact_lock(197341,dia-date '2000-01-01');
  SELECT u."IdUsuario" INTO NEW."IdVendedor" FROM nicar."Usuario" u
  WHERE u."Rol"='Vendedor' AND u."Activo" AND u."DisponibleCitas"
    AND (SELECT count(*) FROM nicar."Cita" c WHERE c."IdVendedor"=u."IdUsuario"
      AND c."Inicio"::date=dia AND c."IdCita"<>NEW."IdCita" AND c."Estado"<>'Cancelada')<12
    AND NOT EXISTS (SELECT 1 FROM nicar."Cita" c WHERE c."IdVendedor"=u."IdUsuario"
      AND c."Inicio"=NEW."Inicio" AND c."IdCita"<>NEW."IdCita" AND c."Estado"<>'Cancelada')
  ORDER BY (SELECT count(*) FROM nicar."Cita" c WHERE c."IdVendedor"=u."IdUsuario"
      AND c."Inicio"::date=dia AND c."Estado"<>'Cancelada'),u."IdUsuario"
  LIMIT 1 FOR SHARE OF u;
  IF NEW."IdVendedor" IS NULL THEN
    RAISE EXCEPTION USING ERRCODE='P1810', MESSAGE='No hay vendedor disponible para la fecha y hora seleccionadas.';
  END IF;
  SELECT n INTO NEW."Cupo" FROM generate_series(1,12) n
  WHERE NOT EXISTS (SELECT 1 FROM nicar."Cita" c WHERE c."IdVendedor"=NEW."IdVendedor"
    AND c."Inicio"::date=dia AND c."Cupo"=n AND c."IdCita"<>NEW."IdCita"
    AND c."Estado"<>'Cancelada') ORDER BY n LIMIT 1;
  RETURN NEW;
END $$;


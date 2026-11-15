ALTER TABLE nicar."Cita"
  ADD COLUMN IF NOT EXISTS "FechaNacimientoReserva" date;

CREATE OR REPLACE FUNCTION nicar.validar_reserva()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  dia date := NEW."Inicio"::date;
  nacimiento date;
BEGIN
  IF NEW."Estado" = 'Cancelada' THEN RETURN NEW; END IF;
  IF NEW."Inicio" <= clock_timestamp() AT TIME ZONE 'America/Managua' THEN
    RAISE EXCEPTION USING ERRCODE='P1801', MESSAGE='La fecha u hora ya pasó.';
  END IF;
  IF extract(isodow FROM NEW."Inicio") = 7 OR NEW."Inicio"::time < time '08:00'
    OR NEW."Inicio"::time > time '16:15'
    OR mod(extract(epoch FROM (NEW."Inicio"::time-time '08:00'))::integer,2700) <> 0 THEN
    RAISE EXCEPTION USING ERRCODE='P1811', MESSAGE='Atención de lunes a sábado, de 8 a 17 horas, en turnos de 45 minutos.';
  END IF;

  IF NEW."IdUsuario" IS NOT NULL THEN
    SELECT u."Nacimiento",u."NombreCompleto" INTO nacimiento,NEW."Nombre"
    FROM nicar."Usuario" u
    WHERE u."IdUsuario"=NEW."IdUsuario" AND u."Activo" AND u."Rol"='Cliente'
      AND u."Nacimiento"+interval '18 years' <= (now() AT TIME ZONE 'America/Managua')::date
    FOR SHARE;
    IF NOT FOUND THEN
      RAISE EXCEPTION USING ERRCODE='P1802', MESSAGE='La cuenta debe ser de un cliente activo y mayor de edad.';
    END IF;
    NEW."FechaNacimientoReserva" := nacimiento;
  ELSIF NEW."FechaNacimientoReserva" IS NULL
    OR NEW."FechaNacimientoReserva"+interval '18 years' > (now() AT TIME ZONE 'America/Managua')::date THEN
    RAISE EXCEPTION USING ERRCODE='P1802', MESSAGE='La cita requiere una persona mayor de edad.';
  END IF;

  PERFORM pg_advisory_xact_lock(197341,dia-date '2000-01-01');
  SELECT u."IdUsuario" INTO NEW."IdVendedor" FROM nicar."Usuario" u
  WHERE u."Rol"='Vendedor' AND u."Activo" AND u."DisponibleCitas"
    AND (SELECT count(*) FROM nicar."Cita" c WHERE c."IdVendedor"=u."IdUsuario"
      AND c."Inicio"::date=dia AND c."IdCita"<>NEW."IdCita" AND c."Estado"<>'Cancelada') < 12
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

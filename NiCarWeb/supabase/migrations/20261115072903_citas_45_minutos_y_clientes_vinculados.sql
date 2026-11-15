ALTER TABLE nicar."Cita" ADD COLUMN "Estado" varchar(12) NOT NULL DEFAULT 'Pendiente'
  CHECK ("Estado" IN ('Pendiente','Atendida','Cancelada')),
  ADD COLUMN "Fin" timestamp GENERATED ALWAYS AS ("Inicio"+interval '45 minutes') STORED;
DO $$ DECLARE c record; BEGIN
  FOR c IN SELECT conname FROM pg_constraint WHERE conrelid='nicar."Cita"'::regclass
    AND contype='c' AND pg_get_constraintdef(oid) LIKE '%Inicio%' LOOP
    EXECUTE format('ALTER TABLE nicar."Cita" DROP CONSTRAINT %I',c.conname);
  END LOOP;
END $$;
ALTER TABLE nicar."Cita" ADD CHECK (extract(isodow FROM "Inicio") BETWEEN 1 AND 6
  AND "Inicio"::time>=time '08:00' AND "Inicio"::time<=time '16:15'
  AND mod(extract(epoch FROM ("Inicio"::time-time '08:00'))::integer,2700)=0);
ALTER TABLE nicar."Cita" DROP CONSTRAINT "Cita_IdVehiculo_Inicio_key";
DROP INDEX nicar.cita_cupo_por_vendedor;
DROP INDEX nicar.cita_vendedor_horario;
CREATE UNIQUE INDEX cita_cupo_por_vendedor ON nicar."Cita" (("Inicio"::date),"IdVendedor","Cupo") WHERE "Estado"<>'Cancelada';
CREATE UNIQUE INDEX cita_vendedor_horario ON nicar."Cita" ("IdVendedor","Inicio") WHERE "Estado"<>'Cancelada';
CREATE UNIQUE INDEX cita_vehiculo_horario ON nicar."Cita" ("IdVehiculo","Inicio") WHERE "Estado"<>'Cancelada';
CREATE OR REPLACE FUNCTION nicar.validar_reserva() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
DECLARE dia date:=NEW."Inicio"::date;
BEGIN
  IF NEW."Estado"='Cancelada' THEN RETURN NEW; END IF;
  IF NEW."Inicio" <= clock_timestamp() AT TIME ZONE 'America/Managua' THEN
    RAISE EXCEPTION USING ERRCODE='P1801', MESSAGE='La fecha u hora ya pasó.';
  END IF;
  IF extract(isodow FROM NEW."Inicio")=7 OR NEW."Inicio"::time < time '08:00'
    OR NEW."Inicio"::time > time '16:15'
    OR mod(extract(epoch FROM (NEW."Inicio"::time-time '08:00'))::integer,2700)<>0 THEN
    RAISE EXCEPTION USING ERRCODE='P1811', MESSAGE='Atención de lunes a sábado de 8 a 17 horas en turnos de 45 minutos.';
  END IF;
  SELECT "NombreCompleto" INTO NEW."Nombre" FROM nicar."Usuario"
    WHERE "IdUsuario"=NEW."IdUsuario" AND "Activo" AND "Rol"='Cliente'
    AND "Nacimiento"+interval '18 years' <= (now() AT TIME ZONE 'America/Managua')::date FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE='P1802', MESSAGE='Se requiere un cliente activo mayor de edad.';
  END IF;
  PERFORM pg_advisory_xact_lock(197341,dia-date '2000-01-01');
  SELECT u."IdUsuario" INTO NEW."IdVendedor" FROM nicar."Usuario" u
    WHERE u."Rol"='Vendedor' AND u."Activo" AND u."DisponibleCitas"
    AND (SELECT count(*) FROM nicar."Cita" c WHERE c."IdVendedor"=u."IdUsuario"
      AND c."Inicio"::date=dia AND c."IdCita"<>NEW."IdCita" AND c."Estado"<>'Cancelada')<12
    AND NOT EXISTS(SELECT 1 FROM nicar."Cita" c WHERE c."IdVendedor"=u."IdUsuario"
      AND c."Inicio"=NEW."Inicio" AND c."IdCita"<>NEW."IdCita" AND c."Estado"<>'Cancelada')
    ORDER BY (SELECT count(*) FROM nicar."Cita" c WHERE c."IdVendedor"=u."IdUsuario"
      AND c."Inicio"::date=dia), u."IdUsuario" LIMIT 1 FOR SHARE OF u;
  IF NEW."IdVendedor" IS NULL THEN
    RAISE EXCEPTION USING ERRCODE='P1810', MESSAGE='No hay vendedor con cupo para ese horario.';
  END IF;
  SELECT n INTO NEW."Cupo" FROM generate_series(1,12) n WHERE NOT EXISTS(
    SELECT 1 FROM nicar."Cita" c WHERE c."IdVendedor"=NEW."IdVendedor"
      AND c."Inicio"::date=dia AND c."Cupo"=n AND c."IdCita"<>NEW."IdCita" AND c."Estado"<>'Cancelada') ORDER BY n LIMIT 1;
  RETURN NEW;
END $$;

DROP TRIGGER validar_reserva ON nicar."Cita";
CREATE TRIGGER validar_reserva BEFORE INSERT OR UPDATE OF "Inicio","IdUsuario","IdVendedor","Cupo" ON nicar."Cita"
  FOR EACH ROW EXECUTE FUNCTION nicar.validar_reserva();
ALTER TABLE nicar."Usuario" ADD COLUMN "IdCliente" integer UNIQUE REFERENCES nicar."Cliente";

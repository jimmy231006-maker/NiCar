ALTER TABLE nicar."Usuario" ADD COLUMN "DisponibleCitas" boolean NOT NULL DEFAULT true;
ALTER TABLE nicar."Cita" ADD COLUMN "IdVendedor" integer REFERENCES nicar."Usuario";
ALTER TABLE nicar."Cita" DROP CONSTRAINT "Cita_Cupo_check", DROP CONSTRAINT "Cita_Inicio_check";
ALTER TABLE nicar."Cita" ADD CHECK ("Cupo" BETWEEN 1 AND 12),
  ADD CHECK (extract(second FROM "Inicio")=0 AND extract(minute FROM "Inicio") IN (0,30)),
  ADD CONSTRAINT cita_horario CHECK (extract(isodow FROM "Inicio") BETWEEN 1 AND 6
    AND "Inicio"::time >= time '08:00' AND "Inicio"::time < time '17:00');
DROP INDEX nicar.cita_cupo_diario;
CREATE UNIQUE INDEX cita_cupo_por_vendedor ON nicar."Cita" (("Inicio"::date),"IdVendedor","Cupo");
CREATE UNIQUE INDEX cita_vendedor_horario ON nicar."Cita" ("IdVendedor","Inicio");
CREATE OR REPLACE FUNCTION nicar.validar_reserva() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
DECLARE dia date:=NEW."Inicio"::date;
BEGIN
  IF NEW."Inicio" <= clock_timestamp() AT TIME ZONE 'America/Managua' THEN
    RAISE EXCEPTION USING ERRCODE='P1801', MESSAGE='La fecha u hora ya pasó.';
  END IF;
  IF extract(isodow FROM NEW."Inicio")=7 OR NEW."Inicio"::time < time '08:00'
    OR NEW."Inicio"::time >= time '17:00' OR extract(minute FROM NEW."Inicio") NOT IN (0,30)
    OR extract(second FROM NEW."Inicio")<>0 THEN
    RAISE EXCEPTION USING ERRCODE='P1811', MESSAGE='Atención de lunes a sábado de 8 a 17 horas.';
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
      AND c."Inicio"::date=dia AND c."IdCita"<>NEW."IdCita")<12
    AND NOT EXISTS(SELECT 1 FROM nicar."Cita" c WHERE c."IdVendedor"=u."IdUsuario"
      AND c."Inicio"=NEW."Inicio" AND c."IdCita"<>NEW."IdCita")
    ORDER BY (SELECT count(*) FROM nicar."Cita" c WHERE c."IdVendedor"=u."IdUsuario"
      AND c."Inicio"::date=dia), u."IdUsuario" LIMIT 1 FOR SHARE OF u;
  IF NEW."IdVendedor" IS NULL THEN
    RAISE EXCEPTION USING ERRCODE='P1810', MESSAGE='No hay vendedor con cupo para ese horario.';
  END IF;
  SELECT n INTO NEW."Cupo" FROM generate_series(1,12) n WHERE NOT EXISTS(
    SELECT 1 FROM nicar."Cita" c WHERE c."IdVendedor"=NEW."IdVendedor"
      AND c."Inicio"::date=dia AND c."Cupo"=n AND c."IdCita"<>NEW."IdCita") ORDER BY n LIMIT 1;
  RETURN NEW;
END $$;

CREATE FUNCTION nicar.proteger_relaciones() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
  IF TG_OP='DELETE' OR (TG_OP='UPDATE' AND OLD."Activo" AND NOT NEW."Activo") THEN
    IF TG_TABLE_NAME='Marca' AND EXISTS(SELECT 1 FROM nicar."Modelo" WHERE "IdMarca"=OLD."IdMarca") THEN
      RAISE EXCEPTION USING ERRCODE='P1901', MESSAGE='La marca tiene modelos relacionados.';
    END IF;
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;
CREATE TRIGGER proteger_marca BEFORE DELETE OR UPDATE OF "Activo" ON nicar."Marca"
  FOR EACH ROW EXECUTE FUNCTION nicar.proteger_relaciones();

CREATE FUNCTION nicar.proteger_vendedor() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
  IF OLD."Rol"='Vendedor' AND (NOT NEW."Activo" OR NEW."Rol"<>'Vendedor') AND EXISTS(
    SELECT 1 FROM nicar."Cita" WHERE "IdVendedor"=OLD."IdUsuario"
      AND "Inicio">clock_timestamp() AT TIME ZONE 'America/Managua') THEN
    RAISE EXCEPTION USING ERRCODE='P1902', MESSAGE='El vendedor tiene citas futuras asignadas.';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER proteger_vendedor BEFORE UPDATE OF "Activo","Rol" ON nicar."Usuario"
  FOR EACH ROW EXECUTE FUNCTION nicar.proteger_vendedor();

ALTER TABLE nicar."Venta" DROP CONSTRAINT "Venta_IdVehiculo_key";
CREATE UNIQUE INDEX venta_activa_por_vehiculo ON nicar."Venta" ("IdVehiculo") WHERE "Activa";
ALTER TABLE nicar."Vehiculo" ADD COLUMN "FuenteImagen" text,
  ADD COLUMN "AutorImagen" varchar(150), ADD COLUMN "LicenciaImagen" varchar(100),
  ADD COLUMN "FotoReferencia" boolean NOT NULL DEFAULT false;
CREATE TABLE nicar."ImagenVehiculo" (
  "IdImagen" uuid PRIMARY KEY,
  "Contenido" bytea NOT NULL,
  "Tipo" text NOT NULL CHECK ("Tipo" IN ('image/jpeg','image/png','image/webp')),
  "IdUsuario" integer NOT NULL REFERENCES nicar."Usuario",
  "Creada" timestamptz NOT NULL DEFAULT now(),
  CHECK(octet_length("Contenido") BETWEEN 1 AND 3145728)
);
REVOKE ALL ON nicar."ImagenVehiculo" FROM PUBLIC,anon,authenticated;

ALTER TABLE nicar."Usuario" DROP CONSTRAINT "Usuario_Rol_check",
    ADD CHECK ("Rol" IN ('Cliente','Vendedor','Administrador','SuperAdministrador','Recepcionista','Bodega')),
    ADD COLUMN "Cedula" varchar(14) UNIQUE,
    ADD COLUMN "Nacimiento" date,
    ADD CHECK ("Rol" <> 'Cliente' OR ("Nacimiento" IS NOT NULL AND "Cedula" IS NOT NULL
        AND "Cedula" ~ '^[0-9]{13}[A-HJ-NP-Y]$' AND substr("Cedula",4,6) = to_char("Nacimiento",'DDMMYY')));

CREATE FUNCTION nicar.validar_edad_cuenta() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
    IF NEW."Rol" = 'Cliente' AND NEW."Nacimiento" + interval '18 years' > (now() AT TIME ZONE 'America/Managua')::date THEN
        RAISE EXCEPTION USING ERRCODE='P1800', MESSAGE='Se requieren 18 años cumplidos.';
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER edad_cliente BEFORE INSERT OR UPDATE OF "Rol","Nacimiento","Cedula" ON nicar."Usuario"
FOR EACH ROW EXECUTE FUNCTION nicar.validar_edad_cuenta();

ALTER TABLE nicar."Cita" ADD COLUMN "IdUsuario" integer REFERENCES nicar."Usuario", ADD COLUMN "Cupo" smallint;
WITH puestos AS (
    SELECT "IdCita", row_number() over(partition by "Inicio"::date order by "IdCita") AS n FROM nicar."Cita"
)
UPDATE nicar."Cita" c SET "Cupo" = p.n FROM puestos p WHERE c."IdCita"=p."IdCita";
ALTER TABLE nicar."Cita" ALTER COLUMN "Cupo" SET NOT NULL, ADD CHECK ("Cupo" BETWEEN 1 AND 10);
CREATE UNIQUE INDEX cita_cupo_diario ON nicar."Cita" (("Inicio"::date), "Cupo");
CREATE INDEX cita_usuario ON nicar."Cita" ("IdUsuario");

CREATE FUNCTION nicar.validar_reserva() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE dia date := NEW."Inicio"::date;
BEGIN
    IF NEW."Inicio" <= clock_timestamp() AT TIME ZONE 'America/Managua' THEN
        RAISE EXCEPTION USING ERRCODE='P1801', MESSAGE='La hora ya pasó.';
    END IF;
    SELECT "NombreCompleto" INTO NEW."Nombre" FROM nicar."Usuario"
        WHERE "IdUsuario" = NEW."IdUsuario" AND "Activo" AND "Rol"='Cliente'
          AND "Nacimiento" + interval '18 years' <= (now() AT TIME ZONE 'America/Managua')::date FOR SHARE;
    IF NOT FOUND THEN
        RAISE EXCEPTION USING ERRCODE='P1802', MESSAGE='Se requiere una cuenta de cliente activa y mayor de edad.';
    END IF;
    PERFORM pg_advisory_xact_lock(197341, dia - date '2000-01-01');
    SELECT n INTO NEW."Cupo" FROM generate_series(1,10) n
    WHERE NOT EXISTS (SELECT 1 FROM nicar."Cita" c WHERE c."Inicio"::date=dia AND c."Cupo"=n AND c."IdCita" <> NEW."IdCita")
    ORDER BY n LIMIT 1;
    IF NEW."Cupo" IS NULL THEN
        RAISE EXCEPTION USING ERRCODE='P1810', MESSAGE='Día sin cupos.';
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER validar_reserva BEFORE INSERT OR UPDATE OF "IdUsuario","Inicio","Cupo" ON nicar."Cita"
FOR EACH ROW EXECUTE FUNCTION nicar.validar_reserva();

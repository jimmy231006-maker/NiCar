CREATE TABLE nicar."Cita" (
    "IdCita" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "IdVehiculo" integer NOT NULL REFERENCES nicar."Vehiculo",
    "Nombre" varchar(100) NOT NULL CHECK (btrim("Nombre") <> ''),
    "Telefono" varchar(16) NOT NULL CHECK ("Telefono" ~ '^[+]?[0-9]{8,15}$'),
    "Inicio" timestamp without time zone NOT NULL CHECK (date_trunc('hour', "Inicio") = "Inicio"),
    UNIQUE ("IdVehiculo", "Inicio")
);
REVOKE ALL ON nicar."Cita" FROM PUBLIC, anon, authenticated;
CREATE INDEX ON nicar."Cita" ("Inicio");
ALTER TABLE nicar."Marca" ADD CHECK ("Nombre" ~ '[[:alpha:]]');
ALTER TABLE nicar."Modelo" ADD CHECK ("Nombre" ~ '[[:alpha:]]');
CREATE UNIQUE INDEX marca_nombre_normalizado ON nicar."Marca" (lower(btrim("Nombre")));
CREATE UNIQUE INDEX modelo_nombre_normalizado ON nicar."Modelo" ("IdMarca", lower(btrim("Nombre")));

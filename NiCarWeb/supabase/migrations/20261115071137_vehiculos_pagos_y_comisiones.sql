ALTER TABLE nicar."Vehiculo"
  ADD COLUMN "NumeroPuertas" smallint,
  ADD COLUMN "CilindrajeCc" integer,
  ADD COLUMN "PotenciaKw" numeric(10,2),
  ADD COLUMN "NumeroAsientos" smallint,
  ADD CONSTRAINT vehiculo_datos_tecnicos CHECK (
    ("NumeroPuertas" IS NULL OR "NumeroPuertas" BETWEEN 1 AND 6)
    AND ("CilindrajeCc" IS NULL OR "CilindrajeCc" > 0)
    AND ("PotenciaKw" IS NULL OR "PotenciaKw" > 0)
    AND ("NumeroAsientos" IS NULL OR "NumeroAsientos" BETWEEN 1 AND 100)
    AND ("TipoCarroceria" <> 'Motocicleta' OR "NumeroPuertas" IS NULL)
    AND ("Combustible" <> 'Eléctrico' OR "CilindrajeCc" IS NULL)
  );
ALTER TABLE nicar."Usuario" ADD COLUMN "PorcentajeComision" numeric(5,2) NOT NULL DEFAULT 0
  CHECK ("PorcentajeComision" BETWEEN 0 AND 100);
ALTER TABLE nicar."Venta"
  ADD COLUMN "IdVendedor" integer REFERENCES nicar."Usuario",
  ADD COLUMN "PorcentajeComision" numeric(5,2) NOT NULL DEFAULT 0
    CHECK ("PorcentajeComision" BETWEEN 0 AND 100),
  ADD COLUMN "ComisionUSD" numeric(18,2) NOT NULL DEFAULT 0 CHECK ("ComisionUSD" >= 0),
  ADD COLUMN "TasaCambio" numeric(18,6),
  ADD COLUMN "TotalNIO" numeric(18,2),
  ADD COLUMN "MontoCobradoNIO" numeric(18,2),
  ADD COLUMN "RedondeoEfectivoNIO" numeric(18,2),
  ADD COLUMN "RecibidoNIO" numeric(18,2),
  ADD COLUMN "CambioNIO" numeric(18,2),
  ADD COLUMN "DetalleCambio" jsonb,
  ADD CONSTRAINT venta_conversion CHECK (
    "TasaCambio" IS NULL OR ("TasaCambio" > 0 AND "TotalNIO" >= 0
      AND "MontoCobradoNIO" >= 0 AND "CambioNIO" >= 0)
  );
CREATE INDEX venta_vendedor_mes ON nicar."Venta" ("IdVendedor","FechaVenta");

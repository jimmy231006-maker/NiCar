-- Permite identificar vehículos nuevos sin placa y mantener el kilometraje real de usados.
ALTER TABLE nicar."Vehiculo"
  ADD COLUMN IF NOT EXISTS "Condicion" varchar(10) NOT NULL DEFAULT 'Usado';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'Vehiculo_Condicion_Consistente'
      AND conrelid = 'nicar."Vehiculo"'::regclass
  ) THEN
    ALTER TABLE nicar."Vehiculo"
      ADD CONSTRAINT "Vehiculo_Condicion_Consistente"
      CHECK (
        "Condicion" = 'Usado'
        OR (
          "Condicion" = 'Nuevo'
          AND "Kilometraje" = 0
          AND "Placa" IS NULL
          AND "EstadoMatricula" = 'Pendiente'
        )
      );
  END IF;
END $$;

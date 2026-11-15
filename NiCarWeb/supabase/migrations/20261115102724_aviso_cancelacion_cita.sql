ALTER TABLE nicar."Cita"
  ADD COLUMN IF NOT EXISTS "MotivoCancelacion" varchar(500),
  ADD COLUMN IF NOT EXISTS "CanceladaPor" integer REFERENCES nicar."Usuario"("IdUsuario"),
  ADD COLUMN IF NOT EXISTS "AvisoClienteLeido" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "AvisoLeidoEn" timestamptz;

CREATE INDEX IF NOT EXISTS "Cita_AvisoCancelacion_idx"
  ON nicar."Cita" ("IdUsuario", "Inicio")
  WHERE "Estado" = 'Cancelada' AND NOT "AvisoClienteLeido";

REVOKE ALL ON nicar."Cita" FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON nicar."Cita" TO postgres;

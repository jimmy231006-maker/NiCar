ALTER TABLE nicar."Usuario" ALTER COLUMN "PorcentajeComision" SET DEFAULT 5;
UPDATE nicar."Usuario" SET "PorcentajeComision"=5 WHERE "PorcentajeComision"<>5;
ALTER TABLE nicar."Usuario" DROP CONSTRAINT IF EXISTS "Usuario_PorcentajeComision_check";
ALTER TABLE nicar."Usuario" ADD CONSTRAINT usuario_comision_fija CHECK ("PorcentajeComision"=5);

ALTER TABLE nicar."Usuario"
  DROP CONSTRAINT IF EXISTS "Usuario_Rol_check";

ALTER TABLE nicar."Usuario"
  ADD CONSTRAINT "Usuario_Rol_check"
  CHECK ("Rol" = ANY (ARRAY[
    'Cliente', 'Vendedor', 'Caja', 'Administrador',
    'SuperAdministrador', 'Recepcionista', 'Bodega'
  ]::text[]));

ALTER TABLE nicar."Cita"
  ALTER COLUMN "IdUsuario" SET NOT NULL;

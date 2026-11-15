DROP TRIGGER IF EXISTS edad_cliente ON nicar."Usuario";

CREATE TRIGGER edad_cliente
BEFORE INSERT OR UPDATE OF "Rol","Nacimiento","Cedula","TipoDocumento","NumeroDocumento","EdadDeclarada"
ON nicar."Usuario"
FOR EACH ROW EXECUTE FUNCTION nicar.validar_edad_cuenta();


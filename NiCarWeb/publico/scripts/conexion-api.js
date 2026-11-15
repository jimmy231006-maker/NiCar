export async function consultarApi(ruta, metodo = 'GET', datos) {
  const respuesta = await fetch('/api' + ruta, {
    method: metodo,
    headers: metodo === 'GET' ? {} : { 'Content-Type': 'application/json' },
    body: datos === undefined ? undefined : JSON.stringify(datos)
  });
  const datosRecibidos = await respuesta.json();
  if (!respuesta.ok) {
    throw new Error(datosRecibidos.error || 'No se pudo completar la solicitud.');
  }
  return datosRecibidos;
}
export const estado = { usuario: null, vehiculos: [], modulos: [] };
export async function actualizarUsuario() {
  estado.usuario = await consultarApi('/sesion');
}

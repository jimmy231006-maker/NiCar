import { consultarApi, estado } from './conexion-api.js';
import { contenido, crearElemento, mostrarTitulo, tabla, mostrarAviso } from './elementos.js';
import { fechaDeHoy } from './validaciones.js';

export async function mostrarComisiones() {
  mostrarTitulo(estado.usuario.Rol === 'Vendedor' ? 'Mis comisiones' : 'Comisiones del personal');
  const mes = crearElemento('input', {
    type: 'month', value: fechaDeHoy().slice(0, 7), 'aria-label': 'Mes de las comisiones'
  });
  const resultados = crearElemento('section');
  const actualizar = async () => {
    try {
      const datos = await consultarApi('/comisiones?mes=' + encodeURIComponent(mes.value));
      resultados.replaceChildren(tabla(datos));
    } catch (problema) {
      mostrarAviso(problema.message);
    }
  };
  mes.addEventListener('change', actualizar);
  contenido.append(crearElemento('p', {}, 'Importes en USD. La comisión usa el porcentaje guardado en cada venta.'), mes, resultados);
  await actualizar();
}

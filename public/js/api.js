export async function api(path,method='GET',data) {
  const response=await fetch('/api'+path,{method,headers:method==='GET'?{}:{'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data)});
  const payload=await response.json();
  if(!response.ok) throw new Error(payload.error||'No se pudo completar la solicitud.');
  return payload;
}
export const state={user:null,cars:[],modules:[]};
export async function refreshUser() { state.user=await api('/me'); }

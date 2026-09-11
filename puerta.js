/* Puerta de entrada de la versión publicada: pide la clave, descifra los datos en este navegador y arranca el tablero.
   La clave no se envía a ningún servidor. */
(function () {
  'use strict';
  const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  async function abrir(clave, sobre) {
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(clave), 'PBKDF2', false, ['deriveKey']);
    const llave = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: b64(sobre.sal), iterations: sobre.iter, hash: 'SHA-256' },
      base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    const claro = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(sobre.iv) }, llave, b64(sobre.datos));
    const flujo = new Blob([claro]).stream().pipeThrough(new DecompressionStream('gzip'));
    return JSON.parse(await new Response(flujo).text());
  }
  const puerta = document.getElementById('puerta');
  const inp = document.getElementById('pClave');
  const btn = document.getElementById('pEntrar');
  const err = document.getElementById('pErr');
  let sobre = null;
  const listo = fetch('contenido.bin', { cache: 'no-store' }).then(r => r.json()).then(s => { sobre = s; })
    .catch(() => { err.textContent = 'No se pudo cargar el contenido. Recargue la página.'; });

  async function entrar(clave, silencioso) {
    await listo;
    if (!sobre) return;
    btn.disabled = true; btn.textContent = 'Abriendo…'; err.textContent = '';
    try {
      const D = await abrir(clave, sobre);
      sessionStorage.setItem('clave_sucre', clave);
      puerta.remove();
      T.iniciar(D);
    } catch (e) {
      sessionStorage.removeItem('clave_sucre');
      if (!silencioso) err.textContent = 'Esa clave no abre el tablero. Revísela con quien se la compartió.';
      btn.disabled = false; btn.textContent = 'Entrar';
      inp.value = ''; inp.focus();
    }
  }
  btn.addEventListener('click', () => entrar(inp.value.trim()));
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') entrar(inp.value.trim()); });
  let guardada = null;
  try { guardada = sessionStorage.getItem('clave_sucre'); } catch (e) { guardada = null; }
  if (guardada) entrar(guardada, true); else setTimeout(() => inp.focus(), 60);
})();

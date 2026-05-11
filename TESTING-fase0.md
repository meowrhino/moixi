# TESTING — fase 0 (smoke test)

> Verificación rápida tras renombrar el proyecto a `moixi` y reorganizar el repo. Tiempo estimado: **5 minutos**.

## arranque

Abre una terminal en la raíz del repo (`/Users/manu/Documents/GitHub/moixi`) y lanza:

```bash
python3 -m http.server 8000
```

Si no tienes Python a mano, vale también:

```bash
npx http-server -p 8000
```

Deja el servidor corriendo. No cierres esa terminal.

---

## test 1 · player con el ejemplo

Abre en el navegador:

```
http://localhost:8000/play.html?game=examples/garden.json
```

**Qué tiene que pasar:**
- [ ] Se carga un canvas con un jardín pixelado, sin errores en consola (`F12` para verla).
- [ ] El avatar aparece en pantalla.
- [ ] Con `↑ ↓ ← →` se mueve por el grid.
- [ ] En móvil/touch: aparece un D-pad SVG flotante abajo que también mueve.
- [ ] Al chocar contra el zorro, sale un diálogo (caja de texto). Espacio o click avanza.
- [ ] Si pisas una flor, desaparece. Mira si hay algún indicador de inventario (puede que no, depende del juego de ejemplo).
- [ ] Si recoges 3+ flores y vas al exit (probablemente abajo), se cambia de room a `forest`.
- [ ] Si intentas pasar al exit sin las 3 flores, no debe dejarte.

**Si algo falla:** anótalo. No intentes fixearlo aún — pasa a la Fase 1 del plan donde recopilamos bugs.

---

## test 2 · editor

Abre:

```
http://localhost:8000/
```

(eso es `index.html`)

**Qué tiene que pasar:**
- [ ] Se ve la toolbar con: mascota (gato-rinoceronte 8x8) + texto "moixi" + tabs `world / sprite / palette / play` + botones `cargar / json / exportar html`.
- [ ] Los 4 tabs son clickables y cambian el contenido del workspace.
- [ ] El tab `world` muestra una lista de rooms y un grid editable.
- [ ] El tab `sprite` muestra editor de pixel art.
- [ ] El tab `palette` muestra los colores.
- [ ] El tab `play` muestra una preview en vivo del juego dentro del editor.
- [ ] En el footer pone `▮ meowrhino studio · vanilla, forever`.

**Verifica también que el brand dice "moixi"** (no `<NAME>`, no `mosi-vanilla-engine`). Eso es lo que estamos validando de la Fase 0.

---

## test 3 · export HTML standalone

Dentro del editor:

1. Pulsa el botón `exportar html`.
2. Se debe descargar un archivo `.html` (probablemente con el nombre del juego, ej. `garden.html`).
3. **Cierra el servidor local** (`Ctrl+C` en la terminal donde corre `http.server`) para asegurar que el HTML descargado es realmente standalone.
4. Abre el `.html` descargado haciendo doble-click desde Finder (eso lo abre con `file://`).

**Qué tiene que pasar:**
- [ ] El HTML se abre y se ve el canvas con el jardín, sin errores en consola.
- [ ] El avatar se mueve.
- [ ] El zorro habla.
- [ ] Funciona todo igual que con el servidor.
- [ ] En el footer del player pone `made with moixi` (no `made with mosi-vanilla-engine`).

Si esto falla, es bug a anotar para Fase 1.

---

## test 4 · autosave del editor (opcional)

1. Vuelve a arrancar `python3 -m http.server 8000`.
2. Abre `http://localhost:8000/` (editor).
3. Cambia algo (ej. un color de la paleta, o un pixel de un sprite).
4. Recarga la página (`Cmd+R`).
5. **Qué tiene que pasar:** el cambio se mantiene (autosave en `localStorage` key `mosi:editor:game`).

Para empezar de cero después: en la consola del navegador, `localStorage.clear()` y recarga.

---

## qué reportarme

Cuando termines:

1. ✅ Si todo ha ido bien: dime "F0 OK" y pasamos a Fase 1.
2. ⚠️ Si algo falla: copiame el mensaje de error de la consola (o describe qué no funciona y en qué test). Lo arreglamos en Fase 1.
3. 💡 Si encuentras algo "raro" pero no roto (estética fea, falta algo obvio): apuntalo, lo metemos en Fase 1 o Fase 2 según corresponda.

No hace falta que ejecutes los 4 tests ahora mismo si solo quieres validar Fase 0 — con el test 1 y el test 2 basta para confirmar que el repo renombrado funciona.

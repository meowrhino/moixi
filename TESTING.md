# TESTING.md

> Checkpoints manuales para verificar que cambios no rompen lo que ya funciona.
> Marca con `[x]` cuando los pases. Re-pásalos antes de cualquier release.

## examples disponibles

- **`examples/garden.json`** — el juego "narrativo" de muestra: jardín con zorro, flores, dos rooms (`garden` ↔ `forest`). Usa: avatar animado, items, wall, condition en script (vía fox dialog), música, dos paletas.
- **`examples/test-all.json`** — example mínimo que ejercita TODOS los módulos en pocas pantallas: walls, items, NPC con `set-var`+`if/else`, puerta con condición sobre inventario (`set-sprite-wall`), 2 rooms con palettes y músicas distintas, exits sin condición, tags inline (`{wavy}`, `{shaky}`, `{color}`, `{position}`, `{delay}`, `{b}`, `{p}`).

Cuando cambies código que afecta a varios módulos, **prueba primero `test-all.json`** (es más rápido) y luego `garden.json` (más realista).

## verificación rápida (≤2 min)

- [ ] `node --check` pasa en todos los `.js` del repo.
- [ ] Levantar server: `python3 -m http.server 8000`.
- [ ] Abrir `http://localhost:8000/play.html`. **Esperado**: el juego del jardín carga, se ve el avatar, se escucha la melodía calm al cabo de 1 segundo (tras un click/keystroke para activar audio context).

## flujo end-to-end del player

- [ ] Mover con flechas: el avatar se mueve.
- [ ] Mover contra una pared (`wall`): el avatar NO se mueve.
- [ ] Caminar sobre una flor (`flower`): aparece diálogo, sube `{item-count flor}`.
- [ ] Tocar al zorro con <3 flores: dice "trae 3 flores y te muestro un sitio".
- [ ] Recoger ≥3 flores. Tocar al zorro: aparece "toma, te enseño" y teletransporta a `forest`. La música cambia a `mystery`.
- [ ] En `forest`, salir por la posición (7, 15) o (8, 15): vuelve a `garden`.
- [ ] Refrescar la página: el estado se resetea (lo esperado, no hay autosave en player aún).
- [ ] En consola del navegador: `MOSI.api.save.saveToURL()`. Copiar la URL. Abrir en otra pestaña: el avatar aparece donde estaba con vars/inventario.

## flujo test-all (≤3 min) — ejercita todos los módulos

Cargar: `http://localhost:8000/play.html?game=examples/test-all.json`.

- [ ] Carga sin errores en consola. Intro: `{wavy}test-all{/wavy}` + segunda página con texto en `{color 3}`.
- [ ] Música `tema a` (square) suena al primer click/keystroke.
- [ ] `r1` se ve: paredes en los 4 bordes (excepto un hueco donde está la puerta), letrero, llave, npc, puerta.
- [ ] **Vars + condicional**: tocar el `npc`. Primera vez dice "primera vez", `{set-var hablado 1}`. Segunda vez dice "ya me hablaste" en `{color 4}` (índice 4 = `#a83e3e` rust).
- [ ] **Inventario**: pisar la `key`. Diálogo `{shaky}+1 llave{/shaky}`, luego `llaves: 1`.
- [ ] **Item-count + set-sprite-wall**: con 0 llaves, intentar pasar por la `door` → diálogo "cerrado". Con 1 llave (recogida), tocar la puerta → "se abre", `{set-sprite-wall false}`, `{dec-item-count llave}`. Ahora se puede caminar a través de ella.
- [ ] **Exit room**: cruzar la puerta y salir por (15, 8) → entras a `r2`. Música cambia a `tema b` (sine). Palette cambia a `p2` (oscura). `enterScript` muestra `{wavy}r2 · música b{/wavy}`.
- [ ] **Exit de vuelta**: en `r2`, mover hasta (0, 8) → vuelves a `r1` en (14, 8).
- [ ] **Letrero (delay + b + var/item-count read)**: tocar el `sign`. Esperar 5 frames (delay). Aparecen 3 líneas: "vars demo", "hablado=1" (si hablaste), "llaves=N". Verifica que los valores son correctos.

## flujo end-to-end del editor

- [ ] Abrir `http://localhost:8000/`. Carga el editor con el jardín.
- [ ] Tab **sprites**: ver lista (avatar, wall, flower, fox, tree, sign). Seleccionar fox. Aparece el pixel art editor.
- [ ] Pintar un pixel en el fox. La preview a la izquierda se actualiza.
- [ ] Cambiar el script del fox en el textarea derecho. El indicador `● sin guardar` aparece.
- [ ] Tab **world**: ver dos rooms. Cambiar el palette del `garden` a `dusk` en el dropdown. Ver que cambia el preview de los sprites en el grid.
- [ ] En el panel derecho, seleccionar la flor como pincel y pintar varias en el grid.
- [ ] Tab **paletas**: cambiar el primer color de `morning` con el color picker. El preview del color en la lista se actualiza.
- [ ] Tab **play**: pulsar "▶ play / restart". El juego corre con los cambios.
- [ ] El panel de debug a la derecha muestra room, pos, vars, inv en tiempo real.
- [ ] Pulsar "json" en la toolbar: descarga un `.json`. Verificar que es JSON válido y parseable.
- [ ] Pulsar "exportar html": descarga un `.html`. Abrirlo directamente (file://). **Esperado**: el juego corre standalone, audio funciona tras primer click.
- [ ] Recargar el editor: el autosave restaura los cambios.

## flujo de importación

- [ ] Pulsar "cargar". Seleccionar el JSON exportado anteriormente. Carga sin errores. El editor refleja el estado guardado.
- [ ] Editar el `examples/garden.json` a mano (cambiar el nombre del juego). Pulsar "cargar" con ese JSON. El cambio se refleja.

## móvil (Chrome DevTools en modo responsive)

- [ ] Abrir player. El D-pad SVG aparece en la esquina inferior derecha.
- [ ] Tap en los direccionales: el avatar se mueve.
- [ ] Tap en el botón central (action): si hay diálogo, avanza.
- [ ] Abrir editor. El layout 3-columnas se rompe a 1 columna (verificar viewport ≤900px).

## tests automáticos (futuro)

- [ ] Crear `tests/` con tests de cada módulo en aislamiento (mock del DOM con `happy-dom` o similar **sin requerir build**, o tests en Node-only para módulos puros).
- [ ] CI: `.github/workflows/test.yml` corre `node --check` + tests de unidad.

## bugs conocidos a verificar primero

- En el escritorio, audio context puede no arrancar hasta primer keydown.
- Si exportas HTML y abres con file://, algunos navegadores bloquean `data:` URLs en imports. **Probar con Chrome y Firefox.**
- Caché de bitmaps en `sprites.js` no se invalida cuando cambias el `colorIndex` por el nombre (vs índice). Hay que mirarlo si se reporta.
- El parser de `dialog.js` no soporta `{if ... {else} ... {/if}}` aún en todos los casos. La sintaxis simple sin else suele funcionar.

# ROADMAP.md

> Tareas pendientes ordenadas por prioridad. Cada tarea con criterios de "done" claros.
> Marca `[x]` cuando esté completada. Si te bloqueas, déjala con `[~]` y pasa a la siguiente.

## leyenda

- `[ ]` pendiente
- `[~]` en progreso / bloqueada
- `[x]` completada
- 🟢 fácil (un módulo nuevo enchufado a hooks existentes)
- 🟡 media (toca varios módulos o tiene UI)
- 🔴 difícil (cambio arquitectónico, deps complejas, scope amplio)

---

## fase 0 — afinar lo que ya hay antes de añadir más

- [x] 🟢 **Renombrar el proyecto a `moixi`.** Find/replace global aplicado a `CLAUDE.md`, `README.md`, `DESIGN.md`, `editor/editor.js`, `editor/export.js`.
- [ ] 🟢 **Probar el flujo end-to-end** con `examples/garden.json` y dejar checkpoints anotados en `TESTING.md`. Específicamente:
  - cargar editor, editar el zorro, exportar HTML, abrir HTML → debe correr aislado.
  - editar paleta, autosave debe persistir en recargar.
  - el preview en vivo debe reflejar cambios al pulsar play.
- [ ] 🟡 **Corregir bugs descubiertos en testing.** Probable: caché de sprites no se invalida al cambiar `colorIndex` por nombre, room exits sin `condition` evaluable porque `script-mosi` no expone `eval` correctamente al módulo `world`.
- [ ] 🟢 **Reemplazar el `window.MOSI` global por inyección via `setup(core)`** en los módulos que aún lo usan (`walls.js`, `dialog.js` lo usa parcialmente para `MOSI.api.palettes.color`). Es accesible pero rompe la pureza de la arquitectura.

---

## fase 1 — estética meowrhino studio

- [ ] 🟢 **Mascota gato-rinoceronte 8x8.** Crear `assets/mascot.svg` con un bicho pixel (cabeza de gato, cuerno de rinoceronte). Usarlo como:
  - favicon del editor y del player.
  - logo junto al brand "moixi" en la toolbar.
  - "firma" en el footer del player exportado.
- [ ] 🟢 **Paleta studio extendida.** Añadir un quinto color en `style.css` (`--coral: #ef7d57` o similar) y usarlo en estados especiales (hover de elementos activos, badges de "nuevo").
- [ ] 🟢 **Footer firma.** En `play.html` y en el HTML exportado: `made in Barcelona ☼ vanilla, forever` o lo que prefiera Manu.
- [ ] 🟡 **Cursor personalizado en el editor.** SVG del bicho como cursor en las zonas creativas (paint canvas, room grid).
- [ ] 🟢 **Separadores tipográficos.** Reemplazar las líneas `border-bottom` planas por glifos `▮▰▱◆` distribuidos como pattern. Documentar en `DESIGN.md`.
- [ ] 🟢 **Splash al cargar el editor.** Pantallita de medio segundo con el bicho y el nombre antes de mostrar la UI.

---

## fase 2 — quality-of-life del editor

- [ ] 🟡 **Undo/redo global.** Módulo `undo-redo` que escucha `editor:change` y guarda snapshots en `state.history.past`. Atajos `Z`/`Y` o `Cmd-Z`. Máximo 50 snapshots.
- [ ] 🟢 **Confirmación antes de cerrar.** `window.onbeforeunload` si `state.dirty === true`.
- [ ] 🟡 **Lista de paletas con preview en sprite editor.** Cuando estás editando un sprite, poder ver al lado la lista de paletas y cambiar cuál se usa para preview (sin cambiar la paleta del sprite).
- [ ] 🟡 **Bucket fill y dropper en el paint canvas.** Hoy solo hay pencil. Añadir flood-fill (`B`) y eyedropper (`I`).
- [ ] 🟢 **Atajos de teclado en el editor.** Documentarlos: `1234` = tabs, `+/-` = añadir/borrar, `space` = play en preview.
- [ ] 🟡 **Onion skin entre frames** en el sprite editor: cuando estás en el frame 1, dibujar el frame 0 al 20% de opacidad de fondo.
- [ ] 🟡 **Drag & drop de JSON en el editor.** Soltar un `.json` sobre la ventana lo carga como juego.

---

## fase 3 — features visuales del runtime

- [ ] 🟢 **`modules/render/transitions.js`** — fade/wipe/pixelate al cambiar de room. Se engancha a `roomEnter`. Añade `room.transition: 'fade'|'wipe'|'pixelate'`.
- [ ] 🟡 **`modules/render/lighting.js`** — radio de luz por sprite, `ambient` por room. Hook `render:fg`. Plantilla concreta ya está en el README, sección "crear un módulo nuevo". Añade `room.ambient` y `sprite.lightRadius`.
- [ ] 🟡 **`modules/render/camera.js`** — modos `flip` (default), `follow`, `smooth`. Hook `tick`. Añade `world.cameraMode`. Atención: requiere que `render:tiles` y `render:sprites` apliquen un offset; el canvas se queda fijo pero se pinta desplazado.
- [ ] 🟡 **`modules/render/layers.js`** — z-ordering por sprite con `sprite.layer: 0..3`. Hook `render:bg/tiles/sprites/fg`. Reescribir el orden de pintado de `sprites.js` para respetar layer.
- [ ] 🔴 **`modules/render/parallax.js`** — capas con scroll diferencial. Depende de `layers` y `camera`. Añade `layer.parallax: 0..1`.
- [ ] 🟡 **`modules/render/particles.js`** — sistema simple. Hook `render:sprites`, `tick`. Funciones de script `{emit kind x y}`, `{emit-burst kind x y}`.
- [ ] 🟢 **`modules/render/screenshot.js`** — captura del canvas a PNG y descarga / share. API `core.api.screenshot.png()`.
- [ ] 🟡 **`modules/render/gif-recorder.js`** — grabar el canvas durante N segundos y descargar GIF. Sin libs: o usa `gif.js` cargado desde CDN con fallback, o se hace en WASM. (Si toca añadir dep, mejor opcional con CDN y fallback claro.)
- [ ] 🟡 **`modules/render/dayNight.js`** — ciclo temporal que afecta a paletas. Hook `tick`. Añade `world.dayLength`, `palette.timeOfDay`.

---

## fase 4 — audio

- [ ] 🟡 **`modules/audio/tracker.js`** — un tracker multi-canal más serio que el actual `beeps.js`. Mantiene `beeps.js` como dependencia simple.
- [ ] 🟢 **`modules/audio/samples.js`** — `game.sounds[id] = base64 | url`. Script fn `{play-sound id}`.
- [ ] 🟢 **`modules/audio/tts-voices.js`** — usa `SpeechSynthesis` nativo. Función de script `{voice on|off}`. `sprite.voice: { pitch, rate, voiceName }`.
- [ ] 🟢 **`modules/audio/ducking.js`** — baja el volumen de la música mientras hay diálogo abierto. Hook a `dialog:open/close` (añadir esos eventos en `dialog.js`).

---

## fase 5 — scripting avanzado

- [ ] 🟡 **`modules/script/script-js.js`** — motor alternativo que ejecuta JavaScript en sandbox. `new Function('api', code)(api)` con `api` curado. Permite usar `core.api` cómodamente. Se elige por sprite: `sprite.scriptLang: 'mosi'|'js'`.
- [ ] 🔴 **`modules/script/script-visual.js`** — DAG de nodos serializado a JSON, render SVG en el editor. Inspired by Whimtale.
- [ ] 🟡 **`modules/script/flow.js`** — funciones de control de flujo: `{delay N}`, `{loop N ...}`, `{break}`, `{return}`.
- [ ] 🟢 **`modules/script/repl.js`** — consola in-game (tecla `~`) para ejecutar funciones del lenguaje a mano. Útil para debug y diseño.

---

## fase 6 — persistencia y distribución

- [ ] 🟢 **Verificar `save-url` (ya implementado).** Test: jugar un rato, llamar `core.api.save.saveToURL()`, copiar URL, abrir en otra pestaña, debe reanudar. Documentar.
- [ ] 🟡 **`modules/persistence/save-slots.js`** — múltiples slots con thumbnail (canvas → dataURL). UI mínima.
- [ ] 🔴 **`modules/persistence/save-codeberg.js`** — OAuth a Codeberg/GitHub, push a un gist privado. Sin servidor. Requiere abrir popup OAuth.
- [ ] 🟡 **`modules/dist/dist-neocities.js`** — botón en el editor "publicar a Neocities" usando el [Neocities API](https://neocities.org/api). Pide API key, sube el HTML exportado. **No guarda la key en localStorage por defecto** (ofrecer toggle).
- [ ] 🟡 **`modules/dist/dist-remix.js`** — el HTML exportado incluye un botón oculto (`?edit` en URL) que reabre el JSON en una instancia del editor. Necesita que el editor pueda recibir un JSON via `postMessage` o URL hash.
- [ ] 🟢 **Generar `.github/workflows/build.yml`** opcional desde el editor: una Action que recompila el HTML al hacer push al repo. Solo el archivo, sin lógica especial.

---

## fase 7 — colaboración (los hits)

- [ ] 🔴 **`modules/collab/webrtc.js`** — edición en tiempo real entre dos editores. Stack: WebRTC nativo + [Yjs](https://github.com/yjs/yjs) cargado desde CDN como ES module. Sincroniza `state.game`. Test: dos navegadores, cambio en uno aparece en el otro.
- [ ] 🔴 **`modules/collab/presence.js`** — muestra el cursor del peer (qué room está viendo, qué sprite tiene seleccionado). Depende de `webrtc`.
- [ ] 🔴 **`modules/persistence/diff-merge.js`** — dado dos JSONs del mismo juego, fusiona o lista conflictos. Útil para git workflow.

---

## fase 8 — accesibilidad y mobile

- [ ] 🟢 **`aria-live` en el diálogo.** Ya está parcialmente. Verificar que un screen reader anuncia el texto a medida que se escribe.
- [ ] 🟡 **Navegación 100% por teclado en el editor.** Tab order coherente, focus visible, atajos documentados en un panel de ayuda.
- [ ] 🟡 **Modo daltonismo.** Toggle que aplica filtros CSS al canvas para previsualizar protanopia/deuteranopia/tritanopia.
- [ ] 🟡 **PWA del editor.** `manifest.webmanifest` + service worker que cachea todos los archivos. Editor funciona offline.
- [ ] 🟡 **Editor responsive en móvil.** El layout 3-columnas se rompe a 1-columna. El paint canvas necesita zoom para que se pueda pintar con el dedo (hoy es muy pequeño).

---

## fase 9 — long shots / ideas locas

- [ ] 🔴 **`modules/editor/font.js`** — editor de fuente bitmap glyph a glyph, custom para el diálogo. Sería único en el ecosistema bitsy-like.
- [ ] 🔴 **`modules/editor/procedural.js`** — generador procedural de rooms con seed (Mosi lo hacía al arrancar). Algoritmos: wave function collapse simple, cellular automata para cuevas, random walks para caminos.
- [ ] 🔴 **`modules/multiplayer/async.js`** — el mundo es un repo git. Cada jugador hace pull, juega, sus huellas se commitean. Otro jugador hace pull mañana y ve dónde estuvo el anterior. Brutalmente experimental.
- [ ] 🔴 **`modules/script/visual-dag.js`** — un editor visual de scripts tipo Blender shader nodes, en SVG vanilla. Para no-coders.

---

## notas de versionado

- Por ahora vivimos en `0.x.y`.
- Bump de minor (`0.1 → 0.2`) cuando se completa una fase entera.
- Bump de patch cuando se cierran 3-4 tareas de la fase actual.
- Tag de git por cada minor para que el HTML exportado sea reproducible.

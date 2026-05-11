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
- [x] 🟢 **Reemplazar el `window.MOSI` global por inyección via `setup(core)`** en los módulos que aún lo usan. Aplicado a `walls.js`, `world.js`, `dialog.js` y `canvas.js`. Solo queda la exposición intencional en `core/index.js:28` para debug y HTML standalone.

---

## fase 1 — estética meowrhino studio + UX del flow

> Cambios estéticos y de **flow del editor/player**. Crítica del 2026-05-11: "el editor estéticamente me gusta, pero al darle play parece un video, no transmite interactivo". Hay que arreglar eso en esta fase, no solo decorar.

### 1.0 — UX del play (no parece interactivo)

- [x] 🟡 **Indicador "click/tecla para empezar"** sobre el canvas hasta primer input.
- [x] 🟢 **Cursor pointer + outline al hover** sobre el canvas. Hover → sombra ámbar.
- [x] 🟢 **Idle animation del avatar** — `sprites.js` cuenta `idleTime` y usa `sprite.idle: [...]` frames si lleva >2s sin moverse. Backwards-compatible (si el sprite no define idle, sigue como antes). `garden.json` avatar "tu" tiene 2 frames idle (ojos cerrados + pies juntos).
- [x] 🟢 **Controles más visibles** debajo del canvas (kbd hints: ↑↓←→ moverse · espacio hablar/avanzar · esc cancelar).
- [x] 🟡 **D-pad táctil visible también en desktop** — `touch.js` quita el gate `pointer:coarse`. En desktop monta a 90px con opacity 0.45 que sube a 0.9 al hover, para indicarlo sin estorbar.
- [x] 🟡 **Border/marco** alrededor del canvas que respira (anillo ámbar pulsante) mientras está idle. Para cuando empiezas a jugar.

### 1.1 — branding meowrhino

- [x] 🟢 **Mascota gato-rinoceronte 8x8.** Existe en `assets/mascot.svg`, ya integrada en favicon, header del editor, footer del player y HTML exportado.
- [x] 🟢 **Paleta studio extendida.** 6 colores (`--paper`, `--ink`, `--amber`, `--teal`, `--rust`, `--coral`) en `style.css`.
- [x] 🟢 **Footer firma.** "made in barcelona ☼ meowrhino studio · inspirado en mosi" en `play.html` y HTML exportado.
- [x] 🟡 **Cursor personalizado en el editor.** SVGs 16×16 en `assets/cursors/` (pencil, bucket, eyedropper) con paleta ink/amber/rust. `.paint-canvas` y `.room-grid` usan pencil; `data-tool="bucket|eyedropper"` cambia automáticamente.
- [x] 🟢 **Separadores tipográficos.** Glifos `▮▰▱` en `.divider-glyphs` en `style.css`.
- [x] 🟢 **Splash al cargar el editor.** Mascota + "moixi · editor" durante ~1s antes de mostrar la UI. Animación bounce en la mascota.

---

## fase 2 — quality-of-life del editor

- [x] 🟡 **Undo/redo global.** `editor/undo.js` escucha `editor:change`, deep-clone JSON del game en `past[]` (max 50). Atajos `⌘Z` / `Ctrl+Z` / `⌘⇧Z` / `⌘Y` via el sistema de shortcuts. Aplica snapshot mutando state.game in-place para no romper referencias cachées. Emit `editor:rerender` post-apply.
- [x] 🟢 **Confirmación antes de cerrar.** `window.onbeforeunload` si `state.dirty === true`. Prompt nativo.
- [ ] 🟡 **Lista de paletas con preview en sprite editor.** Cuando estás editando un sprite, poder ver al lado la lista de paletas y cambiar cuál se usa para preview (sin cambiar la paleta del sprite).
- [x] 🟡 **Bucket fill y dropper en el paint canvas.** `tool` state en sprite.js (pencil/bucket/eyedropper). Shortcut `B` toggle bucket, `I` toggle eyedropper. Flood-fill BFS, eyedropper vuelve a pencil tras leer color.
- [x] 🟢 **Atajos de teclado en el editor.** `editor/shortcuts.js`. `1234`=tabs, `+/=` = nuevo, `-/⌫` = borrar, `space` = play, `B/I/O` = bucket/eyedropper/onion, `⌘Z/⌘Y` = undo/redo, `?` = cheatsheet flotante. Botón flotante "?" abajo-izquierda.
- [x] 🟡 **Onion skin entre frames** en el sprite editor: frame N-1 en `globalAlpha 0.2` detrás del actual. Toggle via shortcut `O`.
- [x] 🟡 **Drag & drop de JSON en el editor.** Overlay con borde dashed ámbar (DESIGN.md). Contador dragenter/leave para evitar flickering.

---

## fase 3 — features visuales del runtime

- [x] 🟢 **`modules/gameplay/transitions.js`** — fade negro de 420ms al cambiar de room. Tipos: 'fade' (default), 'instant', 'wipe'. Hook `render:final`. Config via `game.transition` o `room.transition`.
- [x] 🟡 **`modules/render/lighting.js`** — capa de oscuridad ambient + halos de luz radiales. Hook `render:fg` con dos pasadas: `destination-out` para agujerear + `screen` para tinte cálido. Schema: `sprite.light: { radius, color }`, `room.ambient: rgba`. API: `toggle()`, `setAmbient(rgba)`. ScriptFns: `{light-off}`, `{light-on}`, `{set-ambient rgba}`. Registrado en `play.html`, `editor/panels/play.js`, `editor/export.js`. `garden.json`: avatar tiene light cálido, room `forest` tiene ambient nocturno.
- [x] 🟡 **`modules/render/camera.js`** — modos `flip` (default, retrocompat mosi), `follow`, `smooth`. Aplica `ctx.translate` en render:bg con clamp al room. `game.cameraMode` o `{set-camera mode}`.
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

> Nota del 2026-05-11: con Fase 10 (arxiu en Cloudflare), el **deploy "default"** pasa a ser Cloudflare Pages (mismo stack, ya configurado). Neocities y Codeberg quedan como **opciones extra** para autores que quieran publicar también ahí.

- [ ] 🟢 **Verificar `save-url` (ya implementado).** Test: jugar un rato, llamar `core.api.save.saveToURL()`, copiar URL, abrir en otra pestaña, debe reanudar. Documentar.
- [ ] 🟡 **`modules/persistence/save-slots.js`** — múltiples slots con thumbnail (canvas → dataURL). UI mínima.
- [ ] 🟡 **`modules/dist/dist-cloudflare.js`** (default) — publicar el juego al arxiu de moixi en Cloudflare. Va a Fase 10, mencionado aquí por completitud.
- [ ] 🟡 **`modules/dist/dist-neocities.js`** (extra) — botón opcional "publicar también en mi Neocities" usando el [Neocities API](https://neocities.org/api). Pide API key, sube el HTML exportado. Para autores que quieran tener una copia en su propio dominio.
- [ ] 🔴 **`modules/persistence/save-codeberg.js`** (extra) — OAuth a Codeberg/GitHub, push a un gist privado. Sin servidor. Para power-users.
- [ ] 🟡 **`modules/dist/dist-remix.js`** — el HTML exportado incluye un botón oculto (`?edit` en URL) que reabre el JSON en una instancia del editor. Útil para "remix mode" del HTML standalone.
- [ ] 🟢 **Generar `.github/workflows/build.yml`** opcional desde el editor: una Action que recompila el HTML al hacer push al repo. Solo el archivo, sin lógica especial.

---

## fase 7 — colaboración tiempo real · **DEFERRED**

> Decisión del 2026-05-11: WebRTC + Yjs es interesante pero NO es prioridad. Multi-autor se resuelve mejor vía la Fase 10 (forks + rutas paralelas async). La colab en tiempo real queda parqueada hasta que alguien la pida explícitamente.

- [ ] ⏸ **`modules/collab/webrtc.js`** — edición en tiempo real entre dos editores. Stack: WebRTC nativo + [Yjs](https://github.com/yjs/yjs) cargado desde CDN como ES module. Sincroniza `state.game`.
- [ ] ⏸ **`modules/collab/presence.js`** — cursor del peer en el editor.
- [ ] ⏸ **`modules/persistence/diff-merge.js`** — dado dos JSONs del mismo juego, fusiona o lista conflictos.

---

## fase 8 — accesibilidad y mobile

- [ ] 🟢 **`aria-live` en el diálogo.** Ya está parcialmente. Verificar que un screen reader anuncia el texto a medida que se escribe.
- [~] 🟡 **Navegación 100% por teclado en el editor.** `:focus-visible` global con outline ámbar añadido. Tabs con role=tablist + aria-selected. Botones de toolbar y "×" cripticos con aria-label. Color swatches como role=radiogroup. Cheatsheet "?" flotante. **Falta**: list-items navegables, room-cells con teclado, navegación entre frames con flechas.
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

## fase 10 — arxiu público (cloudflare + multi-autor) ⚠ XL

La idea: que `moixi.dev` (o similar) sea no solo el editor, sino un **archivo público** donde la gente sube juegos, los explora con filtros, hace forks, y eventualmente colabora en rutas/finales de juegos ajenos. Cloudflare Pages para el front, Workers para una API mínima, R2/KV para los JSON. Auth vía GitHub OAuth.

Esta fase es la que más diferencia moixi de mosi: mosi vive en el desktop y exporta HTML que cada uno aloja como puede. moixi sería un **espacio social** alrededor de juegos pequeños.

### subdivisión: 10a (puede empezar YA, sin infra) · 10b (infra después)

> Decisión del 2026-05-11: la parte de **diseño UX/UI del flow del arxiu** se puede arrancar inmediatamente — son wireframes y CSS, no necesitan Cloudflare. Cuando el flow esté claro y validado, ya construimos la infra.

---

### Fase 10a — UX/UI del arxiu (sin backend) · arrancable YA

> **Estado 2026-05-11**: refinado el diseño de cards (jerarquía visual del autor, fecha en footer, gradient thumb limpio). `arxiu-mock.json` ampliado a 10 juegos con concept fuerte (variedad de tags walking-sim, weird, ritual, micro-fiction) + 4 autores nuevos.

- [ ] 🟡 **Wireframe de la landing `/`**: grid de juegos, buscador, filtros (tag/autor/fecha/features), sort, botón "crear juego". Empezar con mockup estático en HTML/CSS, datos de juegos fake hardcoded.
- [ ] 🟡 **Wireframe de `/game/<id>`**: hero con el juego embebido + metadata + autor + forks + (más adelante) histórico. También mockup estático primero.
- [ ] 🟡 **Wireframe de `/u/<handle>`**: perfil del autor con sus juegos.
- [ ] 🟡 **Flow del editor revisado**: el editor actual abre con `garden.json`. Repensar el flujo:
  - landing → "crear juego" → editor vacío con prompt "qué pintamos hoy".
  - landing → click en un juego → `/game/<id>` → botón "fork" o "play".
  - editor con un juego cargado → botón "publicar al arxiu" (mockeable sin backend).
- [ ] 🟢 **Navegación entre páginas** con vanilla routing (hash o pathname + popstate).
- [ ] 🟢 **Mockup del feed de actividad** ("foo publicó X", "bar forkeó Y"). No requiere data real, solo HTML.

Ventaja de hacer 10a primero: cuando lleguemos a 10b (infra), ya sabemos qué endpoints necesitamos exactamente. Y se puede testear el feel del arxiu con datos fake antes de gastar tiempo en Workers.

---

### Fase 10b — infra Cloudflare (después de 10a)

### 10.1 — infraestructura (M, paralelo)
- [ ] 🟡 **Setup Cloudflare Pages** con build = nothing (es vanilla). Dominio custom opcional (`moixi.dev`, `arxiu.moixi.dev`).
- [ ] 🟡 **Setup Cloudflare Workers** con `wrangler` para una API mínima en `/api/*`. Sin npm en runtime — solo Workers SDK.
- [ ] 🟡 **Setup R2 (object storage)** para los JSON de juegos. Versionado: `games/<gameId>/v<N>.json`.
- [ ] 🟢 **Setup KV** para metadata (autores, índice, tags, filtros).

### 10.2 — auth (M)
- [ ] 🟡 **GitHub OAuth** en Worker. Flow: redirect a github, callback al Worker, JWT firmado con secret del Worker, cookie httpOnly. `meowrhino` es el primer admin.
- [ ] 🟢 Endpoint `GET /api/me` devuelve user actual (o 401).
- [ ] ⚠ **Magic link via email** (v2, requiere servicio email tipo Resend o Cloudflare Email Workers).

### 10.3 — API de juegos (M-L)
- [ ] 🟡 `POST /api/games` — crear juego nuevo (validar JSON shape, asignar id, `ownerId = req.user.id`, `version = 1`).
- [ ] 🟡 `GET /api/games/<id>` — leer la versión vigente del juego.
- [ ] 🟡 `PATCH /api/games/<id>` — solo si `ownerId === req.user.id`. Sube nueva versión, mantiene anteriores en R2.
- [ ] 🟡 `DELETE /api/games/<id>` — soft delete: marca `deleted: true` en metadata KV. Las versiones siguen en R2.
- [ ] 🟡 `GET /api/games/<id>/history` — versiones (solo si owner o si `publicHistory: true`).
- [ ] 🟢 `GET /api/games` — listado paginado con filtros (?tag=, ?author=, ?features=, ?since=, ?sort=).

### 10.4 — landing y discoverabilidad (L)
- [ ] 🟡 `index.html` actual pasa a `editor.html`. Nueva landing `/` con:
  - grid de juegos featured (thumbnail = canvas snapshot → PNG cached en R2).
  - buscador.
  - filtros (tag, autor, fecha, features detectados en JSON, # rooms, longitud diálogo).
  - sort: recientes / featured / random / más jugados / más forks.
  - botón gordo "crear juego" → `/editor`.
- [ ] 🟢 `/game/<id>` página individual: juego embebido en iframe + metadata + autor + forks + (si owner) histórico.
- [ ] 🟢 `/u/<handle>` perfil del autor: sus juegos, sus forks, su genealogía.

### 10.5 — fork / multi-autor v1 (M)
- [ ] 🟡 Botón "fork" en `/game/<id>`: copia el JSON, asigna nuevo id, `forkOf: <parentId>`. El usuario edita y publica el suyo.
- [ ] 🟢 Mostrar genealogía: en `/game/<id>` listar "remix de X" y "remixed by [...]".
- [ ] 🟢 Contadores: # forks, # plays.

### 10.6 — multi-autor v2: rutas paralelas (XL · diferenciador real) ⚠
- [ ] 🔴 Schema del JSON gana `room.extensible: true` y `game.branches: [{ id, from, to, author, content }]`.
- [ ] 🔴 Cuando un autor marca un room como extensible, otros usuarios pueden enviar "branches" (mini-juegos que se enganchan a esa room).
- [ ] 🔴 Endpoint `POST /api/games/<id>/branches` con queue de aprobación al owner.
- [ ] 🔴 Render: si jugando un juego entras a un room extensible con branches aceptados, salen como exits adicionales.

### 10.7 — extras (M-L cada uno, opcional)
- [ ] 🟢 Botón "save offline" en editor: descarga el JSON local incluso si estás logueado.
- [ ] 🟡 **Importar juegos de mosi**: leer el formato JSON de mosi original y convertirlo a moixi (tienen ~90% de overlap).
- [ ] 🟡 Estadísticas básicas: # plays por juego (counter Worker → Durable Object o KV con eventual consistency).
- [ ] 🟡 Likes / favoritos.
- [ ] ⚠ Moderación: flagging, queue de revisión, ban de cuentas (necesario antes de abrir registro público).

### decisiones pendientes (avisar antes de tocar)

- ⚠ **Visibilidad por defecto** de los juegos publicados: público o privado.
- ⚠ **Política de borrado**: si el owner borra, ¿los forks sobreviven? (recomendación: sí, los forks son independientes).
- ⚠ **Storage limits** por cuenta gratis (Cloudflare R2 cobra a partir de 10GB/mes).
- ⚠ **Moderación**: antes de abrir registro público hay que tener un mecanismo (al menos un report button + queue admin).
- ⚠ **GDPR / privacidad**: si guardamos emails para magic link, hay que tener política de privacidad y borrado de cuenta.

---

## notas de versionado

- Por ahora vivimos en `0.x.y`.
- Bump de minor (`0.1 → 0.2`) cuando se completa una fase entera.
- Bump de patch cuando se cierran 3-4 tareas de la fase actual.
- Tag de git por cada minor para que el HTML exportado sea reproducible.

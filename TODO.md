# TODO.md

> Resumen práctico de qué está cerrado y qué queda. Para el detalle por fase y prioridad, ver `ROADMAP.md`.

---

## hecho

### motor (`core/` + `modules/`)
- **core** (5 ficheros, ~250 líneas): bus pub/sub con cancel y prioridades, state global, loop con 7 hooks de render, loader de módulos con deps
- **render/canvas**: pixel-perfect, escalado CSS
- **render/palettes**: paletas por room
- **render/sprites**: rasterizado a canvas offscreen con cache, animación por fps, idle animation (`sprite.idle`)
- **render/camera**: 3 modos (flip / follow / smooth)
- **render/lighting**: capa ambient + halos radiales por `sprite.light`
- **input/keyboard**, **input/mover**, **input/touch** (D-pad SVG visible en touch + desktop semi-transparente)
- **gameplay/walls**, **gameplay/dialog** (typewriter + tags inline + aria-live), **gameplay/inventory**, **gameplay/world**, **gameplay/interactable**
- **gameplay/transitions** (fade / wipe / instant entre rooms)
- **script/mosi** (parser + evaluator), **script/stdlib** (math, logic, comparación), **script/vars**
- **audio/beeps** (WebAudio + canciones por notas)
- **persistence/save** (localStorage + URL state con CompressionStream)

### editor
- **layout 3-col**, tabs (world / sprite / palette / play), splash mascota
- **autosave** en localStorage por `editor:change`
- **drag & drop** de `.json` sobre la ventana
- **`window.onbeforeunload`** si `state.dirty` (red de seguridad)
- **shortcuts** (`editor/shortcuts.js`):
  - `1 2 3 4` tabs · `+` / `-` add/remove · `space` play
  - `B` bucket · `I` eyedropper · `O` onion skin
  - `⌘Z` / `⌘⇧Z` / `⌘Y` undo / redo
  - `?` cheatsheet flotante
- **undo / redo** (`editor/undo.js`) — snapshots deep-clone, max 50, escucha `editor:change`
- **paint-canvas** (`editor/paint-canvas.js`) — pencil / bucket fill BFS / eyedropper / onion skin
- **cursores SVG** custom (pencil / bucket / eyedropper en `assets/cursors/`)
- **a11y básica**:
  - `:focus-visible` global con outline ámbar
  - tabs `role=tablist` + `aria-selected`
  - color swatches `role=radiogroup` + `aria-checked` + código hex en label
  - aria-label en botones cripticos del toolbar
- **export** JSON / HTML standalone (inlinea todos los módulos como blob URLs)

### arxiu (sin backend, F10a)
- **landing** (`index.html` + `arxiu/landing.js`) — grid de juegos, buscador, filtros (tag/autor/orden)
- **`game.html`** — página individual del juego con metadata + iframe
- **`u.html`** — perfil del autor
- **cards refinadas**: jerarquía visual del autor, fecha en footer, gradient thumb limpio
- **`examples/arxiu-mock.json`** — 10 juegos fake con concept fuerte, 4 autores nuevos, distribución verosímil de plays/forks

### docs
- `README.md` actualizado con estructura nueva, atajos, schemas extendidos
- `ROADMAP.md` con fases priorizadas, todas las tareas cerradas marcadas `[x]`
- `CLAUDE.md` con filosofía, reglas, convenciones
- `DESIGN.md` con guía estética
- `TESTING.md` con checkpoints manuales

---

## pendiente — corto plazo (próxima sesión)

### F1 — pulido
- [ ] **navegación 100% por teclado en editor** (list-items focusables, room-cells navegables con flechas, frames con teclado)
- [ ] **responsive móvil del editor** (3-cols → 1-col, paint canvas con zoom)

### F2 — qol restante
- [ ] **lista de paletas con preview en sprite editor** (ver al lado qué paleta usa cada sprite, cambiar preview sin tocar la paleta)

### F3 — runtime visual
- [ ] **`modules/render/layers.js`** — z-ordering por `sprite.layer: 0..3` (prerrequisito de parallax)
- [ ] **`modules/render/parallax.js`** — capas con scroll diferencial (depende de layers + camera)
- [ ] **`modules/render/particles.js`** — sistema simple, `{emit kind x y}` `{emit-burst}`
- [ ] **`modules/render/screenshot.js`** — PNG one-shot, `core.api.screenshot.png()`
- [ ] **`modules/render/dayNight.js`** — ciclo temporal afecta paletas
- [ ] **`modules/render/gif-recorder.js`** — grabar N segundos, descargar GIF (puede requerir CDN con fallback)

### F4 — audio
- [ ] **`modules/audio/tts-voices.js`** — `SpeechSynthesis` por sprite (`sprite.voice: { pitch, rate, voiceName }`)
- [ ] **`modules/audio/samples.js`** — `game.sounds[id]` base64/url + `{play-sound id}`
- [ ] **`modules/audio/ducking.js`** — baja música durante diálogo (hook a `dialog:open/close`)
- [ ] **`modules/audio/tracker.js`** — multi-canal más serio que `beeps`

### F8 — accesibilidad
- [ ] **modo daltonismo** — filtros CSS al canvas (protanopia/deuteranopia/tritanopia)
- [ ] **PWA del editor** — `manifest.webmanifest` + service worker, offline

### F10a — UX arxiu (sin backend)
- [ ] **flow editor revisado** — landing → "crear juego" → editor vacío con prompt "qué pintamos hoy"
- [ ] **navegación con vanilla routing** — hash o pathname + popstate
- [ ] **mockup feed de actividad** — "foo publicó X", "bar forkeó Y"

---

## pendiente — medio plazo

### F5 — scripting avanzado ⚠
- [ ] **`modules/script/script-js.js`** — sandbox con `new Function('api', code)(api)`, `sprite.scriptLang: 'mosi'|'js'`
- [ ] **`modules/script/flow.js`** — `{delay N}` `{loop N ...}` `{break}` `{return}`
- [ ] **`modules/script/repl.js`** — consola in-game con tecla `~`

### F6 — distribución
- [ ] **save slots** con thumbnail dataURL
- [ ] **dist-cloudflare** (default cuando F10b esté online)
- [ ] **dist-neocities** (extra, Neocities API key)
- [ ] **dist-codeberg** (extra, OAuth + gist privado)
- [ ] **dist-remix** — `?edit` en HTML exportado reabre el JSON en editor
- [ ] **importar juegos de mosi** — converter al formato moixi (~90% overlap)

### F10b — infra arxiu ⚠ (necesita Cloudflare)
- [ ] **Cloudflare Pages + Workers + R2 + KV** (build = nothing, dominio custom)
- [ ] **GitHub OAuth** + JWT cookie httpOnly
- [ ] **API juegos**: POST/GET/PATCH/DELETE + listado paginado con filtros
- [ ] **fork v1**: botón en `/game/<id>` que copia JSON con `forkOf: <parentId>` + genealogía
- [ ] **rutas paralelas v2**: `room.extensible` + `game.branches`, queue de aprobación del owner
- [ ] **extras**: counters de plays, likes, importar mosi, moderación

---

## pendiente — long-shots

- [ ] **`modules/script/script-visual.js`** — DAG de nodos en SVG vanilla (whimtale-style)
- [ ] **`modules/editor/font.js`** — editor de fuente bitmap glyph a glyph
- [ ] **`modules/editor/procedural.js`** — wave function collapse, cellular automata, random walks
- [ ] **`modules/multiplayer/async.js`** — el mundo es un repo git, huellas commiteadas (brutalmente experimental)

### deferred / parqueado
- [ ] F7 colab tiempo real (WebRTC + Yjs) — multi-autor se resuelve mejor con F10b forks + rutas paralelas

---

## notas de scope

- **NO** añadir build tooling, frameworks, transpiladores, ni dependencias npm. La regla #1 del CLAUDE.md.
- **NO** tocar el core (`core/`) para añadir features. Casi todo se resuelve enchufándose a hooks existentes.
- **NO** importar entre módulos directamente. Siempre via `core.api.<modulo>.method()`.
- **300 líneas máx** por archivo recomendado. Partir si crece más.
- Tareas marcadas con **⚠** requieren trade-offs serios o cambio de scope — avisar antes de empezar.
- Para detalle de criterios "done" por tarea, ver `ROADMAP.md`.

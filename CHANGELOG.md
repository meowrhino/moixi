# CHANGELOG.md

> formato: [keep-a-changelog](https://keepachangelog.com).

## [unreleased]

### added
- documentación para Claude Code: `CLAUDE.md`, `ROADMAP.md`, `DESIGN.md`, `TESTING.md`.
- mascota gato-rinoceronte 8x8 en `assets/mascot.svg` + favicon.
- color `--coral` añadido a la paleta.
- footer con firma "meowrhino studio" en player y editor.
- `examples/test-all.json`: example mínimo que ejercita todos los módulos (walls, items, vars, condiciones, set-sprite-wall, exits, audio multi-room).
- `TESTING-fase0.md`: guía de smoke test para el usuario tras renombrar el proyecto.
- sección "flujo test-all" en `TESTING.md` con checklist por feature.
- `.gitignore` y repo inicializado con git (`main`).

### changed
- proyecto renombrado a **moixi** (antes placeholder `<NAME>` / `mosi-vanilla-engine`).

### fixed
- `walls.js`, `world.js`, `dialog.js` y `canvas.js` accedían al core via el global `window.MOSI`. Ahora guardan `core` en variable de módulo desde `setup(c)` y usan `core.api.*` directamente. La exposición `window.MOSI = core` en `core/index.js` se mantiene como API intencional para debug y para el HTML standalone exportado.

## [0.1.0] — esqueleto inicial

### added
- core (bus, state, loop, loader, index): 5 archivos, ~250 líneas.
- render: canvas pixel-perfect, paletas por room, sprites con caché y queries (`{sprites-named}`, `{neighbors}`, `{pick}`).
- input: keyboard, touch (D-pad SVG), mover con `beforeMove`/`afterMove`/`bump:sprite`/`pickup`.
- gameplay: walls, dialog con typewriter y tags inline (`{wavy}`, `{shaky}`, `{color N}`, `{position}`, `{p}`, `{b}`, `{delay}`), inventory, world (exits, transiciones).
- script: motor estilo mosi, stdlib (math/logic/comparación), vars con tipado auto.
- audio: síntesis WebAudio, songs por notas, loop por room.
- persistence: localStorage + URL state (deflate-raw nativo).
- editor: 4 paneles (world/sprite/palette/play), autosave, export JSON, export HTML standalone, drag-paint en room grid, pixel art editor multi-frame.
- juego de ejemplo: el jardín (2 rooms, 6 sprites, 2 paletas, 2 canciones chiptune, zorro con condicional, exits).

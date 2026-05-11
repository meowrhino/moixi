# moixi

motor + editor minimal para juegos tipo **bitsy/môsi** en vanilla js. sin frameworks, sin build step, sin dependencias. arquitectura de plugins: un núcleo de ~250 líneas, todo lo demás son módulos opt-in con la misma forma.

inspirado en [mosi](https://zenzoa.itch.io/mosi) (zenzoa, 2020), con ideas de bitsy, bipsi, flicksy y whimtale.

```
                                                            ▮
   un avatar    →   anda por rooms   →   habla con sprites
   un grid      →   con paletas       →   recoge items
   un canvas    →   y música chip      →   y resuelve cosas
```

---

## docs

- **`CLAUDE.md`** — briefing para Claude Code (filosofía, reglas, convenciones)
- **`ROADMAP.md`** — fases del proyecto, prioridades, scope amplio
- **`TODO.md`** — qué se ha cerrado / qué queda · resumen práctico
- **`DESIGN.md`** — guía estética meowrhino studio
- **`TESTING.md`** — checkpoints de verificación manual
- **`CHANGELOG.md`** — log de versiones

---

## cómo correrlo

los ES modules nativos requieren http. arranca un servidor local:

```bash
cd moixi
python3 -m http.server 8000
# o
npx http-server -p 8000
```

abre:
- `http://localhost:8000/` → el **arxiu** (landing con grid de juegos)
- `http://localhost:8000/editor.html` → el **editor**
- `http://localhost:8000/play.html?game=examples/garden.json` → el **player**
- `http://localhost:8000/play.html?game=./mi-juego.json` → cargar otro juego

el editor autosaves en `localStorage` (key `mosi:editor:game`). soltar un `.json` sobre la ventana lo carga. ⌘Z para deshacer hasta 50 cambios. para empezar de cero, abre la consola y ejecuta `localStorage.clear()`.

---

## estructura

```
moixi/
├── index.html              ← arxiu (landing con grid de juegos)
├── editor.html             ← editor
├── play.html               ← player standalone
├── game.html               ← página individual de un juego del arxiu
├── u.html                  ← perfil de un autor del arxiu
├── style.css               ← base compartida (incluye estilos del arxiu)
├── examples/
│   ├── garden.json         · juego de ejemplo
│   └── arxiu-mock.json     · 10 juegos fake para la landing (hasta F10b)
├── assets/
│   ├── favicon.svg
│   ├── mascot.svg          · gato-rinoceronte 8×8
│   └── cursors/            · pencil / bucket / eyedropper para el editor
│
├── arxiu/
│   ├── landing.js          · render del grid, filtros, búsqueda
│   ├── game.js             · página individual de juego
│   └── profile.js          · perfil de autor
│
├── core/                   ← el corazón. ~250 líneas. NUNCA se toca.
│   ├── bus.js              · pub/sub event bus con cancel y prioridades
│   ├── state.js            · { game, runtime, history }
│   ├── loop.js             · requestAnimationFrame + hooks por capa
│   ├── loader.js           · registro de módulos, deps, scriptFns
│   └── index.js            · fachada del engine
│
├── modules/                ← TODO lo demás. Cargados a la carta.
│   ├── render/
│   │   ├── canvas.js       · canvas pixel-perfect
│   │   ├── palettes.js     · paletas por room
│   │   ├── sprites.js      · bitmap → canvas con cache, animación, idle
│   │   ├── camera.js       · modos flip / follow / smooth
│   │   └── lighting.js     · ambient + halos radiales por sprite
│   ├── input/
│   │   ├── keyboard.js     · captura teclas y emite input:*
│   │   ├── touch.js        · D-pad SVG (móvil + desktop semi-transparente)
│   │   └── mover.js        · input:* → movimiento avatar (cancelable)
│   ├── gameplay/
│   │   ├── walls.js        · sprites con isWall bloquean
│   │   ├── interactable.js · sprites con script disparable
│   │   ├── dialog.js       · diálogos con typewriter + tags inline (aria-live)
│   │   ├── inventory.js    · items recolectables
│   │   ├── world.js        · exits, transiciones de room
│   │   └── transitions.js  · fade / wipe / instant entre rooms
│   ├── script/
│   │   ├── mosi.js         · parser y evaluador estilo {fn arg arg}
│   │   ├── stdlib.js       · math, logic, comparación
│   │   └── vars.js         · variables de juego
│   ├── audio/
│   │   └── beeps.js        · síntesis WebAudio + canciones por notas
│   └── persistence/
│       └── save.js         · localStorage + URL state (deflate-raw)
│
└── editor/
    ├── editor.css
    ├── editor.js           · controlador, tabs, autosave, drag&drop, onbeforeunload
    ├── ui.js               · helpers compartidos (el, paintBitmap, bus interno)
    ├── shortcuts.js        · atajos teclado globales + cheatsheet
    ├── undo.js             · snapshots deep-clone, max 50, ⌘Z/⌘Y
    ├── paint-canvas.js     · pencil / bucket / eyedropper / onion skin
    ├── export.js           · descargar JSON / generar HTML standalone
    └── panels/
        ├── world.js        · lista de rooms + grid editor
        ├── sprite.js       · pixel art editor multi-frame (usa paint-canvas)
        ├── palette.js      · editor de paletas
        └── play.js         · preview en vivo del juego
```

---

## anatomía de un módulo

cada módulo es un objeto con esta forma:

```js
export default {
  name: 'collision',
  version: '1.0.0',
  deps: ['sprites'],

  schema: { 'sprite.isWall': 'bool' },     // informativo

  hooks: {                                  // se enchufa a eventos del bus
    'beforeMove': (ev) => {
      const target = window.MOSI.api.sprites.spriteAt(ev.x, ev.y);
      if (target?.isWall) ev.cancel = true;
    }
  },

  scriptFns: {                              // funciones del lenguaje de scripting
    'is-wall': (core, x, y) => !!core.api.sprites.spriteAt(x, y)?.isWall
  },

  api: {                                    // expuesta como core.api.collision.X
    canMove(x, y) { /* ... */ }
  },

  setup(core)    { /* opcional */ },
  teardown(core) { /* opcional */ }
};
```

para añadirlo: `core.use(myModule)`. para quitar: `core.unuse('collision')`.

---

## hooks disponibles del core

| evento | cuándo |
|---|---|
| `gameLoad` | tras `core.load(json)` |
| `gameStart` | al pulsar play |
| `gameStop` | tras `core.stop()` |
| `gameReset` | tras `core.reset()` |
| `tick` | cada frame, payload `{ dt, t }` |
| `render:bg` | fase 1 del frame: fondo |
| `render:tiles` | fase 2: tiles del grid |
| `render:sprites` | fase 3: sprites (incluyendo avatar) |
| `render:fg` | fase 4: foreground (lighting, niebla...) |
| `render:ui` | fase 5: HUD |
| `render:final` | fase 6: post-procesado, captura |
| `roomEnter` | al cambiar de room, payload `{ roomId }` |
| `beforeMove` | antes de mover el avatar (cancelable) |
| `afterMove` | después de mover |
| `bump:sprite` | el avatar choca con un sprite |
| `pickup` | el avatar pisa un sprite con isItem |
| `move:out-of-bounds` | el avatar intenta salir del room |
| `music:change` | tras `{set-music}` |
| `input:up`, `input:down`, `input:left`, `input:right`, `input:action`, `input:cancel` | inputs genéricos |

cancelar un evento:
```js
core.bus.on('beforeMove', (ev) => { ev.cancel = true; });
```

prioridad:
```js
core.bus.on('render:fg', drawLight, { priority: 10 }); // mayor corre antes
```

---

## lenguaje de scripting

sintaxis tipo mosi: `{fn arg1 arg2}` con anidamiento.

### diálogo + tags inline

```
hola{p}{wavy}qué tal{/wavy}{p}{position center}{color 3}fin{/color}
```

| tag | efecto |
|---|---|
| `{b}` | salto de línea |
| `{p}` | cambio de página (espera click/space) |
| `{wavy}...{/wavy}` | texto ondulante |
| `{shaky}...{/shaky}` | texto tembloroso |
| `{color N}...{/color}` | color N de la paleta |
| `{position top\|center\|bottom\|fullscreen}` | posición de la caja |
| `{delay N}` | espera N frames |
| `{if {cond}}...{else}...{/if}` | condicional (parser básico) |

### funciones disponibles

**variables y items**
- `{var name}` · `{set-var name val}` · `{inc-var name [by]}` · `{dec-var name [by]}`
- `{item-count name}` · `{set-item-count name n}` · `{inc-item-count name [n]}` · `{dec-item-count name [n]}`

**math**
- `{add a b}` `{sub a b}` `{mul a b}` `{div a b}` `{mod a b}` `{random lo hi}` `{min}` `{max}` `{abs}` `{floor}`

**lógica**
- `{eq a b}` `{gt}` `{gte}` `{lt}` `{lte}` `{not a}` `{all-true ...}` `{any-true ...}` `{none-true ...}`

**avatar y sprites**
- `{avatar-x}` `{avatar-y}` `{avatar-name}`
- `{move-avatar [room] x y}` · `{transform-avatar name}`
- `{sprite-name}` `{sprite-x}` `{sprite-y}` `{sprite-room}`
- `{transform-sprite name}` · `{remove-sprite}` · `{place-sprite name [room] x y}` · `{move-sprite [room] x y}`
- `{set-sprite-color N}` · `{set-sprite-wall true|false}` · `{set-sprite-item true|false}`

**queries (devuelven listas)**
- `{sprite-at x y}` · `{sprites-in-room}` · `{sprites-named name}` · `{neighbors}`

**mundo**
- `{world-name}` · `{room-name}` · `{set-palette [room] palId}` · `{set-music [room] songId}`

---

## el JSON del juego

```json
{
  "name": "mi juego",
  "tileSize": 8,
  "roomSize": [16, 16],
  "wrapH": false,
  "wrapV": false,
  "avatar": "avatar",
  "startRoom": "room1",
  "avatarStart": { "x": 7, "y": 8 },
  "introScript": "{position center}bienvenida",

  "palettes": {
    "morning": { "name": "amanecer", "colors": ["#f4ecd8", "#3d7068", "#1a1a1a"] }
  },

  "songs": {
    "calm": { "wave": "triangle", "loop": true, "notes": [{ "note": "C4", "dur": 0.4 }] }
  },

  "sprites": {
    "avatar": {
      "name": "tu",
      "colorIndex": 2,
      "fps": 2,
      "frames": [[0,0,1,1,1,1,0,0, /* 64 ints en total para 8x8 */]],
      "idle": [[ /* frames usados si lleva >2s sin moverse (opcional) */ ]],
      "idleFps": 1.5,
      "light": { "radius": 4, "color": "rgba(255,200,100,0.5)" }
    },
    "wall": {
      "name": "pared",
      "colorIndex": 1,
      "isWall": true,
      "frames": [[ /* ... */ ]]
    },
    "fox": {
      "name": "zorro",
      "script": "{position center}holaa",
      "frames": [[ /* ... */ ]]
    }
  },

  "rooms": {
    "room1": {
      "name": "jardín",
      "palette": "morning",
      "music": "calm",
      "ambient": "rgba(20,15,30,0.6)",
      "enterScript": "{position top}entras al jardín",
      "tiles": [
        ["wall","wall","wall", /* ... */],
        ["wall",null,null, /* ... */]
      ],
      "exits": [
        { "x": 7, "y": 15, "toRoom": "room2", "toX": 7, "toY": 1, "condition": "{gte {item-count flor} 3}" }
      ]
    }
  }
}
```

campos opcionales notables:
- `sprite.idle` / `sprite.idleFps` — frames de descanso (módulo `sprites`)
- `sprite.light: { radius, color }` — halo radial (módulo `lighting`)
- `room.ambient: "rgba(...)"` — capa de oscuridad sobre el room (módulo `lighting`)
- `game.transition` o `room.transition` — 'fade' (default), 'instant', 'wipe' (módulo `transitions`)
- `game.cameraMode` — 'flip' (default mosi-style), 'follow', 'smooth' (módulo `camera`)

---

## atajos teclado del editor

| tecla | acción |
|---|---|
| `1` `2` `3` `4` | cambiar tab (world / sprite / palette / play) |
| `+` | nuevo item del panel activo (sprite, room, paleta) |
| `-` / `⌫` | borrar item seleccionado |
| `espacio` | play / restart preview |
| `B` | toggle bucket fill (flood-fill BFS, 4-connected) |
| `I` | toggle eyedropper (lee color del píxel, vuelve a pencil) |
| `O` | toggle onion skin (frame N-1 a alpha 0.2 detrás del actual) |
| `⌘Z` / `Ctrl+Z` | undo (snapshot deep-clone del game, max 50) |
| `⌘⇧Z` / `⌘Y` | redo |
| `?` | abrir/cerrar cheatsheet flotante |

los atajos se ignoran cuando hay focus en un `<input>` o `<textarea>` (excepto undo/redo). botón flotante "?" abajo-izquierda los muestra siempre.

---

## crear un módulo nuevo

ejemplo: un módulo `minimap` que dibuja un mini room en la esquina del HUD.

```js
// modules/render/minimap.js
let core = null;
export default {
  name: 'minimap',
  deps: ['canvas', 'sprites'],
  schema: { 'game.minimap': 'bool' },
  setup(c) { core = c; },
  hooks: {
    'render:ui': () => {
      if (!core.state.game.minimap) return;
      const ctx = core.api.canvas.ctx();
      const { w, h } = core.api.canvas.size();
      const room = core.state.runtime.currentRoom;
      const [rw, rh] = core.state.game.roomSize;
      const cell = 2; // px por tile en el mini
      const ox = w - rw * cell - 4;
      const oy = 4;
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(ox - 1, oy - 1, rw * cell + 2, rh * cell + 2);
      for (let y = 0; y < rh; y++) {
        for (let x = 0; x < rw; x++) {
          if (!room.tiles?.[y]?.[x]) continue;
          ctx.fillStyle = '#f4ecd8';
          ctx.fillRect(ox + x * cell, oy + y * cell, cell, cell);
        }
      }
      // avatar
      const a = core.state.runtime.avatar;
      ctx.fillStyle = '#d4843e';
      ctx.fillRect(ox + a.x * cell, oy + a.y * cell, cell, cell);
      ctx.restore();
    }
  }
};
```

en `play.html` añades `import minimap from './modules/render/minimap.js'` y `core.use(minimap)`. listo. para que el editor lo incluya en el HTML standalone, añade la ruta a `RUNTIME_FILES` en `editor/export.js` y al bloque `import` del `bootstrapCode`.

---

## próximos pasos / ideas pendientes

módulos que aún no están pero que la arquitectura ya soporta sin tocar el core. ver `TODO.md` y `ROADMAP.md` para el detalle y prioridad.

**runtime visual**
- `layers` · z-ordering por `sprite.layer: 0..3` (prerrequisito de parallax)
- `parallax` · capas con scroll diferencial
- `particles` · `{emit kind x y}` `{emit-burst}`
- `dayNight` · ciclo temporal que afecta paletas
- `gif-recorder` · grabar canvas y descargar GIF
- `screenshot` · captura PNG one-shot

**audio**
- `tracker` · multi-canal más serio que `beeps`
- `samples` · `game.sounds[id]` base64/url + `{play-sound id}`
- `tts-voices` · `SpeechSynthesis` por sprite (`sprite.voice`)
- `ducking` · baja música mientras hay diálogo

**scripting**
- `script-js` · sandbox con `new Function('api', code)`
- `script-visual` · DAG de nodos en SVG, inspired by whimtale
- `flow` · `{delay N}` `{loop N ...}` `{break}` `{return}`
- `repl` · consola in-game con tecla `~`

**persistencia y distribución**
- `save-slots` · múltiples slots con thumbnail
- `dist-cloudflare` · default cuando F10b esté online
- `dist-neocities` · botón "publicar también en neocities" (extra)
- `dist-codeberg` · push a gist privado vía OAuth (extra)
- `dist-remix` · botón `?edit` en el HTML exportado para reabrir editor

**editor**
- `editor-font` · editor de fuente bitmap glyph a glyph
- `editor-procedural` · generador procedural de rooms con seed
- nav 100% por teclado en list-items y room-cells
- responsive móvil (3-cols → 1-col, zoom en paint canvas)
- PWA con service worker

**arxiu (F10b · necesita Cloudflare)**
- Workers + R2 + KV + GitHub OAuth
- POST/GET/PATCH/DELETE /api/games + listado paginado
- fork v1: copia de JSON con `forkOf`
- rutas paralelas v2: `room.extensible` + `game.branches`

---

## licencia

MIT. haz lo que quieras. si te lo curras mucho, comparte el repo.

---

## créditos

inspirado en mosi de zenzoa y bitsy de adam le doux. construido en barcelona ☼

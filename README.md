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
- **`ROADMAP.md`** — tareas pendientes priorizadas
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
- `http://localhost:8000/` → el **editor**
- `http://localhost:8000/play.html` → el **player** con el juego de ejemplo
- `http://localhost:8000/play.html?game=./mi-juego.json` → cargar otro juego

el editor autosaves en `localStorage` (key `mosi:editor:game`). para empezar de cero, abre la consola y ejecuta `localStorage.clear()`.

---

## estructura

```
moixi/
├── index.html              ← editor
├── play.html               ← player standalone
├── style.css               ← base compartida
├── examples/garden.json    ← juego de ejemplo
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
│   │   └── sprites.js      · bitmap → canvas con cache, animación, queries
│   ├── input/
│   │   ├── keyboard.js     · captura teclas y emite input:*
│   │   ├── touch.js        · D-pad SVG flotante para móvil
│   │   └── mover.js        · input:* → movimiento avatar (cancelable)
│   ├── gameplay/
│   │   ├── walls.js        · sprites con isWall bloquean
│   │   ├── dialog.js       · diálogos con typewriter + tags inline
│   │   ├── inventory.js    · items recolectables
│   │   └── world.js        · exits, transiciones de room
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
    ├── editor.js           · controlador, tabs, autosave
    ├── ui.js               · helpers compartidos (el, paintBitmap, ...)
    ├── export.js           · descargar JSON / generar HTML standalone
    └── panels/
        ├── world.js        · lista de rooms + grid editor
        ├── sprite.js       · pixel art editor multi-frame
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
      "frames": [[0,0,1,1,1,1,0,0, /* 64 ints en total para 8x8 */]]
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

---

## crear un módulo nuevo

ejemplo: un módulo `lighting` que oscurece todo y deja un círculo de luz alrededor del avatar.

```js
// modules/render/lighting.js
let core = null;
export default {
  name: 'lighting',
  deps: ['canvas', 'sprites'],
  schema: { 'room.ambient': '0..1', 'sprite.lightRadius': 'tiles' },
  setup(c) { core = c; },
  hooks: {
    'render:fg': () => {
      const room = core.state.runtime.currentRoom;
      if (!room?.ambient) return;
      const ctx = core.api.canvas.ctx();
      const { w, h } = core.api.canvas.size();
      const ts = core.state.game.tileSize;
      const a = core.state.runtime.avatar;

      ctx.save();
      ctx.fillStyle = `rgba(0,0,0,${room.ambient})`;
      ctx.fillRect(0, 0, w, h);
      // recorta un círculo alrededor del avatar
      ctx.globalCompositeOperation = 'destination-out';
      const grd = ctx.createRadialGradient(
        a.x*ts + ts/2, a.y*ts + ts/2, 0,
        a.x*ts + ts/2, a.y*ts + ts/2, ts*4);
      grd.addColorStop(0, 'rgba(0,0,0,1)');
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }
  }
};
```

en `play.html` añades `import lighting from './modules/render/lighting.js'` y `core.use(lighting)`. listo.

---

## próximos pasos / ideas pendientes

de la conversación: módulos que aún no están pero que la arquitectura ya soporta sin tocar el core.

- `layers` · z-ordering por sprite
- `parallax` · capas con scroll diferencial
- `camera` · follow o smooth en vez de flip-screen
- `lighting` · radio de luz por sprite, ambient por room
- `dayNight` · ciclo de tiempo que afecta paletas
- `particles` · `{emit kind x y}` `{emit-burst}`
- `transitions` · fade/wipe/pixelate al cambiar de room
- `gif-recorder` · captura del canvas
- `samples` · sounds.json con base64 además del tracker
- `tts-voices` · SpeechSynthesis por sprite
- `repl-console` · consola in-game con `~`
- `script-js` · motor alternativo con `new Function`
- `script-visual` · DAG de nodos en SVG
- `save-url` · ya está la base (`saveToURL` en `modules/persistence/save.js`)
- `collab-webrtc` · edición colaborativa con yjs (~20kb)
- `dist-neocities` · botón "publicar a meowrhino.neocities.org"
- `dist-codeberg` · push a repo + GitHub Action que regenera HTML
- `dist-remix-mode` · botón en el HTML exportado para reabrir en editor
- `editor-font` · editor de fuente bitmap glyph a glyph
- `editor-procedural` · generador procedural de rooms con seed

---

## licencia

MIT. haz lo que quieras. si te lo curras mucho, comparte el repo.

---

## créditos

inspirado en mosi de zenzoa y bitsy de adam le doux. construido en barcelona ☼

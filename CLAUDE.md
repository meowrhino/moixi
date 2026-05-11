# CLAUDE.md

> Briefing para Claude Code. Léeme **antes de tocar nada**.

## qué es esto

`moixi` es un motor + editor de juegos tipo bitsy/mosi (avatar moviéndose por rooms con tiles, paletas, items, diálogos y exits) hecho íntegramente en **vanilla HTML/CSS/JS**, sin frameworks, sin build step, sin dependencias npm. Diseñado para correr y desplegarse en Neocities, Codeberg Pages, o cualquier hosting que sirva ficheros estáticos.

Parte de **meowrhino studio** (`meowrhino.neocities.org`).

## la regla número uno

**No introducir build tooling, frameworks, o dependencias.** Punto. Si una feature requiere webpack, vite, npm install, un transpilador, JSX, TypeScript, React, Vue, Tailwind, Sass, postcss, o cualquier preprocesador → la feature está mal diseñada. Hay que rehacerla para que funcione con ES modules nativos del navegador y CSS plano. Esto no es flexible.

Razones:
- El usuario es JAMstack vanilla por convicción, no por imposibilidad.
- El editor tiene que abrirse en Neocities sin pasos previos.
- El HTML standalone exportado tiene que correr desde `file://` o cualquier servidor estático.

Permitido excepcionalmente, solo si justificadísimo: un único `<script type="module" src="https://cdn.jsdelivr.net/npm/...">` con import map, **pero siempre con fallback** si la red falla.

## filosofía de arquitectura

Lee la sección "arquitectura modular" del README. En corto:

- **`core/`** = 5 ficheros, ~250 líneas, jamás se toca. State + bus + loop + loader + index.
- **Todo lo demás es módulo opt-in** con interfaz idéntica: `{ name, deps, schema, hooks, scriptFns, api, setup, teardown }`.
- Los módulos **no se importan entre sí**. Solo via `core.api.<otherModule>.method()`.
- Cada módulo declara qué hooks usa, qué API expone, qué funciones de script añade al lenguaje.
- Para añadir una feature: **crear un archivo nuevo en `modules/`** y registrarlo en `play.html` y en `editor/panels/play.js`. No tocar el core, no tocar los módulos ya existentes.

Si te ves editando `core/loop.js` o `core/bus.js` para añadir una feature, **algo va mal en tu diseño**: la mayoría de features se resuelven enganchándose a hooks existentes (`render:bg`, `render:fg`, `tick`, `beforeMove`, `roomEnter`, etc).

## estructura de carpetas

```
core/                  ← núcleo, no tocar
modules/
├── render/            ← canvas, paletas, sprites, [layers, lighting, parallax, particles...]
├── input/             ← keyboard, touch, mover, [gamepad, mouse, repl...]
├── gameplay/          ← walls, dialog, inventory, world, [endings, transitions...]
├── script/            ← motor + stdlib + vars, [script-js, script-visual...]
├── audio/             ← beeps (synth), [samples, tts...]
└── persistence/       ← save (localStorage + URL), [save-codeberg, multiplayer...]
editor/
├── editor.js          ← controlador
├── ui.js              ← helpers (el, paintBitmap, uid, emit, on)
├── export.js          ← descarga JSON / genera HTML standalone
└── panels/            ← sprite, world, palette, play
examples/              ← JSONs de juegos para probar
play.html              ← player standalone
index.html             ← editor
style.css              ← base
```

## convenciones de código

- **Indentación**: 2 espacios. Sin tabs.
- **Punto y coma**: sí, siempre.
- **Comillas**: simples para strings, backticks para templates.
- **ES modules**: `import` / `export default` / `export`. Nunca CommonJS.
- **Sin transpilación**: usa solo features que funcionen en el último Safari/Firefox/Chrome estable sin polyfills. `?.`, `??`, `??=`, top-level await, structuredClone, CompressionStream → todos OK.
- **Comentarios**: castellano informal. Encabezado del archivo con `// path/del/archivo.js — qué hace en una línea.`
- **Nombres de funciones de scripting**: kebab-case (`{set-var}`, `{item-count}`).
- **Nombres de eventos del bus**: kebab-case con prefijo de namespace (`render:fg`, `input:up`, `bump:sprite`).
- **Tamaño máximo recomendado por archivo**: 300 líneas. Si un módulo crece más, partirlo en submódulos.

## cómo añadir un módulo nuevo (template)

```js
// modules/<categoria>/<nombre>.js — qué hace en una línea

let core = null;

export default {
  name: '<nombre>',
  version: '1.0.0',
  deps: ['<deps>'],                       // módulos requeridos cargados antes

  schema: {                               // documentación, no se valida
    'sprite.<campo>': 'descripcion',
    'room.<campo>': 'descripcion'
  },

  setup(c) { core = c; },                 // se llama al cargar

  hooks: {
    'render:fg': ({ t, dt }) => { /* ... */ },
    'beforeMove': (ev) => { /* ev.cancel = true para vetar */ },
  },

  scriptFns: {                            // expuesto al lenguaje de scripting
    '<fn-name>': (c, ...args) => { /* devolver valor o string para diálogo */ }
  },

  api: {                                  // accesible como core.api.<nombre>.<fn>
    publicFn() { /* ... */ }
  },

  teardown(c) { /* limpieza si se descarga */ }
};
```

Después:
1. Añadir el `import` en `play.html` y `core.use(mod)` en la cadena.
2. Añadir el `import` con cache-buster en `editor/panels/play.js` (la preview del editor).
3. Añadir al `RUNTIME_FILES` array en `editor/export.js` y al bloque `import ... from "${finalURLs['...']}"` del `bootstrapCode` (para que el HTML standalone exportado lo incluya).
4. Actualizar `ROADMAP.md`: tachar de pendiente, anotar versión.

## hooks disponibles del core

| evento | cuándo | payload |
|---|---|---|
| `gameLoad` | tras `core.load(json)` | `{ game }` |
| `gameStart` | al pulsar play | — |
| `gameStop` | tras `core.stop()` | — |
| `gameReset` | tras `core.reset()` | — |
| `tick` | cada frame | `{ dt, t }` |
| `render:bg` | fase 1 del frame: fondo | `{ dt, t }` |
| `render:tiles` | fase 2: tiles del grid | `{ dt, t }` |
| `render:sprites` | fase 3: sprites del room + avatar | `{ dt, t }` |
| `render:fg` | fase 4: foreground (lighting, niebla...) | `{ dt, t }` |
| `render:ui` | fase 5: HUD | `{ dt, t }` |
| `render:final` | fase 6: post-procesado, captura | `{ dt, t }` |
| `roomEnter` | cambio de room | `{ roomId }` |
| `beforeMove` | antes de mover avatar (cancelable) | `{ x, y, dx, dy, from }` |
| `afterMove` | tras moverse | `{ x, y, dx, dy }` |
| `bump:sprite` | choque con sprite | `{ sprite }` |
| `pickup` | pisa item | `{ sprite }` |
| `move:out-of-bounds` | intenta salir del room | `{ dx, dy, from }` |
| `music:change` | `{set-music}` | `{ id }` |
| `input:up/down/left/right/action/cancel` | inputs genéricos | `{ source }` |

Para añadir un evento nuevo, ponle namespace claro (`particles:emit`, `dayNight:phase`, `collab:peer-joined`). NO uses nombres genéricos sin prefijo.

## comandos habituales

```bash
# servir el editor en local
python3 -m http.server 8000
# o
npx http-server -p 8000

# validar sintaxis de todos los JS
find . -name "*.js" -exec node --check {} \;

# test rápido del core (sin DOM)
node test-core.mjs                       # si existe

# generar zip para compartir
zip -r dist.zip . -x "node_modules/*" "*.zip" ".git/*"
```

## qué NO hacer (lista breve y dura)

1. **No añadir build step.** Lo dije arriba y lo repito.
2. **No usar `localStorage`/`sessionStorage` en código de runtime que vaya a un HTML standalone exportado** — solo en el editor. (El runtime debería funcionar igual aunque el storage falle.)
3. **No reproducir contenido con copyright** (lyrics, paletas de juegos comerciales famosas, sprites de Mario...).
4. **No romper la modularidad** importando un módulo desde otro directamente. Siempre via `core.api`.
5. **No meter ofuscación / minificación** en los archivos fuente. Si quieres minificar el HTML exportado, OK, pero los fuentes se leen.
6. **No cambiar el sistema de coordenadas** (origen arriba-izquierda, x→derecha, y→abajo). Todos los módulos lo asumen.
7. **No añadir `console.log` al runtime de producción.** Errores con `console.error`, warnings con `console.warn`. Logs de debug solo dentro de un módulo `dev-inspector` opt-in.
8. **No introducir async/await en hooks síncronos** (`render:*`, `tick`, `beforeMove`). Los hooks deben retornar rápido y ser síncronos para no romper el orden de fases.

## cómo verificar cambios

1. `node --check` en cada `.js` modificado.
2. Levantar el server local y abrir `play.html` con `?game=examples/garden.json`. Comprobar:
   - Se ve el room sin errores en consola.
   - El avatar se mueve con teclas y D-pad (móvil).
   - El zorro habla al chocar.
   - Las flores se recogen y `{item-count flor}` se incrementa.
   - El exit a `forest` funciona con `{gte {item-count flor} 3}`.
3. Abrir `index.html` (editor). Comprobar tabs world/sprite/palette/play.
4. Pulsar "exportar html" y abrir el `.html` resultante. Tiene que correr aislado.

## estética

Lee `DESIGN.md`. **Resumen**:
- Base: paper (#f4ecd8), ink (#1a1a1a), amber (#d4843e), teal (#3d7068), rust (#a83e3e).
- Tipografía: monoespaciada en todo el editor y player.
- Sin border-radius, sin shadows gausianas, sí sombras sólidas desplazadas.
- Personalidad meowrhino: una mascota gato-rinoceronte 8x8 como firma, asteriscos decorativos, footers con `made in Barcelona ☼`, separadores tipográficos.
- Hover de botón = traslación `2px,2px` (efecto botón apretado). Active = mantener.

## roadmap

Lee `ROADMAP.md`. Está ordenado por prioridad. Cuando completes una tarea, márcala con `[x]` y commitea.

## una nota humana

Este engine está hecho con cariño para hacer juegos pequeños donde alguien camina por un jardín y un zorro le dice algo. No es Unity ni quiere serlo. Cualquier feature que añadamos tiene que respetar esa escala emocional: **simple, personal, expresivo, sin fricción**. Si una propuesta tuya añade complejidad que no aporta a esa premisa, recházala incluso si "técnicamente molaría".

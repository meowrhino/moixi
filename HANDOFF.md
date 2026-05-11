# HANDOFF — para Claude Code

> instrucciones de arranque. **léeme primero, antes que CLAUDE.md.**

---

## qué es esto

es el motor + editor de **moixi** — un sistema vanilla (ES modules nativos + Canvas2D + WebAudio) para hacer juegos pequeños tipo **bitsy/môsi**: un avatar caminando por rooms con tiles, paletas, items, diálogos y exits. corre desde un servidor estático sin build step.

el proyecto está hecho con la filosofía meowrhino studio: "vanilla, forever". inspirado en mosi (zenzoa, 2020), con ideas de bitsy, bipsi, flicksy y whimtale. **moixi añade lo que mosi no tiene**: idle animation, lighting, transitions, camera, undo/redo, drag&drop, arxiu social (en construcción). léete CLAUDE.md, ROADMAP.md, TODO.md, DESIGN.md y TESTING.md para el contexto completo.

el repo está parte de un ecosistema mayor (retals, imgToWeb, videoToWeb, trackr...) — todo bajo el paraguas **meowrhino studio**.

---

## qué hacer primero (literalmente el primer commit)

1. **verificar que las tres páginas cargan.**
   ```bash
   cd moixi
   python3 -m http.server 8000
   # abrir:
   #   http://localhost:8000/                                → arxiu (landing)
   #   http://localhost:8000/editor.html                     → editor
   #   http://localhost:8000/play.html?game=examples/garden.json → player
   ```
   debería verse:
   - la landing con 10 cards (mock data), buscador, filtros funcionando
   - el editor con sus 4 tabs (world / sprite / palette / play), splash de la mascota al arrancar
   - el player con el juego "el jardín": avatar movible, zorro que habla, flores recogibles
   sin errores en la consola. si algo se ve raro, arreglar antes de seguir.

2. **revisar la mascota.** `assets/mascot.svg` es el gato-rinoceronte 8×8 oficial de meowrhino studio. **dejarla como está** salvo que Manu te diga lo contrario. está reusada en el favicon, el header del editor, el splash, el footer del player y el HTML standalone exportado. **conservar `width=16 height=16` con `image-rendering: pixelated`** — el CSS asume ese tamaño.

3. **el nombre del proyecto está cerrado: `moixi`.** la key de localStorage del editor es `mosi:editor:game` (legacy: en algún momento el proyecto se llamó "mosi-clone"; la migración se hizo en Fase 0 y no merece la pena romper compatibilidad). no hace falta find/replace.

4. **la regla #1 es no añadir build tooling.** ni npm, ni vite, ni typescript, ni react, ni tailwind. esto está en CLAUDE.md y es **innegociable**. si una feature parece que lo requiere, está mal diseñada — rehacerla para que funcione con ES modules nativos del navegador.

---

## prioridades en orden

el ROADMAP es estricto en orden de fases, pero dentro de una fase las tareas son independientes y paralelizables. **TODO.md es el resumen práctico** — léelo para saber qué está cerrado.

1. **F1 pulido** (lo que queda: nav por teclado completa, responsive móvil del editor)
2. **F2 qol restante** (lista paletas con preview en sprite editor)
3. **F3 runtime visual** (layers → parallax → particles → screenshot → dayNight → gif-recorder)
4. **F4 audio** (tts-voices, samples, ducking, tracker)
5. **F8 accesibilidad** (modo daltonismo, PWA)
6. **F10a UX arxiu** (flow editor revisado, vanilla routing, feed mockup)
7. luego F5 scripting avanzado, F6 dist, F10b infra Cloudflare, F9 long-shots.

**no saltar a F10b (infra Cloudflare) sin tener F10a estable** — la idea es que cuando lleguemos a Workers + R2 + KV ya sepamos exactamente qué endpoints necesitamos.

---

## decisiones ya cerradas (no las reabras)

estas decisiones están **resueltas y documentadas** en CLAUDE.md, ROADMAP.md y los commits. si te tienta tomarlas tú por tu cuenta, ya están tomadas. si te parece que ninguna encaja en una situación concreta, pregunta a Manu antes de cambiar la dirección.

**arquitectura (CLAUDE.md):**
- **core 5 ficheros, ~250 líneas, JAMÁS se toca para añadir features.** casi todo se resuelve enchufándose a hooks existentes (`render:bg/tiles/sprites/fg/ui/final`, `tick`, `beforeMove`, `roomEnter`, `bump:sprite`, etc.).
- **módulos opt-in con la misma forma** `{ name, deps, schema, hooks, scriptFns, api, setup, teardown }`. no se importan entre sí — siempre via `core.api.<modulo>.method()`.
- **300 líneas máximo recomendado por archivo.** si crece más, partir en submódulos (ejemplo reciente: `editor/paint-canvas.js` extraído de `sprite.js`).
- **nombres**: kebab-case para scriptFns (`{set-var}`), kebab-case con prefijo de namespace para eventos del bus (`render:fg`, `input:up`). castellano informal en comentarios.
- **ES modules nativos**, comillas simples, punto y coma, 2 espacios.
- **sistema de coordenadas inamovible**: origen arriba-izquierda, x→derecha, y→abajo. todos los módulos lo asumen.

**editor:**
- **autosave automático** en `localStorage:mosi:editor:game` por cada `editor:change`. clearear con `localStorage.clear()` en consola.
- **bus interno del editor** en `editor/ui.js` (`on`/`emit`) — separado del bus del runtime (`core.bus`). las funciones de cada panel emiten `editor:change` cuando mutan `game`.
- **undo/redo** snapshot deep-clone del game entero (no diffs). max 50, FIFO. el snapshot ANTERIOR al cambio se guarda en `lastSnap` (porque `editor:change` se emite después de mutar).
- **shortcuts** centralizados en `editor/shortcuts.js`. los paneles exponen `onAdd(state)` / `onRemove(state)` / `onPlay(state)` en su default export — el editor delega via `PANELS[activeTab].onXxx(state)`.
- **paint-canvas.js** es la mecánica de pixel-art aislada (pencil/bucket/eyedrop/onion) — diseñada para ser reusada por futuros panels (font editor, etc.).
- **drag & drop de .json** sobre la ventana lo carga inmediatamente vía `loadGame`.

**runtime:**
- **idle animation**: `sprite.idle: [...]` opcional. si lleva >2000ms sin moverse, el avatar usa esos frames. backwards compatible — si no se define, sigue como antes.
- **lighting**: solo se activa si el room tiene `room.ambient: "rgba(...)"`. los sprites con `light: { radius, color }` agujerean la oscuridad y proyectan tinte cálido. `garden.json` tiene esto demostrado en el room `forest`.
- **D-pad en desktop**: visible siempre, 90px semi-transparente, sube opacity al hover. NO está gated por touch device.
- **transitions** (fade/wipe/instant) y **camera** (flip/follow/smooth) ya implementadas.

**arxiu (Fase 10):**
- **F10a se hace SIN backend**, solo HTML/CSS/JS y `examples/arxiu-mock.json` con 10 juegos fake. ya está casi todo: landing, game.html, u.html, cards refinadas, mock data con concept fuerte.
- **F10b necesita Cloudflare** (Pages + Workers + R2 + KV). NO empezar sin tener F10a estable y flow validado.
- **fork v1** = copia de JSON con `forkOf: <parentId>`. **multi-autor v2** = `room.extensible` + `game.branches`. ese es el diferenciador real frente a mosi.
- el HTML standalone exportado **es snapshot inmutable**: lleva los módulos inline como blob URLs. sigue funcionando aunque moixi desaparezca.

**el ZIP / HTML exportado:**
- el editor genera HTML standalone con `editor/export.js`. inlinea todos los módulos como blob URLs reescribiendo los imports. **NO depende de moixi en runtime**.
- corre desde `file://` o cualquier hosting estático (Neocities, Codeberg Pages, GitHub Pages, Cloudflare Pages).

---

## qué NO hacer (errores típicos)

- ❌ **no metas un framework.** ni React, ni Vue, ni Lit, ni Alpine. vanilla ES modules.
- ❌ **no añadas build step.** ni Vite, ni esbuild, ni Webpack, ni TypeScript, ni Sass. el código se sirve tal cual.
- ❌ **no toques `core/`** para añadir features. si te ves editando `core/loop.js` o `core/bus.js`, algo va mal en tu diseño — la mayoría de features se resuelven con hooks.
- ❌ **no importes módulos entre sí** directamente. siempre via `core.api.<otherModule>.method()`. los módulos son independientes.
- ❌ **no añadas `localStorage`/`sessionStorage` al runtime** que vaya al HTML standalone exportado. solo en el editor. el runtime debe funcionar igual aunque el storage falle (incógnito, quota llena).
- ❌ **no introduzcas async/await en hooks síncronos** (`render:*`, `tick`, `beforeMove`). los hooks deben retornar rápido y ser síncronos para no romper el orden de fases.
- ❌ **no metas `console.log` al runtime de producción.** errores con `console.error`, warnings con `console.warn`.
- ❌ **no inventes campos del JSON oculto.** la config siempre es visible en el JSON del juego. si añades un campo nuevo, documéntalo en el `schema` del módulo y en el README.
- ❌ **no copies estética genérica** (shadcn, glassmorphism, gradients morados). la paleta meowrhino está en DESIGN.md: paper #f4ecd8, ink #1a1a1a, amber #d4843e, teal #3d7068, rust #a83e3e, coral #ef7d57. mono everywhere, sin border-radius, sombras sólidas desplazadas.
- ❌ **no reproduzcas copyright** (lyrics, paletas comerciales, sprites de Mario, etc).
- ❌ **no rompas el sistema de coordenadas** (origen arriba-izquierda).

---

## el flow con el user (Manu, meowrhino)

- **idioma**: castellano casual. catalán bienvenido en docs públicos (los juegos mock del arxiu mezclan castellano y catalán a propósito).
- **ecosistema**: meowrhino tiene **imgToWeb, videoToWeb, trackr, retals** — todos vanilla, todos del mismo studio. **integra, no reimplementes**. si una utilidad ya existe en otro repo, mejor enlazar.
- **prefiere decisiones**: cuando haya dudas de arquitectura, plantéale 2-3 opciones con trade-offs claros, no preguntas abiertas.
- **atomicidad**: prefiere tareas pequeñas independientes + commit atómico por cada una. marca con ⚠ las que requieren trade-offs y avisa antes de tocarlas.
- **revisar 2× antes de marcar hecho**: re-leer cada archivo modificado o validar con grep/node --check antes de cerrar una tarea.
- **testing tú puedes hacerlo**: vía Claude_Preview MCP (preview_start + preview_eval + preview_screenshot). silenciar audio inmediato. `play.html` ya tiene cache-bust en sus imports.
- **vibe**: barcelona, ético, anti-bigtech, pro-código-tuyo, sostenibilidad web, "una niña caminando por un jardín y un zorro le dice algo". cualquier feature que añadamos respeta esa escala emocional: **simple, personal, expresivo, sin fricción**.

---

## comando inicial sugerido al user (Manu)

```bash
cd moixi
python3 -m http.server 8000
# abrir http://localhost:8000/ y verificar landing + editor + player
```

luego, en Claude Code, usar el **prompt de revisión crítica** primero (ver más abajo) y solo después arrancar implementación.

---

## los dos prompts que Manu te va a pasar

el flow acordado es: primero te lee y critica antes de tocar código, luego te da luz verde tarea a tarea. los dos prompts canónicos son:

### prompt 1 — revisión crítica (no tocar código)

```
Léete HANDOFF.md, CLAUDE.md, ROADMAP.md, TODO.md, DESIGN.md y TESTING.md
en ese orden. No escribas código todavía.

Cuando termines, dame:

1. Resumen en 5 bullets de qué es moixi y cuál es la filosofía.
2. Ambigüedades o contradicciones que detectes en los docs.
3. Decisiones técnicas implícitas que tú resolverías por tu cuenta —
   quiero ver tu propuesta antes de que las tomes.
4. Dependencias o herramientas externas que creas necesarias y que
   choquen con "vanilla, forever" / "no build step".
5. Estimación honesta de qué tareas de TODO.md son realistas en una
   sesión intensiva y cuáles huelen a optimismo.

No avances a implementar nada hasta que yo te diga.
```

### prompt 2 — arranque de implementación (después de discutir tu review)

```
Vale, resolvemos lo que has marcado:
[Manu te pegará aquí las decisiones que se hayan tomado conjuntamente]

Empieza por [tarea concreta de TODO.md].
Sigue estrictamente CLAUDE.md y DESIGN.md.
Commit atómico por cada cosa. Antes de marcar una tarea como done,
revísala 2× (re-lee el archivo modificado o valida con node --check)
y verifica visualmente vía preview MCP si es observable.
```

---

*moixi · motor + editor para juegos pequeños · vanilla, forever · meowrhino studio*

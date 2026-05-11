# DESIGN.md

> Guía estética de `moixi` // **meowrhino studio**.
>
> Estos son los principios. Cuando Manu suba sus assets reales del studio (paleta, mascota propia, tipografías), reemplazar los placeholders aquí marcados con `[PLACEHOLDER]`.

---

## tono

Vanilla, lo-fi, brutalist clean, monoespaciado, handmade. Cero "AI slop". Cero purple gradients. Cero shadcn. Cero glass-morphism. Cero sci-fi neon.

Las referencias mentales son:
- **Neocities** y la cultura "scrapbook digital handmade".
- **Bitsy/Mosi** (estética del propio engine: pixel art tiny, palette limited).
- **Brutalist web**: bordes sólidos, sombras sólidas desplazadas, layouts que se ven, sin esconder estructura.
- **Tipografía técnica**: mono everywhere. Como si lo hubiera maquetado un dev que cuida la tipografía.
- **Catalán informal**: los strings de UI van en lowercase y en castellano informal o en catalán. Nada de "Welcome to your dashboard". Mejor "qué pintamos hoy".

## paleta

```css
:root {
  --paper:    #f4ecd8;   /* fondo principal, papel viejo / crema */
  --paper-2:  #e8dcb8;   /* fondo secundario / hover bg */
  --ink:      #1a1a1a;   /* texto principal, bordes */
  --ink-soft: #444;      /* texto secundario */
  --amber:    #d4843e;   /* acento primario, focus, sombras de "primary" */
  --teal:     #3d7068;   /* acento secundario, links */
  --rust:     #a83e3e;   /* destructivo, warnings */
  --coral:    #ef7d57;   /* acento studio, badges "nuevo", highlight juguetón */
}
```

Reglas de uso:
- `--paper` es el fondo de todo. `--paper-2` solo para hover bg o áreas centrales del editor.
- `--ink` para texto y bordes. **Bordes de 1.5px o 2px sólidos**, no más.
- `--amber` para focus (`outline: 2px solid var(--amber)`) y como sombra de los botones primary.
- `--teal` para links (`a { color: var(--teal); }`). Hover → `--amber`.
- `--rust` solo para acciones destructivas (`× borrar`).
- `--coral` para detalles juguetones: badge "nuevo", confeti del splash, separadores decorativos.

[PLACEHOLDER] Reemplazar con la paleta real del studio meowrhino si difiere.

## tipografía

```css
--mono: ui-monospace, "JetBrains Mono", "Cascadia Code", "Fira Code", "Source Code Pro", Menlo, Consolas, monospace;
--display: var(--mono);
```

Monoespaciada en TODO. Lowercase por defecto en headers ("sprites", "world", "paletas" en vez de "Sprites", "World"). Tracking ligeramente negativo en H1 (`letter-spacing: -0.02em`). Headers H3 usan `text-transform: uppercase` y `letter-spacing: 0.08em` como "small caps tipográfico".

[PLACEHOLDER] Si meowrhino studio tiene una display font propia (alguna pixel font tipo "Press Start 2P" o algo más sutil), añadirla aquí y usarla solo en H1 y splash screen.

## sombras y bordes

**Las sombras son sólidas y desplazadas**, nunca gausianas:

```css
box-shadow: 6px 6px 0 var(--ink);          /* canvas del player */
box-shadow: 3px 3px 0 var(--amber);        /* botón primary */
box-shadow: 3px 3px 0 var(--amber);        /* list-item.active */
```

**Hover de botón** = traslación, no fade:

```css
button:active { transform: translate(2px, 2px); }   /* "apretado" */
```

**Sin border-radius** en ningún sitio. Ni en botones, ni en inputs, ni en cards. La forma es rectángulo.

## mascota / firma

La mascota es un híbrido **gato-rinoceronte 8x8** en pixel art. Se usa como:
- favicon (`favicon.svg`)
- logo junto al brand "moixi" en la toolbar del editor
- "firma" en el footer del player exportado (junto al texto "made with meowrhino studio")
- cursor custom en zonas creativas del editor (paint canvas, room grid)

Plantilla SVG mínima (8x8 con orejas de gato y cuerno frontal):

```html
<svg viewBox="0 0 8 8" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
  <!-- orejas -->
  <rect x="1" y="0" width="1" height="1" fill="var(--ink)"/>
  <rect x="6" y="0" width="1" height="1" fill="var(--ink)"/>
  <!-- cabeza -->
  <rect x="1" y="1" width="6" height="4" fill="var(--ink)"/>
  <!-- ojos (huecos paper) -->
  <rect x="2" y="2" width="1" height="1" fill="var(--paper)"/>
  <rect x="5" y="2" width="1" height="1" fill="var(--paper)"/>
  <!-- cuerno -->
  <rect x="3" y="0" width="2" height="1" fill="var(--amber)"/>
  <rect x="3" y="1" width="2" height="1" fill="var(--amber)"/>
  <!-- patas -->
  <rect x="1" y="5" width="1" height="2" fill="var(--ink)"/>
  <rect x="6" y="5" width="1" height="2" fill="var(--ink)"/>
</svg>
```

[PLACEHOLDER] Reemplazar por la mascota real si meowrhino tiene una.

## separadores y decoración tipográfica

En lugar de `<hr>` o `border-bottom: 1px solid`, usar caracteres unicode como decoración:

```
▮▰▱▮▰▱▮▰▱▮▰▱
◆◇◆◇◆◇◆◇
══════════════
─ ─ ─ ─ ─ ─ ─
```

Implementación CSS para repetir un glifo como divider:

```css
.divider-glyphs {
  font-family: var(--mono);
  font-size: 0.7rem;
  letter-spacing: 0.3em;
  color: var(--ink-soft);
  opacity: 0.6;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  padding: 0.5rem 0;
}
.divider-glyphs::before { content: "▮▰▱ ▮▰▱ ▮▰▱ ▮▰▱ ▮▰▱"; }
```

## footers y firmas

Footer del player:

```html
<footer class="credits">
  <svg class="mascot">...</svg>
  made in barcelona ☼ <a href="https://meowrhino.neocities.org">meowrhino studio</a>
</footer>
```

Footer del editor (status bar):

```
listo                                          ▮ moixi v0.1 · vanilla forever
```

[PLACEHOLDER] Texto exacto del footer a gusto de Manu.

## micro-interacciones

- Botones: `transform: translate(2px, 2px)` al `:active`. **Sin transitions de color**, solo del transform (`transition: transform 0.06s`).
- Inputs: focus outline ámbar de 2px, offset 1px. Sin glow.
- List items: el `.active` se identifica con `box-shadow: 3px 3px 0 var(--amber)` + un asterisco `▮` decorativo a la izquierda.
- Loading: una mini animación con la mascota parpadeando (los ojos abren y cierran cada 800ms).

## qué NO hacer

- ❌ Border-radius en ningún elemento.
- ❌ Sombras gausianas (`blur` en `box-shadow`).
- ❌ Gradientes excepto los muy sutiles del fondo del body (paper a paper-2 con radial).
- ❌ Emojis en la UI principal. Sí símbolos unicode tipográficos (`▮ ◆ ▰ ☼ ✦`).
- ❌ Animaciones largas. Las micro-interacciones son <100ms. Las animaciones decorativas (mascota, wavy text) son loops infinitos pero suaves.
- ❌ Tooltips con `title` HTML. Si necesitas un hint, ponlo siempre visible (en pequeño y opaco) bajo el control.
- ❌ Modales overlay con dim background. Para diálogos del editor, usar paneles laterales o reemplazar el contenido del slot.

## qué SÍ hacer

- ✅ Lowercase en headers.
- ✅ Castellano / catalán informal en los strings.
- ✅ Asteriscos y símbolos como decoración (`▮ ${nombre}` en branding).
- ✅ Asimetría intencional: el grid del editor es 280px / 1fr / 320px, no centrado, da carácter.
- ✅ Densidad de información alta pero respirada (line-height 1.4, padding 0.4-0.8em).
- ✅ Un guiño visual oculto: por ejemplo, si el usuario escribe `meow` en el script, parpadean los ojos de la mascota. Pequeños easter eggs.

---

## referencias visuales para Claude Code

Si tienes que tomar decisiones de diseño sin que Manu esté delante:
- **Mira**: itch.io devlogs (densidad indie), are.na (handmade web), kool.tools (kit familiar a este engine).
- **No mires**: dribbble, vercel templates, shadcn examples, "modern saas dashboards".

Cuando dudes entre dos opciones, elige la que se vea más "como si lo hubiera hecho una persona, no una empresa".

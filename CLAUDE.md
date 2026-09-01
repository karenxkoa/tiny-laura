# Tiny Laura — Contexto del proyecto

> Este archivo lo lee Claude Code automáticamente al iniciar cada sesión.
> Trabajar y responder **siempre en español**.

## Qué es

Sitio web para **Tiny Laura** (@tiny.laura_), ilustradora kawaii de Culiacán, Sinaloa.
El sitio es **catálogo + portafolio**, NO tienda con pasarela propia: la compra se cierra fuera
del sitio, por **DM de Instagram**. Diseño y desarrollo intermediario: karenxkoa (UX/UI en Figma).

- **Audiencia:** mujeres jóvenes 14–35 de Culiacán. Mayoritariamente móvil.
- **Regla base:** mobile-first y totalmente responsivo. El móvil manda.
- **Antes de opinar sobre diseño/UX:** investigar buenas prácticas UX/UI actuales y las
  pautas WCAG más recientes. Análisis basado en hechos, no en supuestos.

## Stack y alcance

- **Destino final:** Framer (por control de dominio). Este repo HTML/CSS/JS es el
  **código de referencia y plan B**; sirve de guía para traducir a componentes de Framer.
- **Catálogo:** JSON estático en `assets/data/productos.json`. `app.js` lo trae con `fetch`
  (una sola vez por carga, cacheado en memoria) y renderiza las tarjetas. **No hay backend,
  ni Worker, ni panel admin, ni secrets**: para cambiar el catálogo se edita el JSON.
  Campos por producto: `id`, `nombre`, `descripcion`, `imagen`, `precio`, `moneda`,
  `categoria`, `medidas`, `material`, `esNovedad`. Sin `precio` la tarjeta sale
  como "Próximamente" (botón deshabilitado).
- **Pago / cierre de compra:** por **DM de Instagram** (@tiny.laura_), a **nivel de producto**,
  no de categoría. El redirect va a `https://ig.me/m/tiny.laura_`.
- **Método de acumulación:** se gestiona 100% por DM de Instagram, **fuera del sitio**
  (no requiere pantallas ni flujos aquí).
- **Ruta del JSON:** `CATALOGO_URL` en `app.js` es absoluta (`/assets/data/productos.json`),
  así que hace falta servidor local para probar (`python -m http.server`); con `file://` no carga.
- Sin código malicioso ni credenciales en el repo.

## Sistema de diseño (tokens)

Tipografía: **Quicksand** (400–700, cuerpo/UI) + **Caveat** (solo acentos decorativos).
El wordmark "Tiny Laura" es un **asset de imagen**, no una fuente (aquí va aproximado con Quicksand bold).
Medidas en base 8 (8/16/24/32…). Esquinas redondeadas.

**Colores decorativos — SOLO fondos/acentos, nunca en texto o botones:**
`#FAD6D6` `#F6A5A9` `#FFFAEB` (crema, fondo de página) `#F47C84`

**Colores funcionales — texto + UI interactiva:**
`#A5323F` (coral funcional: textos, botones, precios, links) `#332F2C` `#4A4744` `#6E6A67`

**Estados (avisos):** éxito `#2E6B3D`/`#E1F0E4` · warning `#8A5A12`/`#FBEACD`
· error `#A93226`/`#FADEDC` · info `#6B3F8C`/`#F0E5F7`

Todos definidos como variables CSS en `styles.css` (`:root`). Usar siempre las variables.

## Navegación e IA (decisiones cerradas)

- **Desktop:** píldora flotante superior → logo · Catálogo · Conóceme · Ayuda · ícono de búsqueda.
- **Móvil (≤860px):** **una sola barra de navegación**. La píldora superior completa
  (logo, links e ícono de búsqueda) se oculta y sólo queda el **bottom pill nav fijo** con
  4 accesos: **Inicio · Buscar · Categorías · Sobre mí**. (Ayuda queda fuera a propósito, por
  Ley de Hick; se llega desde el footer.)
- **Buscador en móvil:** se abre desde el bottom nav y el panel flota **justo encima** de la
  píldora inferior (`position:fixed`), no arriba de la página. Cierra con Escape y devuelve
  el foco al botón que lo abrió.
- **Novedades** vive solo en la Home, no como pill de categoría ni como tarjeta del índice.
- **FAQ / Ayuda** es página independiente (no acordeón), bajo Ayuda + footer.
- **7 categorías navegables:** Descuentos, Tote Bags y T-Shirts, Prints, Planillas de Stickers,
  Stickers Individuales, Pines y **Charms** (confirmada como categoría oficial el 2026-07-30).
  Todas (incluida Descuentos) tienen botón "Comprar" y redirigen al DM de Instagram.
- **Índice de categorías (`categorias.html`):** es el destino de "Catálogo" (píldora superior)
  y de "Categorías" (bottom nav). Rejilla de 7 tarjetas = imagen retrato 4:5 + nombre en coral,
  **sin precio ni CTA**. 2 columnas en móvil, 4 en desktop.
- **Una página por categoría:** cada categoría tiene su propio HTML. **Las pills SÍ filtran:**
  son la navegación entre categorías, van como `<a class="cat-pill">` con `aria-current="page"`
  en la activa (no `aria-pressed`, que es para toggles), y cada categoría queda con URL propia
  compartible. En móvil la fila es carrusel horizontal; en ≥861px se centra en una línea.
- **Flujo de compra (Instagram DM):** al dar "Comprar" se abre un **modal de confirmación**
  ("Cerremos tu compra por Instagram") que muestra en un `<pre>` el mensaje pre-armado con
  nombre, precio, medidas y material del producto. Botones: "Ir a Instagram" / "Permanecer aquí".
  Al confirmar, `app.js` copia ese mensaje al portapapeles (avisando en un `aria-live="polite"`)
  y abre `https://ig.me/m/tiny.laura_` en pestaña nueva; si el portapapeles falla, redirige igual.
  El botón del catálogo es `<button class="btn-comprar" data-comprar data-comprar-id="…">`
  y se enlaza por **delegación de eventos**, para que funcione con tarjetas renderizadas
  dinámicamente desde el JSON.

## Accesibilidad (WCAG 2.2) — no negociable

- Contraste: usar `#A5323F` para texto/UI. El pastel `#F47C84` **falla** contraste: solo fondo.
- Touch targets ≥ 44px (2.5.8).
- Modal de compra: `role="dialog"`, `aria-modal`, focus trap, cierre con Escape y clic en el fondo,
  y retorno de foco al botón que lo abrió. El aviso de "mensaje copiado" va en `aria-live="polite"`.
- `scroll-padding-bottom` en móvil para que el bottom nav fijo no tape el elemento con foco.
- Foco visible en todo lo interactivo; `prefers-reduced-motion` respetado; skip-link + landmarks.

## Estructura de archivos

- `index.html` — Home (hero + banner promo + Novedades)
- `categorias.html` — Índice de categorías (7 tarjetas). Destino de Catálogo / Categorías.
- `descuentos.html`, `totes-y-tshirts.html`, `prints.html`, `planillas.html`, `stickers.html`,
  `pines.html`, `charms.html` — una página por categoría: fila de pills + grid de productos.
  Son la misma plantilla; sólo cambian título, pill activa y `<title>`/`<meta description>`.
- `buscar.html` — página de resultados de búsqueda (destino del buscador).
- `producto.html` — Detalle de producto (selector de laminado + similares)
- `conoceme.html` — Sobre mí + Redes + Contacto + Behind Tiny Laura
- `ayuda.html` — FAQ / Términos
- `styles.css` — tokens + todos los componentes (header, footer, card, pills, modal, bottom nav)
- `app.js` — catálogo desde JSON + buscador (arriba y bottom nav) + modal de compra accesible
- `assets/data/productos.json` — catálogo estático (fuente única de productos).
- `assets/` — imágenes reales por integrar (gatonejo, fotos de producto, polaroid, wordmark)

`catalogo.html` ya **no existe** en el repo. Las 13 páginas son: `index`, `categorias`,
las 7 de categoría, `buscar`, `producto`, `conoceme` y `ayuda`.

## Convenciones al editar

- Mantener el patrón mobile-first: estilos base = móvil, media queries añaden desktop.
- No duplicar header/footer/modal a mano: si cambian, cambiarlos en **las 13 páginas** por igual.
  Para las 7 de categoría conviene editar una y regenerar el resto con un script, no a mano.
- Nombres de producto y precios en `--coral` (`#A5323F`), no en pastel.
- Cualquier nueva decisión de diseño/IA: pedir que se agregue a este CLAUDE.md.

## Pendientes / decisiones abiertas

- [ ] **Banner promo:** en el mockup del Landing está en verde de éxito; aquí ya se pasó al
      tratamiento de marca (pastel + coral). Confirmar con Karen que así queda.
- [x] **"Charms":** confirmada como categoría oficial (2026-07-30). Tiene tarjeta en el índice,
      pill propia y `charms.html`.
- [x] **Destino de `catalogo.html`:** resuelto — se eliminó; la navegación vive en `categorias.html`.
- [x] **Migración Ko-fi/Stripe → Instagram DM (2026-08-31):** eliminada la integración con Stripe
      (Worker, secrets, panel admin) y toda referencia a Ko-fi. Compra por DM de Instagram
      sobre catálogo JSON estático. La clase del botón pasó de `btn-kofi` a `btn-comprar`.
- [ ] **Assets reales:** sustituir placeholders (gatonejo, fotos de producto, polaroid) y el
      wordmark por el archivo de imagen definitivo. Falta `assets/productos/gyaru-girls.jpg`,
      referenciada ya por `productos.json`.
- [ ] **Catálogo real:** `assets/data/productos.json` hoy trae **un solo producto de ejemplo**
      (Gyaru Girls). Falta volcar el catálogo completo de las 7 categorías.
- [ ] **Traducción a Framer:** breakpoints, componentes responsivos y mapeo del design system.

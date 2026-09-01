/* Tiny Laura — interacciones compartidas
   - Catálogo dinámico: trae los productos desde un JSON estático
   - Buscador de sitio completo
   - Toggle de menú móvil y del buscador
   - Modal de compra: arma un mensaje pre-llenado y redirige al DM de Instagram
*/
(function () {
  'use strict';

  // Ruta al catálogo estático. Ajusta si guardas el JSON en otra carpeta.
  var CATALOGO_URL = '/assets/data/productos.json';

  // Usuario de Instagram al que se redirige para cerrar la compra
  var INSTAGRAM_USUARIO = 'tiny.laura_';

  var catalogoCache = null;

  // ---------- Trae el catálogo del JSON (una sola vez por carga de página) ----------
  async function obtenerCatalogo() {
    if (catalogoCache) { return catalogoCache; }
    try {
      var respuesta = await fetch(CATALOGO_URL);
      if (!respuesta.ok) { throw new Error('No se pudo cargar el catálogo: ' + respuesta.status); }
      var datos = await respuesta.json();
      catalogoCache = datos || [];
    } catch (error) {
      console.error('No se pudo cargar el catálogo:', error);
      catalogoCache = [];
    }
    return catalogoCache;
  }

  // ---------- Construye el HTML de una tarjeta de producto ----------
  function crearTarjetaHTML(producto) {
    var precio = producto.precio != null ? '$' + producto.precio + ' ' + producto.moneda : '';
    var metaPartes = [producto.medidas, producto.material].filter(Boolean);
    var urlDetalle = 'producto.html?id=' + encodeURIComponent(producto.id);
    var imagenHTML = producto.imagen
      ? '<img src="' + producto.imagen + '" alt="' + escaparHTML(producto.nombre) + '" loading="lazy">'
      : '';
    var botonHTML = producto.precio != null
      ? '<button class="btn-comprar" data-comprar data-comprar-id="' + escaparHTML(producto.id) + '">Comprar</button>'
      : '<button class="btn-comprar" disabled>Próximamente</button>';

    return (
      '<li class="product-card">' +
        '<a class="product-media" href="' + urlDetalle + '" aria-label="Ver detalle de ' + escaparHTML(producto.nombre) + '">' +
          imagenHTML +
          '<span class="price-badge">' + precio + '</span>' +
        '</a>' +
        '<p class="product-name"><a href="' + urlDetalle + '">\u201c' + escaparHTML(producto.nombre) + '\u201d</a></p>' +
        '<p class="product-meta">' + escaparHTML(metaPartes.join(' \u00b7 ')) + '</p>' +
        botonHTML +
      '</li>'
    );
  }

  function escaparHTML(texto) {
    var div = document.createElement('div');
    div.textContent = texto || '';
    return div.innerHTML;
  }

  // ---------- Renderiza una lista de productos dentro de un contenedor ----------
  async function renderizarGrid(contenedor, filtro) {
    var productos = await obtenerCatalogo();
    var filtrados = typeof filtro === 'function' ? productos.filter(filtro) : productos;
    contenedor.innerHTML = filtrados.length
      ? filtrados.map(crearTarjetaHTML).join('')
      : '<li class="empty-state">Aún no hay productos aquí.</li>';
  }

  // Catálogo filtrado por categoría — usar en páginas como prints.html, charms.html, etc.
  // Requiere: <ul class="product-grid" data-categoria="prints"></ul>
  var gridCategoria = document.querySelector('[data-categoria]');
  if (gridCategoria) {
    var categoria = gridCategoria.getAttribute('data-categoria');
    renderizarGrid(gridCategoria, function (p) { return p.categoria === categoria; });
  }

  // Sección "Novedades" del home — requiere: <ul class="product-grid" data-novedades></ul>
  var gridNovedades = document.querySelector('[data-novedades]');
  if (gridNovedades) {
    renderizarGrid(gridNovedades, function (p) { return p.esNovedad; });
  }

  // ---------- Página de detalle de producto (producto.html?id=...) ----------
  var detalle = document.querySelector('[data-producto-detalle]');
  var contenedorSimilares = document.querySelector('[data-pd-similares]');
  if (detalle) {
    var params = new URLSearchParams(window.location.search);
    var idProducto = params.get('id');
    obtenerCatalogo().then(function (productos) {
      var producto = productos.find(function (p) { return p.id === idProducto; });
      if (!producto) {
        detalle.innerHTML = '<p>No encontramos este producto. <a href="categorias.html">Ver catálogo completo</a>.</p>';
        if (contenedorSimilares) { contenedorSimilares.innerHTML = ''; }
        return;
      }
      document.title = producto.nombre + ' — Tiny Laura';
      var elTitulo = detalle.querySelector('[data-pd-title]');
      var elDesc = detalle.querySelector('[data-pd-desc]');
      var elPrecio = detalle.querySelector('[data-pd-price]');
      var elImg = detalle.querySelector('[data-pd-img]');
      var elBuy = detalle.querySelector('[data-pd-buy]');
      var elNotaVariante = detalle.querySelector('[data-pd-nota-variante]');
      if (elTitulo) { elTitulo.textContent = producto.nombre; }
      if (elDesc) { elDesc.textContent = producto.descripcion; }
      if (elPrecio) { elPrecio.textContent = '$' + producto.precio + ' ' + producto.moneda; }
      if (elImg && producto.imagen) { elImg.src = producto.imagen; elImg.alt = producto.nombre; }
      if (elBuy) {
        if (producto.precio != null) {
          elBuy.setAttribute('data-comprar', '');
          elBuy.setAttribute('data-comprar-id', producto.id);
          elBuy.removeAttribute('disabled');
          elBuy.textContent = 'Comprar';
        } else {
          elBuy.setAttribute('disabled', '');
          elBuy.textContent = 'Próximamente';
        }
      }
      // Texto informativo de variante (ej. tipo de laminado en stickers) — opcional
      if (elNotaVariante) {
        if (producto.notaVariante) {
          elNotaVariante.textContent = producto.notaVariante;
          elNotaVariante.hidden = false;
        } else {
          elNotaVariante.hidden = true;
        }
      }

      // "Otros productos similares": misma categoría, sin incluir el producto actual
      if (contenedorSimilares) {
        var similares = productos.filter(function (p) {
          return p.categoria === producto.categoria && p.id !== producto.id;
        }).slice(0, 4);
        contenedorSimilares.innerHTML = similares.length
          ? similares.map(crearTarjetaHTML).join('')
          : '<li class="empty-state">Aún no hay más productos en esta categoría.</li>';
      }
    });
  }

  // ---------- Página de resultados de búsqueda (buscar.html?q=...) ----------
  var gridResultados = document.querySelector('[data-resultados-busqueda]');
  if (gridResultados) {
    var qp = new URLSearchParams(window.location.search);
    var terminoPagina = (qp.get('q') || '').trim();
    var tituloResultados = document.querySelector('[data-busqueda-titulo]');
    if (tituloResultados) {
      tituloResultados.textContent = terminoPagina
        ? 'Resultados para \u201c' + terminoPagina + '\u201d'
        : 'Buscar productos';
    }
    var terminoLower = terminoPagina.toLowerCase();
    renderizarGrid(gridResultados, function (p) {
      return terminoLower ? p.nombre.toLowerCase().includes(terminoLower) : false;
    });
  }

  /* ---------- Buscador (botón superior y de la píldora inferior) ---------- */
  var searchToggles = document.querySelectorAll('.search-toggle');
  var searchPanel = document.getElementById('search-panel');
  if (searchPanel && searchToggles.length) {
    var lastSearchToggle = null;

    function setSearch(open, trigger) {
      if (open) {
        lastSearchToggle = trigger || null;
        searchPanel.removeAttribute('hidden');
        var input = searchPanel.querySelector('input');
        if (input) {
          if (getComputedStyle(searchPanel).position !== 'fixed') {
            input.scrollIntoView({ block: 'center' });
          }
          input.focus();
        }
      } else {
        searchPanel.setAttribute('hidden', '');
        if (trigger === undefined && lastSearchToggle) { lastSearchToggle.focus(); }
      }
      searchToggles.forEach(function (b) { b.setAttribute('aria-expanded', String(open)); });
    }

    searchToggles.forEach(function (btn) {
      btn.addEventListener('click', function () {
        setSearch(searchPanel.hasAttribute('hidden'), btn);
      });
    });

    searchPanel.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { setSearch(false); }
    });

    // Enter en el campo de búsqueda → va a la página de resultados
    var inputBuscador = searchPanel.querySelector('input[type="search"]');
    if (inputBuscador) {
      inputBuscador.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter') { return; }
        e.preventDefault();
        var termino = inputBuscador.value.trim();
        if (!termino) { return; }
        window.location.href = 'buscar.html?q=' + encodeURIComponent(termino);
      });
    }
  }

  /* ---------- Tabs accesibles (ej. Ayuda: Preguntas Frecuentes / Términos) ---------- */
  document.querySelectorAll('[role="tablist"]').forEach(function (tablist) {
    var tabs = Array.prototype.slice.call(tablist.querySelectorAll('[role="tab"]'));
    if (!tabs.length) { return; }

    function activarTab(tab, moverFoco) {
      tabs.forEach(function (t) {
        var seleccionado = t === tab;
        t.setAttribute('aria-selected', String(seleccionado));
        t.setAttribute('tabindex', seleccionado ? '0' : '-1');
        t.classList.toggle('is-active', seleccionado);
        var panel = document.getElementById(t.getAttribute('aria-controls'));
        if (panel) { panel.hidden = !seleccionado; }
      });
      if (moverFoco) { tab.focus(); }
    }

    tabs.forEach(function (tab, indice) {
      tab.addEventListener('click', function () { activarTab(tab, false); });
      tab.addEventListener('keydown', function (e) {
        var nuevoIndice = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { nuevoIndice = (indice + 1) % tabs.length; }
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { nuevoIndice = (indice - 1 + tabs.length) % tabs.length; }
        else if (e.key === 'Home') { nuevoIndice = 0; }
        else if (e.key === 'End') { nuevoIndice = tabs.length - 1; }
        if (nuevoIndice !== null) {
          e.preventDefault();
          activarTab(tabs[nuevoIndice], true);
        }
      });
    });
  });

  /* ---------- Modal de compra: arma el mensaje y redirige a Instagram ---------- */
  var modal = document.getElementById('compra-modal');
  if (!modal) { return; }

  var backdrop = modal;
  var goBtn = modal.querySelector('[data-compra-go]');
  var stayBtn = modal.querySelector('[data-compra-stay]');
  var previewEl = modal.querySelector('[data-compra-preview]');
  var statusEl = modal.querySelector('[data-compra-status]');
  var lastTrigger = null;
  var productoActivo = null;

  function focusables() {
    return modal.querySelectorAll('a[href], button:not([disabled])');
  }

  // Arma el texto que se copiará al portapapeles antes de ir a Instagram
  function construirMensaje(producto) {
    var lineas = [
      '¡Hola! 🩷 Me interesa: ' + producto.nombre + ' — $' + producto.precio + ' ' + producto.moneda,
      'Medidas: ' + producto.medidas,
      'Material: ' + producto.material
    ];
    return lineas.join('\n');
  }

  function abrirInstagramConMensaje(producto) {
    var mensaje = construirMensaje(producto);
    var url = 'https://ig.me/m/' + INSTAGRAM_USUARIO;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(mensaje)
        .then(function () { anunciarCopiado(); })
        .catch(function () { /* si falla el portapapeles, igual redirigimos */ })
        .finally(function () { window.open(url, '_blank', 'noopener'); });
    } else {
      window.open(url, '_blank', 'noopener');
    }
  }

  function anunciarCopiado() {
    if (statusEl) { statusEl.textContent = 'Mensaje copiado. Pégalo en el chat de Instagram.'; }
  }

  function openModal(trigger, producto) {
    lastTrigger = trigger || null;
    productoActivo = producto;
    if (previewEl) { previewEl.textContent = construirMensaje(producto); }
    if (statusEl) { statusEl.textContent = ''; }
    backdrop.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';
    var f = focusables();
    if (f.length) { f[0].focus(); }
    document.addEventListener('keydown', onKeydown);
  }

  function closeModal() {
    backdrop.setAttribute('hidden', '');
    document.body.style.overflow = '';
    document.removeEventListener('keydown', onKeydown);
    productoActivo = null;
    if (lastTrigger) { lastTrigger.focus(); }
  }

  function onKeydown(e) {
    if (e.key === 'Escape') { closeModal(); return; }
    if (e.key === 'Tab') {
      var f = focusables();
      if (!f.length) { return; }
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    }
  }

  // Delegación de eventos: funciona con botones creados dinámicamente (tarjetas del catálogo)
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-comprar]');
    if (!btn || btn.hasAttribute('disabled')) { return; }
    var id = btn.getAttribute('data-comprar-id');
    obtenerCatalogo().then(function (productos) {
      var producto = productos.find(function (p) { return p.id === id; });
      if (producto) { openModal(btn, producto); }
    });
  });

  if (stayBtn) { stayBtn.addEventListener('click', closeModal); }
  backdrop.addEventListener('click', function (e) {
    if (e.target === backdrop) { closeModal(); }
  });
  if (goBtn) {
    goBtn.addEventListener('click', function () {
      if (productoActivo) { abrirInstagramConMensaje(productoActivo); }
      closeModal();
    });
  }
})();

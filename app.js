/* Tiny Laura — interacciones compartidas
   - Catálogo dinámico: trae los productos desde el Worker de Cloudflare (Stripe)
   - Buscador de sitio completo
   - Toggle de menú móvil y del buscador
   - Modal de redirección con focus trap, Escape y retorno de foco
*/
(function () {
  'use strict';

  // Cambia esto si tu Worker tiene otra URL
  var WORKER_URL = 'https://tiny-laura-stripe-api.karenxkoa.workers.dev/';

  var catalogoCache = null;

  // ---------- Trae el catálogo del Worker (una sola vez por carga de página) ----------
  async function obtenerCatalogo() {
    if (catalogoCache) { return catalogoCache; }
    try {
      var respuesta = await fetch(WORKER_URL);
      if (!respuesta.ok) { throw new Error('Worker respondió ' + respuesta.status); }
      var datos = await respuesta.json();
      catalogoCache = datos.productos || [];
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
    var botonHTML = producto.linkPago
      ? '<button class="btn-kofi" data-kofi data-kofi-url="' + producto.linkPago + '">Comprar</button>'
      : '<button class="btn-kofi" disabled>Próximamente</button>';

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
      if (elTitulo) { elTitulo.textContent = producto.nombre; }
      if (elDesc) { elDesc.textContent = producto.descripcion; }
      if (elPrecio) { elPrecio.textContent = '$' + producto.precio + ' ' + producto.moneda; }
      if (elImg && producto.imagen) { elImg.src = producto.imagen; elImg.alt = producto.nombre; }
      if (elBuy) {
        if (producto.linkPago) {
          elBuy.setAttribute('data-kofi', '');
          elBuy.setAttribute('data-kofi-url', producto.linkPago);
        } else {
          elBuy.setAttribute('disabled', '');
          elBuy.textContent = 'Próximamente';
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

  /* ---------- Modal de redirección al pago ---------- */
  var modal = document.getElementById('kofi-modal');
  if (!modal) { return; }

  var backdrop = modal;
  var goBtn = modal.querySelector('[data-kofi-go]');
  var stayBtn = modal.querySelector('[data-kofi-stay]');
  var lastTrigger = null;

  function focusables() {
    return modal.querySelectorAll('a[href], button:not([disabled])');
  }

  function openModal(trigger, url) {
    lastTrigger = trigger || null;
    if (goBtn && url) { goBtn.setAttribute('href', url); }
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
    var btn = e.target.closest('[data-kofi]');
    if (!btn || btn.hasAttribute('disabled')) { return; }
    openModal(btn, btn.getAttribute('data-kofi-url'));
  });

  if (stayBtn) { stayBtn.addEventListener('click', closeModal); }
  backdrop.addEventListener('click', function (e) {
    if (e.target === backdrop) { closeModal(); }
  });
  if (goBtn) { goBtn.addEventListener('click', closeModal); }
})();

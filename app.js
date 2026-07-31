/* Tiny Laura — interacciones compartidas
   - Toggle de menú móvil y del buscador
   - Modal de redirección a Ko-fi con focus trap, Escape y retorno de foco
*/
(function () {
  'use strict';

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
          // en móvil el panel es fijo (flota sobre el bottom nav): no hace falta desplazar
          if (getComputedStyle(searchPanel).position !== 'fixed') {
            input.scrollIntoView({ block: 'center' });
          }
          input.focus();
        }
      } else {
        searchPanel.setAttribute('hidden', '');
        if (trigger === undefined && lastSearchToggle) { lastSearchToggle.focus(); }
      }
      // sincroniza aria-expanded en todos los botones de búsqueda
      searchToggles.forEach(function (b) { b.setAttribute('aria-expanded', String(open)); });
    }

    searchToggles.forEach(function (btn) {
      btn.addEventListener('click', function () {
        setSearch(searchPanel.hasAttribute('hidden'), btn);
      });
    });

    // Escape cierra el buscador y devuelve el foco al botón que lo abrió
    searchPanel.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { setSearch(false); }
    });
  }

  /* ---------- Modal Ko-fi ---------- */
  var modal = document.getElementById('kofi-modal');
  if (!modal) { return; }

  var backdrop = modal;
  var goBtn = modal.querySelector('[data-kofi-go]');
  var stayBtn = modal.querySelector('[data-kofi-stay]');
  var lastTrigger = null;
  var KOFI_URL = 'https://ko-fi.com/tinylaura'; // TODO: URL real de la tienda

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

  // Cada botón "Comprar en Ko-Fi" abre el modal (no redirige directo)
  document.querySelectorAll('[data-kofi]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      openModal(btn, btn.getAttribute('data-kofi-url') || KOFI_URL);
    });
  });

  if (stayBtn) { stayBtn.addEventListener('click', closeModal); }
  // Clic en el fondo (fuera del cuadro) cierra
  backdrop.addEventListener('click', function (e) {
    if (e.target === backdrop) { closeModal(); }
  });
  // "Ir a Ko-fi" navega y cierra el estado del modal
  if (goBtn) { goBtn.addEventListener('click', closeModal); }
})();

/* BLANC — comportamiento del tema. Sin dependencias. */
(function () {
  'use strict';

  // Cabecera transparente sobre la portada
  var bar = document.querySelector('[data-bar].bar--over');
  if (bar) {
    var setOver = function () { bar.classList.toggle('is-over', window.scrollY < window.innerHeight * 0.6); };
    setOver();
    window.addEventListener('scroll', setOver, { passive: true });
  }

  // Logotipo del pie a todo el ancho
  function fitGiant() {
    document.querySelectorAll('.giant').forEach(function (g) {
      g.style.fontSize = '100px';
      var r = document.createRange(); r.selectNodeContents(g);
      var tw = r.getBoundingClientRect().width;
      if (!tw) return;
      g.style.fontSize = Math.floor(100 * g.clientWidth / tw * 0.99 * 10) / 10 + 'px';
    });
  }
  fitGiant();
  window.addEventListener('resize', fitGiant);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitGiant);

  // Contador del carrito
  function setCount(n) {
    document.querySelectorAll('[data-cart-count]').forEach(function (el) { el.textContent = n; });
  }

  // Formato de precio con el formato de la tienda
  function formatMoney(cents, format) {
    var value = (cents / 100).toFixed(2);
    var parts = value.split('.');
    var withComma = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + parts[1];
    var withDot = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '.' + parts[1];
    return (format || '{{amount_with_comma_separator}} €')
      .replace(/\{\{\s*amount_with_comma_separator\s*\}\}/, withComma)
      .replace(/\{\{\s*amount_no_decimals_with_comma_separator\s*\}\}/, parts[0])
      .replace(/\{\{\s*amount_no_decimals\s*\}\}/, parts[0])
      .replace(/\{\{\s*amount\s*\}\}/, withDot);
  }

  // Ficha de producto
  document.querySelectorAll('[data-product]').forEach(function (root) {
    var variants = JSON.parse(root.querySelector('[data-variants]').textContent);
    var strings = JSON.parse(root.querySelector('[data-strings]').textContent);
    var form = root.querySelector('[data-product-form]');
    var idInput = root.querySelector('[data-variant-id]');
    var addBtn = root.querySelector('[data-add]');
    var addLabel = root.querySelector('[data-add-label]');
    var priceEl = root.querySelector('[data-price]');
    var status = root.querySelector('[data-status]');

    function selected() {
      var opts = [];
      root.querySelectorAll('[data-option]:checked').forEach(function (i) { opts[+i.dataset.option] = i.value; });
      return opts;
    }
    function match(opts) {
      return variants.find(function (v) { return v.options.every(function (o, i) { return opts[i] === undefined || o === opts[i]; }); });
    }
    function markAvailability() {
      // tacha valores sin stock para la combinación actual (útil con una sola opción, p. ej. talla)
      var opts = selected();
      root.querySelectorAll('[data-option]').forEach(function (input) {
        var idx = +input.dataset.option;
        var test = opts.slice(); test[idx] = input.value;
        var v = match(test);
        input.closest('.size').classList.toggle('is-unavailable', !v || !v.available);
      });
    }
    function update() {
      var v = match(selected());
      status.textContent = '';
      if (!v) {
        addBtn.disabled = true; addLabel.textContent = strings.unavailable; return;
      }
      idInput.value = v.id;
      addBtn.disabled = !v.available;
      addLabel.textContent = v.available ? strings.add + ' — ' + formatMoney(v.price, strings.moneyFormat) : strings.soldOut;
      priceEl.innerHTML = (v.compare_at_price > v.price ? '<s>' + formatMoney(v.compare_at_price, strings.moneyFormat) + '</s> ' : '') + formatMoney(v.price, strings.moneyFormat);
      var url = new URL(window.location.href); url.searchParams.set('variant', v.id);
      window.history.replaceState({}, '', url.toString());
      if (v.featured_media) {
        var i = Array.prototype.findIndex.call(root.querySelectorAll('[data-slide]'), function (s) { return s.dataset.mediaId === String(v.featured_media.id); });
        if (i > -1) show(i);
      }
    }
    root.addEventListener('change', function (e) { if (e.target.matches('[data-option]')) { update(); markAvailability(); } });
    markAvailability();

    // Galería
    var slides = root.querySelectorAll('[data-slide]');
    var dots = root.querySelectorAll('[data-dot]');
    function show(i) {
      slides.forEach(function (s, k) { s.classList.toggle('is-active', k === i); });
      dots.forEach(function (d, k) { d.setAttribute('aria-current', k === i ? 'true' : 'false'); });
    }
    dots.forEach(function (d) { d.addEventListener('click', function () { show(+d.dataset.dot); }); });
    var stage = root.querySelector('[data-slides]');
    if (stage && slides.length > 1) {
      var x0 = null;
      stage.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
      stage.addEventListener('touchend', function (e) {
        if (x0 === null) return;
        var dx = e.changedTouches[0].clientX - x0; x0 = null;
        if (Math.abs(dx) < 40) return;
        var cur = Array.prototype.findIndex.call(slides, function (s) { return s.classList.contains('is-active'); });
        show((cur + (dx < 0 ? 1 : -1) + slides.length) % slides.length);
      });
    }

    // Añadir al carrito sin recargar (si falla, el formulario se envía de forma normal)
    form.addEventListener('submit', function (e) {
      if (!window.fetch) return;
      e.preventDefault();
      addBtn.disabled = true;
      fetch(window.Shopify && Shopify.routes ? Shopify.routes.root + 'cart/add.js' : '/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ items: [{ id: +idInput.value, quantity: 1 }] })
      })
        .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw j; return j; }); })
        .then(function () { return fetch((window.Shopify && Shopify.routes ? Shopify.routes.root : '/') + 'cart.js').then(function (r) { return r.json(); }); })
        .then(function (cart) { setCount(cart.item_count); status.textContent = strings.added; })
        .catch(function (err) { status.textContent = (err && err.description) || strings.error; })
        .finally(function () { var v = match(selected()); addBtn.disabled = !(v && v.available); });
    });
  });

  // Abrir las preferencias del banner de cookies de Shopify
  document.querySelectorAll('[data-cookie-prefs]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (window.privacyBanner && typeof window.privacyBanner.showPreferences === 'function') {
        window.privacyBanner.showPreferences();
      } else {
        window.location.href = (window.Shopify && Shopify.routes ? Shopify.routes.root : '/') + 'pages/cookies';
      }
    });
  });

  // Carrito: obliga a aceptar condiciones antes del pago
  var checkout = document.querySelector('[data-checkout]');
  if (checkout) {
    var terms = document.querySelector('[data-terms]');
    var msg = document.querySelector('[data-terms-msg]');
    checkout.addEventListener('click', function (e) {
      if (terms && !terms.checked) {
        e.preventDefault();
        msg.textContent = document.documentElement.lang.indexOf('es') === 0 ? 'Marca la casilla de condiciones de venta para continuar.' : 'Please accept the terms of sale to continue.';
        terms.focus();
      }
    });
  }
})();

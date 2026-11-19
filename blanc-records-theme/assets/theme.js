/* BLANC — comportamiento del tema. Sin dependencias. */
(function () {
  'use strict';

  // Cabecera transparente sobre la portada
  var bar = document.querySelector('[data-bar].bar--over');
  if (bar) {
    var setOver = function () { bar.classList.toggle('is-over', window.scrollY < window.innerHeight * 0.75); };
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
    document.querySelectorAll('[data-cart-count]').forEach(function (el) {
      el.textContent = n; el.dataset.n = n;
      el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
    });
  }

  // Menú del móvil a pantalla completa
  var menu = document.querySelector('[data-menu]');
  var openBtn = document.querySelector('[data-menu-open]');
  if (menu && openBtn) {
    var closeBtn = menu.querySelector('[data-menu-close]');
    var openMenu = function () { menu.hidden = false; openBtn.setAttribute('aria-expanded', 'true'); document.body.style.overflow = 'hidden'; closeBtn.focus(); };
    var closeMenu = function () { if (menu.hidden) return; menu.hidden = true; openBtn.setAttribute('aria-expanded', 'false'); document.body.style.overflow = ''; openBtn.focus(); };
    openBtn.addEventListener('click', openMenu);
    closeBtn.addEventListener('click', closeMenu);
    menu.addEventListener('click', function (e) { if (e.target.closest('.menu-links a')) closeMenu(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });
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

  // Carrito lateral derecho: se abre al añadir una prenda o al pulsar el carrito
  var sheetEl = document.querySelector('[data-sheet]');
  var routeRoot = (window.Shopify && Shopify.routes && Shopify.routes.root) || '/';
  var sheetOpen = function () {};
  if (sheetEl) {
    var S = JSON.parse(sheetEl.getAttribute('data-strings'));
    var mf = sheetEl.getAttribute('data-money-format');
    var esc = function (t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
    var q = function (sel) { return sheetEl.querySelector(sel); };
    var allProducts = null;
    var addedTimer;
    var lastFocus = null;
    var loadProducts = function () {
      if (allProducts) return Promise.resolve(allProducts);
      return fetch(routeRoot + 'collections/all/products.json?limit=30')
        .then(function (r) { return r.json(); })
        .then(function (j) { allProducts = j.products || []; return allProducts; })
        .catch(function () { allProducts = []; return allProducts; });
    };
    var img = function (src, w) { if (!src) return ''; return src + (src.indexOf('?') > -1 ? '&' : '?') + 'width=' + w; };
    var showAdded = function (cart, variantId) {
      var a = q('[data-sheet-added]');
      var it = cart.items.filter(function (i) { return i.variant_id === variantId; })[0] || cart.items[0];
      if (!it) return;
      var size = it.variant_title && it.variant_title !== 'Default Title' ? ' · ' + S.size + ' ' + esc(it.variant_title) : '';
      a.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' + esc(S.added) + ': ' + esc(it.product_title) + size;
      a.hidden = false;
      clearTimeout(addedTimer); addedTimer = setTimeout(function () { a.hidden = true; }, 3500);
    };
    var render = function (cart) {
      setCount(cart.item_count);
      q('[data-sheet-title]').textContent = cart.item_count ? S.title + ' (' + cart.item_count + ')' : S.title;
      q('[data-sheet-total]').textContent = formatMoney(cart.total_price, mf);
      var co = q('[data-sheet-checkout]');
      co.textContent = cart.item_count ? S.checkout + ' · ' + formatMoney(cart.total_price, mf) : S.checkout;
      co.toggleAttribute('aria-disabled', !cart.item_count);
      q('[data-sheet-lines]').innerHTML = cart.items.length ? cart.items.map(function (it) {
        var size = it.variant_title && it.variant_title !== 'Default Title' ? S.size + ' ' + esc(it.variant_title) : '';
        return '<div class="line"><a href="' + esc(it.url) + '">' + (it.image ? '<img src="' + esc(img(it.image, 160)) + '" alt="" width="72" height="90">' : '') + '</a>' +
          '<div class="info"><a class="n" href="' + esc(it.url) + '">' + esc(it.product_title) + '</a><span class="m">' + size + '</span><span class="qty">' +
          '<button type="button" data-key="' + esc(it.key) + '" data-qty="' + (it.quantity - 1) + '" aria-label="' + esc(S.remove_one) + '">−</button><span>' + it.quantity + '</span>' +
          '<button type="button" data-key="' + esc(it.key) + '" data-qty="' + (it.quantity + 1) + '" aria-label="' + esc(S.add_one) + '">+</button></span></div>' +
          '<span class="pr">' + formatMoney(it.final_line_price, mf) + '</span></div>';
      }).join('') : '<p class="empty">' + esc(S.empty) + '</p>';
      var inCart = {};
      cart.items.forEach(function (it) { inCart[it.product_id] = true; });
      loadProducts().then(function (list) {
        var ups = list.filter(function (p) { return !inCart[p.id] && p.variants.some(function (v) { return v.available; }); }).slice(0, 4);
        q('[data-sheet-ups-wrap]').hidden = !ups.length;
        q('[data-sheet-ups]').innerHTML = ups.map(function (p) {
          var src = p.images && p.images[0] ? p.images[0].src : '';
          var price = Math.round(parseFloat(p.variants[0].price) * 100);
          return '<div class="up-row"><a href="' + routeRoot + 'products/' + esc(p.handle) + '">' + (src ? '<img src="' + esc(img(src, 200)) + '" alt="' + esc(p.title) + '" loading="lazy">' : '') + '</a>' +
            '<div class="up-info"><div class="up-top"><span class="n">' + esc(p.title) + '</span><span class="pr">' + formatMoney(price, mf) + '</span></div>' +
            '<div class="chips" role="group" aria-label="' + esc(S.add_size) + ' ' + esc(p.title) + '">' + p.variants.map(function (v) {
              return '<button type="button" data-variant="' + v.id + '"' + (v.available ? '' : ' disabled') + '>' + esc(v.option1) + '</button>';
            }).join('') + '</div></div></div>';
        }).join('');
      });
    };
    var open = function (cart, added) {
      render(cart);
      if (sheetEl.hidden) {
        lastFocus = document.activeElement;
        sheetEl.hidden = false;
        document.body.style.overflow = 'hidden';
        requestAnimationFrame(function () { requestAnimationFrame(function () { sheetEl.classList.add('open'); }); });
      }
      q('[data-sheet-note]').textContent = '';
      if (added) showAdded(cart, added); else q('[data-sheet-added]').hidden = true;
      q('[data-sheet-close]').focus();
    };
    var close = function () {
      if (sheetEl.hidden) return;
      sheetEl.classList.remove('open');
      document.body.style.overflow = '';
      var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      setTimeout(function () { sheetEl.hidden = true; }, reduce ? 0 : 380);
      if (lastFocus) lastFocus.focus();
    };
    var getCart = function () { return fetch(routeRoot + 'cart.js').then(function (r) { return r.json(); }); };
    var fail = function () { q('[data-sheet-note]').textContent = S.error; };
    sheetOpen = open;
    sheetEl.addEventListener('click', function (e) {
      if (e.target === sheetEl || e.target.closest('[data-sheet-close]')) { close(); return; }
      var b = e.target.closest('[data-key]');
      if (b) {
        fetch(routeRoot + 'cart/change.js', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ id: b.dataset.key, quantity: +b.dataset.qty }) })
          .then(function (r) { if (!r.ok) throw r; return r.json(); }).then(render).catch(fail);
        return;
      }
      var v = e.target.closest('[data-variant]');
      if (v) {
        v.disabled = true;
        fetch(routeRoot + 'cart/add.js', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ items: [{ id: +v.dataset.variant, quantity: 1 }] }) })
          .then(function (r) { if (!r.ok) throw r; return getCart(); }).then(function (c) { render(c); showAdded(c, +v.dataset.variant); }).catch(function () { v.disabled = false; fail(); });
        return;
      }
      var co = e.target.closest('[data-sheet-checkout]');
      if (co && co.hasAttribute('aria-disabled')) e.preventDefault();
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    document.querySelectorAll('.bar .cart').forEach(function (a) {
      a.addEventListener('click', function (e) {
        if (document.body.classList.contains('template-cart') || !window.fetch) return;
        e.preventDefault();
        getCart().then(function (c) { open(c, false); }).catch(function () { window.location.href = a.href; });
      });
    });
  }

  // Entrada de la portada: el título aparece letra a letra
  document.querySelectorAll('[data-split]').forEach(function (h) {
    var txt = h.textContent.trim(); if (!txt) return;
    h.setAttribute('aria-label', txt);
    var i = 0;
    h.innerHTML = Array.prototype.map.call(txt, function (c) {
      if (c === ' ') return '<span class="sp" aria-hidden="true"> </span>';
      return '<span class="ch" aria-hidden="true" style="--i:' + (i++) + '">' + c.replace(/[&<>"]/g, function (x) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[x]; }) + '</span>';
    }).join('');
  });

  // Añadir rápido desde la tarjeta de producto
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-qa-variant]');
    if (!b || b.disabled) return;
    e.preventDefault();
    var label = b.textContent;
    b.disabled = true;
    fetch(routeRoot + 'cart/add.js', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ items: [{ id: +b.dataset.qaVariant, quantity: 1 }] }) })
      .then(function (r) { if (!r.ok) throw r; return fetch(routeRoot + 'cart.js'); })
      .then(function (r) { return r.json(); })
      .then(function (cart) {
        b.classList.add('ok'); b.textContent = '✓';
        setTimeout(function () { b.classList.remove('ok'); b.textContent = label; b.disabled = false; }, 1200);
        sheetOpen(cart, +b.dataset.qaVariant);
      })
      .catch(function () { b.textContent = label; b.disabled = false; });
  });

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
    var stockEl = root.querySelector('[data-stock]');
    var stock = stockEl ? JSON.parse(stockEl.textContent) : { limit: 0, qty: {} };
    var lowEl = root.querySelector('[data-low]');
    function setLow(v) {
      if (!lowEl) return;
      var q = v ? stock.qty[String(v.id)] : undefined;
      if (q === undefined || q <= 0 || q > stock.limit) { lowEl.hidden = true; return; }
      lowEl.textContent = (q === 1 ? strings.last : strings.low).replace('__S__', v.title);
      lowEl.hidden = false;
    }
    var sb = root.querySelector('[data-sticky-buy]');
    function syncSticky(v) {
      if (!sb) return;
      var b = sb.querySelector('[data-sb-btn]');
      b.textContent = v && v.available ? strings.add : (v ? strings.soldOut : strings.choose);
      b.disabled = !!(v && !v.available);
      if (v) sb.querySelector('[data-sb-price]').textContent = formatMoney(v.price, strings.moneyFormat);
    }
    function update() {
      var v = match(selected());
      setLow(v); syncSticky(v);
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
    if (sb) {
      sb.hidden = false;
      var sbCheck = function () { sb.classList.toggle('show', addBtn.getBoundingClientRect().bottom < 0); };
      window.addEventListener('scroll', sbCheck, { passive: true }); sbCheck();
      syncSticky(match(selected()));
      sb.querySelector('[data-sb-btn]').addEventListener('click', function () {
        var v = match(selected());
        if (v && v.available) { if (form.requestSubmit) form.requestSubmit(addBtn); else addBtn.click(); }
        else { var f = root.querySelector('.sizes'); if (f) f.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
      });
    }

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
        .then(function (cart) { setCount(cart.item_count); status.textContent = ''; sheetOpen(cart, +idInput.value); })
        .catch(function (err) { status.textContent = (err && err.description) || strings.error; })
        .finally(function () { var v = match(selected()); addBtn.disabled = !(v && v.available); });
    });
  });

  // Guía de tallas: marca la fila de la talla elegida
  document.addEventListener('change', function (e) {
    if (!e.target.matches('[data-option]')) return;
    document.querySelectorAll('.sg [data-row]').forEach(function (r) { r.classList.toggle('sel', r.dataset.row === e.target.value); });
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

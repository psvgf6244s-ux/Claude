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

  // La foto vuela hasta la bolsa al añadir
  function flyToCart(imgEl, done) {
    var target = document.querySelector('.bar .cart');
    if (!imgEl || !target || !imgEl.animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { done(); return; }
    var a = imgEl.getBoundingClientRect(), b = target.getBoundingClientRect();
    if (!a.width) { done(); return; }
    var c = imgEl.cloneNode(); c.className = 'fly'; c.removeAttribute('srcset'); c.removeAttribute('sizes');
    c.style.left = a.left + 'px'; c.style.top = a.top + 'px'; c.style.width = a.width + 'px'; c.style.height = a.height + 'px';
    document.body.appendChild(c);
    var dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
    var anim = c.animate([{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.08)', opacity: .6 }], { duration: 650, easing: 'cubic-bezier(.5,0,.75,0)' });
    anim.onfinish = function () { c.remove(); done(); };
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
    var lastRemoved = null, undoTimer;
    var lineHTML = function (it, list) {
      var prod = list.filter(function (p) { return p.id === it.product_id; })[0];
      var sizeCtl = '';
      if (prod && prod.variants.length > 1) {
        sizeCtl = '<label class="line-size"><span>' + esc(S.size) + '</span><select data-swap="' + esc(it.key) + '" data-qty="' + it.quantity + '" aria-label="' + esc(S.size) + ': ' + esc(it.product_title) + '">' +
          prod.variants.map(function (v) { return '<option value="' + v.id + '"' + (v.id === it.variant_id ? ' selected' : '') + (v.available || v.id === it.variant_id ? '' : ' disabled') + '>' + esc(v.option1) + '</option>'; }).join('') + '</select></label>';
      } else if (it.variant_title && it.variant_title !== 'Default Title') {
        sizeCtl = '<span class="m">' + esc(S.size) + ' ' + esc(it.variant_title) + '</span>';
      }
      return '<div class="line"><a class="line-img" href="' + esc(it.url) + '">' + (it.image ? '<img src="' + esc(img(it.image, 200)) + '" alt="" width="84" height="105">' : '') + '</a>' +
        '<div class="info"><a class="n" href="' + esc(it.url) + '">' + esc(it.product_title) + '</a>' + sizeCtl +
        '<div class="line-act"><span class="qty"><button type="button" data-key="' + esc(it.key) + '" data-qty="' + (it.quantity - 1) + '" aria-label="' + esc(S.remove_one) + '">−</button><span>' + it.quantity + '</span>' +
        '<button type="button" data-key="' + esc(it.key) + '" data-qty="' + (it.quantity + 1) + '" aria-label="' + esc(S.add_one) + '">+</button></span>' +
        '<button type="button" class="rm" data-remove="' + esc(it.key) + '" data-variant="' + it.variant_id + '" data-q="' + it.quantity + '" data-title="' + esc(it.product_title) + '">' + esc(S.remove) + '</button></div></div>' +
        '<span class="pr">' + formatMoney(it.final_line_price, mf) + '</span></div>';
    };
    var render = function (cart) {
      setCount(cart.item_count);
      q('[data-sheet-title]').textContent = cart.item_count ? S.title + ' (' + cart.item_count + ')' : S.title;
      q('[data-sheet-total]').textContent = formatMoney(cart.total_price, mf);
      var co = q('[data-sheet-checkout]');
      co.textContent = cart.item_count ? S.checkout + ' · ' + formatMoney(cart.total_price, mf) : S.checkout;
      co.toggleAttribute('aria-disabled', !cart.item_count);
      q('[data-sheet-foot]').hidden = !cart.item_count;
      var fsBase = +sheetEl.getAttribute('data-free') || 0, fs = q('[data-fs]');
      if (fs) {
        var rate = window.Shopify && Shopify.currency && +Shopify.currency.rate || 1, goal = Math.round(fsBase * rate);
        fs.hidden = !goal || !cart.item_count;
        if (goal && cart.item_count) {
          var left = goal - cart.total_price;
          q('[data-fs-t]').innerHTML = left > 0 ? S.fs_left.split('__X__').join(esc(formatMoney(left, mf))) : S.fs_done;
          fs.classList.toggle('ok', left <= 0);
          q('[data-fs-i]').style.transform = 'scaleX(' + Math.min(1, cart.total_price / goal) + ')';
        }
      }
      loadProducts().then(function (list) {
        q('[data-sheet-lines]').innerHTML = cart.items.length ? cart.items.map(function (it) { return lineHTML(it, list); }).join('') :
          '<div class="empty-c"><p>' + esc(S.empty) + '</p><a class="btn" href="' + routeRoot + 'collections/all">' + esc(S.see_all) + '</a></div>';
        var inCart = {};
        cart.items.forEach(function (it) { inCart[it.product_id] = true; });
        var ups = list.filter(function (p) { return !inCart[p.id] && p.variants.some(function (v) { return v.available; }); }).slice(0, 8);
        q('[data-sheet-ups-wrap]').hidden = !ups.length;
        q('[data-sheet-ups]').innerHTML = ups.map(function (p) {
          var src = p.images && p.images[0] ? p.images[0].src : '';
          var price = Math.round(parseFloat(p.variants[0].price) * 100);
          return '<div class="up-card"><a class="up-img" href="' + routeRoot + 'products/' + esc(p.handle) + '">' + (src ? '<img src="' + esc(img(src, 400)) + '" alt="' + esc(p.title) + '" loading="lazy">' : '') + '</a>' +
            '<a class="n" href="' + routeRoot + 'products/' + esc(p.handle) + '">' + esc(p.title) + '</a><span class="pr">' + formatMoney(price, mf) + '</span>' +
            '<div class="chips" role="group" aria-label="' + esc(S.add_size) + ' ' + esc(p.title) + '">' + p.variants.map(function (v) {
              return '<button type="button" data-variant="' + v.id + '"' + (v.available ? '' : ' disabled') + '>' + esc(v.option1) + '</button>';
            }).join('') + '</div></div>';
        }).join('');
        var row = q('[data-sheet-ups]'); row.scrollLeft = 0; requestAnimationFrame(upsNav);
      });
    };
    var upsNav = function () {
      var row = q('[data-sheet-ups]'), nav = q('[data-ups-nav]'); if (!row || !nav) return;
      var max = row.scrollWidth - row.clientWidth - 2;
      nav.hidden = max <= 0;
      nav.querySelector('[data-ups-step="-1"]').disabled = row.scrollLeft <= 2;
      nav.querySelector('[data-ups-step="1"]').disabled = row.scrollLeft >= max;
    };
    var open = function (cart, added) {
      render(cart);
      if (sheetEl.hidden) {
        lastFocus = document.activeElement;
        sheetEl.hidden = false;
        document.body.style.overflow = 'hidden';
        requestAnimationFrame(function () { requestAnimationFrame(function () { sheetEl.classList.add('open'); upsNav(); }); });
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
      var rmb = e.target.closest('[data-remove]');
      if (rmb) {
        lastRemoved = { id: +rmb.dataset.variant, quantity: +rmb.dataset.q, title: rmb.dataset.title };
        fetch(routeRoot + 'cart/change.js', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ id: rmb.dataset.remove, quantity: 0 }) })
          .then(function (r) { if (!r.ok) throw r; return r.json(); })
          .then(function (c) {
            render(c);
            var u = q('[data-sheet-undo]'); u.querySelector('span').textContent = S.removed.replace('__NAME__', lastRemoved.title); u.hidden = false;
            clearTimeout(undoTimer); undoTimer = setTimeout(function () { u.hidden = true; lastRemoved = null; }, 5000);
          }).catch(fail);
        return;
      }
      if (e.target.closest('[data-sheet-undo-btn]') && lastRemoved) {
        var lr = lastRemoved; lastRemoved = null; q('[data-sheet-undo]').hidden = true;
        fetch(routeRoot + 'cart/add.js', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ items: [{ id: lr.id, quantity: lr.quantity }] }) })
          .then(function (r) { if (!r.ok) throw r; return getCart(); }).then(render).catch(fail);
        return;
      }
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
    q('[data-sheet-ups]').addEventListener('scroll', upsNav, { passive: true });
    window.addEventListener('resize', upsNav);
    sheetEl.addEventListener('click', function (e) {
      var st = e.target.closest('[data-ups-step]'); if (!st) return;
      var row = q('[data-sheet-ups]'), card = row.querySelector('.up-card'); if (!card) return;
      row.scrollBy({ left: +st.dataset.upsStep * (card.offsetWidth + 12), behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    });
    sheetEl.addEventListener('change', function (e) {
      var sel = e.target.closest('[data-swap]'); if (!sel) return;
      sel.disabled = true;
      fetch(routeRoot + 'cart/change.js', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ id: sel.dataset.swap, quantity: 0 }) })
        .then(function (r) { if (!r.ok) throw r; return fetch(routeRoot + 'cart/add.js', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ items: [{ id: +sel.value, quantity: +sel.dataset.qty }] }) }); })
        .then(function (r) { if (!r.ok) throw r; return getCart(); }).then(render)
        .catch(function () { getCart().then(render); fail(); });
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

  // Buscador con resultados mientras escribes
  var srch = document.querySelector('[data-search]');
  if (srch) {
    var sIn = srch.querySelector('[data-search-input]'), sRes = srch.querySelector('[data-search-results]');
    var sOpenBtn = document.querySelector('[data-search-open]'), sTimer, sLast = '';
    var sMf = srch.getAttribute('data-money-format');
    var sEsc = function (t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
    var sOpen = function (e) { if (e) e.preventDefault(); srch.hidden = false; document.body.style.overflow = 'hidden'; sIn.focus(); };
    var sClose = function () { if (srch.hidden) return; srch.hidden = true; document.body.style.overflow = ''; if (sOpenBtn) sOpenBtn.focus(); };
    var sRun = function () {
      var q = sIn.value.trim(); if (q === sLast) return; sLast = q;
      if (!q) { sRes.innerHTML = ''; return; }
      fetch(srch.getAttribute('data-url') + '.json?q=' + encodeURIComponent(q) + '&resources[type]=product&resources[limit]=8')
        .then(function (r) { return r.json(); })
        .then(function (j) {
          var items = (j.resources && j.resources.results && j.resources.results.products) || [];
          sRes.innerHTML = items.length ? items.map(function (p) {
            var img = p.featured_image && p.featured_image.url ? p.featured_image.url + (p.featured_image.url.indexOf('?') > -1 ? '&' : '?') + 'width=400' : (p.image || '');
            return '<a href="' + sEsc(p.url) + '">' + (img ? '<img src="' + sEsc(img) + '" alt="" loading="lazy">' : '') + '<span class="n">' + sEsc(p.title) + '</span><span class="pr">' + formatMoney(Math.round(parseFloat(p.price) * 100), sMf) + '</span></a>';
          }).join('') : '<p class="srch-empty">' + sEsc(srch.getAttribute('data-empty').replace('{{ terms }}', q)) + '</p>';
        }).catch(function () {});
    };
    if (sOpenBtn) sOpenBtn.addEventListener('click', sOpen);
    srch.querySelector('[data-search-close]').addEventListener('click', sClose);
    sIn.addEventListener('input', function () { clearTimeout(sTimer); sTimer = setTimeout(sRun, 180); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') sClose();
      if (e.key === '/' && srch.hidden && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) sOpen(e);
    });
  }

  // Filtros por tipo de prenda
  document.querySelectorAll('[data-filters]').forEach(function (bar) {
    var grid = bar.parentElement.querySelector('.grid');
    bar.addEventListener('click', function (e) {
      var b = e.target.closest('[data-f]'); if (!b) return;
      bar.querySelectorAll('[data-f]').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      grid.querySelectorAll('.card').forEach(function (c) { c.hidden = b.dataset.f !== 'all' && c.dataset.type !== b.dataset.f; });
    });
  });

  // Encuentra tu talla
  document.addEventListener('click', function (e) {
    var go = e.target.closest('[data-ff-go]');
    if (go) {
      var box = go.closest('[data-ff]'), chest = JSON.parse(box.getAttribute('data-ff'));
      var S = JSON.parse(document.querySelector('[data-ff-strings]').textContent);
      var v = parseFloat(String(box.querySelector('[data-ff-in]').value).replace(',', '.'));
      var out = box.querySelector('[data-ff-out]');
      if (!(v >= 40 && v <= 80)) { out.textContent = S.bad; return; }
      var sizes = Object.keys(chest), best = sizes[0];
      sizes.forEach(function (z) { var d = Math.abs(chest[z] - v), db = Math.abs(chest[best] - v); if (d < db || (d === db && chest[z] > chest[best])) best = z; });
      var first = sizes[0], last = sizes[sizes.length - 1], msg;
      if (v < chest[first] - 2) { best = first; msg = S.small.replace('__C__', chest[first]); }
      else if (v > chest[last] + 2) { best = last; msg = S.big.replace('__C__', chest[last]); }
      else { var d = chest[best] - v; msg = S.result.replace('__Z__', best).replace('__C__', chest[best]).replace('__D__', d === 0 ? S.same : (d > 0 ? S.more : S.less).replace('__N__', Math.abs(d))); }
      out.innerHTML = msg + '<br><button type="button" class="ff-pick" data-ff-pick="' + best + '">' + S.pick.replace('__Z__', best) + '</button>';
      return;
    }
    var pk = e.target.closest('[data-ff-pick]');
    if (pk) {
      var r = Array.prototype.find.call(document.querySelectorAll('[data-option]'), function (i) { return i.value === pk.dataset.ffPick; });
      if (r) { r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); r.closest('.sizes').scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.matches('[data-ff-in]')) { e.preventDefault(); e.target.closest('[data-ff]').querySelector('[data-ff-go]').click(); } });

  // Zoom en la propia foto: con el ratón sigue el cursor; en el móvil, un toque amplía y el dedo desplaza
  document.querySelectorAll('[data-zoomable]').forEach(function (z) {
    var cur = function () { return z.querySelector('.pdp__slide.is-active img'); };
    var at = function (x, y) { var r = z.getBoundingClientRect(), i = cur(); if (!i) return; i.style.transformOrigin = Math.max(0, Math.min(100, (x - r.left) / r.width * 100)) + '% ' + Math.max(0, Math.min(100, (y - r.top) / r.height * 100)) + '%'; };
    var on = function () { z.classList.add('zooming'); }, off = function () { z.classList.remove('zooming'); };
    if (window.matchMedia('(hover: hover)').matches) {
      z.addEventListener('mouseenter', function (e) { at(e.clientX, e.clientY); on(); });
      z.addEventListener('mousemove', function (e) { at(e.clientX, e.clientY); });
      z.addEventListener('mouseleave', off);
    } else {
      z.addEventListener('click', function (e) { if (e.target.closest('[data-dot]')) return; if (z.classList.contains('zooming')) off(); else { at(e.clientX, e.clientY); on(); } });
      z.addEventListener('touchmove', function (e) { if (!z.classList.contains('zooming')) return; e.preventDefault(); at(e.touches[0].clientX, e.touches[0].clientY); }, { passive: false });
    }
    z.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (z.classList.contains('zooming')) off(); else { var r = z.getBoundingClientRect(); at(r.left + r.width / 2, r.top + r.height / 2); on(); } }
      if (e.key === 'Escape') off();
    });
  });

  // ¿Qué talla soy? por altura y peso (estimación) y talla recomendada en cada ficha
  var ffS = document.querySelector('[data-ff-strings]') ? JSON.parse(document.querySelector('[data-ff-strings]').textContent) : null;
  var FFV = {}; try { FFV = JSON.parse(localStorage.getItem('br-fit') || '{}'); } catch (e) {}
  var hwSize = function (h, w, fit, sizes) {
    var hi = h < 172 ? 0 : h < 182 ? 1 : h < 190 ? 2 : 3, wi = w < 64 ? 0 : w < 76 ? 1 : w < 88 ? 2 : 3;
    var i = Math.max(0, Math.min(sizes.length - 1, Math.max(hi, wi) + (+fit || 0)));
    return { z: sizes[i], hi: hi, wi: wi };
  };
  var ffSizes = function () { var box = document.querySelector('[data-ff]'); return box ? Object.keys(JSON.parse(box.getAttribute('data-ff'))) : ['S', 'M', 'L', 'XL']; };
  var recBadge = function () {
    var el = document.querySelector('[data-rec]'); if (!el || !ffS) return;
    if (FFV.h && FFV.w) { var r = hwSize(FFV.h, FFV.w, FFV.fit, ffSizes()); el.innerHTML = ffS.your + ' <strong>' + r.z + '</strong> <button type="button" class="sz-g" data-open-ff>' + ffS.change + '</button>'; }
    else el.innerHTML = '<button type="button" class="sz-g" data-open-ff>' + ffS.which + '</button>';
    el.hidden = false;
  };
  recBadge();
  if (FFV.h) document.querySelectorAll('[data-ff-h]').forEach(function (i) { i.value = FFV.h; });
  if (FFV.w) document.querySelectorAll('[data-ff-w]').forEach(function (i) { i.value = FFV.w; });
  document.addEventListener('click', function (e) {
    var tb = e.target.closest('[data-fft]');
    if (tb) {
      var box = tb.closest('[data-ff]');
      box.querySelectorAll('[data-fft]').forEach(function (x) { x.setAttribute('aria-selected', x === tb ? 'true' : 'false'); });
      box.querySelectorAll('[data-ffp]').forEach(function (p) { p.hidden = p.dataset.ffp !== tb.dataset.fft; });
      box.querySelector('[data-ff-out]').innerHTML = '';
      return;
    }
    if (e.target.closest('[data-open-ff]')) {
      var d = document.querySelector('[data-guide-acc]'); if (d) d.open = true;
      var f = document.querySelector('[data-ff]');
      if (f) setTimeout(function () { f.scrollIntoView({ behavior: 'smooth', block: 'center' }); var i = f.querySelector('[data-ff-h]'); if (i) i.focus({ preventScroll: true }); }, 50);
      return;
    }
    var hw = e.target.closest('[data-ff-hw]');
    if (hw && ffS) {
      var box2 = hw.closest('[data-ff]'), out = box2.querySelector('[data-ff-out]');
      var h = parseFloat(box2.querySelector('[data-ff-h]').value), w = parseFloat(box2.querySelector('[data-ff-w]').value);
      var fitEl = box2.querySelector('[data-ff-fit]:checked'), fit = fitEl ? +fitEl.value : 0;
      if (!(h >= 140 && h <= 210) || !(w >= 40 && w <= 150)) { out.textContent = ffS.badhw; return; }
      var sizes = Object.keys(JSON.parse(box2.getAttribute('data-ff'))), r = hwSize(h, w, fit, sizes);
      FFV = { h: h, w: w, fit: fit }; try { localStorage.setItem('br-fit', JSON.stringify(FFV)); } catch (err) {}
      var msg = ffS.rec.replace('__Z__', r.z).replace('__H__', h).replace('__W__', w);
      if (Math.abs(r.hi - r.wi) >= 2) msg += ' ' + ffS.split.replace('__A__', sizes[Math.min(r.hi, sizes.length - 1)]).replace('__B__', sizes[Math.min(r.wi, sizes.length - 1)]);
      out.innerHTML = msg + '<span class="ff-note">' + ffS.note + '</span><br><button type="button" class="ff-pick" data-ff-pick="' + r.z + '">' + ffS.pick.replace('__Z__', r.z) + '</button>';
      recBadge();
    }
  });

  // Cabecera que se esconde al bajar y vuelve al subir
  var hbar = document.querySelector('[data-bar]'), lastY = window.scrollY;
  if (hbar) window.addEventListener('scroll', function () {
    var y = window.scrollY, menuEl = document.querySelector('[data-menu]'), sh = document.querySelector('[data-sheet]');
    hbar.classList.toggle('hide', y > lastY && y > 240 && (!menuEl || menuEl.hidden) && (!sh || sh.hidden));
    lastY = y;
  }, { passive: true });

  // Aparición suave de las prendas (parten de un estado visible)
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var rv = new IntersectionObserver(function (es) { es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); rv.unobserve(en.target); } }); }, { rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('.grid .card').forEach(function (c, i) { c.classList.add('rv'); c.style.transitionDelay = (i % 5) * 60 + 'ms'; rv.observe(c); });
  }

  // Abrir la guía de tallas desde el enlace junto a las tallas
  document.addEventListener('click', function (e) {
    if (!e.target.closest('[data-open-guide]')) return;
    var d = document.querySelector('[data-guide-acc]');
    if (d) { d.open = true; d.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  });

  // Barra de avisos: los mensajes van rotando
  document.querySelectorAll('[data-ann]').forEach(function (el) {
    var list = JSON.parse(el.getAttribute('data-ann'));
    if (list.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var i = 0;
    setInterval(function () {
      el.classList.add('fade');
      setTimeout(function () { i = (i + 1) % list.length; el.textContent = list[i]; el.classList.remove('fade'); }, 350);
    }, 3800);
  });

  // Entrada de la portada: el título aparece letra a letra
  document.querySelectorAll('[data-split]').forEach(function (h) {
    var txt = h.textContent.trim(); if (!txt) return;
    h.setAttribute('aria-label', txt);
    var i = 0;
    h.innerHTML = Array.prototype.map.call(txt, function (c) {
      if (c === ' ') return '<span class="sp" aria-hidden="true"> </span>';
      if (c === '®') return '<span class="ch reg" aria-hidden="true" style="--i:' + (i++) + '">®</span>';
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
        var card = b.closest('.card');
        flyToCart(card && card.querySelector('.card__img'), function () { sheetOpen(cart, +b.dataset.qaVariant); });
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
        .then(function (cart) {
          status.textContent = '';
          addLabel.textContent = '✓ ' + strings.added; addBtn.classList.add('ok');
          setTimeout(function () { addBtn.classList.remove('ok'); update(); }, 1400);
          flyToCart(root.querySelector('.pdp__slide.is-active img'), function () { setCount(cart.item_count); sheetOpen(cart, +idInput.value); });
        })
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

/* Pop-up de descuento */
(function () {
  const pop = document.querySelector('[data-popup]');
  if (!pop) return;
  const tab = document.querySelector('[data-pop-tab]');
  const S = JSON.parse(pop.dataset.strings || '{}');
  const get = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const set = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const done = pop.querySelector('[data-pop-done]');
  const form = pop.querySelector('form');
  const posted = /customer_posted=true/.test(location.search) || location.hash === '#popup-form';
  const fromPopup = (() => { try { return sessionStorage.getItem('br-pop-pending') === '1'; } catch (e) { return false; } })();
  const hasErr = !!pop.querySelector('[data-pop-err]') && pop.querySelector('[data-pop-err]').textContent.trim() !== '';
  const snoozed = () => get('br-pop-seen') === '1'; // se abre solo una vez por persona
  let shown = false, lastFocus = null;

  function count() {
    const el = pop.querySelector('[data-pop-num]'), big = pop.querySelector('.pop-big');
    if (!el) return;
    if (reduce) { big.classList.add('fill'); return; }
    const to = +el.dataset.to || 10; let n = 0; el.textContent = '0'; big.classList.remove('fill');
    const iv = setInterval(() => { n++; el.textContent = n; if (n >= to) { clearInterval(iv); setTimeout(() => big.classList.add('fill'), 120); } }, Math.max(20, 550 / to));
  }
  // fotos del logo a cortes rápidos (solo mientras el pop-up está abierto)
  const reel = pop.querySelector('[data-pop-reel]');
  let reelT = null;
  function reelStart() {
    if (!reel || reelT || reduce) return;
    const imgs = [...reel.querySelectorAll('img')];
    imgs.forEach((im) => { if (im.dataset.src) { im.src = im.dataset.src; im.removeAttribute('data-src'); } });
    let k = 0;
    reelT = setInterval(() => {
      let n = (k + 1) % imgs.length, tries = 0;
      while (!(imgs[n].complete && imgs[n].naturalWidth) && tries++ < imgs.length) n = (n + 1) % imgs.length;
      imgs[k].classList.remove('on'); imgs[n].classList.add('on'); k = n;
    }, +reel.dataset.speed || 250);
  }
  function reelStop() { clearInterval(reelT); reelT = null; }
  function open(force) {
    if (!force && (shown || get('br-pop-sub') === '1' || snoozed())) return;
    shown = true; lastFocus = document.activeElement; set('br-pop-seen', '1');
    pop.hidden = false; if (tab) { tab.hidden = true; document.body.classList.remove('bar-on'); } document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => requestAnimationFrame(() => pop.classList.add('on')));
    if (done) pop.classList.add('pop-done'); else count();
    reelStart();
    setTimeout(() => { const f = pop.querySelector(done ? '[data-pop-copy]' : '#pop-email'); if (f) f.focus({ preventScroll: true }); }, 350);
  }
  function close(snooze) {
    pop.classList.remove('on'); document.body.style.overflow = ''; reelStop();
    setTimeout(() => { pop.hidden = true; }, reduce ? 0 : 400);
    showBar();
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  pop.querySelectorAll('[data-pop-close]').forEach((b) => b.addEventListener('click', () => close(true)));
  pop.addEventListener('click', (e) => { if (e.target === pop) close(true); });
  document.addEventListener('keydown', (e) => {
    if (pop.hidden) return;
    if (e.key === 'Escape') close(true);
    if (e.key === 'Tab') { // mantener el foco dentro
      const f = [...pop.querySelectorAll('button,a[href],input:not([type=hidden])')].filter((x) => x.offsetParent);
      if (!f.length) return; const a = f[0], z = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    }
  });
  // barra de abajo para recuperar el 10 % si lo cerraron
  const barOff = () => { try { return sessionStorage.getItem('br-bar-off') === '1'; } catch (e) { return false; } };
  const onBuyPage = pop.dataset.page === 'product' || pop.dataset.page === 'cart';
  function showBar() { if (tab && !done && get('br-pop-sub') !== '1' && !barOff() && !onBuyPage) { tab.hidden = false; document.body.classList.add('bar-on'); } }
  if (tab) {
    tab.querySelector('[data-pop-bar-open]').addEventListener('click', () => open(true));
    tab.querySelector('[data-pop-bar-x]').addEventListener('click', () => { tab.hidden = true; document.body.classList.remove('bar-on'); try { sessionStorage.setItem('br-bar-off', '1'); } catch (e) {} });
  }

  if (form && !done) form.addEventListener('submit', (e) => {
    const i = form.querySelector('#pop-email');
    if (!/^\S+@\S+\.\S+$/.test(i.value.trim())) { e.preventDefault(); i.setAttribute('aria-invalid', 'true'); pop.querySelector('[data-pop-err]').textContent = S.bad; i.focus(); return; }
    try { sessionStorage.setItem('br-pop-pending', '1'); } catch (err) {}
  });

  if (done) {
    const code = pop.querySelector('[data-pop-code]').textContent.trim();
    const copy = pop.querySelector('[data-pop-copy]');
    copy.addEventListener('click', () => {
      const ok = () => { copy.textContent = S.copied; copy.classList.add('ok'); setTimeout(() => { copy.textContent = S.copy; copy.classList.remove('ok'); }, 1800); };
      const sel = () => { const r = document.createRange(); r.selectNodeContents(pop.querySelector('[data-pop-code]')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); };
      try { navigator.clipboard.writeText(code).then(ok, sel); } catch (err) { sel(); }
    });
    // aplica el código al carrito y vuelve al catálogo
    pop.querySelector('[data-pop-shop]').addEventListener('click', (e) => {
      e.preventDefault(); const to = e.currentTarget.getAttribute('href');
      location.href = (window.Shopify && Shopify.routes ? Shopify.routes.root : '/') + 'discount/' + encodeURIComponent(code) + '?redirect=' + encodeURIComponent(to);
    });
  }

  if (posted && (fromPopup || location.hash === '#popup-form') && (done || hasErr)) {
    try { sessionStorage.removeItem('br-pop-pending'); } catch (e) {}
    if (done) set('br-pop-sub', '1');
    open(true);
    // aplica el código ya, sin recargar
    if (done) fetch((window.Shopify && Shopify.routes ? Shopify.routes.root : '/') + 'discount/' + encodeURIComponent(pop.querySelector('[data-pop-code]').textContent.trim()), { credentials: 'same-origin' }).catch(() => {});
    return;
  }
  if (get('br-pop-sub') === '1') return;
  if (snoozed()) { showBar(); return; }
  // se abre solo, una única vez, a los segundos indicados (nunca encima del carrito, el menú o la búsqueda)
  const busy = () => document.querySelector('[data-sheet]:not([hidden]), [data-menu]:not([hidden]), [data-search]:not([hidden])');
  const tryOpen = () => { if (shown || snoozed()) return; if (busy()) { setTimeout(tryOpen, 2500); return; } open(); };
  setTimeout(tryOpen, (+pop.dataset.delay || 8) * 1000);
})();

/* Cuenta atrás del próximo drop (fecha en hora de España) */
(function () {
  document.querySelectorAll('[data-countdown]').forEach(function (el) {
    var m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(el.getAttribute('data-countdown').trim());
    if (!m) return;
    var guess = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
    var off = function (t) { // minutos de diferencia de Madrid con UTC en ese momento
      try { var p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(new Date(t)), g = {};
        p.forEach(function (x) { g[x.type] = +x.value; });
        return (Date.UTC(g.year, g.month - 1, g.day, g.hour, g.minute) - t) / 6e4; } catch (e) { return 60; }
    };
    var target = guess - off(guess) * 6e4;
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    var tick = function () {
      var d = Math.max(0, Math.floor((target - Date.now()) / 1000));
      if (!d) { el.outerHTML = '<p class="next-k up">' + el.getAttribute('data-live') + '</p>'; return; }
      el.querySelector('[data-cd=d]').textContent = pad(Math.floor(d / 86400));
      el.querySelector('[data-cd=h]').textContent = pad(Math.floor(d % 86400 / 3600));
      el.querySelector('[data-cd=m]').textContent = pad(Math.floor(d % 3600 / 60));
      el.querySelector('[data-cd=s]').textContent = pad(d % 60);
      setTimeout(tick, 1000);
    };
    el.hidden = false; tick();
  });
})();

/* Portada: pasa las fotos solas */
(function () {
  var hero = document.querySelector('[data-hero]');
  if (!hero) return;
  var slides = hero.querySelectorAll('img.hero__media');
  if (slides.length < 2) return;
  var dots = hero.querySelectorAll('[data-hero-dots] i');
  var ms = (+hero.getAttribute('data-interval') || 6) * 1000, i = 0, timer;
  hero.classList.add('has-slides');
  hero.style.setProperty('--t', ms / 1000 + 's');
  var show = function (n) {
    slides[i].classList.remove('is-on'); if (dots[i]) dots[i].classList.remove('on');
    i = n; var im = slides[i]; im.loading = 'eager';
    im.classList.remove('is-on'); void im.offsetWidth; im.classList.add('is-on');
    if (dots[i]) { dots[i].classList.remove('on'); void dots[i].offsetWidth; dots[i].classList.add('on'); }
  };
  show(0);
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var run = function () { clearInterval(timer); timer = setInterval(function () { show((i + 1) % slides.length); }, ms); };
  slides[1].loading = 'eager';
  run();
  document.addEventListener('visibilitychange', function () { if (document.hidden) clearInterval(timer); else run(); });
})();

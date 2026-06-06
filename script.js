/* ==========================================================
   Dr. Janos Barrera MD — Website Scripts
   Vanilla JS, no dependencies
   ========================================================== */

'use strict';

// ----------------------------------------------------------
// 1. NAV — Scroll shadow + active state
// ----------------------------------------------------------
(function initNav() {
  const nav = document.getElementById('main-nav');
  if (!nav) return;

  const onScroll = () => {
    nav.classList.toggle('scrolled', window.scrollY > 20);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll(); // run once on load
})();


// ----------------------------------------------------------
// 1b. PATIENT RESOURCES DROPDOWN — inject submenu under the
//     "Patient Resources" nav link on every page so users can
//     jump straight to a leaf destination without going through
//     the hub.
// ----------------------------------------------------------
(function initPatientResourcesDropdown() {
  const ITEMS = [
    { label: 'Common Conditions',        href: '/patient-resources/conditions/' },
    { label: 'After Surgery & Recovery', href: '/patient-resources/recovery/' },
    { label: 'Scheduling & Offices',     href: '/patient-resources/scheduling/' },
    { label: 'Printable Handouts',       href: '/patient-resources/handouts/' },
  ];

  function isPatientResourcesLink(a) {
    return /patient[\s-]?resources/i.test((a.textContent || '').trim());
  }

  function makeList(className) {
    const ul = document.createElement('ul');
    ul.className = className;
    ITEMS.forEach(item => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = item.href;
      a.textContent = item.label;
      li.appendChild(a);
      ul.appendChild(li);
    });
    return ul;
  }

  document.querySelectorAll('#main-nav .nav-links > li > a').forEach(a => {
    if (!isPatientResourcesLink(a)) return;
    const li = a.parentElement;
    if (li.classList.contains('has-dropdown')) return;
    li.classList.add('has-dropdown');
    li.appendChild(makeList('nav-dropdown'));
  });

  document.querySelectorAll('#main-nav .mobile-menu ul > li > a').forEach(a => {
    if (!isPatientResourcesLink(a)) return;
    const li = a.parentElement;
    if (li.querySelector('.mobile-submenu')) return;
    li.appendChild(makeList('mobile-submenu'));
  });
})();


// ----------------------------------------------------------
// 1c. SITE SEARCH — client-side search over search-index.json.
//     Injects a search trigger into the desktop + mobile menus
//     and opens an overlay with live results. No per-page markup.
// ----------------------------------------------------------
(function initSiteSearch() {
  const nav = document.getElementById('main-nav');
  if (!nav) return;

  const lang = (document.documentElement.lang || 'en').slice(0, 2);
  const T = {
    en: { label: 'Search', placeholder: 'Search conditions, recovery, scheduling…',
          empty: 'No matches. Try a different word.' },
    es: { label: 'Buscar', placeholder: 'Buscar afecciones, recuperación, programación…',
          empty: 'Sin resultados. Pruebe otra palabra.' },
    ht: { label: 'Chèche', placeholder: 'Chèche kondisyon, rekiperasyon, pwogramasyon…',
          empty: 'Pa gen rezilta. Eseye yon lòt mo.' },
  }[lang] || { label: 'Search', placeholder: 'Search…', empty: 'No matches.' };

  const SEARCH_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">'
    + '<circle cx="11" cy="11" r="7"></circle>'
    + '<line x1="16.5" y1="16.5" x2="21" y2="21"></line></svg>';

  const norm = s => (s || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // --- triggers in both menus ---
  function makeTrigger() {
    const li = document.createElement('li');
    li.className = 'nav-search-item';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'nav-search-btn';
    btn.setAttribute('aria-label', T.label);
    btn.innerHTML = SEARCH_SVG + '<span>' + T.label + '</span>';
    btn.addEventListener('click', open);
    li.appendChild(btn);
    return li;
  }
  const deskList = nav.querySelector('.nav-links');
  if (deskList) deskList.appendChild(makeTrigger());
  const mobList = nav.querySelector('.mobile-menu ul');
  if (mobList) mobList.appendChild(makeTrigger());

  // --- overlay (built once, on first open) ---
  let overlay, input, results, empty, index = null, rows = [], active = -1;

  function build() {
    overlay = document.createElement('div');
    overlay.className = 'site-search-overlay';
    overlay.hidden = true;
    overlay.innerHTML =
      '<div class="site-search-panel" role="dialog" aria-modal="true" aria-label="' + T.label + '">'
      + '<div class="site-search-box">'
      + '<span class="site-search-lead">' + SEARCH_SVG + '</span>'
      + '<input type="text" class="site-search-input" autocomplete="off" spellcheck="false" '
      + 'placeholder="' + T.placeholder + '" aria-label="' + T.label + '" />'
      + '<button type="button" class="site-search-close" aria-label="Close">&times;</button>'
      + '</div>'
      + '<ul class="site-search-results" role="listbox"></ul>'
      + '<p class="site-search-empty" hidden>' + T.empty + '</p>'
      + '</div>';
    document.body.appendChild(overlay);
    input = overlay.querySelector('.site-search-input');
    results = overlay.querySelector('.site-search-results');
    empty = overlay.querySelector('.site-search-empty');
    overlay.addEventListener('mousedown', e => { if (e.target === overlay) close(); });
    overlay.querySelector('.site-search-close').addEventListener('click', close);
    input.addEventListener('input', () => render(input.value));
    input.addEventListener('keydown', onKey);
  }

  async function load() {
    if (index) return index;
    try {
      const res = await fetch('/search-index.json', { cache: 'force-cache' });
      const all = await res.json();
      index = all.filter(e => e.l === lang).map(e => ({
        t: e.t, d: e.d, u: e.u, hay: norm(e.t + ' ' + e.d + ' ' + (e.h || '')),
      }));
    } catch (_) { index = []; }
    return index;
  }

  function score(entry, tokens) {
    const tl = norm(entry.t);
    let s = 0;
    for (const tk of tokens) {
      if (!entry.hay.includes(tk)) return -1;   // every token must match
      if (tl.includes(tk)) s += 2;              // title matches weigh more
      if (tl.startsWith(tk)) s += 1;
    }
    return s;
  }

  function render(q) {
    const query = (q || '').trim();
    rows = []; active = -1; results.innerHTML = '';
    if (!query) { empty.hidden = true; return; }
    const tokens = norm(query).split(/\s+/).filter(Boolean);
    const hits = (index || [])
      .map(e => ({ e, s: score(e, tokens) }))
      .filter(x => x.s >= 0)
      .sort((a, b) => b.s - a.s || a.e.t.length - b.e.t.length)
      .slice(0, 12);
    empty.hidden = hits.length > 0;
    hits.forEach((h, i) => {
      const li = document.createElement('li');
      li.className = 'site-search-result';
      li.setAttribute('role', 'option');
      const a = document.createElement('a');
      a.href = h.e.u;
      a.innerHTML = '<span class="ssr-title"></span><span class="ssr-desc"></span>';
      a.querySelector('.ssr-title').textContent = h.e.t;
      a.querySelector('.ssr-desc').textContent = h.e.d;
      li.appendChild(a);
      li.addEventListener('mouseenter', () => setActive(i));
      results.appendChild(li);
      rows.push(li);
    });
  }

  function setActive(i) {
    if (active > -1 && rows[active]) rows[active].classList.remove('active');
    active = i;
    if (active > -1 && rows[active]) {
      rows[active].classList.add('active');
      rows[active].scrollIntoView({ block: 'nearest' });
    }
  }

  function onKey(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); if (rows.length) setActive((active + 1) % rows.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); if (rows.length) setActive((active - 1 + rows.length) % rows.length); }
    else if (e.key === 'Enter') {
      const target = active > -1 ? rows[active] : rows[0];
      const link = target && target.querySelector('a');
      if (link) window.location.href = link.getAttribute('href');
    } else if (e.key === 'Escape') { close(); }
  }

  function open() {
    if (!overlay) build();
    load().then(() => { if (input && input.value) render(input.value); });
    overlay.hidden = false;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => { overlay.classList.add('open'); input.focus(); });
  }

  function close() {
    if (!overlay) return;
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    input.value = ''; render('');
    setTimeout(() => { overlay.hidden = true; }, 180);
  }
})();


// ----------------------------------------------------------
// 2. HAMBURGER — Mobile menu toggle
// ----------------------------------------------------------
(function initMobileMenu() {
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobile-menu');
  if (!hamburger || !mobileMenu) return;

  const openMenu = () => {
    mobileMenu.removeAttribute('hidden');
    hamburger.classList.add('open');
    hamburger.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  };

  const closeMenu = () => {
    mobileMenu.setAttribute('hidden', '');
    hamburger.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  };

  hamburger.addEventListener('click', () => {
    const isOpen = hamburger.getAttribute('aria-expanded') === 'true';
    isOpen ? closeMenu() : openMenu();
  });

  // Close when a link is clicked
  mobileMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', closeMenu);
  });

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && hamburger.getAttribute('aria-expanded') === 'true') {
      closeMenu();
      hamburger.focus();
    }
  });
})();


// ----------------------------------------------------------
// 3. SMOOTH SCROLL — polyfill for older Safari
// ----------------------------------------------------------
(function initSmoothScroll() {
  // Modern browsers handle scroll-behavior: smooth in CSS
  // This handles anchor clicks as a polyfill / safety net
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;

      const target = document.querySelector(targetId);
      if (!target) return;

      e.preventDefault();

      // Native smooth scroll with fallback
      if ('scrollBehavior' in document.documentElement.style) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        // Simple polyfill
        const targetPosition = target.getBoundingClientRect().top + window.pageYOffset;
        const navHeight = parseInt(getComputedStyle(document.documentElement)
          .getPropertyValue('--nav-height')) || 72;
        window.scrollTo({ top: targetPosition - navHeight, behavior: 'smooth' });
      }
    });
  });
})();


// ----------------------------------------------------------
// 4. INTERSECTION OBSERVER — Scroll-triggered reveals
// ----------------------------------------------------------
(function initReveal() {
  // Skip if browser doesn't support IntersectionObserver
  if (!('IntersectionObserver' in window)) {
    // Fallback: just show everything
    document.querySelectorAll('.reveal').forEach(el => {
      el.classList.add('visible');
    });
    return;
  }

  const options = {
    root: null,
    rootMargin: '0px 0px -60px 0px',  // trigger slightly before fully in view
    threshold: 0.1,
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target); // animate once only
      }
    });
  }, options);

  document.querySelectorAll('.reveal').forEach(el => {
    observer.observe(el);
  });
})();


// ----------------------------------------------------------
// 5. HEADSHOT IMAGE FALLBACK
// ----------------------------------------------------------
(function initHeadshotFallback() {
  const img = document.getElementById('headshot');
  if (!img) return;

  const fallback = img.nextElementSibling; // .photo-fallback div
  if (!fallback) return;

  // Show image if it exists; show fallback if it errors
  img.addEventListener('load', () => {
    if (fallback) fallback.style.opacity = '0';
  });

  img.addEventListener('error', () => {
    img.style.display = 'none';
    if (fallback) fallback.style.opacity = '1';
  });

  // If image is already broken (e.g., cached 404)
  if (img.complete && !img.naturalWidth) {
    img.style.display = 'none';
    if (fallback) fallback.style.opacity = '1';
  }
})();


// ----------------------------------------------------------
// 6. ACTIVE NAV LINK — Highlight current section
// ----------------------------------------------------------
(function initActiveNav() {
  const navLinks = document.querySelectorAll('#main-nav .nav-links a[href^="#"]');
  if (!navLinks.length) return;

  const sections = Array.from(navLinks)
    .map(link => document.querySelector(link.getAttribute('href')))
    .filter(Boolean);

  if (!('IntersectionObserver' in window)) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;

      const id = entry.target.getAttribute('id');
      navLinks.forEach(link => {
        link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
      });
    });
  }, {
    rootMargin: `-${72}px 0px -60% 0px`,
    threshold: 0,
  });

  sections.forEach(section => observer.observe(section));
})();

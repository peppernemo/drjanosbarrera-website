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

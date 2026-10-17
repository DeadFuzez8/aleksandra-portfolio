(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const root = document.documentElement;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- Header state + hero parallax (single rAF-throttled scroll handler) ---------- */
  const header = $('#header');
  const stage = $('#heroStage');
  const hero = $('#top');
  let ticking = false;

  function onScroll() {
    const y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 40);

    if (!reduceMotion.matches && y < hero.offsetHeight) {
      // The name drifts slower than the page, the figure a touch faster: a quiet sense of depth.
      stage.style.setProperty('--ny', (y * 0.2).toFixed(1) + 'px');
      stage.style.setProperty('--fy', (y * -0.05).toFixed(1) + 'px');
    }
    ticking = false;
  }
  window.addEventListener('scroll', () => {
    if (!ticking) { requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });
  onScroll();

  /* ---------- Intro sequence ---------- */
  const start = () => requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-loaded')));
  const figure = $('#heroFigure');
  const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  const figureReady = figure.complete ? Promise.resolve() : new Promise(r => { figure.addEventListener('load', r, { once: true }); figure.addEventListener('error', r, { once: true }); });
  // Never block the intro for more than a moment if something is slow.
  Promise.race([Promise.all([fontsReady, figureReady]), new Promise(r => setTimeout(r, 1800))]).then(start);

  /* ---------- Reveal on scroll ---------- */
  const revealEls = $$('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion.matches) {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      }
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    revealEls.forEach(el => io.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('is-in'));
  }

  /* ---------- Mobile menu ---------- */
  const menuButton = $('#menuToggle');
  const mobileNav = $('#mobileNav');
  function setMenu(open) {
    mobileNav.classList.toggle('open', open);
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    document.body.classList.toggle('modal-open', open);
  }
  menuButton.addEventListener('click', () => setMenu(!mobileNav.classList.contains('open')));
  mobileNav.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  matchMedia('(min-width: 821px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });

  $('#year').textContent = String(new Date().getFullYear());

  /* ---------- Active section in nav ---------- */
  const navLinks = $$('.desktop-nav a');
  const byId = new Map(navLinks.map(a => [a.getAttribute('href').slice(1), a]));
  if ('IntersectionObserver' in window) {
    const spy = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const link = byId.get(e.target.id);
        if (link) { link.classList.toggle('is-active', e.isIntersecting); if (e.isIntersecting) link.setAttribute('aria-current', 'true'); else link.removeAttribute('aria-current'); }
      }
    }, { rootMargin: '-40% 0px -55% 0px' });
    byId.forEach((_, id) => { const s = document.getElementById(id); if (s) spy.observe(s); });
  }

  /* ---------- Lightbox ---------- */
  const image = (n) => `photos/image${n}.webp`;
  const galleries = {
    self:     { photos: [8, 9],  title: 'Моя трансформация · 2020 / 2021' },
    client1:  { photos: [10],    title: 'Результат 01 · −8 кг' },
    client2:  { photos: [11, 12], title: 'Результат 02 · −10 кг' },
    client3:  { photos: [13, 14], title: 'Результат 03 · −8 кг' },
    client4:  { photos: [15],    title: 'Результат 04 · −10 кг' },
    client5:  { photos: [16],    title: 'Результат 05 · −7 кг' },
    client6:  { photos: [17],    title: 'Результат 06 · −12 кг' },
    review1:  { photos: [18],    title: 'Оригинал отзыва 01' },
    review2:  { photos: [19],    title: 'Оригинал отзыва 02' },
    review3:  { photos: [20],    title: 'Оригинал отзыва 03' },
    review4:  { photos: [21],    title: 'Оригинал отзыва 04' },
    diploma1: { photos: [22],    title: 'Диплом SBA · профессиональная переподготовка' },
    diploma2: { photos: [23],    title: 'Удостоверение SBA · повышение квалификации' }
  };

  const modal = $('#lightbox');
  const modalImg = $('#lightboxImage');
  const caption = $('#lightboxCaption');
  const count = $('#lightboxCount');
  const prevBtn = $('#lightboxPrev');
  const nextBtn = $('#lightboxNext');
  const closeBtn = $('#lightboxClose');
  let active = null, index = 0, lastFocus = null, touchX = null;

  function renderModal() {
    if (!active) return;
    const g = galleries[active];
    modalImg.src = image(g.photos[index]);
    modalImg.alt = g.title;
    caption.textContent = g.title;
    count.textContent = g.photos.length > 1 ? `${index + 1} / ${g.photos.length}` : '';
    prevBtn.hidden = nextBtn.hidden = g.photos.length < 2;
    if (g.photos.length > 1) g.photos.forEach(n => { new Image().src = image(n); });
  }
  function openModal(key, i = 0) {
    if (!galleries[key]) return;
    lastFocus = document.activeElement;
    active = key;
    index = Math.min(Math.max(0, i), galleries[key].photos.length - 1);
    renderModal();
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    closeBtn.focus();
  }
  function closeModal() {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    active = null;
    modalImg.removeAttribute('src');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function shift(step) {
    if (!active) return;
    const total = galleries[active].photos.length;
    index = (index + step + total) % total;
    renderModal();
  }

  $$('[data-gallery]').forEach(btn => btn.addEventListener('click', () => openModal(btn.dataset.gallery, Number(btn.dataset.index) || 0)));
  closeBtn.addEventListener('click', closeModal);
  prevBtn.addEventListener('click', () => shift(-1));
  nextBtn.addEventListener('click', () => shift(1));
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

  document.addEventListener('keydown', (e) => {
    if (active) {
      if (e.key === 'Escape') closeModal();
      else if (e.key === 'ArrowRight') shift(1);
      else if (e.key === 'ArrowLeft') shift(-1);
      else if (e.key === 'Tab') {
        const items = [closeBtn, ...(prevBtn.hidden ? [] : [prevBtn, nextBtn])];
        const i = items.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); items[items.length - 1].focus(); }
        else if (!e.shiftKey && i === items.length - 1) { e.preventDefault(); items[0].focus(); }
      }
    } else if (e.key === 'Escape' && mobileNav.classList.contains('open')) {
      setMenu(false);
      menuButton.focus();
    }
  });

  modal.addEventListener('touchstart', (e) => { touchX = e.changedTouches[0].clientX; }, { passive: true });
  modal.addEventListener('touchend', (e) => {
    if (touchX === null) return;
    const diff = e.changedTouches[0].clientX - touchX;
    if (Math.abs(diff) > 60) shift(diff < 0 ? 1 : -1);
    touchX = null;
  }, { passive: true });
})();

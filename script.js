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
  let depthFn = null; // set by the smooth-scroll block below

  function onScroll() {
    const y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 40);

    if (!reduceMotion.matches && y < hero.offsetHeight) {
      // The name drifts slower than the page, the figure a touch faster: a quiet sense of depth.
      stage.style.setProperty('--ny', (y * 0.2).toFixed(1) + 'px');
      stage.style.setProperty('--fy', (y * -0.05).toFixed(1) + 'px');
    }
    if (depthFn) depthFn();
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
    review5:  { photos: [24],    title: 'Оригинал отзыва 05' },
    review6:  { photos: [25],    title: 'Оригинал отзыва 06' },
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
  /* ---------- Smooth scroll (inertia) + soft depth ---------- */
  // Wheel input on desktop is eased with a lerp; touch keeps the browser's native momentum.
  // Images drift a few pixels inside their frames and headings lag the scroll slightly.
  const motionOK = !reduceMotion.matches;
  const depthItems = [];
  const visible = new Set();
  const compact = matchMedia('(max-width: 820px)');

  if (motionOK) {
    const add = (el, kind, range) => { if (el) { depthItems.push({ el, kind, range }); el.classList.add('has-depth'); } };
    $$('.about__frame img, .year figure img, .photo-btn img').forEach(el => add(el, 'img', 0.035));
    $$('main .display, main .lede').forEach(el => add(el, 'text', 16));
    if ('IntersectionObserver' in window) {
      const vis = new IntersectionObserver((entries) => {
        for (const e of entries) {
          const item = e.target.__depth;
          if (e.isIntersecting) visible.add(item); else visible.delete(item);
        }
        depthTick();
      }, { rootMargin: '15% 0px 15% 0px' });
      depthItems.forEach(it => { it.el.__depth = it; vis.observe(it.el); });
    } else {
      depthItems.forEach(it => visible.add(it));
    }
  }

  function depthTick() {
    if (!visible.size) return;
    const vh = window.innerHeight || 1;
    const k = compact.matches ? 0.6 : 1;
    const reads = [];
    visible.forEach(it => {
      const r = (it.kind === 'img' ? it.el.parentElement : it.el).getBoundingClientRect();
      const p = Math.max(-1, Math.min(1, (r.top + r.height / 2 - vh / 2) / vh));
      reads.push([it, it.kind === 'img' ? p * r.height * it.range * k : p * it.range * k]);
    });
    for (const [it, y] of reads) it.el.style.translate = '0 ' + y.toFixed(2) + 'px';
  }

  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  if (motionOK && fine.matches) {
    let target = window.scrollY, current = target, last = 0, running = false;
    const maxScroll = () => Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const frame = (t) => {
      const dt = Math.min(48, t - (last || t - 16.7)); last = t;
      const ease = 1 - Math.pow(1 - 0.085, dt / 16.7);
      current += (target - current) * ease;
      if (Math.abs(target - current) < 0.4) { current = target; running = false; last = 0; }
      window.scrollTo({ top: current, behavior: 'instant' });
      if (running) requestAnimationFrame(frame);
    };
    window.addEventListener('wheel', (e) => {
      if (e.ctrlKey || e.defaultPrevented || document.body.classList.contains('modal-open')) return;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1;
      target = Math.max(0, Math.min(maxScroll(), target + e.deltaY * unit));
      e.preventDefault();
      if (!running) { running = true; requestAnimationFrame(frame); }
    }, { passive: false });
    // Anything else that moves the page (keys, scrollbar, anchors) takes over and resets the target.
    window.addEventListener('scroll', () => {
      if (Math.abs(window.scrollY - current) > 2) { target = current = window.scrollY; running = false; last = 0; }
    }, { passive: true });
  }
  depthFn = depthTick;
  depthFn();
})();

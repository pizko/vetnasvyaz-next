// Общая интерактивная система: курсор, магнитные кнопки, раскрытие текста, шапка, меню.
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import type Lenis from 'lenis';

/* ---------- Курсор с контекстными состояниями ---------- */
export function initCursor() {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  const root = document.documentElement;
  const el = document.querySelector<HTMLElement>('.cursor')!;
  const dot = el.querySelector<HTMLElement>('.cursor__dot')!;
  const ring = el.querySelector<HTMLElement>('.cursor__ring')!;
  const label = el.querySelector<HTMLElement>('.cursor__label')!;
  root.classList.add('has-cursor');
  // точка — без задержки, кольцо — с мягкой инерцией
  const dx = gsap.quickSetter(dot, 'x', 'px'), dy = gsap.quickSetter(dot, 'y', 'px');
  const rx = gsap.quickTo(ring, 'x', { duration: .35, ease: 'power3' }), ry = gsap.quickTo(ring, 'y', { duration: .35, ease: 'power3' });
  let shown = false;
  window.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY);
    if (!shown) { shown = true; el.classList.remove('is-hidden'); }
  }, { passive: true });
  document.addEventListener('pointerleave', () => { shown = false; el.classList.add('is-hidden'); });
  window.addEventListener('pointerdown', () => el.classList.add('is-down'));
  window.addEventListener('pointerup', () => el.classList.remove('is-down'));

  const LABELS: Record<string, string> = { view: 'Открыть', drag: '← Тяни →', link: '', cross: '', text: '' };
  const states = ['is-link', 'is-view', 'is-drag', 'is-cross', 'is-text'];
  document.addEventListener('pointerover', e => {
    const t = e.target as HTMLElement;
    let state = '';
    const c = t.closest<HTMLElement>('[data-cursor]');
    if (t.closest('input[type="search"], input[type="text"], textarea')) state = 'text';
    else if (root.classList.contains('is-dragging')) state = 'drag';
    else if (c) state = c.dataset.cursor!;
    else if (t.closest('a, button, label, [role="button"]')) state = 'link';
    if (state === 'view' && t.closest('.svc.is-open')) state = 'link';
    if (state === 'view' && t.closest('.svc')) label.textContent = t.closest('.svc.is-open') ? '' : 'Открыть';
    else label.textContent = LABELS[state] ?? '';
    states.forEach(s => el.classList.toggle(s, s === 'is-' + state));
  });
}

/* ---------- Магнитные кнопки ---------- */
export function initMagnetic() {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  document.querySelectorAll<HTMLElement>('[data-magnetic]').forEach(el => {
    if (el.dataset.magInit) return;
    el.dataset.magInit = '1';
    const inner = [...el.querySelectorAll<HTMLElement>('[data-magnetic-inner]')];
    const xTo = gsap.quickTo(el, 'x', { duration: .8, ease: 'elastic.out(1, .4)' });
    const yTo = gsap.quickTo(el, 'y', { duration: .8, ease: 'elastic.out(1, .4)' });
    const ins = inner.map(i => ({ x: gsap.quickTo(i, 'x', { duration: .6, ease: 'power3' }), y: gsap.quickTo(i, 'y', { duration: .6, ease: 'power3' }) }));
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      const mx = e.clientX - (r.left + r.width / 2), my = e.clientY - (r.top + r.height / 2);
      const k = Math.min(.35, 60 / r.width + .12);
      xTo(mx * k); yTo(my * k * 1.2);
      ins.forEach(i => { i.x(mx * .14); i.y(my * .2); });
    });
    el.addEventListener('pointerleave', () => { xTo(0); yTo(0); ins.forEach(i => { i.x(0); i.y(0); }); });
  });
}

/* ---------- Раскрытие текста: строки, слова, глубина, насыщенность ---------- */
export function initReveals(reduce: boolean, scope: ParentNode = document) {
  const els = [...scope.querySelectorAll<HTMLElement>('[data-reveal]')];
  els.forEach(el => {
    const kind = el.dataset.reveal;
    if (reduce) { el.classList.add('is-split'); return; }
    if (kind === 'lines') {
      const split = new SplitText(el, { type: 'lines', mask: 'lines', linesClass: 'split-line-in' });
      el.classList.add('is-split');
      gsap.from(split.lines, {
        yPercent: 110, rotate: 2.5, transformOrigin: '0 0', duration: 1.4, stagger: .1, ease: 'expo.out',
        scrollTrigger: { trigger: el, start: 'top 85%', once: true },
      });
    } else if (kind === 'depth') {
      // пространственное раскрытие: перспектива + маска
      const split = new SplitText(el, { type: 'words', mask: 'words' });
      el.classList.add('is-split');
      gsap.from(split.words, {
        yPercent: 100, rotateX: -70, z: -200, transformPerspective: 800, transformOrigin: '50% 100%', duration: 1.5, stagger: .07, ease: 'expo.out',
        scrollTrigger: { trigger: el, start: 'top 88%', once: true },
      });
    } else if (kind === 'weight') {
      // раскрытие через насыщенность шрифта, связано со скроллом
      const split = new SplitText(el, { type: 'words', wordsClass: 'w' });
      el.classList.add('is-split');
      split.words.forEach((w, i) => {
        (w as HTMLElement).style.setProperty('--ww', '200');
        gsap.to(w, { '--ww': 560, ease: 'none', scrollTrigger: { trigger: el, start: `top ${85 - i * 1.2}%`, end: `top ${55 - i * 1.2}%`, scrub: true } });
        gsap.fromTo(w, { opacity: .25 }, { opacity: 1, ease: 'none', scrollTrigger: { trigger: el, start: `top ${85 - i * 1.2}%`, end: `top ${60 - i * 1.2}%`, scrub: true } });
      });
    }
  });

  // Манифест: слова «проявляются» по мере прокрутки
  scope.querySelectorAll<HTMLElement>('[data-scrub-words]').forEach(el => {
    const split = new SplitText(el, { type: 'words', wordsClass: 'w' });
    if (reduce) return;
    const words = split.words as HTMLElement[];
    ScrollTrigger.create({
      trigger: el, start: 'top 80%', end: 'bottom 45%', scrub: true,
      onUpdate: s => { const n = Math.round(s.progress * words.length); words.forEach((w, i) => w.classList.toggle('is-on', i < n)); },
    });
  });
}

/* ---------- Шапка: тема по секции под ней, скрытие при прокрутке вниз ---------- */
export function initHeader() {
  const hdr = document.querySelector<HTMLElement>('.hdr')!;
  let last = 0;
  const check = () => {
    const y = window.scrollY;
    const probe = document.elementsFromPoint(innerWidth / 2, 40).find(e => e !== hdr && !hdr.contains(e) && (e as HTMLElement).closest?.('[data-theme], .page-view'));
    const host = (probe as HTMLElement | undefined)?.closest<HTMLElement>('[data-theme], .page-view');
    const light = !!host && (host.classList.contains('page-view') || host.dataset.theme === 'light');
    hdr.classList.toggle('is-light', light);
    const menuOpen = !document.querySelector<HTMLElement>('.menu')!.hidden;
    hdr.classList.toggle('is-hidden', !menuOpen && y > 200 && y > last + 2);
    if (y < last - 2 || y < 200) hdr.classList.remove('is-hidden');
    last = y;
  };
  window.addEventListener('scroll', check, { passive: true });
  check();
  return check;
}

/* ---------- Меню: полноэкранное на десктопе, нижний лист на телефоне ---------- */
export function initMenu(lenis: Lenis | null) {
  const menu = document.querySelector<HTMLElement>('.menu')!;
  const sheet = menu.querySelector<HTMLElement>('.menu__sheet')!;
  const burger = document.querySelector<HTMLButtonElement>('.hdr__burger')!;
  const links = [...menu.querySelectorAll<HTMLElement>('.menu__nav a')];
  let lastFocus: HTMLElement | null = null;
  const mobile = () => innerWidth < 768;

  const open = () => {
    lastFocus = document.activeElement as HTMLElement;
    menu.hidden = false;
    burger.setAttribute('aria-expanded', 'true');
    lenis?.stop();
    gsap.fromTo(menu.querySelector('.menu__scrim'), { opacity: 0 }, { opacity: 1, duration: .5 });
    gsap.fromTo(sheet, mobile() ? { yPercent: 100, xPercent: 0 } : { xPercent: 100, yPercent: 0 }, { yPercent: 0, xPercent: 0, duration: .8, ease: 'expo.out' });
    gsap.fromTo(links, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: .9, stagger: .045, delay: .12, ease: 'expo.out' });
    setTimeout(() => links[0]?.focus(), 50);
  };
  const close = () => {
    if (menu.hidden) return;
    burger.setAttribute('aria-expanded', 'false');
    gsap.to(menu.querySelector('.menu__scrim'), { opacity: 0, duration: .4 });
    gsap.to(sheet, { ...(mobile() ? { yPercent: 100 } : { xPercent: 100 }), duration: .55, ease: 'expo.in', onComplete: () => { menu.hidden = true; lenis?.start(); } });
    lastFocus?.focus?.();
  };
  burger.addEventListener('click', open);
  document.querySelectorAll('[data-open-menu]').forEach(b => b.addEventListener('click', open));
  menu.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', close));
  links.forEach(a => a.addEventListener('click', close));
  document.addEventListener('keydown', e => {
    if (menu.hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === 'Tab') { // ловушка фокуса
      const f = [...sheet.querySelectorAll<HTMLElement>('a, button')];
      const first = f[0], lastEl = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastEl.focus(); }
      else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); first.focus(); }
    }
  });
  // свайп вниз закрывает нижний лист
  let sy = 0, dy = 0;
  sheet.addEventListener('touchstart', e => { sy = e.touches[0].clientY; dy = 0; }, { passive: true });
  sheet.addEventListener('touchmove', e => { dy = Math.max(0, e.touches[0].clientY - sy); if (mobile() && sheet.scrollTop <= 0) gsap.set(sheet, { y: dy }); }, { passive: true });
  sheet.addEventListener('touchend', () => { if (!mobile()) return; if (dy > 90) { gsap.set(sheet, { y: 0 }); close(); } else gsap.to(sheet, { y: 0, duration: .5, ease: 'expo.out' }); });
  return close;
}

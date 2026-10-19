// 00 — Hero: интро-прелоадер, кинематографичный вход, многослойный параллакс,
// «живая» вариативная типографика и сценарный переход в следующий раздел.
import gsap from 'gsap';

export function runIntro(reduce: boolean): Promise<void> {
  const intro = document.querySelector<HTMLElement>('.intro');
  if (!intro) return Promise.resolve();
  if (reduce || new URLSearchParams(location.search).has('nointro')) { intro.remove(); return Promise.resolve(); }
  const num = intro.querySelector<HTMLElement>('.intro__num')!;
  const bar = intro.querySelector<HTMLElement>('.intro__bar i')!;
  const img = document.querySelector<HTMLImageElement>('.hero__dog img')!;
  const ready = Promise.all([
    img.decode().catch(() => {}),
    (document as Document & { fonts?: FontFaceSet }).fonts?.ready ?? Promise.resolve(),
  ]);
  const c = { v: 0 };
  return new Promise(resolve => {
    // счётчик идёт до 80, ждёт загрузку, затем добегает до 100
    const t1 = gsap.to(c, { v: 80, duration: 1, ease: 'power2.inOut', onUpdate: () => { num.textContent = String(Math.round(c.v)).padStart(3, '0'); bar.style.transform = `scaleX(${c.v / 100})`; } });
    ready.then(() => t1.then(() => {
      gsap.to(c, {
        v: 100, duration: .45, ease: 'power3.out',
        onUpdate: () => { num.textContent = String(Math.round(c.v)).padStart(3, '0'); bar.style.transform = `scaleX(${c.v / 100})`; },
        onComplete: () => {
          gsap.to(intro, { clipPath: 'inset(0 0 100% 0)', duration: 1.1, ease: 'expo.inOut', onComplete: () => intro.remove() });
          setTimeout(resolve, 380);
        },
      });
    }));
  });
}

export function initHero(reduce: boolean) {
  const hero = document.querySelector<HTMLElement>('.hero');
  if (!hero) return { enter: () => {} };
  const stage = hero.querySelector<HTMLElement>('.hero__stage')!;
  const dog = hero.querySelector<HTMLElement>('.hero__dog')!;
  const letters = [...hero.querySelectorAll<HTMLElement>('.hl')];
  const hf = [...hero.querySelectorAll<HTMLElement>('.hf')];
  const reticle = hero.querySelector<SVGElement>('.hero__reticle')!;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

  // --- исходные состояния для входа ---
  if (!reduce) {
    // центрирование отдаём GSAP, чтобы не конфликтовать с CSS translate
    gsap.set(dog, { xPercent: -50, x: 0 });
    gsap.set(reticle, { xPercent: -50, yPercent: -50, x: 0, y: 0 });
    gsap.set(dog, { clipPath: 'circle(0% at 50% 28%)', scale: 1.18 });
    gsap.set(letters, { yPercent: 110, opacity: 0 });
    gsap.set(hf, { clipPath: 'inset(0% 0% 100% 0%)', yPercent: 40 });
    gsap.set(reticle, { scale: .2, opacity: 0, rotate: -90 });
    gsap.set('.hero__light', { opacity: 0, scale: .6 });
    gsap.set(['.hero__meta', '.hero__sub', '.hero__ctas > *'], { opacity: 0, y: 30 });
  }

  const enter = () => {
    if (reduce) return;
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.to('.hero__light', { opacity: 1, scale: 1, duration: 2.4, stagger: .2, ease: 'power2.out' }, 0)
      .to(dog, { clipPath: 'circle(120% at 50% 28%)', duration: 2.2, ease: 'expo.inOut' }, .1)
      .to(dog, { scale: 1, duration: 2.8, ease: 'expo.out' }, .3)
      .to(letters, { yPercent: 0, opacity: 1, duration: 1.6, stagger: { each: .06, from: 'center' } }, .5)
      .to(reticle, { scale: 1, opacity: 1, rotate: 0, duration: 2.2, ease: 'expo.out' }, .9)
      .to(hf, { clipPath: 'inset(0% 0% -20% 0%)', yPercent: 0, duration: 1.5, stagger: .12 }, 1.1)
      .to(['.hero__meta', '.hero__sub', '.hero__ctas > *'], { opacity: 1, y: 0, duration: 1.2, stagger: .08 }, 1.4)
      // лёгкий «пространственный» акцент: лаймовая точка заголовка совершает прыжок
      .fromTo('.hl--lime', { y: -40, scale: 1.6 }, { y: 0, scale: 1, duration: 1.2, ease: 'bounce.out' }, 1.6);
  };

  if (reduce) return { enter };

  // --- параллакс по курсору: слои движутся с разной скоростью ---
  const layers = [...hero.querySelectorAll<HTMLElement>('[data-depth]')].map(el => ({
    d: parseFloat(el.dataset.depth!),
    x: gsap.quickTo(el, 'x', { duration: 1.2, ease: 'power3' }),
    y: gsap.quickTo(el, 'y', { duration: 1.2, ease: 'power3' }),
  }));
  // вариативный шрифт: буквы рядом с курсором становятся тоньше и «отступают»
  const centers = () => letters.map(l => { const r = l.getBoundingClientRect(); return r.left + r.width / 2; });
  let cx = centers();
  window.addEventListener('resize', () => (cx = centers()));
  const REST = 260;
  const wState = letters.map(() => ({ w: REST }));
  letters.forEach(l => l.style.setProperty('--w', String(REST)));

  if (fine) {
    hero.addEventListener('pointermove', e => {
      const nx = e.clientX / innerWidth - .5, ny = e.clientY / innerHeight - .5;
      layers.forEach(l => { l.x(-nx * 40 * l.d); l.y(-ny * 26 * l.d); });
      letters.forEach((l, i) => {
        const dist = Math.abs(e.clientX - cx[i]) / innerWidth;
        const f = Math.exp(-dist * dist * 60);
        gsap.to(wState[i], { w: REST + f * 620, duration: .8, ease: 'power3.out', overwrite: true, onUpdate: () => l.style.setProperty('--w', String(wState[i].w)) });
      });
    });
    hero.addEventListener('pointerleave', () => {
      layers.forEach(l => { l.x(0); l.y(0); });
      letters.forEach((l, i) => gsap.to(wState[i], { w: REST, duration: 1.2, ease: 'power3.out', overwrite: true, onUpdate: () => l.style.setProperty('--w', String(wState[i].w)) }));
    });
  } else {
    // на сенсорных экранах — медленное «дыхание» собаки вместо курсора
    gsap.to(dog, { y: -8, scale: 1.015, duration: 4, ease: 'sine.inOut', yoyo: true, repeat: -1 });
  }

  // --- сценарный переход при скролле: одна непрерывная сцена ---
  const st = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: hero, start: 'top top', end: '+=110%', pin: stage, scrub: .6, anticipatePin: 1,
      onUpdate: s => { hero.dataset.theme = s.progress > .72 ? 'light' : 'dark'; },
    },
  });
  st.fromTo('.hero__layer--dog', { scale: 1, yPercent: 0 }, { scale: 1.5, yPercent: -4, transformOrigin: '50% 40%', duration: 1, immediateRender: false }, 0)
    .to('.hero__word', { yPercent: -70, letterSpacing: '.04em', opacity: 0, duration: .6 }, 0)
    .fromTo(letters, { '--w': REST }, { '--w': 900, duration: .5, stagger: .02, immediateRender: false }, 0)
    .to(hf[0], { xPercent: -70, opacity: 0, duration: .55 }, 0)
    .to(hf[1], { xPercent: 70, opacity: 0, duration: .55 }, 0)
    .to(reticle, { scale: 2.6, opacity: 0, duration: .5 }, 0)
    .to(['.hero__bottom', '.hero__meta', '.hero__scroll'], { opacity: 0, y: -40, duration: .3 }, 0)
    .fromTo('.hero__wipe', { clipPath: 'circle(0% at 50% 62%)' }, { clipPath: 'circle(80% at 50% 50%)', duration: .6, ease: 'power2.in' }, .4)
    .fromTo('.hero__wipe-text', { scale: 1.35, opacity: 0 }, { scale: 1, opacity: 1, duration: .5, ease: 'power2.out' }, .55);

  return { enter };
}

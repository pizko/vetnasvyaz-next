import '@fontsource-variable/piazzolla/opsz.css';
import '@fontsource-variable/piazzolla/opsz-italic.css';
import '@fontsource-variable/manrope';
import '@fontsource-variable/jetbrains-mono';
import './styles/base.css';
import './styles/hero.css';
import './styles/sections.css';
import './styles/vns.css';
import './styles/responsive.css';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { Flip } from 'gsap/Flip';
import Lenis from 'lenis';
import { setBase, resolveRoute } from './data';

import { runIntro, initHero } from './modules/hero';
import { initSpecies } from './modules/species';
import { initServices } from './modules/services';
import { initStory } from './modules/story';
import { initHelper } from './modules/helper';
import { initArea } from './modules/area';
import { initPrices } from './modules/prices';
import { initScenes } from './modules/scenes';
import { initGallery } from './modules/gallery';
import { initReviews } from './modules/reviews';
import { initRouter } from './modules/router';
import { initCursor, initMagnetic, initReveals, initHeader, initMenu } from './modules/ui';

setBase(import.meta.env.BASE_URL);
gsap.registerPlugin(ScrollTrigger, SplitText, Flip);
history.scrollRestoration = 'manual';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const root = document.documentElement;
if (reduce) root.classList.add('no-motion');

// Плавная прокрутка (Lenis) синхронизирована с ScrollTrigger; при reduced-motion — нативная
let lenis: Lenis | null = null;
if (!reduce) {
  lenis = new Lenis({ lerp: .1, smoothWheel: true, syncTouch: false });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis!.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

function safe(name: string, fn: () => void) {
  try { fn(); } catch (e) { console.error(`[${name}]`, e); }
}

async function boot() {
  const isPage = root.dataset.route === 'page' || (resolveRoute(location.pathname)?.kind ?? 'home') !== 'home';
  const homeReal = !document.querySelector('.home-view[data-stub]');

  let hero = { enter: () => {} };
  if (homeReal) {
    safe('hero', () => (hero = initHero(reduce || isPage)));
    safe('species', initSpecies);
    safe('services', initServices);
    safe('story', () => !reduce && initStory());
    safe('helper', initHelper);
    safe('area', initArea);
    safe('prices', initPrices);
    safe('scenes', () => !reduce && initScenes());
    safe('gallery', () => initGallery(reduce));
    safe('reviews', () => initReviews(reduce));
  }
  safe('reveals', () => initReveals(reduce));
  safe('cursor', initCursor);
  safe('magnetic', initMagnetic);
  let close = () => {};
  safe('menu', () => (close = initMenu(lenis)));
  const checkHeader = initHeader();

  initRouter(lenis, reduce, {
    onPage: () => { initMagnetic(); close(); setTimeout(checkHeader, 60); },
    onHome: () => { setTimeout(checkHeader, 60); },
  });

  document.querySelector('[data-to-top]')?.addEventListener('click', () => (lenis ? lenis.scrollTo(0, { duration: 2 }) : window.scrollTo({ top: 0 })));

  // Интро только на главной при первом заходе
  if (!isPage) {
    lenis?.stop();
    await runIntro(reduce);
    lenis?.start();
    hero.enter();
    if (location.hash) setTimeout(() => document.querySelector(location.hash) && (lenis ? lenis.scrollTo(location.hash, { immediate: true }) : document.querySelector(location.hash)!.scrollIntoView()), 50);
  } else {
    document.querySelector('.intro')?.remove();
  }
  ScrollTrigger.refresh();
  setTimeout(checkHeader, 100);
}

boot().catch(e => {
  console.error(e);
  document.querySelector('.intro')?.remove();
  root.classList.add('no-motion');
});

// Пересчёт после загрузки шрифтов, чтобы маски строк и пины совпадали с финальной вёрсткой
document.fonts?.ready.then(() => ScrollTrigger.refresh());

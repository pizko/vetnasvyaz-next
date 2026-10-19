// Маршрутизация с переходами-шторками: главная ⇄ внутренние страницы (адреса как на vetnasvyaz.ru:
// /kardiologiya.html, /novosti/<slug>/, /contacts.html …). История браузера работает (pushState/popstate),
// прямые ссылки отдают пререндеренный HTML.
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type Lenis from 'lenis';
import { resolveRoute, CONTACT, type Route } from '../data';
import { renderRoute, routeMeta } from '../render';

const HOME_TITLE = document.title;
const HOME_DESC = document.querySelector('meta[name="description"]')?.getAttribute('content') ?? '';

type Hooks = { onPage: (root: HTMLElement) => void; onHome: () => void };

const label = (r: Route) =>
  r.kind === 'service' ? r.service.title : r.kind === 'article' ? 'Статья' : r.kind === 'info' ? r.page.title : 'Главная';

/** Поиск по прайсу внутри страницы направления */
function enhancePage(root: HTMLElement) {
  const box = root.querySelector<HTMLElement>('[data-sp-prices]');
  if (!box) return;
  const input = box.querySelector<HTMLInputElement>('input')!;
  const rows = [...box.querySelectorAll<HTMLTableRowElement>('tbody tr')];
  const empty = box.querySelector<HTMLElement>('.sp-prices__empty')!;
  const norm = (s: string) => s.toLowerCase().replace(/ё/g, 'е');
  input.addEventListener('input', () => {
    const q = norm(input.value.trim());
    let n = 0;
    rows.forEach(r => { const ok = !q || norm(r.cells[0].textContent || '').includes(q); r.hidden = !ok; if (ok) n++; });
    empty.hidden = n > 0;
    ScrollTrigger.refresh();
  });
}

export function initRouter(lenis: Lenis | null, reduce: boolean, hooks: Hooks) {
  const home = document.querySelector<HTMLElement>('.home-view')!;
  const page = document.querySelector<HTMLElement>('#page-view')!;
  const curtain = document.querySelector<HTMLElement>('.curtain')!;
  const panel = curtain.querySelector<HTMLElement>('.curtain__panel')!;
  const lime = curtain.querySelector<HTMLElement>('.curtain__lime')!;
  const cLabel = curtain.querySelector<HTMLElement>('.curtain__label')!;
  const homeIsStub = () => home.hasAttribute('data-stub');
  let homeScroll = 0;
  let busy = false;

  const scrollTo = (target: string | number, immediate = false) => {
    if (lenis) lenis.scrollTo(target as never, { immediate, offset: 0, duration: 1.6 });
    else if (typeof target === 'number') window.scrollTo(0, target);
    else document.querySelector(target)?.scrollIntoView({ behavior: immediate || reduce ? 'auto' : 'smooth' });
  };

  const setMeta = (title: string, desc: string, path: string) => {
    document.title = title;
    document.querySelector('meta[name="description"]')?.setAttribute('content', desc);
    document.querySelector('link[rel="canonical"]')?.setAttribute('href', CONTACT.origin + path);
  };

  const curtainIn = (text: string) => new Promise<void>(res => {
    if (reduce) return res();
    curtain.style.visibility = 'visible';
    cLabel.textContent = text;
    gsap.timeline({ onComplete: res })
      .fromTo(lime, { yPercent: 100 }, { yPercent: 0, duration: .6, ease: 'expo.inOut' }, 0)
      .fromTo(panel, { yPercent: 100 }, { yPercent: 0, duration: .6, ease: 'expo.inOut' }, .1)
      .fromTo(cLabel, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: .4 }, .45);
  });
  const curtainOut = () => {
    if (reduce) return;
    gsap.timeline({ onComplete: () => { curtain.style.visibility = 'hidden'; } })
      .to(cLabel, { opacity: 0, duration: .2 }, 0)
      .to(panel, { yPercent: -100, duration: .8, ease: 'expo.inOut' }, .1)
      .to(lime, { yPercent: -100, duration: .8, ease: 'expo.inOut' }, .18);
  };

  const animatePage = () => {
    if (reduce) return;
    gsap.from(page.querySelectorAll('.sp__crumbs, .sp__num, .sp__kicker, .sp__h1, .sp__lead'), { y: 60, opacity: 0, duration: 1.3, stagger: .08, delay: .25, ease: 'expo.out' });
    const fig = page.querySelector('.sp__fig, .art__cover');
    if (fig) {
      gsap.fromTo(fig, { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: 1.4, delay: .3, ease: 'expo.inOut' });
      gsap.fromTo(fig.querySelector('img'), { scale: 1.3 }, { scale: 1, duration: 1.8, delay: .3, ease: 'expo.out' });
    }
    gsap.from(page.querySelectorAll('.sp__block, .sp-prices, .cat__group, .news-row, .vac__role, .ct__item'), {
      y: 40, opacity: 0, duration: 1, stagger: .04, delay: .5, ease: 'expo.out',
    });
  };

  const showPage = (r: Route) => {
    page.innerHTML = renderRoute(r);
    page.hidden = false;
    home.hidden = true;
    document.documentElement.dataset.route = 'page';
    const m = routeMeta(r);
    setMeta(m.title, m.desc, m.path);
    scrollTo(0, true);
    enhancePage(page);
    ScrollTrigger.refresh();
    hooks.onPage(page);
    animatePage();
  };

  const showHome = (hash: string) => {
    page.hidden = true;
    page.innerHTML = '';
    home.hidden = false;
    delete document.documentElement.dataset.route;
    setMeta(HOME_TITLE, HOME_DESC, '/');
    ScrollTrigger.refresh();
    hooks.onHome();
    if (hash && document.querySelector(hash)) scrollTo(hash, true);
    else scrollTo(homeScroll, true);
  };

  const go = async (url: URL, push: boolean) => {
    if (busy) return;
    const r = resolveRoute(url.pathname);
    if (!r) { location.href = url.href; return; }
    const onHome = !home.hidden && document.documentElement.dataset.route !== 'page';
    // Главная → якорь на главной: плавный скролл без шторки
    if (r.kind === 'home' && onHome) {
      if (push) history.pushState({}, '', url.pathname + url.search + url.hash);
      if (url.hash) scrollTo(url.hash); else scrollTo(0);
      return;
    }
    if (r.kind === 'home' && homeIsStub()) { location.href = url.href; return; }
    busy = true;
    if (onHome) homeScroll = window.scrollY;
    await curtainIn(label(r));
    if (push) history.pushState({}, '', url.pathname + url.search + url.hash);
    if (r.kind === 'home') showHome(url.hash); else showPage(r);
    curtainOut();
    busy = false;
  };

  document.addEventListener('click', e => {
    const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[data-route]');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;
    e.preventDefault();
    go(url, true);
  });
  window.addEventListener('popstate', () => go(new URL(location.href), false));

  // Первичная загрузка по прямой ссылке (в dev-режиме HTML общий — рендерим на клиенте)
  const initial = resolveRoute(location.pathname);
  if (initial && initial.kind !== 'home') {
    if (page.hidden || !page.innerHTML.trim()) showPage(initial);
    else { enhancePage(page); hooks.onPage(page); animatePage(); }
  }
  return { go };
}

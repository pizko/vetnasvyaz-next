// Чистые функции рендера в строку HTML: работают и в Node (пререндер для SEO), и в браузере (роутер).
import {
  SERVICES, GROUPS, POPULAR, REVIEWS, GALLERY, STEPS, URGENT, ABOUT, VISIT_TIPS, VACANCIES, NEWS, PAGES, CONTACT,
  fmt, u, servicePath, articlePath, type Service, type Article, type InfoPage, type Block, type Route,
} from './data.ts';

export const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Картинка: 'svc-8' → адаптивная пара 900/1800, 'vns/x' или 'news/x' → один файл */
export const imgSrc = (name: string, w: 900 | 1800 = 900) => u(name.includes('/') ? `/img/${name}.webp` : `/img/${name}-${w}.webp`);
const img = (name: string, alt: string, cls = '', sizes = '(max-width: 768px) 100vw, 50vw', eager = false) => {
  const set = name.includes('/') ? '' : ` srcset="${imgSrc(name, 900)} 900w, ${imgSrc(name, 1800)} 1800w" sizes="${sizes}"`;
  return `<img class="${cls}" src="${imgSrc(name)}"${set} alt="${esc(alt)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;
};

export const ARROW = `<svg class="ico-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 18 18 6M8 6h10v10" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>`;
const callBtn = (label = 'Позвонить в клинику', cls = 'btn--lime') =>
  `<a class="btn ${cls}" href="${CONTACT.tel}" data-magnetic><span data-magnetic-inner>${label}</span>${ARROW}</a>`;
const minPrice = (s: Service) => (s.prices.length ? Math.min(...s.prices.map(p => p.v)) : 0);
const num = (i: number) => String(i + 1).padStart(2, '0');

/* ---------------- Главная ---------------- */

export function renderGroupChips(): string {
  return GROUPS.map((g, i) => {
    const n = g.id === 'all' ? SERVICES.length : SERVICES.filter(s => s.group === g.id).length;
    return `<button type="button" class="chip${i === 0 ? ' is-active' : ''}" data-group="${g.id}" aria-pressed="${i === 0}">${g.label}<sup>${n}</sup></button>`;
  }).join('');
}

export function renderServiceRows(): string {
  return SERVICES.map((s, i) => {
    const mp = minPrice(s);
    return `
  <li class="svc" data-index="${i}" data-img="${s.img}" data-group="${s.group}">
    <button class="svc__head" type="button" aria-expanded="false" aria-controls="svc-panel-${s.slug}" id="svc-btn-${s.slug}" data-cursor="view">
      <span class="svc__num">${num(i)}</span>
      <span class="svc__title"><span class="svc__title-in">${esc(s.title)}</span></span>
      <span class="svc__short">${esc(s.short)}</span>
      <span class="svc__price">${mp ? 'от ' + fmt(mp) : s.kicker}</span>
      <span class="svc__plus" aria-hidden="true"><i></i><i></i></span>
    </button>
    <div class="svc__panel" id="svc-panel-${s.slug}" role="region" aria-labelledby="svc-btn-${s.slug}" hidden>
      <div class="svc__panel-in">
        <figure class="svc__fig">${img(s.img, s.title, '', '(max-width: 768px) 90vw, 30vw')}</figure>
        <div class="svc__body">
          <p class="svc__lead">${esc(s.lead)}</p>
          ${s.prices.length ? `<ul class="svc__mini">${s.prices.slice(0, 4).map(p => `<li><span>${esc(p.n)}</span><b>${fmt(p.v)}</b></li>`).join('')}</ul>
          <p class="mono svc__more">${s.prices.length} позиций в прайсе направления</p>` : `<p class="svc__note">${esc(s.short)}</p>`}
          <div class="svc__actions">
            <a class="btn btn--dark" href="${u(servicePath(s))}" data-route data-cursor="link"><span>Подробнее и цены</span>${ARROW}</a>
            <a class="btn btn--ghost" href="${CONTACT.tel}"><span>Записаться по телефону</span></a>
          </div>
        </div>
      </div>
    </div>
  </li>`;
  }).join('');
}

export const priceRow = (p: { n: string; v: number; slug: string; title: string }, i: number, q = '') => {
  const name = q ? highlight(p.n, q) : esc(p.n);
  return `
  <li class="price" data-value="${p.v}" data-order="${i}">
    <a class="price__row" href="${u(`/${p.slug}.html`)}" data-route>
      <span class="price__idx">${num(i)}</span>
      <span class="price__name">${name}</span>
      <span class="price__cat">${esc(p.title)}</span>
      <span class="price__leader" aria-hidden="true"></span>
      <span class="price__val">${fmt(p.v)}</span>
      <span class="price__chev" aria-hidden="true"></span>
    </a>
  </li>`;
};
const norm = (s: string) => s.toLowerCase().replace(/ё/g, 'е');
export function highlight(name: string, q: string) {
  const i = norm(name).indexOf(norm(q));
  if (i < 0 || !q) return esc(name);
  return `${esc(name.slice(0, i))}<mark>${esc(name.slice(i, i + q.length))}</mark>${esc(name.slice(i + q.length))}`;
}
export const renderPopularPrices = () => POPULAR.map((p, i) => priceRow(p, i)).join('');
export function renderPriceCats(): string {
  return [`<button type="button" class="chip is-active" data-cat="popular" aria-pressed="true">Популярное<sup>${POPULAR.length}</sup></button>`]
    .concat(SERVICES.filter(s => s.prices.length).map(s => `<button type="button" class="chip" data-cat="${s.slug}" aria-pressed="false">${esc(s.title)}<sup>${s.prices.length}</sup></button>`)).join('');
}

export function renderStory(): string {
  return STEPS.map((s, i) => `
    <figure class="story__shot" data-step="${i}">${img(s.img, s.alt, '', '(max-width: 1024px) 100vw, 50vw').replace('loading="lazy"', 'loading="eager"')}</figure>`).join('');
}
export function renderStoryText(): string {
  return STEPS.map(s => `
    <article class="story__step">
      <p class="story__kicker mono">Этап ${s.n} / 04</p>
      <h3 class="story__title">${s.title}</h3>
      <p class="story__text">${s.text}</p>
    </article>`).join('');
}

export function renderReviews(): string {
  return REVIEWS.map((r, i) => `
    <figure class="review" data-i="${i}">
      <blockquote><p>${esc(r.text)}</p></blockquote>
      <figcaption><span class="mono">${num(i)} / ${num(REVIEWS.length - 1)}</span>${esc(r.name)}</figcaption>
    </figure>`).join('');
}
export function renderGallery(): string {
  return GALLERY.map((g, i) => `<figure class="gal__item" data-cursor="drag"><div class="gal__img">${img(g.img, g.alt)}</div><figcaption class="mono">${num(i)} — ${esc(g.alt)}</figcaption></figure>`).join('');
}
export const renderUrgent = () => URGENT.map((t, i) => `<li><span class="urgent__n">${num(i)}</span><b>${t}</b></li>`).join('');
export function renderNewsTeasers(n = 4): string {
  return NEWS.slice(0, n).map((a, i) => newsRow(a, i)).join('');
}
const excerpt = (a: Article) => (a.body.find(b => b[0] === 'p')?.[1] ?? '').slice(0, 170).replace(/\s+\S*$/, '') + '…';
const newsRow = (a: Article, i: number) => `
  <li class="news-row">
    <a href="${u(articlePath(a))}" data-route data-cursor="view">
      <span class="mono news-row__n">${num(i)}</span>
      <span class="news-row__thumb">${a.cover ? img(a.cover, '', '', '120px') : ''}</span>
      <span class="news-row__t">${esc(a.title)}</span>
      <span class="news-row__x">${esc(excerpt(a))}</span>
      <span class="news-row__arrow">${ARROW}</span>
    </a>
  </li>`;

const FOOT_DIRS = ['hirurgiya', 'kardiologiya', 'travmatologiya', 'onkologiya-zhivotnykh-ramenskoe', 'rodentologiya', 'stacionar', 'stomatologiya', 'laboratoriya-vns'];
export function renderServiceFooterLinks(): string {
  return FOOT_DIRS.map(sl => SERVICES.find(s => s.slug === sl)!).map(s => `<li><a href="${u(servicePath(s))}" data-route>${esc(s.title)}</a></li>`).join('');
}

/* ---------------- Внутренние страницы ---------------- */

const crumbs = (items: [string, string?][]) =>
  `<nav class="sp__crumbs mono" aria-label="Хлебные крошки">${items.map(([t, href], i) =>
    (i ? '<span>/</span>' : '') + (href ? `<a href="${u(href)}" data-route>${esc(t)}</a>` : `<span aria-current="page">${esc(t)}</span>`)).join('')}</nav>`;

function renderBlock(b: Block, i: number): string {
  const body =
    (b.p ? b.p.map(x => `<p>${esc(x)}</p>`).join('') : '') +
    (b.list ? `<ul class="sp__list">${b.list.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '') +
    (b.cards ? `<dl class="sp__cards">${b.cards.map(([t, d]) => `<div><dt>${esc(t)}</dt><dd>${esc(d)}</dd></div>`).join('')}</dl>` : '') +
    (b.faq ? `<div class="sp__faq">${b.faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div>` : '');
  return `<section class="sp__block"><p class="mono">( ${num(i)} )</p><h2>${esc(b.h)}</h2>${body}</section>`;
}

const callAside = (title = 'Запись по телефону') => `
  <aside class="sp__price">
    <p class="mono">${title}</p>
    <p class="sp__price-val">${CONTACT.phone}</p>
    <p>Клиника работает ${CONTACT.hours.toLowerCase()}. Позвоните, опишите ситуацию администратору и уточните ближайшее удобное время приёма.</p>
    ${callBtn('Позвонить')}
    <p class="mono sp__hours">${CONTACT.address}</p>
  </aside>`;

export function renderServicePage(s: Service): string {
  const idx = SERVICES.indexOf(s);
  const next = SERVICES[(idx + 1) % SERVICES.length];
  const mp = minPrice(s);
  return `
  <article class="sp" data-slug="${s.slug}">
    <header class="sp__hero">
      ${crumbs([['Главная', '/'], ['Услуги и цены', '/uslugi-i-tseny.html'], [s.title]])}
      <p class="sp__num" aria-hidden="true">${num(idx)}</p>
      <p class="sp__kicker mono">${esc(s.kicker)}${mp ? ` · от ${fmt(mp)}` : ''}</p>
      <h1 class="sp__h1">${esc(s.h1)}</h1>
      <p class="sp__lead">${esc(s.lead)}</p>
      <figure class="sp__fig${s.img.startsWith('news/') ? ' sp__fig--small' : ''}">${img(s.img, s.title, '', '(max-width: 768px) 100vw, 40vw', true)}</figure>
    </header>
    <div class="sp__grid">
      <div class="sp__main">
        ${s.blocks.map(renderBlock).join('')}
        ${s.prices.length ? `
        <section class="sp-prices" data-sp-prices>
          <div class="sp-prices__head">
            <h2>Цены: ${esc(s.title.toLowerCase())}</h2>
            <label class="search"><span class="sr-only">Поиск по прайсу направления</span>
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="m16 16 4 4" stroke="currentColor" stroke-width="1.5"/></svg>
              <input type="search" placeholder="Поиск по ${s.prices.length} позициям" autocomplete="off">
            </label>
          </div>
          <table class="sp-table">
            <thead><tr><th>Услуга</th><th>Цена</th></tr></thead>
            <tbody>${s.prices.map(p => `<tr><td>${esc(p.n)}</td><td>${fmt(p.v)}</td></tr>`).join('')}</tbody>
          </table>
          <p class="sp-prices__empty" hidden>Ничего не найдено — уточните по телефону.</p>
          <p class="mono sp-prices__note">Цены из прайса клиники. Точную стоимость лечения врач называет после осмотра и согласования плана.</p>
        </section>` : `<section class="sp__block"><p class="mono">( ₽ )</p><h2>Стоимость</h2><p>Стоимость зависит от состояния животного, объёма помощи и необходимости дополнительных исследований. Конкретную сумму корректно обсуждать после осмотра — администратор подскажет порядок записи.</p></section>`}
      </div>
      ${callAside()}
    </div>
    <a class="sp__next" href="${u(servicePath(next))}" data-route data-cursor="link">
      <span class="mono">Следующее направление — ${num(SERVICES.indexOf(next))}</span>
      <span class="sp__next-title">${esc(next.title)} ${ARROW}</span>
    </a>
  </article>`;
}

export function renderArticlePage(a: Article): string {
  const i = NEWS.indexOf(a);
  const more = NEWS.filter(x => x !== a).slice(0, 3);
  const body = a.body.map(([k, t]) => (k === 'h' ? `<h2>${esc(t)}</h2>` : k === 'li' ? `<p class="sp__li">— ${esc(t)}</p>` : `<p>${esc(t)}</p>`)).join('');
  return `
  <article class="sp sp--article">
    <header class="sp__hero sp__hero--article">
      ${crumbs([['Главная', '/'], ['Новости', '/novosti.html'], [a.title]])}
      <p class="sp__kicker mono">Статья ${num(i)} · ${esc(a.date)}</p>
      <h1 class="sp__h1 sp__h1--article">${esc(a.title)}</h1>
      ${a.cover ? `<figure class="art__cover">${img(a.cover, a.title, '', '320px', true)}</figure>` : ''}
    </header>
    <div class="art__body">${body}</div>
    <section class="art__more">
      <p class="mono">Ещё статьи</p>
      <ul class="news-list">${more.map((x) => newsRow(x, NEWS.indexOf(x))).join('')}</ul>
    </section>
    <div class="art__cta"><p>Есть вопрос о здоровье питомца?</p>${callBtn()}</div>
  </article>`;
}

function infoHeader(p: InfoPage, n: string, lead: string) {
  return `<header class="sp__hero sp__hero--info">
      ${crumbs([['Главная', '/'], [p.title]])}
      <p class="sp__num" aria-hidden="true">${n}</p>
      <h1 class="sp__h1">${esc(p.h1)}</h1>
      <p class="sp__lead">${esc(lead)}</p>
    </header>`;
}

export function renderInfoPage(p: InfoPage): string {
  if (p.kind === 'about') return `
  <article class="sp">
    ${infoHeader(p, 'VNS', 'Лечение и реабилитация самых разнообразных животных в Раменском — круглосуточно.')}
    <div class="sp__grid"><div class="sp__main">
      ${ABOUT.map((t, i) => `<section class="sp__block"><p class="mono">( ${num(i)} )</p><p class="about__p">${esc(t)}</p></section>`).join('')}
      <div class="about__gal">${GALLERY.map(g => `<figure>${img(g.img, g.alt)}</figure>`).join('')}</div>
    </div>${callAside()}</div>
  </article>`;

  if (p.kind === 'contacts') return `
  <article class="sp">
    ${infoHeader(p, '24/7', 'Если питомцу нужна помощь, позвоните в клинику и уточните ближайшее удобное время приёма, подготовку к визиту и порядок действий в срочной ситуации.')}
    <div class="ct">
      <div class="ct__item"><p class="mono">Адрес</p><p class="ct__big">${CONTACT.address}</p><a class="btn btn--dark" href="${CONTACT.route}" target="_blank" rel="noopener"><span>Построить маршрут</span>${ARROW}</a></div>
      <div class="ct__item"><p class="mono">Телефон</p><a class="ct__big ct__phone" href="${CONTACT.tel}">${CONTACT.phone}</a>${callBtn('Позвонить')}</div>
      <div class="ct__item"><p class="mono">График работы</p><p class="ct__big">${CONTACT.hours}</p></div>
    </div>
    <section class="sp__block ct__tips"><p class="mono">( 01 )</p><h2>Что удобно уточнить перед визитом</h2><ul class="sp__list">${VISIT_TIPS.map(t => `<li>${t}</li>`).join('')}</ul></section>
    <div class="ct__map"><iframe src="https://yandex.ru/map-widget/v1/?um=constructor%3A12c6f83f62633c0e3e8d6a48d06744f5b1911b877c4178e68e373911f8e94fb7&amp;source=constructor" title="«Ветеринар на связи» на карте" loading="lazy"></iframe></div>
  </article>`;

  if (p.kind === 'catalog') return `
  <article class="sp">
    ${infoHeader(p, `${SERVICES.length}`, 'Все направления клиники. Откройте нужное, чтобы посмотреть подробности, цены и подготовиться к визиту.')}
    <div class="cat">${GROUPS.filter(g => g.id !== 'all').map(g => `
      <section class="cat__group"><h2 class="cat__h"><span class="mono">${g.label}</span></h2>
        <ul>${SERVICES.filter(s => s.group === g.id).map(s => `<li><a href="${u(servicePath(s))}" data-route data-cursor="view" data-img="${s.img}">
          <span class="cat__t">${esc(s.title)}</span><span class="cat__d">${esc(s.short)}</span><span class="cat__p">${minPrice(s) ? 'от ' + fmt(minPrice(s)) : s.kicker}</span></a></li>`).join('')}</ul>
      </section>`).join('')}
    </div>
  </article>`;

  if (p.kind === 'news') return `
  <article class="sp">
    ${infoHeader(p, `${NEWS.length}`, p.desc)}
    <ul class="news-list news-list--page">${NEWS.map(newsRow).join('')}</ul>
  </article>`;

  // vacancies
  return `
  <article class="sp">
    ${infoHeader(p, 'JOB', VACANCIES.intro)}
    <div class="vac__contacts">${VACANCIES.contacts.map(c => `<a href="${c.tel}" class="vac__c"><span class="mono">${c.name}</span><b>${c.phone}</b></a>`).join('')}</div>
    <div class="vac">${VACANCIES.roles.map((r, i) => `
      <details class="vac__role"${i === 0 ? ' open' : ''}><summary><span class="mono">${num(i)}</span>${esc(r.title)}</summary>
        <div class="vac__body">${r.sections.map(([h, items]) => `<div><p class="mono">${h}</p><ul class="sp__list">${items.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>`).join('')}</div>
      </details>`).join('')}
    </div>
  </article>`;
}

export function renderRoute(r: Route): string {
  if (r.kind === 'service') return renderServicePage(r.service);
  if (r.kind === 'article') return renderArticlePage(r.article);
  if (r.kind === 'info') return renderInfoPage(r.page);
  return '';
}

export function routeMeta(r: Route): { title: string; desc: string; path: string } {
  if (r.kind === 'service') return { title: `${r.service.h1} — «Ветеринар на связи»`, desc: r.service.lead, path: servicePath(r.service) };
  if (r.kind === 'article') return { title: `${r.article.title} — «Ветеринар на связи»`, desc: excerpt(r.article), path: articlePath(r.article) };
  if (r.kind === 'info') return { title: `${r.page.title} — ветеринарная клиника «Ветеринар на связи», Раменское`, desc: r.page.desc, path: r.page.path };
  return { title: '', desc: '', path: '/' };
}
export { PAGES };

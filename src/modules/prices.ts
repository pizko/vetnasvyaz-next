// 07 — Прайс как продуктовый интерфейс: живой поиск по всем 778 позициям клиники,
// фильтр по направлениям, сортировка, FLIP-анимации и подгрузка порциями.
import gsap from 'gsap';
import { Flip } from 'gsap/Flip';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ALL_PRICES, POPULAR } from '../data';
import { priceRow } from '../render';

const PAGE = 40;
const norm = (s: string) => s.toLowerCase().replace(/ё/g, 'е').trim();
const plural = (n: number) => {
  const m10 = n % 10, m100 = n % 100;
  return m10 === 1 && m100 !== 11 ? 'позиция' : m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20) ? 'позиции' : 'позиций';
};

export function initPrices() {
  const sec = document.querySelector<HTMLElement>('.prices');
  if (!sec) return;
  const list = sec.querySelector<HTMLElement>('.price-list')!;
  const input = sec.querySelector<HTMLInputElement>('.search input')!;
  const chips = [...sec.querySelectorAll<HTMLButtonElement>('.prices__cats .chip')];
  const sorts = [...sec.querySelectorAll<HTMLButtonElement>('.sort__btn')];
  const countEl = sec.querySelector<HTMLElement>('.prices__count')!;
  const more = sec.querySelector<HTMLButtonElement>('.prices__more')!;
  const empty = sec.querySelector<HTMLElement>('.prices__empty')!;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let cat = 'popular', sort = 'order', q = '', shown = PAGE;

  const current = () => {
    const qq = norm(q);
    let rows = qq ? ALL_PRICES.filter(p => norm(p.n).includes(qq) || norm(p.title).includes(qq))
      : cat === 'popular' ? POPULAR : ALL_PRICES.filter(p => p.slug === cat);
    if (qq && cat !== 'popular') rows = rows.filter(p => p.slug === cat);
    if (qq && sort === 'order') {
      // релевантность: совпадение с начала слова > название направления > совпадение внутри слова
      const re = new RegExp(`(^|[^а-яa-z0-9])${qq.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
      const score = (p: typeof rows[number]) => (re.test(norm(p.n)) ? 0 : norm(p.title).includes(qq) ? 1 : 2);
      rows = rows.map((p, i) => ({ p, i, s: score(p) })).sort((a, b) => a.s - b.s || a.i - b.i).map(x => x.p);
    }
    if (sort !== 'order') rows = [...rows].sort((a, b) => (sort === 'asc' ? a.v - b.v : b.v - a.v));
    return rows;
  };

  const render = (animate = true) => {
    const rows = current();
    const state = animate && !reduce ? Flip.getState(list.children) : null;
    list.innerHTML = rows.slice(0, shown).map((p, i) => priceRow(p, i, q.trim())).join('');
    countEl.innerHTML = `<b>${rows.length}</b> ${plural(rows.length)}${q ? ` по запросу «${q.replace(/</g, '')}»` : ''}`;
    more.hidden = rows.length <= shown;
    if (!more.hidden) more.querySelector('span')!.textContent = `Показать ещё (${rows.length - shown})`;
    empty.hidden = rows.length > 0;
    if (state) {
      Flip.from(state, { duration: .6, ease: 'expo.out', absolute: false, onComplete: () => ScrollTrigger.refresh() });
      gsap.from(list.children, { opacity: 0, y: 20, duration: .5, stagger: .012, ease: 'expo.out' });
    } else ScrollTrigger.refresh();
  };

  let to = 0;
  input.addEventListener('input', () => { clearTimeout(to); to = window.setTimeout(() => { q = input.value; shown = PAGE; render(); }, 140); });
  chips.forEach(c => c.addEventListener('click', () => {
    cat = c.dataset.cat!; shown = PAGE;
    chips.forEach(x => { x.classList.toggle('is-active', x === c); x.setAttribute('aria-pressed', String(x === c)); });
    c.scrollIntoView({ block: 'nearest', inline: 'center', behavior: reduce ? 'auto' : 'smooth' });
    render();
  }));
  sorts.forEach(s => s.addEventListener('click', () => {
    sort = s.dataset.sort!;
    sorts.forEach(x => { x.classList.toggle('is-active', x === s); x.setAttribute('aria-pressed', String(x === s)); });
    render();
  }));
  more.addEventListener('click', () => {
    const from = shown; shown += PAGE * 2;
    const rows = current();
    list.insertAdjacentHTML('beforeend', rows.slice(from, shown).map((p, i) => priceRow(p, from + i, q.trim())).join(''));
    gsap.from([...list.children].slice(from), { opacity: 0, y: 24, duration: .6, stagger: .015, ease: 'expo.out' });
    more.hidden = rows.length <= shown;
    if (!more.hidden) more.querySelector('span')!.textContent = `Показать ещё (${rows.length - shown})`;
    ScrollTrigger.refresh();
  });
  sec.querySelector('[data-reset-prices]')!.addEventListener('click', () => {
    input.value = ''; q = ''; cat = 'popular'; shown = PAGE;
    chips.forEach((x, i) => { x.classList.toggle('is-active', i === 0); x.setAttribute('aria-pressed', String(i === 0)); });
    render();
    input.focus();
  });
}

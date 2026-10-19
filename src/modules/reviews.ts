// 10 — Отзывы: одна большая цитата на экране, смена с раскрытием маской, автопрокрутка с паузой при наведении,
// стрелки, свайп и клавиатура.
import gsap from 'gsap';

export function initReviews(reduce: boolean) {
  const sec = document.querySelector<HTMLElement>('.reviews');
  if (!sec) return;
  const items = [...sec.querySelectorAll<HTMLElement>('.review')];
  const dotsBox = sec.querySelector<HTMLElement>('.reviews__dots')!;
  const stage = sec.querySelector<HTMLElement>('.reviews__stage')!;
  if (!items.length) return;
  dotsBox.innerHTML = items.map(() => '<i></i>').join('');
  const dots = [...dotsBox.children] as HTMLElement[];
  let cur = 0, timer = 0, hover = false;

  const show = (n: number, dir = 1) => {
    const prev = items[cur];
    cur = (n + items.length) % items.length;
    const next = items[cur];
    dots.forEach((d, i) => d.classList.toggle('is-on', i === cur));
    if (prev === next) { next.classList.add('is-on'); return; }
    prev.classList.remove('is-on');
    next.classList.add('is-on');
    if (reduce) return;
    // сначала уходит старая цитата, затем собирается новая — тексты не накладываются
    gsap.killTweensOf([prev, next]);
    gsap.to(prev, { opacity: 0, x: -40 * dir, duration: .35, ease: 'power2.in' });
    gsap.fromTo(next, { opacity: 0, x: 30 * dir }, { opacity: 1, x: 0, duration: .8, delay: .3, ease: 'expo.out' });
    // цитата целиком проявляется маской снизу вверх (курсив не разбиваем на слова — так не ломаются пробелы)
    gsap.fromTo(next.querySelector('p'), { clipPath: 'inset(0 0 100% 0)', y: 30 }, { clipPath: 'inset(0 0 -10% 0)', y: 0, duration: 1.1, delay: .3, ease: 'expo.out' });
  };
  const auto = () => { clearInterval(timer); if (!reduce) timer = window.setInterval(() => !hover && !document.hidden && show(cur + 1), 7000); };

  sec.querySelectorAll<HTMLButtonElement>('.reviews__btn').forEach(b => b.addEventListener('click', () => { show(cur + +b.dataset.dir!, +b.dataset.dir!); auto(); }));
  stage.addEventListener('pointerenter', () => (hover = true));
  stage.addEventListener('pointerleave', () => (hover = false));
  let sx = 0;
  stage.addEventListener('pointerdown', e => (sx = e.clientX));
  stage.addEventListener('pointerup', e => { const d = e.clientX - sx; if (Math.abs(d) > 50) { show(cur + (d < 0 ? 1 : -1), d < 0 ? 1 : -1); auto(); } });
  sec.addEventListener('keydown', e => { if (e.key === 'ArrowRight') show(cur + 1, 1); if (e.key === 'ArrowLeft') show(cur - 1, -1); });
  items.forEach((it, i) => i && gsap.set(it, { opacity: 0 }));
  show(0);
  auto();
}

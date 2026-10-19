// 09 — Фотогалерея клиники: закреплённая сцена с горизонтальным ходом ленты по скроллу,
// параллаксом кадров внутри рамок и перетаскиванием на сенсорных экранах.
import gsap from 'gsap';

export function initGallery(reduce: boolean) {
  const sec = document.querySelector<HTMLElement>('.gal');
  if (!sec) return;
  const pin = sec.querySelector<HTMLElement>('.gal__pin')!;
  const track = sec.querySelector<HTMLElement>('.gal__track')!;
  const items = [...track.querySelectorAll<HTMLElement>('.gal__item')];
  if (reduce || matchMedia('(max-width: 767px)').matches) {
    // на телефоне — нативная горизонтальная прокрутка со snap
    sec.classList.add('gal--native');
    return;
  }
  const dist = () => Math.max(0, track.scrollWidth - innerWidth + 40);
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { trigger: sec, start: 'top top', end: () => '+=' + dist(), pin, scrub: .8, invalidateOnRefresh: true, anticipatePin: 1 },
  });
  tl.to(track, { x: () => -dist(), duration: 1 }, 0);
  items.forEach((it, i) => {
    const img = it.querySelector('img');
    tl.fromTo(img, { xPercent: -12 }, { xPercent: 12, duration: 1 }, 0);
    tl.fromTo(it, { y: i % 2 ? 60 : -30, rotate: i % 2 ? 1.5 : -1.5 }, { y: i % 2 ? -40 : 30, rotate: 0, duration: 1 }, 0);
  });
}

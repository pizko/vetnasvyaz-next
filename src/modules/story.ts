// 04 — «История одного вызова»: закреплённая сцена, которой управляет скролл.
// Маски кадров, перспективные трансформации, кинетическая типографика, счётчик-барабан, смена палитры.
import gsap from 'gsap';
import { SplitText } from 'gsap/SplitText';

const PALETTE = [
  { bg: '#F4F1E9', fg: '#161B1C' },
  { bg: '#DDE4DC', fg: '#161B1C' },
  { bg: '#161B1C', fg: '#F4F1E9' },
  { bg: '#F4F1E9', fg: '#161B1C' },
];

export function initStory() {
  const sec = document.querySelector<HTMLElement>('.story');
  if (!sec) return;
  const pin = sec.querySelector<HTMLElement>('.story__pin')!;
  const shots = [...sec.querySelectorAll<HTMLElement>('.story__shot')];
  const steps = [...sec.querySelectorAll<HTMLElement>('.story__step')];
  const bars = [...sec.querySelectorAll<HTMLElement>('.story__progress i')];
  const digits = sec.querySelector<HTMLElement>('.story__digits')!;

  const titles = steps.map(s => new SplitText(s.querySelector('.story__title'), { type: 'words,chars', charsClass: 'ch' }));
  steps.forEach((s, i) => { if (i) gsap.set(s, { autoAlpha: 0 }); });
  gsap.set(shots.slice(1), { clipPath: 'inset(100% 0% 0% 0%)' });

  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: sec, start: 'top top', end: () => '+=' + window.innerHeight * 3.2,
      pin, scrub: .8, anticipatePin: 1, invalidateOnRefresh: true,
      onUpdate: self => {
        const p = self.progress * 4;
        bars.forEach((b, i) => b.style.setProperty('--p', String(Math.min(1, Math.max(0, p - i)))));
      },
    },
  });

  for (let i = 1; i < steps.length; i++) {
    const at = i - 1 + .35; // каждый шаг занимает 1 единицу таймлайна, переход — в середине
    const prev = steps[i - 1], next = steps[i];
    const prevShot = shots[i - 1], nextShot = shots[i];
    // палитра
    tl.to(sec, { '--sbg': PALETTE[i].bg, '--sfg': PALETTE[i].fg, duration: .5 }, at);
    // текст: старый уходит вверх с наклоном, новый собирается по буквам
    tl.to(titles[i - 1].chars, { yPercent: -110, rotate: -8, opacity: 0, stagger: .012, duration: .3, ease: 'power2.in' }, at);
    tl.to(prev.querySelectorAll('.story__text, .story__kicker'), { y: -30, opacity: 0, duration: .25 }, at);
    tl.set(prev, { autoAlpha: 0 }, at + .32);
    tl.set(next, { autoAlpha: 1 }, at + .3);
    tl.fromTo(titles[i].chars, { yPercent: 120, rotate: 10, opacity: 0 }, { yPercent: 0, rotate: 0, opacity: 1, stagger: .015, duration: .35, ease: 'power3.out' }, at + .3);
    tl.fromTo(next.querySelectorAll('.story__text, .story__kicker'), { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: .3, ease: 'power2.out' }, at + .38);
    // кадр: старый уходит в глубину, новый вырастает маской снизу с перспективой
    tl.to(prevShot, { scale: .86, rotateX: 8, filter: 'brightness(.45)', duration: .6, ease: 'power2.inOut' }, at);
    tl.fromTo(nextShot, { clipPath: 'inset(100% 0% 0% 0%)', rotateX: -14, y: 60 }, { clipPath: 'inset(0% 0% 0% 0%)', rotateX: 0, y: 0, duration: .6, ease: 'power3.inOut' }, at);
    tl.fromTo(nextShot.querySelector('img'), { scale: 1.35, yPercent: 8 }, { scale: 1.02, yPercent: 0, duration: .8, ease: 'power2.out' }, at);
    // счётчик-барабан
    tl.to(digits, { yPercent: -25 * i, duration: .45, ease: 'power3.inOut' }, at);
  }
  tl.to({}, { duration: .35 }); // финальная пауза на последнем шаге
}

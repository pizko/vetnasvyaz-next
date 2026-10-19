// Сцены второго плана: editorial-параллакс, «пульс» срочной секции, финальный кадр, футер.
import gsap from 'gsap';

export function initScenes() {
  // 08 — Editorial: фото раскрывается шторкой и живёт своим параллаксом
  const ed = document.querySelector<HTMLElement>('.edit__img');
  if (ed) {
    gsap.fromTo(ed, { clipPath: 'inset(30% 12% 30% 12%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'none', scrollTrigger: { trigger: ed, start: 'top 95%', end: 'top 30%', scrub: true } });
    gsap.fromTo(ed.querySelector('img'), { yPercent: -12, scale: 1.25 }, { yPercent: 0, scale: 1, ease: 'none', scrollTrigger: { trigger: ed, start: 'top bottom', end: 'bottom top', scrub: true } });
  }
  gsap.utils.toArray<HTMLElement>('.edit__l').forEach((l, i) => {
    gsap.to(l, { xPercent: i % 2 ? -4 : 4, ease: 'none', scrollTrigger: { trigger: l, start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  // 09 — Срочно: линия «пульса» прорисовывается скроллом, цифры загораются по очереди
  const path = document.querySelector<SVGPathElement>('.urgent__line path');
  if (path) {
    const len = path.getTotalLength();
    gsap.fromTo(path, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, ease: 'none', scrollTrigger: { trigger: path, start: 'top 85%', end: 'top 35%', scrub: true } });
  }
  const signs = gsap.utils.toArray<HTMLElement>('.urgent__signs li');
  signs.forEach((li, i) => {
    gsap.from(li, { y: 60, opacity: 0, duration: 1.2, delay: i * .08, ease: 'expo.out', scrollTrigger: { trigger: '.urgent__signs', start: 'top 85%', once: true } });
  });
  gsap.timeline({ scrollTrigger: { trigger: '.urgent__signs', start: 'top 70%', end: 'bottom 40%', scrub: true,
    onUpdate: s => signs.forEach((li, i) => li.classList.toggle('is-lit', s.progress > i / signs.length)) } });

  // 10 — Финал: кадр приближается, заголовок поднимается из глубины
  const fin = document.querySelector<HTMLElement>('.final__img img');
  if (fin) gsap.fromTo(fin, { scale: 1.3, yPercent: -6 }, { scale: 1, yPercent: 0, ease: 'none', scrollTrigger: { trigger: '.final', start: 'top bottom', end: 'bottom bottom', scrub: true } });

  // Футер: гигантский знак собирается из-под линии
  const mark = gsap.utils.toArray<HTMLElement>('.ftr__mark span');
  gsap.from(mark, { yPercent: 70, opacity: 0, stagger: .1, ease: 'none', scrollTrigger: { trigger: '.ftr', start: 'top 90%', end: 'bottom bottom', scrub: true } });

  // Манифест: факты проявляются каскадом
  gsap.from('.manifest__facts li', { y: 40, opacity: 0, duration: 1.2, stagger: .08, ease: 'expo.out', scrollTrigger: { trigger: '.manifest__facts', start: 'top 90%', once: true } });

  // Строки услуг «въезжают» при появлении
  gsap.from('.svc', { y: 50, opacity: 0, duration: 1.2, stagger: .06, ease: 'expo.out', scrollTrigger: { trigger: '.svc-list', start: 'top 85%', once: true } });
}

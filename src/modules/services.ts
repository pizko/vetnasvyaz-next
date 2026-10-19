// 03 — Каталог услуг: строки-аккордеон + плавающее WebGL-превью у курсора,
// которое искажается волной и RGB-сдвигом пропорционально скорости движения.
import gsap from 'gsap';
import { imgSrc } from '../render';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Flip } from 'gsap/Flip';
import { createGL, makeProgram, loadTexture, resize, NOISE, lowPower, type Tex } from '../gl/gl';

const FS = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D t0, t1;
uniform vec2 res, s0, s1, vel;
uniform float mixP, time, reveal;
${NOISE}
void main(){
  vec2 uv = vUv;
  float speed = clamp(length(vel), 0., 1.);
  // волна, ориентированная по направлению движения
  float wave = sin(uv.y * 9. + time * 3.) * .5 + sin(uv.x * 7. - time * 2.) * .5;
  vec2 off = vel * .09 * (.6 + .4 * wave) * smoothstep(0., 1., 1. - abs(uv.y - .5) * 1.4);
  // раскрытие маской снизу вверх с шумовым краем
  float n = snoise(uv * 4. + time * .3) * .06;
  float rv = smoothstep(reveal - .02, reveal + .02, 1. - uv.y + n);
  vec2 u0 = coverUv((uv - .5) * (1. - .08 * reveal) + .5 + off, res, s0, vec2(.5));
  vec2 u1 = coverUv((uv - .5) * (1. - .08 * reveal) + .5 + off, res, s1, vec2(.5));
  float ca = speed * .03;
  vec3 a = vec3(texture2D(t0, u0 + vel * ca).r, texture2D(t0, u0).g, texture2D(t0, u0 - vel * ca).b);
  vec3 b = vec3(texture2D(t1, u1 + vel * ca).r, texture2D(t1, u1).g, texture2D(t1, u1 - vel * ca).b);
  float m = smoothstep(mixP - .15, mixP + .15, uv.y + snoise(uv * 3.) * .1);
  vec3 col = mix(a, b, 1. - m);
  gl_FragColor = vec4(col, 1.) * (1. - rv);
}`;

export function initServices() {
  const list = document.querySelector<HTMLElement>('.svc-list');
  if (!list) return;
  const items = [...list.querySelectorAll<HTMLElement>('.svc')];

  // --- Фильтр по группам направлений (FLIP-перестроение списка) ---
  const chips = [...document.querySelectorAll<HTMLButtonElement>('.services__filter .chip')];
  chips.forEach(c => c.addEventListener('click', () => {
    const g = c.dataset.group!;
    chips.forEach(x => { x.classList.toggle('is-active', x === c); x.setAttribute('aria-pressed', String(x === c)); });
    const state = Flip.getState(items);
    let n = 0;
    items.forEach(it => {
      const ok = g === 'all' || it.dataset.group === g;
      it.hidden = !ok;
      if (ok) it.querySelector('.svc__num')!.textContent = String(++n).padStart(2, '0');
    });
    Flip.from(state, { duration: .7, ease: 'expo.out', stagger: .02, onEnter: els => gsap.fromTo(els, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: .6, stagger: .03 }), onComplete: () => ScrollTrigger.refresh() });
  }));

  // --- Аккордеон ---
  const close = (it: HTMLElement) => {
    const btn = it.querySelector<HTMLButtonElement>('.svc__head')!;
    const panel = it.querySelector<HTMLElement>('.svc__panel')!;
    if (panel.hidden) return;
    btn.setAttribute('aria-expanded', 'false');
    it.classList.remove('is-open');
    gsap.to(panel, { height: 0, duration: .7, ease: 'expo.inOut', onComplete: () => { panel.hidden = true; panel.style.height = ''; ScrollTrigger.refresh(); } });
  };
  const open = (it: HTMLElement) => {
    const btn = it.querySelector<HTMLButtonElement>('.svc__head')!;
    const panel = it.querySelector<HTMLElement>('.svc__panel')!;
    panel.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    it.classList.add('is-open');
    const h = panel.scrollHeight;
    gsap.fromTo(panel, { height: 0 }, { height: h, duration: .9, ease: 'expo.inOut', onComplete: () => { panel.style.height = 'auto'; ScrollTrigger.refresh(); } });
    const inner = panel.querySelectorAll('.svc__fig, .svc__lead, .svc__dl > div, .svc__actions');
    gsap.fromTo(inner, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 1, stagger: .06, delay: .2, ease: 'expo.out' });
    gsap.fromTo(panel.querySelector('.svc__fig img'), { scale: 1.3 }, { scale: 1, duration: 1.4, ease: 'expo.out' });
  };
  items.forEach(it => {
    it.querySelector('.svc__head')!.addEventListener('click', () => {
      const isOpen = it.classList.contains('is-open');
      items.forEach(o => o !== it && close(o));
      isOpen ? close(it) : open(it);
      preview.hide();
    });
  });

  // --- Плавающее превью ---
  const canvas = document.querySelector<HTMLCanvasElement>('.svc-preview')!;
  const preview = { hide: () => {} };
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (!fine || lowPower()) return;
  const ctx = createGL(canvas, 1.5);
  if (!ctx) return;
  const { gl } = ctx;
  let prog: ReturnType<typeof makeProgram>;
  try { prog = makeProgram(gl, FS); } catch (e) { console.warn(e); return; }
  const { u } = prog;
  gl.uniform1i(u('t0'), 0); gl.uniform1i(u('t1'), 1);

  const tex = new Map<string, Promise<Tex>>();
  const get = (name: string) => { if (!tex.has(name)) tex.set(name, loadTexture(gl, imgSrc(name))); return tex.get(name)!; };
  const st = { x: 0, y: 0, tx: 0, ty: 0, vx: 0, vy: 0, reveal: 1, mix: 0, active: false };
  let cur: Tex | null = null, next: Tex | null = null, raf = 0, curName = '';

  const bind = () => {
    if (!cur) return;
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, cur.tex); gl.uniform2f(u('s0'), cur.w, cur.h);
    const n = next || cur;
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, n.tex); gl.uniform2f(u('s1'), n.w, n.h);
  };
  const show = async (name: string) => {
    if (name === curName) return;
    curName = name;
    const t = await get(name);
    if (curName !== name) return;
    if (!cur || st.reveal > .9) { cur = t; next = null; st.mix = 0; bind(); }
    else {
      next = t; bind(); st.mix = 0;
      gsap.to(st, { mix: 1, duration: .6, ease: 'power3.out', onComplete: () => { cur = t; next = null; st.mix = 0; bind(); } });
    }
    st.active = true;
    canvas.classList.add('is-on');
    gsap.to(st, { reveal: 0, duration: .9, ease: 'expo.out' });
    start();
  };
  preview.hide = () => {
    st.active = false; curName = '';
    gsap.to(st, { reveal: 1, duration: .6, ease: 'power3.in', onComplete: () => canvas.classList.remove('is-on') });
  };

  const W = () => canvas.offsetWidth, H = () => canvas.offsetHeight;
  window.addEventListener('pointermove', e => { st.tx = e.clientX; st.ty = e.clientY; }, { passive: true });
  items.forEach(it => {
    const head = it.querySelector<HTMLElement>('.svc__head')!;
    head.addEventListener('pointerenter', () => { if (!it.classList.contains('is-open')) show(it.dataset.img!); });
    head.addEventListener('pointerleave', () => preview.hide());
  });
  window.addEventListener('scroll', () => { if (st.active && !list.matches(':hover')) preview.hide(); }, { passive: true });

  const frame = (t: number) => {
    const px = st.x, py = st.y;
    st.x += (st.tx - st.x) * .14; st.y += (st.ty - st.y) * .14;
    st.vx += (((st.x - px) / 40) - st.vx) * .2; st.vy += (((st.y - py) / 40) - st.vy) * .2;
    const vx = Math.max(-1, Math.min(1, st.vx)), vy = Math.max(-1, Math.min(1, st.vy));
    // превью держится справа от курсора и чуть наклоняется по скорости
    const px0 = st.x + 40 + W() > innerWidth - 20 ? st.x - W() - 40 : st.x + 40; // у правого края превью уходит влево
    canvas.style.transform = `translate3d(${px0}px, ${Math.min(innerHeight - H() - 10, Math.max(10, st.y - H() / 2))}px, 0) rotate(${vx * 6}deg)`;
    const [w, h] = resize(ctx);
    gl.uniform2f(u('res'), w, h);
    gl.uniform2f(u('vel'), vx, -vy);
    gl.uniform1f(u('time'), t / 1000);
    gl.uniform1f(u('reveal'), st.reveal);
    gl.uniform1f(u('mixP'), st.mix * 1.4 - .2);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    if (st.active || st.reveal < 1) raf = requestAnimationFrame(frame); else raf = 0;
  };
  const start = () => { if (!raf) { st.x = st.tx; st.y = st.ty; raf = requestAnimationFrame(frame); } };
}

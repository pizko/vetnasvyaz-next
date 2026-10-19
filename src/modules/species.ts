// 02 — Переключатель «Кошки / Собаки»: шейдерный переход-растворение с displacement,
// перетаскивание (drag/swipe) управляет прогрессом перехода напрямую.
import gsap from 'gsap';
import { u as withBase } from '../data';
import { createGL, makeProgram, loadTexture, resize, visibleLoop, NOISE, type Tex } from '../gl/gl';

const FS = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D t0, t1;
uniform vec2 res, s0, s1, f0, f1, mouse;
uniform float progress, time, energy;
${NOISE}
void main(){
  vec2 uv = vUv;
  // «дыхание» кадра: у кошки медленнее, у собаки — живее
  float breath = sin(time * mix(.6, 1.4, energy)) * .006;
  vec2 m = mouse * .012;
  float n = fbm(uv * 2.4 + vec2(time * .04, 0.));
  float edge = progress * 1.9 - .6;
  float d = uv.x * .55 + n * .45;
  float mask = smoothstep(edge - .18, edge + .18, d);       // 1 = старое, 0 = новое
  float band = 1. - abs(mask - .5) * 2.;                    // зона фронта перехода
  vec2 disp = vec2(n, fbm(uv * 2.4 + 7.)) * .16;
  vec2 uv0 = coverUv((uv - .5) * (1. - breath - progress * .08) + .5 + m + disp * (1. - mask) , res, s0, f0);
  vec2 uv1 = coverUv((uv - .5) * (1.08 - breath - progress * .08) + .5 + m - disp * mask, res, s1, f1);
  float ca = band * .012;
  vec4 a = vec4(texture2D(t0, uv0 + vec2(ca, 0.)).r, texture2D(t0, uv0).g, texture2D(t0, uv0 - vec2(ca, 0.)).b, 1.);
  vec4 b = vec4(texture2D(t1, uv1 + vec2(ca, 0.)).r, texture2D(t1, uv1).g, texture2D(t1, uv1 - vec2(ca, 0.)).b, 1.);
  vec4 col = mix(b, a, mask);
  col.rgb += vec3(.80, .95, .42) * pow(band, 6.) * .35;     // тонкая лаймовая кромка
  // мягкая виньетка
  float v = smoothstep(1.2, .35, length(uv - .5));
  col.rgb *= mix(.72, 1., v);
  gl_FragColor = col;
}`;

export function initSpecies() {
  const sec = document.querySelector<HTMLElement>('.species');
  if (!sec) return;
  const canvas = sec.querySelector<HTMLCanvasElement>('.species__gl')!;
  const visual = sec.querySelector<HTMLElement>('.species__visual')!;
  const opts = [...sec.querySelectorAll<HTMLButtonElement>('.sw-opt')];
  const track = sec.querySelector<HTMLElement>('.sw-track')!;
  const marquee = sec.querySelector<HTMLElement>('.species__track')!;
  const panes = [...sec.querySelectorAll<HTMLElement>('.species__pane')];

  let mode: 'cat' | 'dog' = 'cat';
  // progress: 0 = кошка, 1 = собака
  const state = { p: 0, energy: 0, drag: 0 };
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };

  // Бегущая строка: темп зависит от режима
  const mq = gsap.to(marquee, { xPercent: -50, duration: 60, ease: 'none', repeat: -1, paused: matchMedia('(prefers-reduced-motion: reduce)').matches });

  const setMode = (m: 'cat' | 'dog', fromDrag = false) => {
    if (m === mode && !fromDrag) return;
    const changed = m !== mode;
    mode = m;
    sec.dataset.mode = m;
    opts.forEach(o => { const on = o.dataset.mode === m; o.classList.toggle('is-active', on); o.setAttribute('aria-checked', String(on)); });
    gsap.to(state, { p: m === 'dog' ? 1 : 0, energy: m === 'dog' ? 1 : 0, duration: 1.6, ease: 'power3.inOut', onUpdate: () => loop?.wake() });
    gsap.to(mq, { timeScale: m === 'dog' ? 2.6 : 1, duration: 1.2 });
    const label = m === 'dog' ? 'Собаки · Собаки · Собаки · Собаки · ' : 'Кошки · Кошки · Кошки · Кошки · ';
    if (!changed) return;
    // Смена текста: уход вверх, появление снизу
    const out = panes.find(p => !p.hidden)!;
    const inn = panes.find(p => p.dataset.pane === m)!;
    gsap.to(out.children, {
      y: -24, opacity: 0, duration: .45, stagger: .04, ease: 'power2.in',
      onComplete: () => {
        out.hidden = true; inn.hidden = false;
        gsap.fromTo(inn.children, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: .9, stagger: .07, ease: 'expo.out' });
        gsap.fromTo(inn.querySelectorAll('li'), { x: m === 'dog' ? 40 : -20 }, { x: 0, duration: m === 'dog' ? .7 : 1.3, stagger: m === 'dog' ? .05 : .09, ease: m === 'dog' ? 'back.out(1.6)' : 'expo.out' });
        marquee.querySelectorAll('span').forEach(s => (s.textContent = label));
      },
    });
  };

  opts.forEach(o => o.addEventListener('click', () => setMode(o.dataset.mode as 'cat' | 'dog')));
  track.addEventListener('click', () => setMode(mode === 'cat' ? 'dog' : 'cat'));

  // Drag / swipe по изображению: прогресс перехода следует за пальцем
  let startX = 0, dragging = false, base = 0;
  visual.addEventListener('pointerdown', e => {
    dragging = true; startX = e.clientX; base = state.p;
    gsap.killTweensOf(state, 'p');
    visual.setPointerCapture(e.pointerId);
    document.documentElement.classList.add('is-dragging');
  });
  visual.addEventListener('pointermove', e => {
    const r = visual.getBoundingClientRect();
    mouse.tx = ((e.clientX - r.left) / r.width - .5) * 2;
    mouse.ty = ((e.clientY - r.top) / r.height - .5) * -2;
    if (dragging) {
      const dx = (startX - e.clientX) / r.width;
      state.p = Math.min(1, Math.max(0, base + dx * 1.4));
    }
    loop?.wake();
  });
  const end = (e: PointerEvent) => {
    if (!dragging) return;
    dragging = false;
    document.documentElement.classList.remove('is-dragging');
    const moved = Math.abs(e.clientX - startX) > 8;
    if (!moved) { setMode(mode === 'cat' ? 'dog' : 'cat'); return; }
    setMode(state.p > .5 ? 'dog' : 'cat', true);
  };
  visual.addEventListener('pointerup', end);
  visual.addEventListener('pointercancel', end);
  visual.addEventListener('pointerleave', () => { mouse.tx = 0; mouse.ty = 0; });

  // Клавиатура: стрелки в radiogroup
  sec.querySelector('.species__switch')!.addEventListener('keydown', e => {
    const k = (e as KeyboardEvent).key;
    if (k === 'ArrowRight' || k === 'ArrowLeft') {
      e.preventDefault();
      const m = k === 'ArrowRight' ? 'dog' : 'cat';
      setMode(m);
      opts.find(o => o.dataset.mode === m)?.focus();
    }
  });

  // WebGL
  const ctx = createGL(canvas, 1.75);
  let loop: ReturnType<typeof visibleLoop> | null = null;
  if (!ctx) return;
  const { gl } = ctx;
  let prog: ReturnType<typeof makeProgram>;
  try { prog = makeProgram(gl, FS); } catch (err) { console.warn(err); return; }
  Promise.all([
    loadTexture(gl, withBase('/img/vns/cat-hug.webp')),
    loadTexture(gl, withBase('/img/vns/team-shepherd.webp')),
  ]).then(([cat, dog]: Tex[]) => {
    sec.classList.add('has-gl');
    const { u } = prog;
    gl.uniform1i(u('t0'), 0); gl.uniform1i(u('t1'), 1);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, cat.tex);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, dog.tex);
    gl.uniform2f(u('s0'), cat.w, cat.h); gl.uniform2f(u('s1'), dog.w, dog.h);
    gl.uniform2f(u('f0'), .5, 1 - .42); gl.uniform2f(u('f1'), .5, 1 - .55);
    loop = visibleLoop(visual, t => {
      const [w, h] = resize(ctx);
      mouse.x += (mouse.tx - mouse.x) * .06; mouse.y += (mouse.ty - mouse.y) * .06;
      gl.uniform2f(u('res'), w, h);
      gl.uniform2f(u('mouse'), mouse.x, mouse.y);
      gl.uniform1f(u('progress'), state.p);
      gl.uniform1f(u('energy'), state.energy);
      gl.uniform1f(u('time'), t / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    });
  }).catch(() => sec.classList.remove('has-gl'));
}

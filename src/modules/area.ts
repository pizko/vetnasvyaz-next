// 06 — «Мы рядом»: шейдерная топография (изолинии из fbm-шума) + условная схема районов
// как диаграмма Вороного. Никаких координат, расстояний и времени прибытия.
import gsap from 'gsap';
import { createGL, makeProgram, resize, visibleLoop, NOISE, lowPower } from '../gl/gl';

const FS = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform vec2 res, mouse;
uniform float time;
${NOISE}
void main(){
  vec2 uv = vUv; vec2 p = uv * vec2(res.x / res.y, 1.) * 1.6;
  float h = fbm(p + vec2(time * .015, time * .01));
  float d = distance(uv, mouse);
  h += .12 * exp(-d * d * 18.);                         // курсор «приподнимает» рельеф
  float lines = abs(fract(h * 9.) - .5);
  float w = fwidth(h * 9.);
  float iso = 1. - smoothstep(0., w * 1.4, lines);
  float major = 1. - smoothstep(0., w * 1.6, abs(fract(h * 1.8) - .5));
  float glow = exp(-d * d * 14.);
  vec3 col = vec3(.957, .945, .914) * iso * (.06 + .1 * glow) + vec3(.8, .95, .42) * major * .05 * (1. + glow * 2.);
  col += vec3(.8, .95, .42) * iso * glow * .14;
  gl_FragColor = vec4(col, 1.);
}`;

// Схема охвата (условная, без масштаба): клиника в центре, кольца — Раменское, район и ближайшие города.
const ZONES = [
  { r: 95, name: 'Раменское', note: 'клиника на Красноармейской, 13Б' },
  { r: 190, name: 'Раменский район', note: 'пациенты со всего района' },
  { r: 290, name: 'Близлежащие города', note: 'приезжают и из соседних городов' },
];

export function initArea() {
  const sec = document.querySelector<HTMLElement>('.area');
  if (!sec) return;
  const svg = sec.querySelector<SVGSVGElement>('.area__svg')!;
  const NS = 'http://www.w3.org/2000/svg';
  const cx = 400, cy = 340;
  const g = document.createElementNS(NS, 'g');
  svg.append(g);
  // радиальные «улицы» — декоративная сетка схемы
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + .13;
    const l = document.createElementNS(NS, 'line');
    l.setAttribute('x1', String(cx + Math.cos(a) * 40)); l.setAttribute('y1', String(cy + Math.sin(a) * 40));
    l.setAttribute('x2', String(cx + Math.cos(a) * 330)); l.setAttribute('y2', String(cy + Math.sin(a) * 330));
    l.setAttribute('class', 'mk-line');
    g.append(l);
  }
  const rings = ZONES.map((z, i) => {
    const c = document.createElementNS(NS, 'circle');
    c.setAttribute('cx', String(cx)); c.setAttribute('cy', String(cy)); c.setAttribute('r', String(z.r));
    c.setAttribute('class', 'cell' + (i === 2 ? ' is-other' : ''));
    c.setAttribute('tabindex', '0'); c.setAttribute('role', 'button'); c.setAttribute('aria-label', z.name);
    g.append(c);
    const t = document.createElementNS(NS, 'text');
    const ang = [-0.35, -1.05, -2.2][i]; // подписи колец разнесены по разным углам
    t.setAttribute('x', String(cx + Math.cos(ang) * z.r)); t.setAttribute('y', String(cy + Math.sin(ang) * z.r - 10));
    t.setAttribute('text-anchor', i === 2 ? 'end' : 'start');
    t.setAttribute('class', 'mk-label'); t.textContent = z.name;
    g.append(t);
    return { c, t };
  });
  // маркер клиники
  const mk = document.createElementNS(NS, 'g');
  mk.setAttribute('class', 'mk is-active');
  mk.innerHTML = `<circle class="mk-ring" cx="${cx}" cy="${cy}" r="18"/><circle class="mk-ring mk-ring--2" cx="${cx}" cy="${cy}" r="18"/>
    <circle class="mk-dot" cx="${cx}" cy="${cy}" r="9"/>
    <text class="mk-label mk-label--main" x="${cx + 22}" y="${cy + 46}">Ветеринар на связи</text>
    <text class="mk-id" x="${cx + 22}" y="${cy + 66}">Красноармейская, 13Б · 24/7</text>`;
  g.append(mk);

  const text = sec.querySelector<HTMLElement>('.area__panel-text')!;
  const base = text.textContent;
  rings.forEach(({ c, t }, i) => {
    const on = () => { rings.forEach((x, j) => { x.c.classList.toggle('is-active', j === i); x.t.classList.toggle('is-on', j === i); }); text.textContent = `${ZONES[i].name}: ${ZONES[i].note}. Время приёма уточняйте по телефону.`; };
    const off = () => { c.classList.remove('is-active'); t.classList.remove('is-on'); text.textContent = base; };
    c.addEventListener('pointerenter', on); c.addEventListener('focus', on);
    c.addEventListener('pointerleave', off); c.addEventListener('blur', off);
  });

  gsap.from(rings.map(r => r.c), { attr: { r: 0 }, duration: 1.8, stagger: .15, ease: 'expo.out', scrollTrigger: { trigger: svg, start: 'top 75%' } });
  gsap.from(g.querySelectorAll('.mk-line'), { opacity: 0, duration: 1.2, stagger: .04, scrollTrigger: { trigger: svg, start: 'top 75%' } });
  gsap.from(mk, { scale: 0, transformOrigin: `${cx}px ${cy}px`, duration: 1.2, delay: .4, ease: 'back.out(2)', scrollTrigger: { trigger: svg, start: 'top 75%' } });

  // Топография
  const canvas = sec.querySelector<HTMLCanvasElement>('.area__topo')!;
  const ctx = createGL(canvas, lowPower() ? 1 : 1.5);
  if (!ctx) return;
  const { gl } = ctx;
  gl.getExtension('OES_standard_derivatives');
  let prog: ReturnType<typeof makeProgram>;
  try { prog = makeProgram(gl, '#extension GL_OES_standard_derivatives : enable\n' + FS); } catch (e) { console.warn(e); return; }
  const { u } = prog;
  const m = { x: .7, y: .5, tx: .7, ty: .5 };
  sec.addEventListener('pointermove', e => {
    const r = sec.getBoundingClientRect();
    m.tx = (e.clientX - r.left) / r.width; m.ty = 1 - (e.clientY - r.top) / r.height;
  });
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  visibleLoop(sec, t => {
    const [w, h] = resize(ctx);
    m.x += (m.tx - m.x) * .05; m.y += (m.ty - m.y) * .05;
    gl.uniform2f(u('res'), w, h);
    gl.uniform2f(u('mouse'), m.x, m.y);
    gl.uniform1f(u('time'), reduce ? 0 : t / 1000);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    if (reduce) return false;
  });
}

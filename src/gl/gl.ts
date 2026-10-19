// Минимальное ядро WebGL без сторонних библиотек: программа, полноэкранный квад, текстуры.

export const QUAD_VS = /* glsl */ `
attribute vec2 p;
varying vec2 vUv;
void main() { vUv = p * .5 + .5; gl_Position = vec4(p, 0., 1.); }`;

export const NOISE = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}
vec2 mod289(vec2 x){return x-floor(x*(1./289.))*289.;}
vec3 permute(vec3 x){return mod289(((x*34.)+1.)*x);}
float snoise(vec2 v){
  const vec4 C=vec4(.211324865405187,.366025403784439,-.577350269189626,.024390243902439);
  vec2 i=floor(v+dot(v,C.yy)); vec2 x0=v-i+dot(i,C.xx);
  vec2 i1=(x0.x>x0.y)?vec2(1.,0.):vec2(0.,1.);
  vec4 x12=x0.xyxy+C.xxzz; x12.xy-=i1; i=mod289(i);
  vec3 p=permute(permute(i.y+vec3(0.,i1.y,1.))+i.x+vec3(0.,i1.x,1.));
  vec3 m=max(.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.); m=m*m; m=m*m;
  vec3 x=2.*fract(p*C.www)-1.; vec3 h=abs(x)-.5; vec3 ox=floor(x+.5); vec3 a0=x-ox;
  m*=1.79284291400159-.85373472095314*(a0*a0+h*h);
  vec3 g; g.x=a0.x*x0.x+h.x*x0.y; g.yz=a0.yz*x12.xz+h.yz*x12.yw; return 130.*dot(m,g);
}
float fbm(vec2 p){ float v=0.; float a=.5; for(int i=0;i<4;i++){ v+=a*snoise(p); p*=2.03; a*=.5; } return v; }
// UV «object-fit: cover» с точкой фокуса
vec2 coverUv(vec2 uv, vec2 res, vec2 img, vec2 focus){
  float rs=res.x/res.y; float ri=img.x/img.y;
  vec2 scale = rs>ri ? vec2(1., ri/rs) : vec2(rs/ri, 1.);
  return (uv-.5)*scale + mix(vec2(.5), focus, 1.-scale) ;
}`;

export interface GLCtx { gl: WebGLRenderingContext; canvas: HTMLCanvasElement; dpr: number }

export function createGL(canvas: HTMLCanvasElement, maxDpr = 2): GLCtx | null {
  const gl = canvas.getContext('webgl', { antialias: false, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance' }) as WebGLRenderingContext | null;
  if (!gl) return null;
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
  return { gl, canvas, dpr: Math.min(window.devicePixelRatio || 1, maxDpr) };
}

export function makeProgram(gl: WebGLRenderingContext, fs: string, vs = QUAD_VS) {
  const sh = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader');
    return s;
  };
  const p = gl.createProgram()!;
  gl.attachShader(p, sh(gl.VERTEX_SHADER, vs));
  gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || 'link');
  gl.useProgram(p);
  const loc = gl.getAttribLocation(p, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const cache: Record<string, WebGLUniformLocation | null> = {};
  const u = (name: string) => (name in cache ? cache[name] : (cache[name] = gl.getUniformLocation(p, name)));
  return { p, u };
}

export interface Tex { tex: WebGLTexture; w: number; h: number }
export function loadTexture(gl: WebGLRenderingContext, url: string): Promise<Tex> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      const tex = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      res({ tex, w: img.naturalWidth, h: img.naturalHeight });
    };
    img.onerror = rej;
    img.src = url;
  });
}

export function resize(ctx: GLCtx) {
  const { canvas, gl, dpr } = ctx;
  const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
  const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  gl.viewport(0, 0, w, h);
  return [w, h] as const;
}

/** Цикл рендера, который работает только пока элемент виден и вкладка активна. */
export function visibleLoop(el: Element, frame: (t: number) => boolean | void) {
  let visible = false, raf = 0, running = false;
  const tick = (t: number) => {
    const keep = frame(t);
    if (visible && !document.hidden && keep !== false) raf = requestAnimationFrame(tick);
    else running = false;
  };
  const start = () => { if (!running && visible && !document.hidden) { running = true; raf = requestAnimationFrame(tick); } };
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) start(); else { cancelAnimationFrame(raf); running = false; } }, { rootMargin: '100px' });
  io.observe(el);
  document.addEventListener('visibilitychange', start);
  return { wake: start, destroy: () => { io.disconnect(); cancelAnimationFrame(raf); document.removeEventListener('visibilitychange', start); } };
}

export const lowPower = () => {
  const n = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  return (n.hardwareConcurrency || 8) <= 4 || (n.deviceMemory ?? 8) <= 4 || !!n.connection?.saveData;
};

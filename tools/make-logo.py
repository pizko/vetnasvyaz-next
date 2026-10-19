# Генерирует логотип «Ветеринар на связи» в brand/: знак + надпись, текст переведён в кривые (SVG не зависит от шрифтов).
# usage: python tools/make-logo.py  (нужны fonttools и brotli)
import os
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT = os.path.join(ROOT, 'node_modules/@fontsource-variable/piazzolla/files')
OUT = os.path.join(ROOT, 'brand')
os.makedirs(OUT, exist_ok=True)

INK, IVORY, LIME = '#161B1C', '#F4F1E9', '#CBF36B'


def load(weight, opsz=30):
    # кириллица + латиница (пробел и точка) — объединяем два сабсета
    faces = []
    for sub in ('cyrillic', 'latin'):
        f = TTFont(os.path.join(FONT, f'piazzolla-{sub}-opsz-normal.woff2'))
        f = instantiateVariableFont(f, {'wght': weight, 'opsz': opsz})
        faces.append(f)
    return faces


def text_path(text, faces, size, x0=0, y0=0, tracking=0):
    """Возвращает (svg-path, ширина) для строки, набранной кеглем size; y0 — базовая линия."""
    upm = faces[0]['head'].unitsPerEm
    s = size / upm
    d, x = [], x0
    for ch in text:
        for f in faces:
            cmap = f.getBestCmap()
            if ord(ch) in cmap:
                gname = cmap[ord(ch)]
                gs = f.getGlyphSet()
                pen = SVGPathPen(gs)
                tpen = TransformPen(pen, (s, 0, 0, -s, x, y0))
                gs[gname].draw(tpen)
                d.append(pen.getCommands())
                x += gs[gname].width * s + tracking
                break
    return ' '.join(p for p in d if p), x - x0 - tracking


def mark(x, y, h, fg, accent):
    """Знак: медицинский крест, правое плечо которого превращается в волны связи."""
    k = h / 48
    t = lambda v: round(v * k, 2)
    return (f'<g transform="translate({x} {y})">'
            f'<rect x="{t(18.5)}" y="{t(6)}" width="{t(7)}" height="{t(36)}" rx="{t(1.2)}" fill="{fg}"/>'
            f'<rect x="{t(4)}" y="{t(20.5)}" width="{t(14.5)}" height="{t(7)}" rx="{t(1.2)}" fill="{fg}"/>'
            f'<path d="M{t(30.5)} {t(17.2)}a{t(8)} {t(8)} 0 0 1 0 {t(13.6)}" fill="none" stroke="{fg}" stroke-width="{t(3)}" stroke-linecap="round"/>'
            f'<path d="M{t(34.6)} {t(12.6)}a{t(14.5)} {t(14.5)} 0 0 1 0 {t(22.8)}" fill="none" stroke="{fg}" stroke-width="{t(3)}" stroke-linecap="round"/>'
            f'<path d="M{t(38.8)} {t(8)}a{t(21)} {t(21)} 0 0 1 0 {t(32)}" fill="none" stroke="{accent}" stroke-width="{t(3)}" stroke-linecap="round"/>'
            '</g>')


bold, light = load(620), load(300)
small = load(500, 12)


def horizontal(fg, bg, accent, name):
    H = 96
    p1, w1 = text_path('Ветеринар на связи', bold, 44, 120, 56)
    p2, w2 = text_path('ВЕТКЛИНИКА · РАМЕНСКОЕ · 24/7', small, 13, 122, 84, 2.2)
    W = round(120 + max(w1, w2) + 24)
    bgr = f'<rect width="{W}" height="{H}" fill="{bg}"/>' if bg else ''
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">{bgr}'
           f'{mark(18, 10, 76, fg, accent)}<path d="{p1}" fill="{fg}"/><path d="{p2}" fill="{fg}" fill-opacity=".6"/></svg>')
    open(os.path.join(OUT, name), 'w').write(svg)


def stacked(fg, bg, accent, name):
    W, H = 520, 420
    p1, w1 = text_path('Ветеринар', bold, 76, 0, 0)
    p2, w2 = text_path('на связи', light, 76, 0, 0)
    pa, _ = text_path('Ветеринар', bold, 76, (W - w1) / 2, 300)
    pb, _ = text_path('на связи', light, 76, (W - w2) / 2, 372)
    bgr = f'<rect width="{W}" height="{H}" rx="0" fill="{bg}"/>' if bg else ''
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">{bgr}'
           f'{mark((W - 180) / 2, 30, 180, fg, accent)}<path d="{pa}" fill="{fg}"/><path d="{pb}" fill="{fg}"/></svg>')
    open(os.path.join(OUT, name), 'w').write(svg)


def mark_only(fg, bg, accent, name, rx=0):
    bgr = f'<rect width="48" height="48" rx="{rx}" fill="{bg}"/>' if bg else ''
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="512" height="512">{bgr}{mark(0, 0, 48, fg, accent)}</svg>'
    open(os.path.join(OUT, name), 'w').write(svg)


horizontal(INK, None, '#7FA62B', 'logo-horizontal.svg')
horizontal(IVORY, INK, LIME, 'logo-horizontal-dark.svg')
stacked(INK, IVORY, '#7FA62B', 'logo-stacked.svg')
stacked(IVORY, INK, LIME, 'logo-stacked-dark.svg')
mark_only(INK, None, '#7FA62B', 'mark.svg')
mark_only(IVORY, INK, LIME, 'mark-app-icon.svg', rx=11)
print('ok', sorted(os.listdir(OUT)))

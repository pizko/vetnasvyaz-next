import { defineConfig, type Plugin } from 'vite';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { SERVICES, NEWS, PAGES, setBase, resolveRoute, servicePath, articlePath } from './src/data.ts';
import {
  renderServiceRows, renderGroupChips, renderPopularPrices, renderPriceCats, renderStory, renderStoryText,
  renderReviews, renderGallery, renderUrgent, renderNewsTeasers, renderServiceFooterLinks, renderRoute, routeMeta, esc,
} from './src/render.ts';

// База для GitHub Pages: BASE=/vetnasvyaz-next/ npm run build
const BASE = process.env.BASE || '/';
setBase(BASE);
const ORIGIN = 'https://vetnasvyaz.ru';

// Префикс базы для корневых ссылок в HTML (href/src/srcset), которые Vite не переписывает сам.
const withBase = (html: string) => {
  if (BASE === '/') return html;
  const b = BASE.replace(/^\/|\/$/g, '');
  const skip = `(?!/|${b}/)`;
  return html
    .replace(new RegExp(`((?:href|src|content)=")/${skip}`, 'g'), `$1${BASE}`)
    .replace(new RegExp(`((?:srcset|imagesrcset)="[^"]*)`, 'g'), m => m.replace(new RegExp(`(^|[",]\\s*|="?)/${skip}`, 'g'), `$1${BASE}`));
};

/** Все внутренние адреса сайта — повторяют адреса действующего vetnasvyaz.ru */
const ALL_PATHS = [...SERVICES.map(servicePath), ...PAGES.map(p => p.path), ...NEWS.map(articlePath)];

function pageHtml(base: string, path: string) {
  const r = resolveRoute(path)!;
  const m = routeMeta(r);
  return base
    .replace(/<title>.*?<\/title>/, `<title>${esc(m.title)}</title>`)
    .replace(/<meta name="description" content=".*?"/, `<meta name="description" content="${esc(m.desc)}"`)
    .replace(/<link rel="canonical" href=".*?"/, `<link rel="canonical" href="${ORIGIN}${m.path}"`)
    .replace('<html lang="ru">', '<html lang="ru" data-route="page">')
    .replace(/<div id="page-view" class="page-view" hidden>[\s\S]*?<\/div><!--\/page-view-->/, `<div id="page-view" class="page-view">${renderRoute(r)}</div><!--/page-view-->`)
    .replace(/<main id="main" class="home-view">[\s\S]*?<\/main>/, '<main id="main" class="home-view" data-stub></main>');
}

function prerender(): Plugin {
  let outDir = 'dist';
  return {
    name: 'vet-prerender',
    configResolved(c) { outDir = c.build.outDir; },
    // dev: любые адреса страниц отдаём главным index.html — дальше их рендерит клиентский роутер
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const p = (req.url || '').split('?')[0];
        if (ALL_PATHS.some(x => x === p || x === p + '/')) req.url = '/index.html';
        next();
      });
    },
    transformIndexHtml(html) {
      return html
        .replace('<!--@SERVICES-->', renderServiceRows())
        .replace('<!--@GROUPS-->', renderGroupChips())
        .replace('<!--@PRICES-->', renderPopularPrices())
        .replace('<!--@PRICE_CATS-->', renderPriceCats())
        .replace('<!--@STORY_MEDIA-->', renderStory())
        .replace('<!--@STORY_TEXT-->', renderStoryText())
        .replace('<!--@REVIEWS-->', renderReviews())
        .replace('<!--@GALLERY-->', renderGallery())
        .replace('<!--@URGENT-->', renderUrgent())
        .replace('<!--@NEWS-->', renderNewsTeasers())
        .replace(/<!--@FOOTER_SERVICES-->/g, renderServiceFooterLinks());
    },
    // Пререндер всех внутренних страниц по их исходным адресам (/kardiologiya.html, /novosti/<slug>/ …)
    closeBundle() {
      const base = readFileSync(resolve(outDir, 'index.html'), 'utf8');
      for (const p of ALL_PATHS) {
        const file = resolve(outDir, p.endsWith('/') ? p.slice(1) + 'index.html' : p.slice(1));
        mkdirSync(dirname(file), { recursive: true });
        writeFileSync(file, pageHtml(base, p));
      }
      writeFileSync(resolve(outDir, '404.html'), base);
      // карта сайта
      const urls = ['/', ...ALL_PATHS].map(p => `<url><loc>${ORIGIN}${p}</loc></url>`).join('');
      writeFileSync(resolve(outDir, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`);
    },
  };
}

function basePaths(): Plugin {
  return { name: 'vet-base-paths', transformIndexHtml: { order: 'post', handler: withBase } };
}

export default defineConfig({
  base: BASE,
  plugins: [prerender(), basePaths()],
  server: { port: 5199 },
  preview: { port: 5199 },
});

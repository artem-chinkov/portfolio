import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import sharp from 'sharp';
import { App } from '../src/App';
import { roles, type Lang, type Role } from '../src/content';

const origin = 'https://artem-chinkov.github.io';
const base = '/portfolio/';
const out = path.resolve('dist');
const escape = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
const manifest = JSON.parse(await readFile(path.join(out, '.vite/manifest.json'), 'utf8')) as Record<string, { file: string; css?: string[]; imports?: string[] }>;
const entry = manifest['index.html'];
if (!entry) throw new Error('Vite entry is missing from the manifest.');
const styles = new Set<string>();
const collectStyles = (key: string) => {
  const chunk = manifest[key];
  chunk?.css?.forEach(file => styles.add(file));
  chunk?.imports?.forEach(collectStyles);
};
collectStyles('index.html');
const css = [...styles].map(file => `<link rel="stylesheet" href="${base}${escape(file)}">`).join('\n');
const descriptions: Record<Lang, string> = {
  ru: 'Портфолио Артёма Чинкова: продуктовый менеджмент, UX/UI, разработка с AI и гейм-дизайн. Проекты для Сбера, МТС, VK и БКС.',
  en: 'Artem Chinkov’s portfolio: product management, UX/UI, AI-assisted development and game design. Projects for Sber, MTS, VK and BCS.',
};
const names: Record<Lang, string> = { ru: 'Артём Чинков', en: 'Artem Chinkov' };
const urls: string[] = [];
await mkdir(path.join(out, 'og'), { recursive: true });
const portrait = await sharp(path.resolve('public/assets/images/portrait.png')).resize({ width: 290 }).png().toBuffer();
const fontfile = path.resolve('scripts/fonts/Nunito.ttf');
const textLayer = async (value: string, size: number, top: number, color: string, bold = false) => ({
  input: await sharp({ text: {
    text: `<span foreground="${color}">${escape(value)}</span>`,
    font: `Nunito ${bold ? 'Bold ' : ''}${size}`,
    fontfile,
    rgba: true,
  } }).resize({ width: 710, withoutEnlargement: true }).png().toBuffer(),
  left: 76,
  top,
});

for (const lang of ['ru', 'en'] as const) {
  for (const role of Object.keys(roles) as Role[]) {
    const title = `${names[lang]} — ${roles[role][lang].join(' ')}`;
    const url = `${origin}${base}${lang}/${role}/`;
    const imageUrl = `${origin}${base}og/${lang}-${role}.png`;
    const counterpart = `${origin}${base}${lang === 'ru' ? 'en' : 'ru'}/${role}/`;
    const preview = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
      <rect width="1200" height="630" fill="#181818"/>
      <circle cx="1120" cy="105" r="260" fill="#0088ff" opacity="0.14"/>
      <rect x="76" y="80" width="76" height="8" rx="4" fill="#0088ff"/>
    </svg>`;
    await sharp(Buffer.from(preview)).composite([
      { input: portrait, left: 834, top: 163 },
      await textLayer(names[lang], 45, 135, '#0088ff', true),
      await textLayer(roles[role][lang][0], 70, 235, '#ffffff', true),
      await textLayer(roles[role][lang][1], 70, 325, '#ffffff', true),
      await textLayer(lang === 'ru' ? 'Продукты · Дизайн · Технологии · Игры' : 'Products · Design · Technology · Games', 28, 481, '#b6b6b6'),
      await textLayer('artem-chinkov.github.io/portfolio', 22, 547, '#b6b6b6'),
    ]).png().toFile(path.join(out, 'og', `${lang}-${role}.png`));
    const markup = renderToString(createElement(App, { lang, role }));
    const html = `<!doctype html>
<html lang="${lang}"><head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="theme-color" content="#181818">
<title>${escape(title)}</title>
<meta name="description" content="${escape(descriptions[lang])}">
<link rel="canonical" href="${url}">
<link rel="alternate" hreflang="${lang}" href="${url}">
<link rel="alternate" hreflang="${lang === 'ru' ? 'en' : 'ru'}" href="${counterpart}">
<link rel="alternate" hreflang="x-default" href="${origin}${base}ru/${role}/">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${escape(names[lang])}">
<meta property="og:locale" content="${lang === 'ru' ? 'ru_RU' : 'en_US'}">
<meta property="og:title" content="${escape(title)}">
<meta property="og:description" content="${escape(descriptions[lang])}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${imageUrl}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${escape(title)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escape(title)}">
<meta name="twitter:description" content="${escape(descriptions[lang])}">
<meta name="twitter:image" content="${imageUrl}">
${css}
</head><body><div id="root">${markup}</div><script type="module" src="${base}${entry.file}"></script></body></html>`;
    const directory = path.join(out, lang, role);
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, 'index.html'), html);
    urls.push(url);
  }
}

await writeFile(path.join(out, 'index.html'), `<!doctype html><html lang="ru"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Артём Чинков — портфолио</title><link rel="canonical" href="${origin}${base}ru/manager/"><meta http-equiv="refresh" content="0;url=${base}ru/manager/"></head><body><a href="${base}ru/manager/">Открыть портфолио Артёма Чинкова</a><script>location.replace('${base}ru/manager/'+location.search+location.hash)</script></body></html>`);
await writeFile(path.join(out, '404.html'), `<!doctype html><html lang="ru"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Страница не найдена / Page not found</title></head><body><h1>404</h1><p>Страница не найдена / Page not found</p><a href="${base}ru/manager/">Портфолио / Portfolio</a></body></html>`);
await writeFile(path.join(out, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(url => `<url><loc>${url}</loc></url>`).join('')}</urlset>`);
await writeFile(path.join(out, '.nojekyll'), '');
console.log(`Generated ${urls.length} static pages and social previews.`);

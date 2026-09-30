import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { content, email, projects, roles, type Lang, type Role } from '../src/content';
import { carouselSettled, carouselStep, settled } from './helpers';

const pathFor = (lang: Lang, role: Role) => `/portfolio/${lang}/${role}/`;
const expectedHeadings: Record<Role, Record<Lang, [string, string]>> = {
  manager: { ru: ['Менеджер', 'Продукта'], en: ['Product', 'Manager'] },
  designer: { ru: ['Продуктовый', 'Дизайнер'], en: ['Product', 'Designer'] },
  engineer: { ru: ['AI Инженер', 'Продукта'], en: ['AI Product', 'Engineer'] },
  gamification: { ru: ['Гейм-Дизайнер', '(Геймификация)'], en: ['Game Designer', '(Gamification)'] },
};
const letterUrls = [
  'https://drive.google.com/file/d/1vrNzm3OFZsI1X5Z-TzSSrq_YH0Ra7Ye_/view',
  'https://drive.google.com/file/d/1ofpqDRjHSs35CvZRyGngVdXWQn9Qq_Iu/view',
];

for (const lang of ['ru', 'en'] as const) {
  for (const role of Object.keys(roles) as Role[]) {
    test(`${lang}/${role}: direct entry, static metadata and matching CV`, async ({ page, request }) => {
      const path = pathFor(lang, role);
      const response = await request.get(path);
      expect(response.status()).toBe(200);
      const html = await response.text();
      expect(html).toMatch(new RegExp(`<html[^>]*lang=["']${lang}["']`));
      expect(html).toMatch(/<meta[^>]*name=["']description["'][^>]*>/);
      expect(html).toContain(`https://artem-chinkov.github.io${path}`);
      const heading = expectedHeadings[role][lang];
      const title = `${lang === 'ru' ? 'Артём Чинков' : 'Artem Chinkov'} — ${heading.join(' ')}`;
      expect(html).toContain(`<title>${title}</title>`);
      expect(html).toContain(`<meta property="og:title" content="${title}">`);
      expect(html).toContain(`<meta name="twitter:title" content="${title}">`);
      await page.goto(path);
      await settled(page);
      await page.evaluate(() => document.fonts.ready);
      await expect(page.locator('h1 > span')).toHaveText(heading);
      await expect(page).toHaveTitle(title);
      for (const width of [320, 390, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await settled(page);
        const lines = await page.locator('h1 > span').evaluateAll(spans => spans.map(span => {
          const range = document.createRange();
          range.selectNodeContents(span);
          const rects = [...range.getClientRects()];
          return { lines: new Set(rects.map(rect => Math.round(rect.top))).size, top: rects[0].top,
            left: Math.min(...rects.map(rect => rect.left)), right: Math.max(...rects.map(rect => rect.right)) };
        }));
        expect(lines.map(line => line.lines), `${lang}/${role} at ${width}px`).toEqual([1, 1]);
        expect(lines[1].top).toBeGreaterThan(lines[0].top);
        for (const line of lines) {
          expect(line.left).toBeGreaterThanOrEqual(0);
          expect(line.right).toBeLessThanOrEqual(width);
        }
      }
      const portrait = page.locator('.portrait img');
      await expect(portrait).toBeVisible();
      await expect.poll(() => portrait.evaluate((image: HTMLImageElement) => image.naturalWidth / image.naturalHeight)).toBeCloseTo(486 / 590, 3);
      const letters = page.locator('.letters a');
      await expect(letters).toHaveCount(2);
      for (const [index, url] of letterUrls.entries()) {
        await expect(letters.nth(index)).toHaveAttribute('href', url);
        await expect(letters.nth(index)).toHaveAttribute('target', '_blank');
        await expect(letters.nth(index)).toHaveAttribute('rel', /noopener/);
      }
      await expect(page.locator('.recommendations-section > .button')).toHaveAttribute('href', 'https://drive.google.com/drive/folders/14A69UB_mIAChmjtHNVzPm3XFBqA-L3Z7?usp=sharing');
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://artem-chinkov.github.io${path}`);
      const preview = await page.locator('meta[property="og:image"]').getAttribute('content');
      expect(preview).toMatch(/\.png$/);
      const previewPath = new URL(preview!).pathname;
      const previewResponse = await request.get(previewPath);
      expect(previewResponse.status()).toBe(200);
      expect(previewResponse.headers()['content-type']).toContain('image/png');
      const cvPath = `/portfolio/assets/resumes/${roles[role].resume[lang]}`;
      await expect(page.locator(`a[href="${cvPath}"]`).first()).toBeVisible();
      const cv = await request.get(cvPath);
      expect(cv.status()).toBe(200);
      const cvBytes = await cv.body();
      expect(cvBytes.subarray(0, 5).toString()).toBe('%PDF-');
      expect(cvBytes.equals(await readFile(`public/assets/resumes/${roles[role].resume[lang]}`))).toBe(true);
      const downloadPromise = page.waitForEvent('download');
      await page.locator(`a[href="${cvPath}"]`).first().click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toBe(roles[role].resume[lang]);
      expect((await readFile((await download.path())!)).equals(cvBytes)).toBe(true);
      await page.reload();
      await expect(page.locator('h1')).toBeVisible();
    });
  }
}

test('each letter opens its own PDF in a new tab', async ({ page, context }) => {
  await context.route('https://drive.google.com/**', route => route.fulfill({
    contentType: 'text/html', body: '<!doctype html><title>Recommendation PDF</title>',
  }));
  await page.goto('/portfolio/ru/manager/#recommendations');
  await settled(page);
  for (const [index, url] of letterUrls.entries()) {
    const popupPromise = page.waitForEvent('popup');
    await page.locator('.letters a').nth(index).click();
    const popup = await popupPromise;
    await expect(popup).toHaveURL(url);
    await expect(page).toHaveURL(/\/portfolio\/ru\/manager\/#recommendations$/);
    await popup.close();
  }
});

test('default route opens Russian product manager', async ({ page }) => {
  await page.goto('/portfolio/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
  await expect(page.locator('h1')).toHaveText(roles.manager.ru.join(' '), { useInnerText: true });
});

test('language switch preserves profession and section', async ({ page }) => {
  await page.goto('/portfolio/ru/engineer/#about');
  await settled(page);
  await page.locator('.screen-page[data-active="true"]').getByTestId('language-en').click();
  await expect(page).toHaveURL(/\/portfolio\/en\/engineer\/#about$/);
  await expect(page.locator('h1')).toHaveText(roles.engineer.en.join(' '), { useInnerText: true });
  await page.evaluate(() => { location.hash = 'contacts'; });
  await expect(page.locator('#contacts')).toBeVisible();
  await settled(page);
  // The header is intentionally confined to the first screen. Its destination
  // still tracks the active section for direct route navigation.
  const destination = await page.getByTestId('language-ru').getAttribute('href');
  expect(destination).toBe('/portfolio/ru/engineer/#contacts');
  await page.goto(destination!);
  await expect(page).toHaveURL(/\/portfolio\/ru\/engineer\/#contacts$/);
  await expect(page.locator('#contacts')).toBeVisible();
});

test('carousel advances, reverses and exposes six correct external destinations', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/portfolio/ru/manager/#projects');
  await settled(page);
  const cards = page.getByTestId('project-card');
  await expect(cards).toHaveCount(6);
  await expect(cards.nth(0)).toHaveAttribute('aria-current', 'true');
  await carouselStep(page, 'next');
  await expect(cards.nth(1)).toHaveAttribute('aria-current', 'true');
  await carouselStep(page, 'previous');
  await expect(cards.nth(0)).toHaveAttribute('aria-current', 'true');
  for (const [index, project] of projects.entries()) {
    await page.getByTestId(`project-dot-${index}`).click();
    await carouselSettled(page);
    await expect(cards.nth(index)).toHaveAttribute('aria-current', 'true');
    const link = cards.nth(index).locator(`a[href="${project.href}"]`);
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', /noopener/);
    await expect(page.getByTestId(`project-dot-${index}`)).toHaveAccessibleName(/\S/);
  }
});

test('interactive projects open isolated dialogs, trap keyboard focus and restore it', async ({ page }) => {
  test.setTimeout(90_000);
  await page.route('**/*', async route => {
    if (new URL(route.request().url()).hostname !== '127.0.0.1') {
      await route.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="en"><title>Interactive preview</title><body>Preview</body></html>' });
    } else await route.continue();
  });
  await page.goto('/portfolio/en/manager/#projects');
  await settled(page);
  for (const [index, project] of projects.entries()) {
    if (!project.game) continue;
    await page.getByTestId(`project-dot-${index}`).click();
    await carouselSettled(page);
    const opener = page.getByTestId(`play-${project.id}`);
    await opener.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAccessibleName(/\S/);
    await expect(dialog.locator('iframe')).toHaveAttribute('src', project.game);
    await expect(dialog.getByRole('link', { name: content.en.openExternal })).toHaveAttribute('href', project.game);
    await page.getByTestId('close-modal').focus();
    await page.keyboard.press('Shift+Tab');
    expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
    await page.getByTestId('close-modal').focus();
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(opener).toBeFocused();
  }
});

for (const succeeds of [true, false]) {
  test(`copy email reports ${succeeds ? 'success' : 'failure'}`, async ({ page }) => {
    await page.addInitScript(({ succeeds }) => {
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
        writeText: async (value: string) => {
          if (!succeeds) throw new DOMException('Clipboard unavailable', 'NotAllowedError');
          document.documentElement.dataset.copiedEmail = value;
        },
      } });
    }, { succeeds });
    await page.goto('/portfolio/en/manager/#contacts');
    await page.getByTestId('copy-email').click();
    await expect(page.getByTestId('toast')).toHaveText(succeeds ? content.en.copied : content.en.copyError);
    if (succeeds) await expect(page.locator('html')).toHaveAttribute('data-copied-email', email);
  });
}

test('responsive sections fit viewport and use Nunito without broken local assets', async ({ page }) => {
  test.setTimeout(180_000);
  const failedAssets: string[] = [];
  page.on('response', response => {
    if (response.url().startsWith('http://127.0.0.1:4173/') && response.status() >= 400) failedAssets.push(`${response.status()} ${response.url()}`);
  });
  await page.goto('/portfolio/en/gamification/');
  await page.evaluate(() => document.fonts.ready);
  expect(await page.locator('body').evaluate(el => getComputedStyle(el).fontFamily)).toMatch(/Nunito/);
  for (const width of [320, 390, 430, 768, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    for (const section of ['about', 'experience', 'services', 'projects', 'recommendations', 'contacts']) {
      await page.evaluate(id => { location.hash = id; }, section);
      await expect.poll(() => page.locator(`#${section}`).evaluate(el => el.closest('.screen-page')?.getAttribute('data-active'))).toBe('true');
      await expect(page.locator(`#${section}`)).toBeVisible();
      await settled(page);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), `${section} at ${width}px`).toBeLessThanOrEqual(1);
    }
  }
  await expect.poll(() => page.locator('img').evaluateAll(images => (images as HTMLImageElement[]).filter(image => !image.complete || image.naturalWidth === 0).map(image => image.src))).toEqual([]);
  expect(failedAssets).toEqual([]);
});

test('horizontal drag selects a project without opening a game or following a link', async ({ page }) => {
  await page.goto('/portfolio/en/manager/#projects');
  await settled(page);
  const preview=page.getByTestId('play-yacht');
  const box=await preview.boundingBox();
  expect(box).toBeTruthy();
  await page.mouse.move(box!.x+box!.width*.75,box!.y+box!.height*.5);
  await page.mouse.down();
  await page.mouse.move(box!.x+box!.width*.2,box!.y+box!.height*.5,{steps:10});
  await page.mouse.up();
  await expect(page.getByTestId('project-card').nth(1)).toHaveAttribute('aria-current','true');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page).toHaveURL(/\/portfolio\/en\/manager\/#projects$/);
});

test('mobile header controls stay visually compact', async ({ page }) => {
  await page.setViewportSize({width:360,height:800});
  await page.goto('/portfolio/ru/manager/');
  await settled(page);
  for(const selector of ['.site-header .language-switch','.site-header .resume-link']){
    const box=await page.locator(selector).boundingBox();
    expect(box,selector).not.toBeNull();
    expect(box!.height,selector).toBeLessThanOrEqual(36);
    expect(box!.width,selector).toBeLessThanOrEqual(145);
  }
});

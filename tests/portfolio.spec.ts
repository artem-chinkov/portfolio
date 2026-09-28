import { expect, test } from '@playwright/test';
import { content, email, projects, roles, type Lang, type Role } from '../src/content';

const pathFor = (lang: Lang, role: Role) => `/portfolio/${lang}/${role}/`;

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
      await page.goto(path);
      await expect(page.locator('h1')).toHaveText(roles[role][lang].join(' '), { useInnerText: true });
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://artem-chinkov.github.io${path}`);
      const preview = await page.locator('meta[property="og:image"]').getAttribute('content');
      expect(preview).toMatch(/\.png$/);
      const previewPath = new URL(preview!).pathname;
      const previewResponse = await request.get(previewPath);
      expect(previewResponse.status()).toBe(200);
      expect(previewResponse.headers()['content-type']).toContain('image/png');
      const cvPath = `/portfolio/assets/resumes/${role}.pdf`;
      await expect(page.locator(`a[href="${cvPath}"]`).first()).toBeVisible();
      const cv = await request.get(cvPath);
      expect(cv.status()).toBe(200);
      expect((await cv.body()).subarray(0, 5).toString()).toBe('%PDF-');
      await page.reload();
      await expect(page.locator('h1')).toBeVisible();
    });
  }
}

test('default route opens Russian product manager', async ({ page }) => {
  await page.goto('/portfolio/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
  await expect(page.locator('h1')).toHaveText(roles.manager.ru.join(' '), { useInnerText: true });
});

test('language switch preserves profession and section', async ({ page }) => {
  await page.goto('/portfolio/ru/engineer/#about');
  await page.locator('.screen-page[data-active="true"]').getByTestId('language-en').click();
  await expect(page).toHaveURL(/\/portfolio\/en\/engineer\/#about$/);
  await expect(page.locator('h1')).toHaveText(roles.engineer.en.join(' '), { useInnerText: true });
  await page.evaluate(() => { location.hash = 'contacts'; });
  await expect(page.locator('#contacts')).toBeVisible();
  // The header is intentionally confined to the first screen. Its destination
  // still tracks the active section for direct route navigation.
  const destination = await page.getByTestId('language-ru').getAttribute('href');
  expect(destination).toBe('/portfolio/ru/engineer/#contacts');
  await page.goto(destination!);
  await expect(page).toHaveURL(/\/portfolio\/ru\/engineer\/#contacts$/);
  await expect(page.locator('#contacts')).toBeVisible();
});

test('carousel advances, reverses and exposes six correct external destinations', async ({ page }) => {
  await page.goto('/portfolio/ru/manager/#projects');
  const cards = page.getByTestId('project-card');
  await expect(cards).toHaveCount(6);
  await expect(cards.nth(0)).toHaveAttribute('aria-current', 'true');
  await page.getByTestId('next-project').click();
  await expect(cards.nth(1)).toHaveAttribute('aria-current', 'true');
  await page.getByTestId('previous-project').click();
  await expect(cards.nth(0)).toHaveAttribute('aria-current', 'true');
  for (const [index, project] of projects.entries()) {
    await page.getByTestId(`project-dot-${index}`).click();
    await expect(cards.nth(index)).toHaveAttribute('aria-current', 'true');
    const link = cards.nth(index).locator(`a[href="${project.href}"]`);
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', /noopener/);
    await expect(page.getByTestId(`project-dot-${index}`)).toHaveAccessibleName(/\S/);
  }
});

test('interactive projects open isolated dialogs, trap keyboard focus and restore it', async ({ page }) => {
  await page.route('**/*', async route => {
    if (new URL(route.request().url()).hostname !== '127.0.0.1') {
      await route.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="en"><title>Interactive preview</title><body>Preview</body></html>' });
    } else await route.continue();
  });
  await page.goto('/portfolio/en/manager/#projects');
  for (const [index, project] of projects.entries()) {
    if (!project.game) continue;
    await page.getByTestId(`project-dot-${index}`).click();
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
      await expect(page.locator(`#${section}`)).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), `${section} at ${width}px`).toBeLessThanOrEqual(1);
    }
  }
  await expect.poll(() => page.locator('img').evaluateAll(images => (images as HTMLImageElement[]).filter(image => !image.complete || image.naturalWidth === 0).map(image => image.src))).toEqual([]);
  expect(failedAssets).toEqual([]);
});

test('horizontal drag selects a project without opening a game or following a link', async ({ page }) => {
  await page.goto('/portfolio/en/manager/#projects');
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
  for(const selector of ['.site-header .language-switch','.site-header .resume-link']){
    const box=await page.locator(selector).boundingBox();
    expect(box,selector).not.toBeNull();
    expect(box!.height,selector).toBeLessThanOrEqual(36);
    expect(box!.width,selector).toBeLessThanOrEqual(145);
  }
});

import { expect, test, type Page } from '@playwright/test';
import { carouselSettled, carouselStep, settled } from './helpers';

const stage = (page: Page) => page.locator('.screen-stage');
const activeVideo = (page: Page) => page.locator('.project-card.active video');

for (const reducedMotion of ['reduce', 'no-preference'] as const) {
  test(`screen, card, carousel and return animations remain enabled with ${reducedMotion}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion });
    await page.goto('/portfolio/en/manager/');
    await expect(stage(page)).toHaveAttribute('data-intro', 'true');
    await settled(page);
    await page.keyboard.press('PageDown');
    await expect(stage(page)).toHaveAttribute('data-transitioning', 'true');
    const start = await page.locator('#experience').boundingBox();
    await page.waitForTimeout(300);
    const middle = await page.locator('#experience').boundingBox();
    expect(Math.abs(start!.y - middle!.y)).toBeGreaterThan(5);
    await settled(page);
    const card = page.locator('#experience .info-card').first();
    expect(await card.evaluate(el => getComputedStyle(el).animationName)).not.toBe('none');
    await page.evaluate(() => { location.hash = 'projects'; });
    await expect(stage(page)).toHaveAttribute('data-active-screen', 'projects');
    await settled(page);
    await carouselStep(page, 'next', false);
    await expect(page.getByTestId('carousel')).toHaveAttribute('data-moving', 'true');
    await carouselSettled(page);
    await page.keyboard.press('End');
    await settled(page);
    const anchor = page.locator('.back-to-top');
    const visual = anchor.locator('.back-to-top-visual');
    const before = await anchor.boundingBox();
    const position = await visual.evaluate(el => getComputedStyle(el).transform);
    await expect.poll(() => visual.evaluate(el => getComputedStyle(el).transform)).not.toBe(position);
    expect(await anchor.boundingBox()).toEqual(before);
    await anchor.click();
    await expect(stage(page)).toHaveAttribute('data-transitioning', 'true');
    await settled(page);
    await expect(stage(page)).toHaveAttribute('data-active-screen', 'about');
  });
}

test('small normalized wheel input advances once despite a long inertial tail', async ({ page }) => {
  await page.goto('/portfolio/en/manager/');
  await settled(page);
  // Emit one actual burst inside the browser: protocol round trips can exceed
  // the quiet gap on Windows WebKit and accidentally synthesize separate gestures.
  const initialScreens = await page.evaluate(async () => {
    const root = document.querySelector<HTMLElement>('.screen-stage')!;
    const tick = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    root.dispatchEvent(new WheelEvent('wheel', { deltaY: 6, bubbles: true, cancelable: true }));
    await tick();
    const belowThreshold = root.dataset.activeScreen;
    root.dispatchEvent(new WheelEvent('wheel', { deltaY: 6, bubbles: true, cancelable: true }));
    await tick();
    const aboveThreshold = root.dataset.activeScreen;
    for (let index = 0; index < 32; index++) {
      root.dispatchEvent(new WheelEvent('wheel', { deltaY: 20 - index / 2, bubbles: true, cancelable: true }));
      await new Promise(resolve => setTimeout(resolve, 80));
    }
    return [belowThreshold, aboveThreshold];
  });
  expect(initialScreens).toEqual(['about', 'experience']);
  await expect(stage(page)).toHaveAttribute('data-active-screen', 'experience');
  // A direction reversal after unlock is a fresh gesture, even without a quiet gap.
  await stage(page).dispatchEvent('wheel', { deltaY: -1, deltaMode: 1, bubbles: true, cancelable: true });
  await expect(stage(page)).toHaveAttribute('data-active-screen', 'about');
  await settled(page);
  await page.waitForTimeout(850);
  await stage(page).dispatchEvent('wheel', { deltaY: 1, deltaMode: 2, bubbles: true, cancelable: true });
  await expect(stage(page)).toHaveAttribute('data-active-screen', 'experience');
});

test('1200ms vertical cooldown drops blocked wheel and swipe gestures without queuing their tails', async ({ page }) => {
  await page.goto('/portfolio/en/manager/#experience');
  await settled(page);
  const snapshots = await page.evaluate(async () => {
    const root = document.querySelector<HTMLElement>('.screen-stage')!;
    const wheel = () => root.dispatchEvent(new WheelEvent('wheel', { deltaY: 12, bubbles: true, cancelable: true }));
    const pointer = (type: string, y: number) => root.dispatchEvent(new PointerEvent(type, { pointerId: 1, isPrimary: true, button: 0, clientX: 10, clientY: y, bubbles: true }));
    const start = performance.now();
    const until = async (time: number) => { while (performance.now() - start < time) await new Promise(resolve => setTimeout(resolve, 20)); };
    wheel();
    await until(650);
    pointer('pointerdown', 300); pointer('pointerup', 100);
    wheel();
    await until(1050);
    // A swipe begun during the lock must not sneak through when released after it.
    pointer('pointerdown', 300);
    for (let i = 0; i < 7; i++) { wheel(); await new Promise(resolve => setTimeout(resolve, 100)); }
    pointer('pointerup', 100);
    await until(1900);
    const afterAnimation = { screen: root.dataset.activeScreen, transitioning: root.dataset.transitioning };
    return { afterAnimation, afterTail: root.dataset.activeScreen };
  });
  expect(snapshots).toEqual({ afterAnimation: { screen: 'services', transitioning: 'false' }, afterTail: 'services' });
  // A genuinely new gesture after the cooldown is accepted.
  await page.waitForTimeout(200);
  await stage(page).dispatchEvent('wheel', { deltaY: 12, bubbles: true, cancelable: true });
  await expect(stage(page)).toHaveAttribute('data-active-screen', 'projects');
  await settled(page);
});

test('a new vertical gesture is accepted 1350ms after the previous gesture', async ({ page }) => {
  await page.goto('/portfolio/en/manager/#experience');
  await settled(page);
  const beforeSecondGesture = await page.evaluate(async () => {
    const root = document.querySelector<HTMLElement>('.screen-stage')!;
    const wheel = () => root.dispatchEvent(new WheelEvent('wheel', { deltaY: 12, bubbles: true, cancelable: true }));
    wheel();
    await new Promise(resolve => setTimeout(resolve, 1350));
    const snapshot = { screen: root.dataset.activeScreen, transitioning: root.dataset.transitioning };
    wheel();
    return snapshot;
  });
  expect(beforeSecondGesture).toEqual({ screen: 'services', transitioning: 'false' });
  await expect(stage(page)).toHaveAttribute('data-active-screen', 'projects');
  await settled(page);
});

test('six stable carousel cards cross both seams without stacking or crossing the wrong center', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/portfolio/en/manager/#projects');
  await settled(page);
  const arrows = page.getByTestId('next-project');
  if (page.viewportSize()!.width < 768) await expect(arrows).toBeHidden();
  else await expect(arrows).toBeVisible();
  await page.evaluate(() => {
    (window as unknown as { qaCards: Element[] }).qaCards = [...document.querySelectorAll('[data-testid="project-card"]')];
  });
  let selected = 0;
  for (const direction of [...Array<number>(12).fill(1), ...Array<number>(12).fill(-1), 1, -1]) {
    const outgoing = selected;
    selected = (selected + direction + 6) % 6;
    await carouselStep(page, direction > 0 ? 'next' : 'previous', false);
    const failures = await page.evaluate(async ({ outgoing, incoming }) => {
      const cards = (window as unknown as { qaCards: HTMLElement[] }).qaCards;
      const errors = new Set<string>();
      const until = performance.now() + 810;
      do {
        await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
        const viewport = document.querySelector('.carousel-viewport')!.getBoundingClientRect();
        const center = viewport.x + viewport.width / 2;
        const visible = cards.flatMap((card, index) => {
          if (!card.isConnected) errors.add('card replaced');
          const rect = card.getBoundingClientRect();
          const style = getComputedStyle(card);
          if (style.visibility === 'hidden' || Number(style.opacity) < .01 || rect.right <= viewport.left || rect.left >= viewport.right) return [];
          const x = rect.x + rect.width / 2;
          if (index !== outgoing && index !== incoming && Math.abs(x - center) < rect.width * .15) errors.add(`unrelated center: ${index}`);
          return [{ index, x, width: rect.width }];
        });
        for (let a = 0; a < visible.length; a++) for (let b = a + 1; b < visible.length; b++) {
          if (Math.abs(visible[a].x - visible[b].x) < Math.min(visible[a].width, visible[b].width) * .5) errors.add(`stacked cards: ${visible[a].index},${visible[b].index}`);
        }
      } while (performance.now() < until);
      return [...errors];
    }, { outgoing, incoming: selected });
    expect(failures, `step ${outgoing} to ${selected}`).toEqual([]);
    await carouselSettled(page);
    await expect(page.getByTestId('project-card')).toHaveCount(6);
    await expect(page.getByTestId('project-card').nth(selected)).toHaveAttribute('aria-current', 'true');
  }
});

test('active video advances and resumes on pageshow, visibility and screen return', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/portfolio/en/manager/#projects');
  await settled(page);
  // Use the ordinary non-game project to check playback independently of the game overlay.
  await page.getByTestId('project-dot-4').click();
  await carouselSettled(page);
  await expect(activeVideo(page)).toHaveAttribute('poster', /\/progressors\.webp$/);
  await expect(activeVideo(page)).toHaveAttribute('data-ready', 'true');
  const time = await activeVideo(page).evaluate(video => (video as HTMLVideoElement).currentTime);
  await expect.poll(() => activeVideo(page).evaluate(video => (video as HTMLVideoElement).currentTime)).toBeGreaterThan(time + .1);
  for (const event of ['pageshow', 'visibilitychange']) {
    await activeVideo(page).evaluate(video => (video as HTMLVideoElement).pause());
    await page.evaluate(event => {
      if (event === 'pageshow') window.dispatchEvent(new Event(event));
      else document.dispatchEvent(new Event(event));
    }, event);
    await expect.poll(() => activeVideo(page).evaluate(video => (video as HTMLVideoElement).paused)).toBe(false);
  }
  await page.keyboard.press('PageUp');
  await settled(page);
  await expect.poll(() => page.locator('video').evaluateAll(videos => videos.every(video => (video as HTMLVideoElement).paused))).toBe(true);
  await page.waitForTimeout(850);
  await page.keyboard.press('PageDown');
  await settled(page);
  await expect.poll(() => activeVideo(page).evaluate(video => (video as HTMLVideoElement).paused)).toBe(false);
});

test('blocked autoplay preserves poster and offers an independent preview retry', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      if (document.documentElement.dataset.allowPreview !== 'true') return Promise.reject(new DOMException('Autoplay blocked for regression test', 'NotAllowedError'));
      return original.call(this);
    };
  });
  await page.goto('/portfolio/ru/manager/#projects');
  await settled(page);
  const retry = page.getByTestId('preview-start-yacht');
  await expect(retry).toHaveAccessibleName('Запустить превью');
  await expect(retry).toBeVisible();
  await expect(activeVideo(page)).toHaveAttribute('data-ready', 'false');
  const poster = page.locator('.project-card.active .video-poster');
  await expect(poster).toHaveCSS('opacity', '1');
  expect(await poster.evaluate(img => (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0)).toBe(true);
  await page.evaluate(() => { document.documentElement.dataset.allowPreview = 'true'; });
  await retry.click();
  await expect(activeVideo(page)).toHaveAttribute('data-ready', 'true');
  await expect(retry).toBeHidden();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

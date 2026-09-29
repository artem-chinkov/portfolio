import { expect, test, type Page } from '@playwright/test';
import { carouselSettled, carouselStep } from './helpers';

test.use({ reducedMotion: 'no-preference' });

const screenIds = ['about', 'experience', 'services', 'projects', 'recommendations', 'contacts'];
const activePage = (page: Page) => page.locator('.screen-page[data-active="true"]');

async function settled(page: Page) {
  await expect(page.locator('.screen-stage')).toHaveAttribute('data-intro', 'false');
  await expect(page.locator('.screen-stage')).toHaveAttribute('data-transitioning', 'false');
  await expect(activePage(page)).toHaveCount(1);
}

async function navigate(page: Page, id: string) {
  await page.evaluate(id => { location.hash = id; }, id);
  await expect.poll(() => page.locator(`#${id}`).evaluate(el => el.closest('.screen-page')?.getAttribute('data-active'))).toBe('true');
  await settled(page);
}

async function drag(page: Page, selector: string, direction: 'left' | 'right') {
  const box = await page.locator(selector).boundingBox();
  expect(box).not.toBeNull();
  const from = direction === 'left' ? .8 : .2;
  const to = direction === 'left' ? .2 : .8;
  await page.mouse.move(box!.x + box!.width * from, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.move(box!.x + box!.width * to, box!.y + box!.height / 2, { steps: 10 });
  await page.mouse.up();
}

async function expectOneLineNavigation(page: Page, selector: string) {
  const positions = await page.locator(`${selector} a`).evaluateAll(links => links.flatMap(link => {
    if (!link.getBoundingClientRect().width) return [];
    const range = document.createRange();
    range.selectNodeContents(link);
    return [...range.getClientRects()].filter(rect => rect.width > 0).map(rect => rect.top);
  }));
  expect(positions.length).toBeGreaterThanOrEqual(5);
  expect(Math.max(...positions) - Math.min(...positions), `${selector} must occupy one text line`).toBeLessThanOrEqual(1.5);
}

test('first screen includes the header and both navigation bars stay on one line', async ({ page }) => {
  test.setTimeout(120_000);
  for (const lang of ['ru', 'en']) {
    await page.goto(`/portfolio/${lang}/gamification/#about`);
    for (const width of [320, 390, 430]) {
      await page.setViewportSize({ width, height: 740 });
      await settled(page);
      const header = await page.locator('.site-header').boundingBox();
      expect(header).not.toBeNull();
      expect(header!.y).toBeGreaterThanOrEqual(0);
      expect(header!.y + header!.height).toBeLessThanOrEqual(740);
      await expectOneLineNavigation(page, '.site-header .navigation');
      await navigate(page, 'contacts');
      await expectOneLineNavigation(page, '.footer-nav');
      await navigate(page, 'about');
    }
  }
});

test('intro brings portrait, copy and actions from their designated edges before revealing the next screen', async ({ page }) => {
  await page.goto('/portfolio/ru/manager/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.screen-stage')).toHaveAttribute('data-intro', 'true');
  const snapshot = () => page.locator('.hero-copy, .portrait, .hero-contact, .hero-socials').evaluateAll(nodes => nodes.map(el => {
    const rect = el.getBoundingClientRect();
    return { className: el.className, x: rect.x, y: rect.y };
  }));
  const beginning = await snapshot();
  const nextScreen = page.locator('.screen-page[data-screen="experience"]');
  expect(Number(await nextScreen.evaluate(el => getComputedStyle(el).opacity))).toBeLessThan(.01);
  await page.waitForTimeout(300);
  const intermediate = await snapshot();
  for (const start of beginning) {
    const moved = intermediate.find(el => el.className === start.className)!;
    if (start.className === 'hero-copy') expect(moved.x - start.x, 'copy enters from the left').toBeGreaterThan(5);
    else if (start.className === 'portrait') expect(start.x - moved.x, 'portrait enters from the right').toBeGreaterThan(5);
    else expect(start.y - moved.y, `${start.className} enters from below`).toBeGreaterThan(5);
  }
  await page.waitForFunction(() => {
    const next = document.querySelector('.screen-page[data-screen="experience"]')!;
    const opacity = Number(getComputedStyle(next).opacity);
    return opacity > .005 && opacity < .19;
  }, undefined, { polling: 'raf' });
  // The neighbor fades in only after the simultaneous1200ms hero entrance.
  await settled(page);
  expect(Number(await nextScreen.evaluate(el => getComputedStyle(el).opacity))).toBeCloseTo(.2, 2);
  const ending = await snapshot();
  for (const end of ending) {
    const start = beginning.find(el => el.className === end.className)!;
    if (end.className === 'hero-copy') expect(end.x).toBeGreaterThan(start.x);
    else if (end.className === 'portrait') expect(end.x).toBeLessThan(start.x);
    else expect(end.y).toBeLessThan(start.y);
  }
});

test('every screen fits and centers after resizing, including short landscape windows', async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto('/portfolio/en/gamification/');
  await page.evaluate(() => document.fonts.ready);
  // System preferences must not change fitting or skip the animated transition.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 430, height: 700 }, { width: 768, height: 900 }, { width: 1440, height: 900 }, { width: 1920, height: 1080 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport);
    for (const id of screenIds) {
      await navigate(page, id);
      await expect.poll(async () => {
        const box = await activePage(page).locator('.screen-content').boundingBox();
        if (!box) return false;
        return box.x >= -1 && box.y >= -1 && box.x + box.width <= viewport.width + 1 && box.y + box.height <= viewport.height + 1;
      }, { message: `${id} must fit ${viewport.width} × ${viewport.height}` }).toBe(true);
      const geometry = await activePage(page).locator('.screen-content').evaluate(el => {
        const box = el.getBoundingClientRect();
        return { center: box.y + box.height / 2, scroll: window.scrollY, overflow: document.documentElement.scrollWidth - innerWidth,
          cards: [...el.querySelectorAll('.info-card')].map(card => {
            const rect = card.getBoundingClientRect();
            return { width: rect.width, height: rect.height, overflow: card.scrollHeight - card.clientHeight };
          }) };
      });
      expect(Math.abs(geometry.center - viewport.height / 2), `${id} vertical center`).toBeLessThanOrEqual(3);
      expect(geometry.scroll).toBe(0);
      expect(geometry.overflow).toBeLessThanOrEqual(1);
      if (id === 'experience' || id === 'services') {
        const cards = geometry.cards;
        expect(cards).toHaveLength(4);
        for (const card of cards) {
          expect(Math.abs(card.width - card.height), `${id}: square card`).toBeLessThanOrEqual(1);
          expect(card.overflow, `${id}: text fits inside square`).toBeLessThanOrEqual(1);
        }
      }
    }
  }
});

test('wheel inertia advances one screen and navigation remains reversible', async ({ page, browserName, isMobile }) => {
  await page.goto('/portfolio/ru/manager/');
  await settled(page);
  await page.mouse.move(10, 100);
  // A sustained inertial wheel burst must not enqueue multiple page changes.
  for (let i = 0; i < 12; i++) {
    if (browserName === 'webkit' && isMobile) await page.locator('.screen-stage').dispatchEvent('wheel', { deltaY: 140 - i * 8, bubbles: true, cancelable: true });
    else await page.mouse.wheel(0, 140 - i * 8);
    await page.waitForTimeout(80);
  }
  await expect(page.locator('.screen-stage')).toHaveAttribute('data-active-screen', 'experience');
  await settled(page);
  await page.waitForTimeout(850);
  await expect(page.locator('.screen-stage')).toHaveAttribute('data-active-screen', 'experience');
  await page.keyboard.press('PageDown');
  await expect(page.locator('.screen-stage')).toHaveAttribute('data-active-screen', 'services');
  await settled(page);
  await page.goBack();
  await expect(page.locator('.screen-stage')).toHaveAttribute('data-active-screen', 'experience');
  await settled(page);
  await page.goForward();
  await expect(page.locator('.screen-stage')).toHaveAttribute('data-active-screen', 'services');
  await settled(page);
});

test('normal motion visibly animates screen arrival and whole square cards', async ({ page }) => {
  await page.goto('/portfolio/ru/manager/');
  await settled(page);
  await page.evaluate(() => {
    const stage = document.querySelector('.screen-stage') as HTMLElement & { qaTiming?: { start: number; duration: number } };
    stage.qaTiming = { start: 0, duration: 0 };
    const observer = new MutationObserver(() => {
      if (stage.dataset.transitioning === 'true') stage.qaTiming!.start = performance.now();
      else if (stage.qaTiming!.start) {
        stage.qaTiming!.duration = performance.now() - stage.qaTiming!.start;
        observer.disconnect();
      }
    });
    observer.observe(stage, { attributes: true, attributeFilter: ['data-transitioning'] });
  });
  await page.keyboard.press('PageDown');
  await expect(page.locator('.screen-stage')).toHaveAttribute('data-transitioning', 'true');
  const beginning = await activePage(page).locator('.screen-content').boundingBox();
  await page.waitForTimeout(300);
  const intermediate = await activePage(page).locator('.screen-content').boundingBox();
  await settled(page);
  const ending = await activePage(page).locator('.screen-content').boundingBox();
  expect(Math.abs(beginning!.y - ending!.y), 'screen actually travels towards the center').toBeGreaterThan(10);
  expect(Math.abs(intermediate!.y - ending!.y)).toBeLessThan(Math.abs(beginning!.y - ending!.y));
  const elapsed = await page.locator('.screen-stage').evaluate(el => (el as HTMLElement & { qaTiming: { duration: number } }).qaTiming.duration);
  expect(elapsed, 'screen transition lasts about1200ms').toBeGreaterThanOrEqual(1100);
  expect(elapsed, 'screen transition lasts about1200ms').toBeLessThanOrEqual(1450);
  const cards = activePage(page).locator('.info-card');
  expect(await cards.evaluateAll(nodes => Math.max(...nodes.map(el => el.scrollHeight - el.clientHeight))), 'Russian metrics fit inside their cards').toBeLessThanOrEqual(1);
  const start = await cards.evaluateAll(nodes => nodes.map(el => el.getBoundingClientRect().width));
  await expect.poll(async () => {
    const widths = await cards.evaluateAll(nodes => nodes.map(el => el.getBoundingClientRect().width));
    return Math.max(...widths.map((width, index) => Math.abs(width - start[index])));
  }, { message: 'passive wave scales white cards, not only icons', timeout: 4_000 }).toBeGreaterThan(.4);
});

test('adjacent screens remain visible, scaled and inert around the active screen', async ({ page }) => {
  await page.goto('/portfolio/ru/manager/');
  await settled(page);
  const mobile = page.viewportSize()!.width < 768;
  await expect(page.locator('.screen-page')).toHaveCount(mobile ? 5 : 6);
  for (const id of mobile ? screenIds.slice(0, 5) : screenIds) {
    await navigate(page, id);
    const panels = await page.locator('.screen-page').evaluateAll(nodes => nodes.map(el => {
      const style = getComputedStyle(el);
      const matrix = new DOMMatrix(style.transform);
      const content = el.querySelector('.screen-content')!.getBoundingClientRect();
      return {
        active: el.getAttribute('data-active') === 'true',
        inert: el.hasAttribute('inert'),
        opacity: Number(style.opacity),
        scale: Math.hypot(matrix.a, matrix.b),
        visibleHeight: Math.max(0, Math.min(content.bottom, innerHeight) - Math.max(content.top, 0)),
        height: content.height,
        visibility: style.visibility,
      };
    }));
    const current = panels.findIndex(panel => panel.active);
    expect(current).toBeGreaterThanOrEqual(0);
    for (const neighborIndex of [current - 1, current + 1].filter(index => index >= 0 && index < panels.length)) {
      const neighbor = panels[neighborIndex];
      expect(neighbor.inert, `${id}: neighbor cannot capture keyboard focus`).toBe(true);
      expect(neighbor.visibility).toBe('visible');
      expect(neighbor.opacity).toBeCloseTo(.2, 2);
      expect(neighbor.scale).toBeCloseTo(.75, 2);
      expect(neighbor.visibleHeight, `${id}: part of adjacent content is visible`).toBeGreaterThan(2);
      expect(neighbor.visibleHeight).toBeLessThan(neighbor.height);
    }
  }
});

test('blue text buttons share native Figma dimensions and language control height', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/portfolio/ru/manager/');
  for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 1000 }]) {
    await page.setViewportSize(viewport);
    await settled(page);
    const expected = viewport.width < 768 ? { width: 129, height: 25 } : { width: 243, height: 52 };
    const buttons = await page.locator('.screen-page .button').evaluateAll(nodes => nodes.map(el => {
      const style = getComputedStyle(el);
      return { text: el.textContent, width: parseFloat(style.width), height: parseFloat(style.height) };
    }));
    expect(buttons.length).toBeGreaterThanOrEqual(5);
    for (const button of buttons) {
      expect(button.width, `${button.text}: native button width`).toBeCloseTo(expected.width, 1);
      expect(button.height, `${button.text}: native button height`).toBeCloseTo(expected.height, 1);
    }
    const sliders = await page.locator('.language-switch').evaluateAll(nodes => nodes.map(el => parseFloat(getComputedStyle(el).height)));
    for (const height of sliders) expect(height).toBeCloseTo(expected.height, 1);
  }
});

test('reduced motion preserves discrete screens and excludes inactive controls from keyboard access', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/portfolio/en/engineer/#services');
  await settled(page);
  await expect(page.locator('.screen-stage')).toHaveAttribute('data-active-screen', 'services');
  const inactive = page.locator('.screen-page[data-active="false"]');
  expect(await inactive.evaluateAll(nodes => nodes.every(el => el.hasAttribute('inert')))).toBe(true);
  await page.keyboard.press('PageDown');
  await expect(page.locator('.screen-stage')).toHaveAttribute('data-active-screen', 'projects');
  await settled(page);
  await page.getByTestId('project-dot-0').focus();
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => {
      const panel = document.activeElement?.closest('.screen-page');
      return !panel || panel.getAttribute('data-active') === 'true';
    })).toBe(true);
  }
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
});

test('carousel wrap never carries an unrelated card through the center', async ({ page }) => {
  await page.goto('/portfolio/en/manager/#projects');
  await settled(page);
  await carouselStep(page, 'next', false);
  const samples = await page.evaluate(async () => {
    const unrelated = [...document.querySelectorAll<HTMLElement>('[data-testid="project-card"]')].slice(2);
    const badFrames: string[] = [];
    const until = performance.now() + 900;
    while (performance.now() < until) {
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      const viewport = document.querySelector('.carousel-viewport')!.getBoundingClientRect();
      const center = viewport.x + viewport.width / 2;
      for (const card of unrelated) {
        const style = getComputedStyle(card);
        if (style.visibility === 'hidden' || style.display === 'none' || Number(style.opacity) < .01) continue;
        const rect = card.getBoundingClientRect();
        if (Math.abs(rect.x + rect.width / 2 - center) < 35) badFrames.push(card.querySelector('h3')?.textContent ?? 'unknown');
      }
    }
    return badFrames;
  });
  expect(samples).toEqual([]);
  await expect(page.getByTestId('project-card').nth(1)).toHaveAttribute('aria-current', 'true');
  await expect(page.getByTestId('carousel')).toHaveAttribute('data-moving', 'false');
  await carouselStep(page, 'previous');
  await expect(page.getByTestId('carousel')).toHaveAttribute('data-moving', 'false');
  await carouselStep(page, 'previous');
  await expect(page.getByTestId('project-card').nth(5)).toHaveAttribute('aria-current', 'true');
  await expect(page.getByTestId('carousel')).toHaveAttribute('data-moving', 'false');
  await expect(page.locator('.screen-stage')).toHaveAttribute('data-active-screen', 'projects');
});

test('horizontal swipe stays in projects and rapid clicks cannot open an accidental game', async ({ page }) => {
  await page.goto('/portfolio/en/manager/#projects');
  await settled(page);
  await drag(page, '.project-card.active .project-preview', 'left');
  await expect(page.getByTestId('project-card').nth(1)).toHaveAttribute('aria-current', 'true');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.screen-stage')).toHaveAttribute('data-active-screen', 'projects');
  for (let i = 0; i < 4; i++) {
    if (page.viewportSize()!.width >= 768) await page.getByTestId('next-project').click({ force: true });
    else await page.getByTestId('project-dot-0').press('ArrowRight');
  }
  await expect(page.getByTestId('carousel')).toHaveAttribute('data-moving', 'false');
  await expect(page.locator('[data-testid="project-card"][aria-current="true"]')).toHaveCount(1);
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('native mobile touch distinguishes page swipes from project swipes', async ({ page, browserName, isMobile }) => {
  test.skip(browserName !== 'chromium' || !isMobile, 'Native touch injection uses Chromium CDP; pointer gestures are covered in all browsers.');
  const session = await page.context().newCDPSession(page);
  async function swipe(from: { x: number; y: number }, to: { x: number; y: number }) {
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...from, id: 1 }] });
    for (let step = 1; step <= 8; step++) {
      await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: from.x + (to.x - from.x) * step / 8, y: from.y + (to.y - from.y) * step / 8, id: 1 }] });
      await page.waitForTimeout(20);
    }
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  }
  try {
    await page.goto('/portfolio/ru/manager/');
    await settled(page);
    const viewport = page.viewportSize()!;
    await swipe({ x: 15, y: viewport.height * .75 }, { x: 15, y: viewport.height * .25 });
    await expect(page.locator('.screen-stage')).toHaveAttribute('data-active-screen', 'experience');
    await settled(page);
    await navigate(page, 'projects');
    const box = await page.locator('.project-card.active .project-preview').boundingBox();
    expect(box).not.toBeNull();
    await swipe({ x: box!.x + box!.width * .85, y: box!.y + box!.height / 2 }, { x: box!.x + box!.width * .15, y: box!.y + box!.height / 2 });
    await expect(page.getByTestId('project-card').nth(1)).toHaveAttribute('aria-current', 'true');
    await expect(page.locator('.screen-stage')).toHaveAttribute('data-active-screen', 'projects');
    await expect(page.getByRole('dialog')).toHaveCount(0);
  } finally { await session.detach(); }
});

test('language slider drag preserves role and the first screen', async ({ page }) => {
  await page.goto('/portfolio/ru/designer/#about');
  await settled(page);
  await drag(page, '.screen-page[data-active="true"] .language-switch', 'right');
  await expect(page).toHaveURL(/\/portfolio\/en\/designer\/#about$/);
  await settled(page);
  await expect(page.locator('#about')).toBeVisible();
  await drag(page, '.screen-page[data-active="true"] .language-switch', 'left');
  await expect(page).toHaveURL(/\/portfolio\/ru\/designer\/#about$/);
  await settled(page);
  await expect(page.locator('#about')).toBeVisible();
});

test('open game freezes screen input and closing restores focus', async ({ page, browserName, isMobile }) => {
  await page.route('**/*', async route => {
    if (new URL(route.request().url()).hostname === '127.0.0.1') return route.continue();
    await route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Preview</title><p>Interactive preview</p>' });
  });
  await page.goto('/portfolio/en/manager/#projects');
  await settled(page);
  const opener = page.getByTestId('play-yacht');
  await opener.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  if (browserName === 'webkit' && isMobile) await page.locator('.screen-stage').dispatchEvent('wheel', { deltaY: 600, bubbles: true, cancelable: true });
  else await page.mouse.wheel(0, 600);
  await page.keyboard.press('PageDown');
  await expect(page.locator('.screen-stage')).toHaveAttribute('data-active-screen', 'projects');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(opener).toBeFocused();
});

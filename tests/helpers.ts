import { expect, type Page } from '@playwright/test';

export async function settled(page: Page) {
  await expect(page.locator('.screen-stage')).toHaveAttribute('data-intro', 'false');
  await expect(page.locator('.screen-stage')).toHaveAttribute('data-transitioning', 'false');
  await expect(page.locator('.screen-page[data-active="true"]')).toHaveCount(1);
}

export async function carouselSettled(page: Page) {
  await expect(page.getByTestId('carousel')).toHaveAttribute('data-moving', 'false');
}

export async function carouselStep(page: Page, direction: 'next' | 'previous', wait = true) {
  await carouselSettled(page);
  if (page.viewportSize()!.width >= 768) {
    await page.getByTestId(`${direction}-project`).click();
  } else {
    await page.getByTestId('project-dot-0').focus();
    await page.keyboard.press(direction === 'next' ? 'ArrowRight' : 'ArrowLeft');
  }
  if (wait) await carouselSettled(page);
}

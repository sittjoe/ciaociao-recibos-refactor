import { Page, expect } from '@playwright/test';

export async function loginIfNeeded(page: Page, targetPath: string) {
  await page.goto(`/auth/index.html?redirect=${encodeURIComponent(targetPath)}`);
  // If already redirected to target, return
  if (page.url().includes(targetPath)) return;
  await page.fill('#passInput', '27181730');
  await page.click('#enter');
  await page.waitForURL('**' + targetPath);
}

export async function expectModalOpen(page: Page, modalId: string) {
  await expect(page.locator(`#${modalId}`)).toHaveClass(/active/);
}


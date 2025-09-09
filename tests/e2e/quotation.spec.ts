import { test, expect } from '@playwright/test';
import { loginIfNeeded, expectModalOpen } from './utils';

test.describe('Cotización – Ajustes y Seleccionar cliente', () => {
  test('abre Ajustes y Seleccionar cliente', async ({ page }) => {
    await loginIfNeeded(page, '/quotation/index.html');
    // Ajustes
    await page.click('#openSettings');
    await expectModalOpen(page, 'settingsModal');
    await page.click('#closeSettingsModal');
    await expect(page.locator('#settingsModal')).not.toHaveClass(/active/);

    // Seleccionar cliente
    await page.click('#pick-client');
    await expectModalOpen(page, 'clientsModal');
    await page.click('#closeClientsModal');
    await expect(page.locator('#clientsModal')).not.toHaveClass(/active/);
  });
});


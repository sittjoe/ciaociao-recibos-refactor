import { test, expect } from '@playwright/test';
import { loginIfNeeded } from './utils';

test.describe('Recibo – QR, Folio y Ajustes', () => {
  test('genera QR en carga y folio automático', async ({ page }) => {
    page.on('console', m => console.log('PAGE:', m.type(), m.text()));
    page.on('pageerror', e => console.log('PAGEERROR:', e.message));
    await loginIfNeeded(page, '/receipt/index.html');
    console.log('readyState:', await page.evaluate(()=>document.readyState));
    console.log('has module receipt:', await page.evaluate(()=>!![...document.querySelectorAll('script')].find(s=> (s as HTMLScriptElement).src.includes('/src/receipt/receipt.js'))));
    console.log('has year:', await page.evaluate(()=>!!document.getElementById('year')));
    console.log('year text:', await page.evaluate(()=>document.getElementById('year')?.textContent||''));
    console.log('receiptNumber before:', await page.evaluate(()=>document.getElementById('receiptNumber')?.textContent||''));
    // Folio distinto de '---'
    const folio = page.locator('#receiptNumber');
    await expect(folio).not.toHaveText('---');
    // QR generado (algún hijo dentro de #qrBox)
    const qrBox = page.locator('#qrBox');
    await expect(async () => {
      const count = await qrBox.evaluate((el) => el ? (el as HTMLElement).children.length : 0);
      expect(count).toBeGreaterThan(0);
    }).toPass();
  });

  test('ajustes se guardan y aplican', async ({ page }) => {
    await loginIfNeeded(page, '/receipt/index.html');
    console.log('receiptNumber at settings test:', await page.evaluate(()=>document.getElementById('receiptNumber')?.textContent||''));
    await page.click('#openSettings');
    // Cambiar ajustes
    await page.fill('#settingsIvaRate', '8');
    await page.selectOption('#settingsApplyIVA', 'false');
    await page.fill('#settingsValidityDays', '10');
    await page.selectOption('#settingsPdfFormat', 'a4');
    await page.click('#saveSettingsModal');

    // Verificar se aplicó al UI principal
    await expect(page.locator('#applyIVA')).not.toBeChecked();
    await expect(page.locator('#ivaRate')).toHaveValue('8');

    // Recargar y validar persistencia
    await page.reload();
    await page.click('#openSettings');
    await expect(page.locator('#settingsIvaRate')).toHaveValue('8');
    await expect(page.locator('#settingsApplyIVA')).toHaveValue('false');
    await expect(page.locator('#settingsValidityDays')).toHaveValue('10');
    await expect(page.locator('#settingsPdfFormat')).toHaveValue('a4');
  });
});

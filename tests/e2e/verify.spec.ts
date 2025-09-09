import { test, expect } from '@playwright/test';
import { loginIfNeeded } from './utils';

test('verificador muestra Verificado para un QR generado localmente', async ({ page, context }) => {
  // Configurar verifyBase al localhost del server de pruebas y ruta por defecto
  await loginIfNeeded(page, '/receipt/index.html');
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('app_settings')||'{}');
    s.verifyBase = location.origin; s.verifyPath = '/verify/index.html';
    localStorage.setItem('app_settings', JSON.stringify(s));
  });
  // Forzar regeneración del QR
  await page.reload();
  const url = await page.evaluate(() => (document.getElementById('qrBox') as HTMLElement)?.dataset.url || '');
  expect(url).toContain('/verify/index.html?p=');
  // Abrir verificador y validar
  const v = await context.newPage();
  await v.goto(url);
  await expect(v.locator('#statusBadge')).toContainText('Verificado');
  await v.close();
});


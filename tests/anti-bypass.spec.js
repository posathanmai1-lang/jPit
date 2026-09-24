// jPit Automated Playwright Anti-Bypass Verification Test Suite
const { test, expect, chromium } = require('@playwright/test');
const path = require('path');

const extensionPath = path.join(__dirname, '../src');

test.describe('jPit Anti-Bypass Test Suite Verification', () => {
  let context;
  let page;

  test.beforeAll(async () => {
    context = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`
      ]
    });
    page = await context.newPage();
    await page.goto('http://localhost:3000/harness.html');
  });

  test.afterAll(async () => {
    if (context) await context.close();
  });

  test('TC01: Inline onpaste return false unblocked', async () => {
    await page.click('#tc01');
    await page.evaluate(() => navigator.clipboard.writeText('PAYLOAD_TC01'));
    await page.keyboard.press('Control+v');
    await expect(page.locator('#tc01')).toHaveValue('PAYLOAD_TC01');
  });

  test('TC02: addEventListener paste preventDefault unblocked', async () => {
    await page.click('#tc02');
    await page.evaluate(() => navigator.clipboard.writeText('PAYLOAD_TC02'));
    await page.keyboard.press('Control+v');
    await expect(page.locator('#tc02')).toHaveValue('PAYLOAD_TC02');
  });

  test('TC03: React controlled component synthetic state updated', async () => {
    await page.click('#react-input');
    await page.evaluate(() => navigator.clipboard.writeText('PAYLOAD_REACT'));
    await page.keyboard.press('Control+v');
    await page.click('#react-submit');
    await expect(page.locator('#react-result')).toHaveText('PAYLOAD_REACT');
  });

  test('TC06: beforeinput insertFromPaste unblocked', async () => {
    await page.click('#tc06');
    await page.evaluate(() => navigator.clipboard.writeText('PAYLOAD_BEFOREINPUT'));
    await page.keyboard.press('Control+v');
    await expect(page.locator('#tc06')).toHaveValue('PAYLOAD_BEFOREINPUT');
  });

  test('TC08: System hotkey keydown theft unblocked', async () => {
    await page.click('#tc08');
    await page.evaluate(() => navigator.clipboard.writeText('PAYLOAD_HOTKEY'));
    await page.keyboard.press('Control+v');
    await expect(page.locator('#tc08')).toHaveValue('PAYLOAD_HOTKEY');
  });

  test('TC13: DevTools shortcut interception bypassed', async () => {
    // Enable DevTools shield on the page
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('jPit_ConfigUpdate', {
        detail: { active: true, devToolsShield: true, unblockDevTools: true }
      }));
    });

    await page.keyboard.press('F12');
    // The site listener should have been blocked from cancelling the event
    await expect(page.locator('#tc13-status')).toHaveText('Waiting for keypress...');
  });

  test('TC14: Debugger flooding in Function constructor neutralized', async () => {
    await page.click('#tc14-btn');
    await expect(page.locator('#tc14-status')).toHaveText('SUCCESS_WITHOUT_FREEZE');
  });

  test('TC15: Window dimension DevTools detection heuristic safe', async () => {
    await page.click('#tc15-btn');
    await expect(page.locator('#tc15-status')).toHaveText('HEURISTIC_SAFE');
  });

  test('TC16: Console getter trap neutralized', async () => {
    await page.click('#tc16-btn');
    await expect(page.locator('#tc16-status')).toHaveText('TRAP_NEUTRALIZED');
  });
});

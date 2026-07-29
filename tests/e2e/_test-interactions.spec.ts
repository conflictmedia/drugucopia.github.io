import { expect, test } from "playwright/test";
import packageJson from "../../package.json" with { type: "json" };

test("interaction checker search box works", async ({ page }) => {
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  page.on('console', msg => {
    if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text());
  });

  await page.goto("/interactions");
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);

  // Set localStorage to skip tour/changelog BEFORE reloading.
  // Use the actual app version so the changelog popup doesn't appear
  // (it compares last-seen-version to APP_VERSION and shows on mismatch).
  await page.evaluate((appVersion) => {
    localStorage.setItem('drugucopia-tour-complete', 'true');
    localStorage.setItem('drugucopia-last-seen-version', appVersion);
  }, packageJson.version);
  await page.reload();
  await page.waitForTimeout(2000);
  
  console.log('Modal count after dismiss:', await page.locator('.fixed.inset-0.z-50').count());
  console.log('LS state:', await page.evaluate(() => ({
    tour: localStorage.getItem('drugucopia-tour-complete'),
    ver: localStorage.getItem('drugucopia-last-seen-version'),
  })));
  
  // Now try the search
  const trigger = page.locator('[role="combobox"]').first();
  await trigger.click();
  await page.waitForTimeout(500);
  
  console.log('Combobox expanded?', await trigger.getAttribute('aria-expanded'));
  
  const input = page.locator('input[placeholder*="substance"]').first();
  if (await input.count() > 0) {
    await input.fill('mdma');
    await page.waitForTimeout(2000);
    
    const results = page.locator('[role="option"]');
    console.log('Results:', await results.count());
    
    if (await results.count() > 0) {
      const text = await results.first().innerText();
      console.log('First result:', text.substring(0, 80));
    }
  }
  
  console.log('TEST COMPLETE');
});

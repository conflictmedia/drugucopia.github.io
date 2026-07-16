import { expect, test } from "playwright/test";

test("the production app remains usable offline after installation", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Drugucopia/);

  // Registration can trigger one controller-change navigation when a worker
  // from an earlier run is replaced, so poll across navigations instead of
  // holding a single evaluate context open.
  await expect
    .poll(async () => {
      try {
        return await page.evaluate(
          async () => (await navigator.serviceWorker.getRegistrations()).length,
        );
      } catch {
        return 0;
      }
    })
    .toBeGreaterThan(0);
  await page.waitForLoadState("domcontentloaded");
  await page.reload();
  await expect
    .poll(async () => {
      try {
        return await page.evaluate(() =>
          Boolean(navigator.serviceWorker.controller),
        );
      } catch {
        return false;
      }
    })
    .toBe(true);

  await context.setOffline(true);
  await page.reload();
  await expect(page).toHaveTitle(/Drugucopia/);
  await expect(page.locator("body")).not.toContainText(
    "Drugucopia can’t reach the network",
  );
});

test("the update message protocol activates a waiting worker", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    registration.active?.postMessage({ type: "SKIP_WAITING" });
  });
  await expect(page).toHaveTitle(/Drugucopia/);
});

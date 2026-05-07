import { expect, type Locator, type Page } from '@playwright/test';

/** Returns the tab locator collection for a panel. */
export function tabsInPanel(page: Page, panelId: number): Locator {
  return page.getByTestId(`panel-${panelId}-tabbar`).locator('[data-testid^="tab-"]');
}

/** Returns the active tab locator for a panel. */
export function activeTabInPanel(page: Page, panelId: number): Locator {
  return page.getByTestId(`panel-${panelId}-tabbar`).locator('[data-testid^="tab-"][data-active="true"]');
}

/** Returns the current number of tabs in a panel. */
export async function tabCount(page: Page, panelId: number) {
  return tabsInPanel(page, panelId).count();
}

/** Returns whether the Electron BrowserWindow is currently visible. */
export async function isWindowVisible(page: Page) {
  return page.evaluate(async () => window.electronAPI?.isWindowVisible?.() ?? true);
}

/** Creates a new tool tab in the requested panel. */
export async function createToolInPanel(page: Page, panelId: number, toolId: string) {
  await page.getByTestId(`panel-${panelId}-add-tab`).click();
  await page.getByTestId(`panel-${panelId}-tool-${toolId}`).click();
  await expect(activeTabInPanel(page, panelId)).toHaveAttribute('data-tool-id', toolId);
}

/** Focuses a panel shell so keyboard shortcuts target that panel. */
export async function focusPanel(page: Page, panelId: number) {
  const tabbar = page.getByTestId(`panel-${panelId}-tabbar`);
  if (await tabbar.count() > 0) {
    await tabbar.click();
  } else {
    await page.getByTestId(`panel-${panelId}-content`).click();
  }
  await expect(page.getByTestId(`panel-${panelId}`)).toBeVisible();
}

import { expect, type Page } from '@playwright/test';

/** Returns the platform primary modifier for Playwright keyboard input. */
export const primaryKey = () => process.platform === 'darwin' ? 'Meta' : 'Control';

/** Returns the platform primary modifier label shown in the app UI. */
export const primaryLabel = () => process.platform === 'darwin' ? 'Meta' : 'Ctrl';

/** Opens the shortcut settings tab. */
export async function openShortcutSettings(page: Page) {
  await page.getByTestId('settings-button').click();
  await page.getByRole('button', { name: /shortcuts/i }).click();
  await page.getByTestId('shortcut-reset').waitFor();
}

/** Closes the shortcut settings sheet through its explicit close control. */
export async function closeShortcutSettings(page: Page) {
  await page.getByTestId('settings-sheet-close').click();
  await page.getByTestId('shortcut-reset').waitFor({ state: 'hidden' });
}

/** Applies the tmux shortcut preset and closes settings. */
export async function applyTmuxPreset(page: Page) {
  await openShortcutSettings(page);
  await page.getByTestId('shortcut-preset-tmux').click();
  await expect(page.getByTestId('shortcut-row-switch-tab-1')).toContainText(primaryLabel());
  await expect(page.getByTestId('shortcut-row-switch-tab-1')).toContainText('then');
  await closeShortcutSettings(page);
}

/** Applies the iTerm shortcut preset and closes settings. */
export async function applyItermPreset(page: Page) {
  await openShortcutSettings(page);
  await page.getByTestId('shortcut-preset-iterm').click();
  await expect(page.getByTestId('shortcut-row-switch-tab-1')).toContainText(primaryLabel());
  await expect(page.getByTestId('shortcut-row-switch-tab-1')).toContainText('1');
  await closeShortcutSettings(page);
}

/** Presses a two-step prefix shortcut sequence. */
export async function pressPrefix(page: Page, first: string, second: string) {
  await page.keyboard.press(first);
  await page.keyboard.press(second);
}

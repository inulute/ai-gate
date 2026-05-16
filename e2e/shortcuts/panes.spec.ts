import { test, expect } from '../fixtures/electronApp';
import { activeTabInPanel, createToolInPanel, focusPanel, isWindowVisible, tabCount, tabsInPanel } from '../support/app';
import { applyItermPreset, applyTmuxPreset, pressPrefix, primaryKey } from '../support/shortcuts';

test('iTerm direct tab shortcut switches to the intended tab', async ({ appPage }) => {
  await applyItermPreset(appPage);
  await createToolInPanel(appPage, 0, 'gemini');
  await focusPanel(appPage, 0);
  await appPage.keyboard.press(`${primaryKey()}+1`);

  await expect(activeTabInPanel(appPage, 0)).toHaveAttribute('data-tool-id', 'chatgpt');
});

test('tmux prefix number switches to the intended tab', async ({ appPage }) => {
  await applyTmuxPreset(appPage);
  await createToolInPanel(appPage, 0, 'gemini');
  await focusPanel(appPage, 0);
  await pressPrefix(appPage, `${primaryKey()}+B`, '1');

  await expect(activeTabInPanel(appPage, 0)).toHaveAttribute('data-tool-id', 'chatgpt');
});

test('Escape cancels prefix mode and the next key does not trigger a shortcut', async ({ appPage }) => {
  await applyTmuxPreset(appPage);
  await focusPanel(appPage, 0);
  const startingCount = await tabCount(appPage, 0);
  await appPage.keyboard.press(`${primaryKey()}+N`);
  await appPage.keyboard.press('Escape');
  await appPage.keyboard.press('3');

  await expect.poll(() => tabCount(appPage, 0)).toBe(startingCount);
});

test('tmux prefix n then provider number creates a provider tab', async ({ appPage }) => {
  await applyTmuxPreset(appPage);
  await focusPanel(appPage, 0);
  const startingCount = await tabCount(appPage, 0);
  await pressPrefix(appPage, `${primaryKey()}+N`, '3');

  await expect.poll(() => tabCount(appPage, 0)).toBe(startingCount + 1);
  await expect(activeTabInPanel(appPage, 0)).toHaveAttribute('data-tool-id', 'perplexity');
});

test('primary W closes an app tab and keeps the Electron window visible', async ({ appPage }) => {
  await createToolInPanel(appPage, 0, 'gemini');
  await focusPanel(appPage, 0);
  await appPage.keyboard.press(`${primaryKey()}+W`);

  await expect.poll(() => tabCount(appPage, 0)).toBe(1);
  await expect(activeTabInPanel(appPage, 0)).toHaveAttribute('data-tool-id', 'chatgpt');
  await expect.poll(() => isWindowVisible(appPage)).toBe(true);
});

test('closing the active middle tab selects the next adjacent tab', async ({ appPage }) => {
  await applyTmuxPreset(appPage);
  await createToolInPanel(appPage, 0, 'gemini');
  await focusPanel(appPage, 0);
  await pressPrefix(appPage, `${primaryKey()}+N`, '3');
  await tabsInPanel(appPage, 0).nth(1).click();
  await expect(activeTabInPanel(appPage, 0)).toHaveAttribute('data-tool-id', 'gemini');

  await focusPanel(appPage, 0);
  await pressPrefix(appPage, `${primaryKey()}+B`, 'x');

  await expect.poll(() => tabCount(appPage, 0)).toBe(2);
  await expect(activeTabInPanel(appPage, 0)).toHaveAttribute('data-tool-id', 'perplexity');
});

test('tab number setting prefixes tabs by visible order', async ({ appPage }) => {
  await appPage.getByTestId('settings-button').click();
  await appPage.getByLabel('Show numbers before tabs').click();
  await appPage.getByRole('button', { name: /save settings/i }).click();

  await expect(tabsInPanel(appPage, 0).nth(0)).toContainText('1:');
  await createToolInPanel(appPage, 0, 'gemini');
  await expect(tabsInPanel(appPage, 0).nth(1)).toContainText('2:');
});

test('tmux prefix x closes the active pane tab', async ({ appPage }) => {
  await applyTmuxPreset(appPage);
  await createToolInPanel(appPage, 0, 'gemini');
  await focusPanel(appPage, 0);
  await pressPrefix(appPage, `${primaryKey()}+B`, 'x');

  await expect.poll(() => tabCount(appPage, 0)).toBe(1);
  await expect(activeTabInPanel(appPage, 0)).toHaveAttribute('data-tool-id', 'chatgpt');
});

test('tmux prefix comma opens rename and Enter saves the active pane tab name', async ({ appPage }) => {
  await applyTmuxPreset(appPage);
  await focusPanel(appPage, 0);
  await pressPrefix(appPage, `${primaryKey()}+B`, 'Comma');
  await expect(appPage.getByTestId('rename-tab-dialog')).toBeVisible();

  await appPage.getByRole('textbox').fill('Research');
  await appPage.keyboard.press('Enter');

  await expect(activeTabInPanel(appPage, 0)).toContainText('Research');
});

test('close-current shortcut closes the active pane tab, not another pane', async ({ appPage }) => {
  await applyTmuxPreset(appPage);
  await appPage.keyboard.press('Alt+2');
  await focusPanel(appPage, 1);
  await pressPrefix(appPage, `${primaryKey()}+N`, '2');
  await expect(activeTabInPanel(appPage, 1)).toHaveAttribute('data-tool-id', 'gemini');
  await pressPrefix(appPage, `${primaryKey()}+B`, 'x');

  await expect.poll(() => tabCount(appPage, 1)).toBe(0);
  await expect(activeTabInPanel(appPage, 0)).toHaveAttribute('data-tool-id', 'chatgpt');
});

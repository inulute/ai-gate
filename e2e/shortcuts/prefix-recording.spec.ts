import { test, expect } from '../fixtures/electronApp';
import { closeShortcutSettings, openShortcutSettings, primaryKey, primaryLabel } from '../support/shortcuts';

test('recording prefix shortcut supports multiple steps', async ({ appPage }) => {
  await openShortcutSettings(appPage);
  await appPage.getByTestId('edit-shortcut-rename-current-tab').click();
  await appPage.getByLabel('Prefix').click();
  await appPage.getByRole('button', { name: /record new shortcut/i }).click();
  await appPage.keyboard.press(`${primaryKey()}+B`);
  await appPage.keyboard.press('Comma');
  await appPage.getByRole('button', { name: 'Done' }).click();

  await expect(appPage.getByText('Recorded Shortcut:')).toBeVisible();
  await expect(appPage.getByText('then')).toBeVisible();
  await appPage.getByRole('button', { name: 'Save Changes' }).click();
  await expect(appPage.getByTestId('shortcut-row-rename-current-tab')).toContainText(primaryLabel());
  await expect(appPage.getByTestId('shortcut-row-rename-current-tab')).toContainText(',');
});

test('recording standard shortcut saves one combo and executes it', async ({ appPage }) => {
  await openShortcutSettings(appPage);
  await appPage.getByTestId('edit-shortcut-rename-current-tab').click();
  await appPage.getByLabel('Standard').click();
  await appPage.getByRole('button', { name: /record new shortcut/i }).click();
  await appPage.keyboard.press('Alt+R');

  await expect(appPage.getByText('Recorded Shortcut:')).toBeVisible();
  await appPage.getByRole('button', { name: 'Save Changes' }).click();
  await expect(appPage.getByTestId('shortcut-row-rename-current-tab')).toContainText('Alt');
  await expect(appPage.getByTestId('shortcut-row-rename-current-tab')).toContainText('r');

  await closeShortcutSettings(appPage);
  await appPage.keyboard.press('Alt+R');
  await expect(appPage.getByTestId('rename-tab-dialog')).toBeVisible();
});

test('unsupported shifted number recording shows an error', async ({ appPage }) => {
  await openShortcutSettings(appPage);
  await appPage.getByTestId('edit-shortcut-rename-current-tab').click();
  await appPage.getByRole('button', { name: /record new shortcut/i }).click();
  await appPage.keyboard.press('Shift+1');

  await expect(appPage.getByTestId('shortcut-recorder-error')).toContainText('Shifted number and punctuation shortcuts are not supported in webviews');
});

import { test, expect } from '../fixtures/electronApp';
import { openShortcutSettings, primaryLabel } from '../support/shortcuts';

test('reset/original leaves provider-open shortcuts unassigned', async ({ appPage }) => {
  await openShortcutSettings(appPage);
  await appPage.getByTestId('shortcut-reset').click();

  await expect(appPage.getByTestId('shortcut-row-new-tool-tab-1')).toContainText('Not assigned');
  await expect(appPage.getByTestId('shortcut-row-switch-tab-1')).toContainText('Not assigned');
  await expect(appPage.getByTestId('shortcut-row-close-current-tool')).toContainText(primaryLabel());
  await expect(appPage.getByTestId('shortcut-row-close-current-tool')).toContainText('w');
  await expect(appPage.getByTestId('shortcut-row-layout-double')).toContainText('Alt');
  await expect(appPage.getByTestId('shortcut-row-layout-double')).toContainText('2');
});

test('iTerm preset assigns direct tab switching and keeps close tab shortcut', async ({ appPage }) => {
  await openShortcutSettings(appPage);
  await appPage.getByTestId('shortcut-preset-iterm').click();

  await expect(appPage.getByTestId('shortcut-row-switch-tab-1')).toContainText(primaryLabel());
  await expect(appPage.getByTestId('shortcut-row-switch-tab-1')).toContainText('1');
  await expect(appPage.getByTestId('shortcut-row-close-current-tool')).toContainText(primaryLabel());
  await expect(appPage.getByTestId('shortcut-row-close-current-tool')).toContainText('w');
});

test('fresh app launch does not keep shortcut state from another test', async ({ appPage }) => {
  await openShortcutSettings(appPage);

  await expect(appPage.getByTestId('shortcut-row-switch-tab-1')).toContainText('Not assigned');
});

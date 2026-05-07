import { _electron as electron, test as base, expect, type ElectronApplication, type Page } from '@playwright/test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

type Fixtures = {
  electronApp: ElectronApplication;
  appPage: Page;
};

export const test = base.extend<Fixtures>({
  electronApp: async ({}, use, testInfo) => {
    const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), `ai-gate-e2e-${testInfo.workerIndex}-`));
    const electronApp = await electron.launch({
      args: ['.'],
      cwd: path.resolve(__dirname, '../..'),
      env: {
        ...process.env,
        AI_GATE_E2E: '1',
        AI_GATE_E2E_DEV_SERVER_URL: 'http://127.0.0.1:5173',
        AI_GATE_E2E_USER_DATA_DIR: userDataDir,
        ELECTRON_DISABLE_SECURITY_WARNINGS: 'true',
        NODE_ENV: 'development',
      },
    });

    try {
      await use(electronApp);
    } finally {
      await electronApp.close();
      await fs.rm(userDataDir, { recursive: true, force: true });
    }
  },
  appPage: async ({ electronApp }, use) => {
    const page = await electronApp.firstWindow();
    await electronApp.evaluate(({ BrowserWindow }) => {
      const window = BrowserWindow.getAllWindows()[0];
      window.setSize(1400, 900);
      window.center();
      window.show();
      window.focus();
    });
    await page.waitForLoadState('domcontentloaded');
    await page.getByTestId('settings-button').waitFor();
    await page.getByTestId('panel-0-tabbar').waitFor();
    await use(page);
  },
});

export { expect };

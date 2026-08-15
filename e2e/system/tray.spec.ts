import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';
import { test, expect } from '@playwright/test';

const execFileAsync = promisify(execFile);

test('normalizes the macOS tray image to menu bar dimensions', async () => {
  const electronPath = require('electron') as string;
  const { stdout } = await execFileAsync(electronPath, [
    path.resolve('e2e/system/tray-harness.cjs'),
    path.resolve('dist-electron/trayIcon.js'),
    path.resolve('icons/png/favicon.png'),
  ]);
  const sizeLine = stdout.split('\n').find(line => line.startsWith('TRAY_SIZE:'));

  expect(sizeLine).toBeDefined();
  expect(JSON.parse(sizeLine!.slice('TRAY_SIZE:'.length))).toEqual({ width: 16, height: 16 });
});

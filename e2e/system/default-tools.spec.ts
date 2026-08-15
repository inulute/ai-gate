import { test, expect } from '../fixtures/electronApp';

const toolIds = (page: import('@playwright/test').Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('ai-tools') || '[]').map((t: { id: string }) => t.id));

test('seeds every built-in provider on a fresh install', async ({ appPage }) => {
  await expect.poll(() => toolIds(appPage)).toContain('kimi');
});

// A provider added in a later version has to reach installs that already have a
// seeded tool list, or only new users ever see it.
test('offers a newly added provider to an existing install', async ({ appPage }) => {
  await appPage.evaluate(() => {
    localStorage.setItem('ai-tools', JSON.stringify([
      { id: 'chatgpt', name: 'ChatGPT', url: 'about:blank', type: 'webview', icon: '' },
      { id: 'claude', name: 'Claude', url: 'about:blank', type: 'webview', icon: '' },
    ]));
    localStorage.removeItem('offered-default-tools');
  });
  await appPage.reload();

  await expect.poll(() => toolIds(appPage)).toEqual(['chatgpt', 'claude', 'kimi']);
});

// ...but a built-in the user deleted must stay deleted.
test('does not resurrect a built-in the user removed', async ({ appPage }) => {
  await appPage.evaluate(() => {
    localStorage.setItem('ai-tools', JSON.stringify([
      { id: 'chatgpt', name: 'ChatGPT', url: 'about:blank', type: 'webview', icon: '' },
    ]));
    localStorage.setItem('offered-default-tools', JSON.stringify([
      'chatgpt', 'gemini', 'perplexity', 'qwen', 'claude', 'grok', 'kimi',
    ]));
  });
  await appPage.reload();
  await appPage.waitForTimeout(1500);

  expect(await toolIds(appPage)).toEqual(['chatgpt']);
});

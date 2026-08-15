import { test, expect } from '../fixtures/electronApp';

test('does not automatically reopen a dismissed release', async ({ appPage }) => {
  await appPage.addInitScript(() => {
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (url === 'https://api.github.com/repos/inulute/ai-gate/releases/latest') {
        const version = localStorage.getItem('e2eLatestVersion');
        return new Response(JSON.stringify({
          tag_name: `v${version}`,
          body: 'Release notes',
          html_url: `https://github.com/inulute/ai-gate/releases/tag/v${version}`,
          published_at: '2026-07-22T00:00:00Z',
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }
      if (url.startsWith('https://raw.githubusercontent.com/inulute/ai-gate/main/release_notes/')) {
        return new Response('', { status: 404 });
      }
      return originalFetch(input, init);
    };
  });

  await appPage.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('e2eLatestVersion', '99.0.0');
  });
  await appPage.reload();

  await expect(appPage.getByRole('heading', { name: 'Update Available!' })).toBeVisible();
  await appPage.getByRole('button', { name: 'Close' }).click();
  await appPage.reload();

  await expect(appPage.getByRole('heading', { name: 'Update Available!' })).not.toBeVisible();
  expect(await appPage.evaluate(() => localStorage.getItem('dismissedUpdateVersion'))).toBe('99.0.0');

  await appPage.evaluate(() => localStorage.setItem('e2eLatestVersion', '99.0.1'));
  await appPage.reload();

  await expect(appPage.getByRole('heading', { name: 'Update Available!' })).toBeVisible();
});

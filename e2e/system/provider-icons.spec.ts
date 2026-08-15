import { test, expect } from '@playwright/test';
import { getProviderIconKey, resolveProviderIconKey } from '../../src/lib/providerIcons';

// The built-in providers must resolve to a bundled mark. Three of the remote
// icon URLs these tools used to point at stopped serving a decodable image,
// which silently pushed the sidebar onto Google's favicon proxy — and onto a
// blank box whenever that was slow or blocked.
const BUILT_IN_TOOL_URLS = [
  'https://chatgpt.com',
  'https://gemini.google.com',
  'https://www.perplexity.ai',
  'https://chat.qwen.ai',
  'https://claude.ai',
  'https://grok.com',
  'https://www.kimi.com',
];

test('ships a bundled mark for every built-in provider', () => {
  for (const url of BUILT_IN_TOOL_URLS) {
    expect(getProviderIconKey(url), url).not.toBeNull();
  }
});

test('matches subdomains and known alternates of a provider', () => {
  expect(getProviderIconKey('https://chat.openai.com/')).not.toBeNull();
  expect(getProviderIconKey('https://www.perplexity.ai/search')).not.toBeNull();
  expect(getProviderIconKey('https://x.ai')).not.toBeNull();
});

test('leaves unknown tools to the remote icon chain', () => {
  expect(getProviderIconKey('https://example.com')).toBeNull();
  expect(getProviderIconKey('not a url')).toBeNull();
});

// A suffix match must not treat an unrelated host that merely ends in the same
// characters as the provider (e.g. notclaude.ai) as a match.
test('does not match hosts that only share a suffix', () => {
  expect(getProviderIconKey('https://notclaude.ai')).toBeNull();
  expect(getProviderIconKey('https://fakegrok.com')).toBeNull();
});

// An uploaded icon is the one the user picked deliberately, so it has to win
// over the mark we ship for that provider.
test('an uploaded icon overrides the bundled mark', () => {
  expect(getProviderIconKey('https://chatgpt.com')).toBe('openai');
  expect(resolveProviderIconKey('https://chatgpt.com', 'data:image/png;base64,AAAA')).toBeNull();
  expect(resolveProviderIconKey('https://chatgpt.com', '')).toBe('openai');
  // A stale saved favicon URL is not a deliberate choice, so the mark wins.
  expect(resolveProviderIconKey('https://grok.com', 'https://grok.com/images/favicon-dark.png')).toBe('grok');
});

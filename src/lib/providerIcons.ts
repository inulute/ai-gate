// src/lib/providerIcons.ts
//
// Maps a tool URL to one of the provider marks that ship with the app. Kept
// separate from the SVGs themselves so the lookup can be imported without
// pulling in a component module.

export type ProviderIconKey = 'openai' | 'gemini' | 'perplexity' | 'qwen' | 'claude' | 'grok';

/**
 * Hostname suffixes for each bundled mark. Matching on the host rather than the
 * tool id means tools already persisted in localStorage — which still carry the
 * old remote icon URLs — pick up the bundled mark with no migration, and a
 * user-added tool pointing at the same provider gets it too.
 */
const PROVIDER_HOSTS: Array<{ key: ProviderIconKey; hosts: string[] }> = [
  { key: 'openai', hosts: ['chatgpt.com', 'chat.openai.com', 'openai.com'] },
  { key: 'gemini', hosts: ['gemini.google.com', 'bard.google.com'] },
  { key: 'perplexity', hosts: ['perplexity.ai'] },
  { key: 'qwen', hosts: ['qwen.ai', 'tongyi.aliyun.com'] },
  { key: 'claude', hosts: ['claude.ai', 'anthropic.com'] },
  { key: 'grok', hosts: ['grok.com', 'x.ai'] },
];

/** Returns the bundled mark for a provider URL, or null when we don't ship one. */
export function getProviderIconKey(url: string): ProviderIconKey | null {
  let hostname: string;
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }

  const entry = PROVIDER_HOSTS.find(({ hosts }) =>
    hosts.some(host => hostname === host || hostname.endsWith(`.${host}`))
  );

  return entry ? entry.key : null;
}

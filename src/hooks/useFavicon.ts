// src/hooks/useFavicon.ts
import { useEffect, useState } from 'react';

interface FaviconCacheEntry {
  dataUrl: string;
  timestamp: number;
}

const CACHE_KEY = 'favicon-cache-v1';
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function loadCache(): Record<string, FaviconCacheEntry> {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveCache(cache: Record<string, FaviconCacheEntry>) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
  }
}

function toHostname(inputUrl: string): string | null {
  try {
    const u = new URL(inputUrl);
    return u.hostname;
  } catch {
    return null;
  }
}

async function fetchFaviconDataUrl(hostname: string): Promise<string | null> {
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
  try {
    const res = await fetch(faviconUrl, { cache: 'force-cache' });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export function useFavicon(url: string, explicitIcon?: string) {
  const [iconUrl, setIconUrl] = useState<string | undefined>(explicitIcon);

  useEffect(() => {
    if (explicitIcon) {
      setIconUrl(explicitIcon);
      return;
    }

    const hostname = toHostname(url);
    if (!hostname) return;

    const cache = loadCache();
    const entry = cache[hostname];
    const now = Date.now();

    if (entry && now - entry.timestamp < ONE_WEEK_MS) {
      setIconUrl(entry.dataUrl);
      return;
    }

    let aborted = false;
    fetchFaviconDataUrl(hostname).then((dataUrl) => {
      if (aborted) return;
      if (dataUrl) {
        setIconUrl(dataUrl);
        cache[hostname] = { dataUrl, timestamp: now };
        saveCache(cache);
      }
    });

    return () => {
      aborted = true;
    };
  }, [url, explicitIcon]);

  return iconUrl;
}

export default useFavicon;



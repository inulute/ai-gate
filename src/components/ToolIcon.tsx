// src/components/ToolIcon.tsx
import { Bot } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { getFaviconUrl } from '@/lib/favicon';
import { resolveProviderIconKey } from '@/lib/providerIcons';
import { ProviderIcon } from '@/components/ProviderIcon';

interface ToolIconProps {
  url: string;
  icon?: string;
  name?: string;
  /** Sizing classes applied to whichever glyph or image ends up being drawn. */
  className?: string;
  /** Extra classes for the remote-image path only (chip border, cropping). */
  imgClassName?: string;
}

/**
 * A remote icon that neither loads nor errors leaves an empty box on screen for
 * as long as the request hangs, which is what "the icons sometimes don't show"
 * looks like on a slow network. Give up after this and draw the placeholder;
 * if the image does arrive later it replaces the placeholder.
 */
const REMOTE_ICON_TIMEOUT_MS = 6000;

/**
 * Draws a tool's icon, preferring the mark bundled with the app. Built-in
 * providers never touch the network; anything else falls back to the tool's
 * saved icon, then the provider favicon, then a generic placeholder.
 */
export const ToolIcon = ({ url, icon, name = '', className = 'w-4 h-4', imgClassName }: ToolIconProps) => {
  const providerIconKey = resolveProviderIconKey(url, icon);
  const [iconUrl, setIconUrl] = useState(icon || getFaviconUrl(url) || '');
  const [showFallback, setShowFallback] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    setIconUrl(icon || getFaviconUrl(url) || '');
    setShowFallback(false);
    setTimedOut(false);
  }, [icon, url]);

  useEffect(() => {
    if (providerIconKey || showFallback || !iconUrl) {
      return;
    }

    const timer = setTimeout(() => setTimedOut(true), REMOTE_ICON_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [providerIconKey, showFallback, iconUrl]);

  if (providerIconKey) {
    return <ProviderIcon name={providerIconKey} className={className} />;
  }

  /** Falls back to the provider favicon when the saved icon fails. */
  const handleIconError = () => {
    const fallbackUrl = getFaviconUrl(url) || '';
    if (fallbackUrl && iconUrl !== fallbackUrl) {
      setIconUrl(fallbackUrl);
      setTimedOut(false);
      return;
    }

    setShowFallback(true);
  };

  return (
    <>
      {(showFallback || timedOut) && <Bot className={className} />}
      {!showFallback && iconUrl && (
        <img
          src={iconUrl}
          alt={name}
          className={cn(className, imgClassName, timedOut && 'hidden')}
          onLoad={() => setTimedOut(false)}
          onError={handleIconError}
        />
      )}
      {!showFallback && !iconUrl && <Bot className={className} />}
    </>
  );
};

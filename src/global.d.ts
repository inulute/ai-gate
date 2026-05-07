// src/global.d.ts
interface Window {
    openExternal?: (url: string) => void;
    electronAPI?: {
      getSettings: () => Promise<any>;
      setSettings: (settings: any) => Promise<void>;
      showWindow: () => Promise<void>;
      setAutostart: (enabled: boolean) => Promise<void>;
      isE2E: () => boolean;
      isWindowVisible: () => Promise<boolean>;
      setShortcutConfig: (shortcuts: { id: string; name: string; mode: 'standard' | 'prefix'; keys: string[][] }[]) => void;
      setShortcutRecordingActive: (isActive: boolean) => void;
      onShortcut: (cb: (payload: { type: string; shortcutId?: string }) => void) => () => void;
      openExternal: (url: string) => void;
    };
  }
  
  declare namespace JSX {
    interface IntrinsicElements {
      webview: React.DetailedHTMLProps<React.WebViewHTMLAttributes<HTMLElement>, HTMLElement> & {
        allowpopups?: boolean | string;
        webpreferences?: string;
        partition?: string;
      };
    }
  }
  
  interface HTMLWebViewElement extends HTMLElement {
    reload: () => void;
    executeJavaScript: (code: string) => Promise<any>;
    src: string;
    
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
    removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void;
  }

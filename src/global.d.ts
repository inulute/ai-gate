// src/global.d.ts
interface Window {
    openExternal?: (url: string) => void;
    electronAPI?: {
      getSettings: () => Promise<any>;
      setSettings: (settings: any) => Promise<void>;
      showWindow: () => Promise<void>;
      setAutostart: (enabled: boolean) => Promise<void>;
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
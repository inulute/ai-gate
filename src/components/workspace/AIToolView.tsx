// src/components/workspace/AIToolView.tsx
import { X, RotateCw, Pin, PinOff, MoreVertical, ChevronLeft, ChevronRight, Link as LinkIcon } from 'lucide-react';
import { AITool, ToolInstance } from '@/types/AITool';
import { getFaviconUrl } from '@/lib/favicon';
import useFavicon from '@/hooks/useFavicon';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { useRef, useEffect, useState } from 'react';
import { useAITools } from '@/context/AIToolsContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

interface AIToolViewProps {
  tool: AITool;
  instance: ToolInstance;
  isVisible: boolean;
}

const AUTH_DOMAINS = [
  'accounts.google.com',
  'login.microsoftonline.com',
  'github.com/login',
  'api.twitter.com/oauth',
  'auth',
  'login',
  'signin',
  'oauth'
];

const KEEP_IN_APP_URL_PARTS = [
  'google.com/sorry'
];

export const AIToolView = ({ tool, instance, isVisible }: AIToolViewProps) => {
  const webviewRef = useRef<HTMLWebViewElement>(null);
  const hasSetSrcRef = useRef(false);
  const favicon = useFavicon(tool.url, tool.icon);
  const { 
    closeToolInstance, 
    updateToolState, 
    pinToolInstance, 
    unpinToolInstance
  } = useAITools();
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [canBack, setCanBack] = useState(false);
  const [canFwd, setCanFwd] = useState(false);
  const { toast } = useToast();

  // Only set src when visible for the first time
  useEffect(() => {
    const webview = webviewRef.current;
    if (webview && isVisible && !hasSetSrcRef.current) {
      const targetUrl = instance.state.lastUrl || tool.url;
      webview.src = targetUrl;
      hasSetSrcRef.current = true;
    }
  }, [isVisible, instance.state.lastUrl, tool.url]);
  
  const handleReload = () => {
    if (webviewRef.current && isVisible) {
      setIsLoading(true);
      updateToolState(instance.id, { isLoading: true });
      webviewRef.current.reload();
    }
  };

  const handleClose = () => {
    closeToolInstance(instance.id);
  };

  const handlePin = () => {
    if (instance.isPinned) {
      unpinToolInstance(instance.id);
    } else {
      pinToolInstance(instance.id);
    }
  };

  const isKeepInApp = (url: string) => {
    try {
      const urlObj = new URL(url);
      if (KEEP_IN_APP_URL_PARTS.some(part => url.includes(part))) return true;
      if (AUTH_DOMAINS.some(domain => urlObj.hostname.includes(domain) || urlObj.pathname.includes(domain))) return true;
      if (urlObj.hostname.endsWith('google.com') && urlObj.pathname.startsWith('/sorry')) return true;
      return false;
    } catch (e) {
      return false;
    }
  };

  // Set up event listeners
  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview || tool.type !== 'webview') return;
    
    const handleStartLoad = () => {
      setIsLoading(true);
      updateToolState(instance.id, { isLoading: true });
    };
    
    const handleStopLoad = () => {
      setIsLoading(false);
      updateToolState(instance.id, { isLoading: false });
    };
    
    const handleNewWindow = (e: any) => {
      const url = e.url;
      if (!url) return;
      
      if (isKeepInApp(url)) {
        e.preventDefault();
        webview.src = url;
      } else if (url.startsWith('http:') || url.startsWith('https:')) {
        e.preventDefault();
        window.open(url, '_blank');
      }
    };
    
    const handleDomReady = () => {
      webview.executeJavaScript(`
        document.addEventListener('click', (event) => {
          const anchor = event.target.closest('a');
          if (!anchor || !anchor.href) return;
          
          const url = anchor.href;
          const currentHost = window.location.hostname;
          const targetHost = new URL(url).hostname;
          
          const isAuthURL = ${JSON.stringify(AUTH_DOMAINS)}.some(domain => url.includes(domain));
          const keepInAppParts = ${JSON.stringify(KEEP_IN_APP_URL_PARTS)};
          const isKeepInAppUrl = keepInAppParts.some(part => url.includes(part))
            || (targetHost.endsWith('google.com') && new URL(url).pathname.startsWith('/sorry'));
          const isSameDomain = targetHost === currentHost || targetHost.endsWith('.' + currentHost) || currentHost.endsWith('.' + targetHost);
          
          if (!isAuthURL && !isKeepInAppUrl && !isSameDomain && (url.startsWith('http:') || url.startsWith('https:'))) {
            event.preventDefault();
            window.open(url, '_blank');
            return false;
          }
        });
      `);

      const scrollbarCss = `
        ::-webkit-scrollbar { width: 10px; height: 10px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background-color: rgba(120,120,120,0.5); border-radius: 8px; border: 2px solid transparent; background-clip: content-box; }
        ::-webkit-scrollbar-thumb:hover { background-color: rgba(120,120,120,0.7); }
      `;
      (webview as any).insertCSS(scrollbarCss);
      
      setIsLoading(false);
      setIsReady(true);
      try {
        const wv: any = webview;
        setCanBack(typeof wv.canGoBack === 'function' ? wv.canGoBack() : false);
        setCanFwd(typeof wv.canGoForward === 'function' ? wv.canGoForward() : false);
      } catch {}
      updateToolState(instance.id, { isLoading: false, lastUrl: webview.src });
    };
    
    const handleNavigate = () => {
      try {
        const wv: any = webview;
        setCanBack(typeof wv.canGoBack === 'function' ? wv.canGoBack() : false);
        setCanFwd(typeof wv.canGoForward === 'function' ? wv.canGoForward() : false);
        updateToolState(instance.id, { lastUrl: webview.src });
      } catch {}
    };
    
    webview.addEventListener('did-start-loading', handleStartLoad as any);
    webview.addEventListener('did-stop-loading', handleStopLoad as any);
    webview.addEventListener('new-window', handleNewWindow as any);
    webview.addEventListener('dom-ready', handleDomReady as any);
    webview.addEventListener('did-navigate', handleNavigate as any);
    webview.addEventListener('did-navigate-in-page', handleNavigate as any);
    
    return () => {
      webview.removeEventListener('did-start-loading', handleStartLoad as any);
      webview.removeEventListener('did-stop-loading', handleStopLoad as any);
      webview.removeEventListener('new-window', handleNewWindow as any);
      webview.removeEventListener('dom-ready', handleDomReady as any);
      webview.removeEventListener('did-navigate', handleNavigate as any);
      webview.removeEventListener('did-navigate-in-page', handleNavigate as any);
    };
  }, [tool.type]);

  const goBack = () => {
    const webview = webviewRef.current as any;
    if (isReady && webview && typeof webview.canGoBack === 'function' && webview.canGoBack()) webview.goBack();
  };
  
  const goForward = () => {
    const webview = webviewRef.current as any;
    if (isReady && webview && typeof webview.canGoForward === 'function' && webview.canGoForward()) webview.goForward();
  };
  
  const handleCopyUrl = async () => {
    const webview = webviewRef.current as any;
    const currentUrl = (webview && webview.src) || instance.state.lastUrl || tool.url || '';
    if (!currentUrl) return;
    try {
      await navigator.clipboard.writeText(currentUrl);
      toast({ title: 'URL Copied', description: 'The current page URL has been copied.', duration: 1500 });
    } catch (err) {
      const textarea = document.createElement('textarea');
      textarea.value = currentUrl;
      document.body.appendChild(textarea);
      textarea.select();
      try { document.execCommand('copy'); } catch {}
      document.body.removeChild(textarea);
      toast({ title: 'URL Copied', description: 'The current page URL has been copied.', duration: 1500 });
    }
  };

  // Use visibility and pointer-events instead of display: none to preserve webview state
  return (
    <Card 
      className="h-full flex flex-col dark:border-border/50 transition-all duration-300 ease-in-out"
      style={{
        visibility: isVisible ? 'visible' : 'hidden',
        pointerEvents: isVisible ? 'auto' : 'none'
      }}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 py-1 px-2 border-b dark:border-border/50">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:bg-secondary"
            onClick={goBack}
            disabled={!isReady || !canBack}
            aria-label="Back"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:bg-secondary"
            onClick={goForward}
            disabled={!isReady || !canFwd}
            aria-label="Forward"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:bg-secondary"
            onClick={handleCopyUrl}
            aria-label="Copy URL"
            title="Copy current URL"
          >
            <LinkIcon className="h-3.5 w-3.5" />
          </Button>
          <img
            src={favicon || getFaviconUrl(tool.url) || ''}
            alt=""
            className="w-4 h-4 rounded-full border border-border bg-card"
            onError={(e) => {
              const target = e.currentTarget as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
          <h3 className="font-medium text-xs text-foreground truncate">{instance.title}</h3>
          {instance.isPinned && (
            <Pin className="h-3 w-3 text-blue-500 flex-shrink-0" />
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 hover:bg-secondary"
            onClick={handleReload}
          >
            <RotateCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 hover:bg-secondary"
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-card text-foreground border border-border shadow-md">
              <DropdownMenuItem 
                onClick={handlePin}
                className="text-foreground hover:bg-secondary hover:text-foreground"
              >
                {instance.isPinned ? (
                  <>
                    <PinOff className="h-3.5 w-3.5 mr-2 text-foreground" />
                    Unpin Tool
                  </>
                ) : (
                  <>
                    <Pin className="h-3.5 w-3.5 mr-2 text-foreground" />
                    Pin Tool
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handleClose}
                className="text-destructive focus:text-destructive hover:bg-secondary"
              >
                <X className="h-3.5 w-3.5 mr-2" />
                Close Tool
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        {tool.type === 'webview' ? (
          <webview
            ref={webviewRef}
            className="w-full h-full"
            useragent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
            title={tool.name}
            webpreferences="contextIsolation=yes, nodeIntegration=no"
            partition="persist:webtool"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-secondary/20">
            API Integration View
          </div>
        )}
      </CardContent>
    </Card>
  );
};
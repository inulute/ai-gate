// src/components/NotificationPanel.tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Bell, 
  X, 
  Check, 
  Trash2, 
  ArrowLeft, 
  Clock
} from 'lucide-react';
import { useNotifications } from '@/context/NotificationContext';
import type { NotificationItem } from '@/services/notificationService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import rehypeRaw from 'rehype-raw';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationPanel = ({ isOpen, onClose }: NotificationPanelProps) => {
  const {
    notifications,
    unreadCount,
    markAsRead,
    deleteNotification,
    markAllAsRead,
    fetchNotificationContent
  } = useNotifications();

  const [activeNotification, setActiveNotification] = useState<NotificationItem | null>(null);
  const [notificationContent, setNotificationContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // Custom components for markdown rendering
  const markdownComponents = {
    img: ({ src, alt, ...props }: any) => (
      <img
        src={src}
        alt={alt}
        {...props}
        className="max-w-full h-auto rounded border border-[#333] my-4"
        loading="lazy"
        onError={(e) => {
          e.currentTarget.style.display = 'none';
        }}
      />
    ),
    a: ({ href, children, ...props }: any) => (
      <a
        href="#"
        {...props}
        className="text-[#30D5C8] hover:underline cursor-pointer font-medium border-b border-dotted border-[#30D5C8]/40 pb-0.5"
        onClick={(e) => {
          e.preventDefault();
          if (href) {
            console.log('Opening external link:', href);
            if (window.electronAPI?.openExternal) {
              try {
                window.electronAPI.openExternal(href);
              } catch (error) {
                console.error('Error opening external link via electronAPI:', error);
                window.open(href, '_blank', 'noopener,noreferrer');
              }
            } else {
              console.log('electronAPI not available, using window.open');
              window.open(href, '_blank', 'noopener,noreferrer');
            }
          }
        }}
      >
        {children}
      </a>
    ),
    code: ({ children, ...props }: any) => (
      <code
        {...props}
        className="bg-[#2d2d2d] px-1.5 py-0.5 rounded text-sm font-mono text-[#d1d5db]"
      >
        {children}
      </code>
    ),
    pre: ({ children, ...props }: any) => (
      <pre
        {...props}
        className="bg-[#2d2d2d] p-4 rounded overflow-x-auto text-sm font-mono border border-[#333] my-4"
      >
        {children}
      </pre>
    ),
    blockquote: ({ children, ...props }: any) => (
      <blockquote
        {...props}
        className="border-l-4 border-[#30D5C8] pl-5 pr-4 py-3 my-4 text-[#9ca3af] bg-[#212225] rounded-r"
      >
        {children}
      </blockquote>
    ),
    h1: ({ children, ...props }: any) => (
      <h1 {...props} className="text-xl font-semibold mb-4 mt-6 text-white">
        {children}
      </h1>
    ),
    h2: ({ children, ...props }: any) => (
      <h2 {...props} className="text-lg font-semibold mb-3 mt-5 text-white">
        {children}
      </h2>
    ),
    h3: ({ children, ...props }: any) => (
      <h3 {...props} className="text-base font-semibold mb-2 mt-4 text-white">
        {children}
      </h3>
    ),
    ul: ({ children, ...props }: any) => (
      <ul {...props} className="list-disc list-inside space-y-2 my-4 pl-5">
        {children}
      </ul>
    ),
    ol: ({ children, ...props }: any) => (
      <ol {...props} className="list-decimal list-inside space-y-2 my-4 pl-5">
        {children}
      </ol>
    ),
    li: ({ children, ...props }: any) => (
      <li {...props} className="text-sm text-[#d1d5db]">
        {children}
      </li>
    ),
    p: ({ children, ...props }: any) => (
      <p {...props} className="text-sm mb-4 last:mb-0 text-[#d1d5db] leading-relaxed">
        {children}
      </p>
    ),
  };

  const handleNotificationClick = async (notification: NotificationItem) => {
    setActiveNotification(notification);
    setIsLoading(true);
    
    try {
      const content = await fetchNotificationContent(notification.filename);
      setNotificationContent(content || 'No content available');
      markAsRead(notification.id);
    } catch (error) {
      console.error('Error fetching notification content:', error);
      setNotificationContent('Error loading content');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToList = () => {
    setActiveNotification(null);
    setNotificationContent('');
  };

  const handleMarkAsRead = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    markAsRead(id);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteNotification(id);
    if (activeNotification?.id === id) {
      handleBackToList();
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    });
  };

  const sortedNotifications = [...notifications].sort((a, b) => {
    if (a.read !== b.read) {
      return a.read ? 1 : -1;
    }
    return new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime();
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden p-0 bg-[#1a1b1e] border-[#333]">
        <DialogHeader className="p-3 border-b border-[#333] bg-[#1a1b1e]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-[#30D5C8]" />
              <DialogTitle className="text-lg text-white font-semibold">Notifications</DialogTitle>
              {unreadCount > 0 && (
                <span className="text-sm text-[#9ca3af]">
                  ({unreadCount} unread)
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {notifications.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={markAllAsRead}
                  className="flex items-center gap-1 bg-[rgba(255,255,255,0.06)] border-[#333] text-[#9ca3af] hover:bg-[#333] hover:text-white text-xs px-2 py-1 h-7"
                >
                  <Check className="h-3 w-3" />
                  Mark All Read
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-[#9ca3af] hover:text-white hover:bg-[#333] rounded-full w-6 h-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden bg-[#1a1b1e]">
          {!activeNotification ? (
            <ScrollArea className="h-[520px]">
              <div className="p-0">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-center">
                    <Bell className="h-12 w-12 text-[#9ca3af] mb-4 opacity-50" />
                    <h3 className="text-lg font-semibold mb-2 text-white">No notifications yet</h3>
                    <p className="text-sm text-[#9ca3af]">
                      You'll see your notifications here when they arrive
                    </p>
                  </div>
                ) : (
                  <div className="space-y-0">
                    {sortedNotifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-4 border-b border-[#333] cursor-pointer transition-colors hover:bg-[#212225] relative group ${
                          !notification.read ? 'bg-[rgba(48,213,200,0.05)] hover:bg-[rgba(48,213,200,0.1)]' : ''
                        }`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0 pr-20">
                            <div className="flex items-center gap-2 mb-2">
                              {!notification.read && (
                                <div className="w-2 h-2 bg-[#30D5C8] rounded-full shadow-[0_0_5px_rgba(48,213,200,0.5)]" />
                              )}
                              <h4 className={`text-sm truncate ${
                                !notification.read ? 'text-white font-semibold' : 'text-[#d1d5db] font-normal'
                              }`}>
                                {notification.title}
                              </h4>
                              <Badge 
                                variant={notification.priority === 'high' ? 'destructive' : 'secondary'}
                                className={`text-xs px-2 py-0.5 ${
                                  notification.priority === 'high' 
                                    ? 'bg-red-500/20 text-red-400 border-red-500/30' 
                                    : 'bg-[#4b5563]/20 text-[#9ca3af] border-[#4b5563]/30'
                                }`}
                              >
                                {notification.priority}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-[#9ca3af]">
                              <Clock className="h-3 w-3" />
                              {formatDate(notification.receivedAt)}
                            </div>
                          </div>
                          <div className="absolute top-1/2 right-4 transform -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {!notification.read && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => handleMarkAsRead(notification.id, e)}
                                className="h-6 w-6 p-0 text-[#9ca3af] hover:text-white hover:bg-[#333]"
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => handleDelete(notification.id, e)}
                              className="h-6 w-6 p-0 text-[#9ca3af] hover:text-red-400 hover:bg-[#333]"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          ) : (
            <div className="h-[520px] flex flex-col bg-[#1a1b1e]">
              <div className="p-3 border-b border-[#333] flex items-center gap-2 bg-[#1a1b1e]">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBackToList}
                  className="flex items-center gap-1 text-[#9ca3af] hover:text-white hover:bg-[#333] text-xs px-2 py-1 h-7"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Back
                </Button>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white text-sm truncate">{activeNotification.title}</h3>
                  <p className="text-xs text-[#9ca3af]">
                    {formatDate(activeNotification.receivedAt)}
                  </p>
                </div>
                <Badge 
                  variant={activeNotification.priority === 'high' ? 'destructive' : 'secondary'}
                  className={`text-xs px-2 py-0.5 ${
                    activeNotification.priority === 'high' 
                      ? 'bg-red-500/20 text-red-400 border-red-500/30' 
                      : 'bg-[#4b5563]/20 text-[#9ca3af] border-[#4b5563]/30'
                  }`}
                >
                  {activeNotification.priority}
                </Badge>
              </div>
              
              <ScrollArea className="flex-1">
                <div className="p-6">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#30D5C8]"></div>
                    </div>
                  ) : (
                    <div className="prose prose-sm max-w-none prose-invert">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeRaw, rehypeSanitize]}
                        components={markdownComponents}
                      >
                        {notificationContent}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

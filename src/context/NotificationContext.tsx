// src/context/NotificationContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { notificationService } from '@/services/notificationService';
import type { NotificationItem } from '@/services/notificationService';

interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  highPriorityNotifications: NotificationItem[];
  showPanel: boolean;
  setShowPanel: (show: boolean) => void;
  markAsRead: (id: string) => void;
  deleteNotification: (id: string) => void;
  markAllAsRead: () => void;
  clearAllNotifications: () => void;
  fetchNotificationContent: (filename: string) => Promise<string | null>;
  checkForNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [highPriorityNotifications, setHighPriorityNotifications] = useState<NotificationItem[]>([]);
  const [showPanel, setShowPanel] = useState(false);

  const updateNotificationState = () => {
    try {
      const allNotifications = notificationService.getNotifications();
      const unread = notificationService.getUnreadCount();
      const highPriority = notificationService.getHighPriorityNotifications();
      
      setNotifications(allNotifications);
      setUnreadCount(unread);
      setHighPriorityNotifications(highPriority);
    } catch (error) {
      console.error('Error updating notification state:', error);
      // Set safe defaults on error
      setNotifications([]);
      setUnreadCount(0);
      setHighPriorityNotifications([]);
    }
  };


  const markAsRead = (id: string) => {
    try {
      notificationService.markAsRead(id);
      updateNotificationState();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const deleteNotification = (id: string) => {
    try {
      notificationService.deleteNotification(id);
      updateNotificationState();
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const markAllAsRead = () => {
    try {
      notificationService.markAllAsRead();
      updateNotificationState();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const clearAllNotifications = () => {
    try {
      notificationService.clearAllNotifications();
      updateNotificationState();
    } catch (error) {
      console.error('Error clearing all notifications:', error);
    }
  };

  const fetchNotificationContent = async (filename: string): Promise<string | null> => {
    try {
      return await notificationService.fetchNotificationContent(filename);
    } catch (error) {
      console.error('Error fetching notification content:', error);
      return null;
    }
  };

  const checkForNotifications = async (): Promise<void> => {
    try {
      await notificationService.checkForNotifications();
      updateNotificationState();
    } catch (error) {
      console.error('Error checking for notifications:', error);
    }
  };

  // Initialize notification state
  useEffect(() => {
    updateNotificationState();
  }, []);

  // Set up periodic updates
  useEffect(() => {
    const interval = setInterval(updateNotificationState, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        highPriorityNotifications,
        showPanel,
        setShowPanel,
        markAsRead,
        deleteNotification,
        markAllAsRead,
        clearAllNotifications,
        fetchNotificationContent,
        checkForNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

// src/services/notificationService.ts
interface NotificationItem {
  id: string;
  title: string;
  filename: string;
  priority: 'medium' | 'high';
  date: string;
  read: boolean;
  receivedAt: string;
  readAt?: string;
  content?: string;
}

interface NotificationManifest {
  notifications: Array<{
    id: string;
    title: string;
    filename: string;
    priority: 'medium' | 'high';
    date: string;
  }>;
}

interface NotificationState {
  items: NotificationItem[];
  unreadCount: number;
}

class NotificationService {
  private readonly GITHUB_REPO = 'inulute/ai-gate';
  private readonly JSDELIVR_BASE_URL = `https://cdn.jsdelivr.net/gh/${this.GITHUB_REPO}@main/notifications`;
  private readonly MANIFEST_URL = `${this.JSDELIVR_BASE_URL}/notification-manifest.json`;
  private readonly CHECK_INTERVAL = 60 * 60 * 1000; 
  private readonly FETCH_COOLDOWN = 60 * 60 * 1000; 
  
  private checkTimer: NodeJS.Timeout | null = null;
  private lastFetchTime = 0;
  private notifications: NotificationState = {
    items: [],
    unreadCount: 0
  };
  private dismissedNotifications: string[] = [];

  constructor() {
    try {
      this.loadStoredData();
      this.startPeriodicChecks();
    } catch (error) {
      console.error('Error initializing NotificationService:', error);
      this.notifications = { items: [], unreadCount: 0 };
      this.dismissedNotifications = [];
    }
  }

  private loadStoredData() {
    try {
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        console.log('Not in browser environment, skipping localStorage access');
        return;
      }

      console.log('Loading stored notification data from localStorage...');
      const storedNotifications = localStorage.getItem('notifications');
      if (storedNotifications) {
        this.notifications = JSON.parse(storedNotifications);
        console.log('Loaded notifications from storage:', this.notifications);
      } else {
        console.log('No stored notifications found');
      }
      
      const storedDismissed = localStorage.getItem('dismissedNotifications');
      if (storedDismissed) {
        this.dismissedNotifications = JSON.parse(storedDismissed);
        console.log('Loaded dismissed notifications from storage:', this.dismissedNotifications);
      } else {
        console.log('No dismissed notifications found');
      }
    } catch (error) {
      console.error('Error loading stored notification data:', error);
      this.notifications = { items: [], unreadCount: 0 };
      this.dismissedNotifications = [];
    }
  }

  private saveNotifications() {
    try {
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        console.log('Not in browser environment, skipping localStorage save');
        return;
      }
      localStorage.setItem('notifications', JSON.stringify(this.notifications));
    } catch (error) {
      console.error('Error saving notifications:', error);
    }
  }

  private saveDismissedNotifications() {
    try {
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        console.log('Not in browser environment, skipping localStorage save');
        return;
      }
      localStorage.setItem('dismissedNotifications', JSON.stringify(this.dismissedNotifications));
    } catch (error) {
      console.error('Error saving dismissed notifications:', error);
    }
  }

  startPeriodicChecks() {
    this.stopPeriodicChecks();
    console.log('Starting periodic notification checks (every 1 hour)');
    
    this.checkForNotifications();
    
    this.checkTimer = setInterval(() => {
      console.log('Running scheduled notification check');
      this.checkForNotifications();
    }, this.CHECK_INTERVAL);
  }

  stopPeriodicChecks() {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
      console.log('Stopped periodic notification checks');
    }
  }

  async checkForNotifications(): Promise<void> {
    try {
      const now = Date.now();
      if (now - this.lastFetchTime < this.FETCH_COOLDOWN) {
        console.log('Skipping notification check - checked recently');
        return;
      }
      this.lastFetchTime = now;
      
      console.log('Checking for notifications at', new Date().toLocaleString());
      
      const manifest = await this.fetchNotificationManifest();
      if (!manifest) {
        console.log('No manifest data received');
        return;
      }

      const manifestNotificationIds = manifest.notifications.map(notif => notif.id);
      console.log('Manifest notification IDs:', manifestNotificationIds);

      const notificationsToRemove: string[] = [];
      
      if (this.notifications && this.notifications.items) {
        this.notifications.items.forEach(localNotif => {
          if (this.dismissedNotifications.includes(localNotif.id)) {
            return;
          }
          
          if (!manifestNotificationIds.includes(localNotif.id)) {
            console.log(`Notification #${localNotif.id} was removed from manifest - removing from app`);
            notificationsToRemove.push(localNotif.id);
          }
        });
      }

      if (notificationsToRemove.length > 0) {
        console.log(`Removing ${notificationsToRemove.length} deleted notifications`);
        
        notificationsToRemove.forEach(id => {
          if (this.notifications && this.notifications.items) {
            const index = this.notifications.items.findIndex(n => n.id === id);
            if (index !== -1) {
              const notification = this.notifications.items[index];
              if (!notification.read) {
                this.notifications.unreadCount = Math.max(0, this.notifications.unreadCount - 1);
              }
              this.notifications.items.splice(index, 1);
            }
          }
        });
        
        this.saveNotifications();
      }

      let newNotificationsFound = false;
      let highPriorityNotification: NotificationItem | null = null;

      for (const notif of manifest.notifications) {
        if (this.dismissedNotifications.includes(notif.id)) {
          continue;
        }

        const existing = this.notifications?.items?.find(item => item.id === notif.id);
        
        if (!existing) {
          const newNotif: NotificationItem = {
            ...notif,
            read: false,
            receivedAt: new Date().toISOString(),
            content: undefined
          };

          if (this.notifications && this.notifications.items) {
            this.notifications.items.push(newNotif);
            this.notifications.unreadCount++;
            newNotificationsFound = true;

            if (notif.priority === 'high' && (!highPriorityNotification || 
                new Date(notif.date) > new Date(highPriorityNotification.date))) {
              highPriorityNotification = newNotif;
            }
          }
        }
      }

      if (newNotificationsFound || notificationsToRemove.length > 0) {
        if (newNotificationsFound) {
          console.log(`Found ${this.notifications?.unreadCount || 0} new notification(s)`);
        }
        this.saveNotifications();

        if (highPriorityNotification) {
          console.log('High priority notification found:', highPriorityNotification.title);
        }
      } else {
        console.log('No notification changes detected');
      }
    } catch (error) {
      console.error('Error checking for notifications:', error);
    }
  }

  private async fetchNotificationManifest(): Promise<NotificationManifest | null> {
    try {
      const timestamp = Date.now();
      const url = `${this.MANIFEST_URL}?_=${timestamp}`;
      console.log('Fetching notification manifest from jsDelivr:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        mode: 'cors'
      });

      if (!response.ok) {
        if (response.status === 404) {
          console.log('Notification manifest not available, skipping notifications');
        } else {
          console.log('jsDelivr manifest not found, no notifications available');
        }
        return null;
      }

      const manifest = await response.json();
      console.log('Successfully fetched manifest from jsDelivr:', manifest);
      return manifest;
    } catch (error) {
      console.error('Error fetching notification manifest from jsDelivr:', error);
      console.log('No notifications available due to fetch error');
      return null;
    }
  }


  async fetchNotificationContent(filename: string): Promise<string | null> {
    try {
      const timestamp = Date.now();
      const url = `${this.JSDELIVR_BASE_URL}/${filename}?_=${timestamp}`;
      console.log('Fetching notification content from jsDelivr:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        mode: 'cors'
      });

      if (!response.ok) {
        console.log('jsDelivr content not found, no content available');
        return null;
      }

      const content = await response.text();
      console.log('Successfully fetched content from jsDelivr for:', filename);
      return content;
    } catch (error) {
      console.error('Error fetching notification content from jsDelivr:', error);
      console.log('No content available due to fetch error');
      return null;
    }
  }


  getNotifications(): NotificationItem[] {
    return this.notifications?.items || [];
  }

  getUnreadCount(): number {
    return this.notifications?.unreadCount || 0;
  }

  getHighPriorityNotifications(): NotificationItem[] {
    if (!this.notifications || !this.notifications.items) {
      return [];
    }
    return this.notifications.items.filter(notif => 
      notif.priority === 'high' && !notif.read && !this.dismissedNotifications.includes(notif.id)
    );
  }

  markAsRead(notificationId: string): void {
    if (!this.notifications || !this.notifications.items) return;
    
    const notification = this.notifications.items.find(n => n.id === notificationId);
    if (notification && !notification.read) {
      notification.read = true;
      notification.readAt = new Date().toISOString();
      this.notifications.unreadCount = Math.max(0, this.notifications.unreadCount - 1);
      this.saveNotifications();
    }
  }

  deleteNotification(notificationId: string): void {
    if (!this.notifications || !this.notifications.items) return;
    
    if (!this.dismissedNotifications.includes(notificationId)) {
      this.dismissedNotifications.push(notificationId);
      this.saveDismissedNotifications();
    }
    
    const index = this.notifications.items.findIndex(n => n.id === notificationId);
    if (index !== -1) {
      const notification = this.notifications.items[index];
      if (!notification.read) {
        this.notifications.unreadCount = Math.max(0, this.notifications.unreadCount - 1);
      }
      this.notifications.items.splice(index, 1);
      this.saveNotifications();
    }
  }

  markAllAsRead(): void {
    if (!this.notifications || !this.notifications.items) return;
    
    let updated = false;
    this.notifications.items.forEach(notification => {
      if (!notification.read) {
        notification.read = true;
        notification.readAt = new Date().toISOString();
        updated = true;
      }
    });

    if (updated) {
      this.notifications.unreadCount = 0;
      this.saveNotifications();
    }
  }

  clearAllNotifications(): void {
    if (!this.notifications || !this.notifications.items) return;
    
    const notificationIds = this.notifications.items.map(item => item.id);
    
    notificationIds.forEach(id => {
      if (!this.dismissedNotifications.includes(id)) {
        this.dismissedNotifications.push(id);
      }
    });
    
    this.saveDismissedNotifications();
    
    this.notifications.items = [];
    this.notifications.unreadCount = 0;
    this.saveNotifications();
  }

  resetDismissedNotifications(): void {
    this.dismissedNotifications = [];
    this.saveDismissedNotifications();
    console.log('Dismissed notifications reset');
  }

  cleanup(): void {
    this.stopPeriodicChecks();
  }
}

export const notificationService = new NotificationService();
export type { NotificationItem, NotificationManifest, NotificationState };

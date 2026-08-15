// src/context/UpdateContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { updateService, ReleaseInfo, UpdateCheckResult } from '@/services/updateService';
import { UpdatePopup } from '@/components/UpdatePopup';

const DISMISSED_UPDATE_VERSION_KEY = 'dismissedUpdateVersion';

interface UpdateContextType {
  hasUpdate: boolean;
  releaseInfo: ReleaseInfo | null;
  checkForUpdates: () => Promise<void>;
  showUpdatePopup: () => void;
  hideUpdatePopup: () => void;
}

const UpdateContext = createContext<UpdateContextType | undefined>(undefined);

export const UpdateProvider = ({ children }: { children: React.ReactNode }) => {
  const [hasUpdate, setHasUpdate] = useState(false);
  const [releaseInfo, setReleaseInfo] = useState<ReleaseInfo | null>(null);
  const [showPopup, setShowPopup] = useState(false);

  const checkForUpdates = async () => {
    try {
      const result: UpdateCheckResult = await updateService.checkForUpdates();
      
      if (result.hasUpdate && result.releaseInfo) {
        setHasUpdate(true);
        setReleaseInfo(result.releaseInfo);
        
        const reminderTime = localStorage.getItem('updateReminderTime');
        if (reminderTime) {
          const reminderDate = new Date(reminderTime);
          const now = new Date();
          
          if (now >= reminderDate) {
            setShowPopup(true);
            localStorage.removeItem('updateReminderTime');
          }
        } else if (localStorage.getItem(DISMISSED_UPDATE_VERSION_KEY) !== result.releaseInfo.version) {
          setShowPopup(true);
        }
      } else {
        setHasUpdate(false);
        setReleaseInfo(null);
      }
    } catch (error) {
      console.error('Error checking for updates:', error);
    }
  };

  const showUpdatePopup = () => {
    if (hasUpdate && releaseInfo) {
      setShowPopup(true);
    }
  };

  const hideUpdatePopup = () => {
    setShowPopup(false);
  };

  const dismissUpdatePopup = () => {
    if (releaseInfo) {
      localStorage.setItem(DISMISSED_UPDATE_VERSION_KEY, releaseInfo.version);
    }
    localStorage.removeItem('updateReminderTime');
    setShowPopup(false);
  };

  useEffect(() => {
    checkForUpdates();
  }, []);

  useEffect(() => {
    const interval = setInterval(checkForUpdates, 12 * 60 * 60 * 1000); // 12 hours
    return () => clearInterval(interval);
  }, []);

  return (
    <UpdateContext.Provider
      value={{
        hasUpdate,
        releaseInfo,
        checkForUpdates,
        showUpdatePopup,
        hideUpdatePopup,
      }}
    >
      {children}
      {showPopup && releaseInfo && (
        <UpdatePopup
          isOpen={showPopup}
          onClose={hideUpdatePopup}
          onDismiss={dismissUpdatePopup}
          releaseInfo={releaseInfo}
        />
      )}
    </UpdateContext.Provider>
  );
};

export const useUpdate = () => {
  const context = useContext(UpdateContext);
  if (!context) {
    throw new Error('useUpdate must be used within UpdateProvider');
  }
  return context;
};

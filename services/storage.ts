

import { DeliveryRecord, Theme, SavedAddress, DailyTransaction, UserBankDetails, MaintenanceData, NavigationState, PromotionDetails, ChatMessage, StorageKey, Reminder, CookiePreferences, SavedRoute, NotificationPreferences, Task } from '../types';

// DAILY TRANSACTIONS MANAGEMENT

export const getTodayTransactions = (): DailyTransaction[] => {
  try {
    const stored = localStorage.getItem('delivery_today_transactions');
    if (stored) {
      return JSON.parse(stored);
    }
    return [];
  } catch (e) {
    console.error("Error reading today transactions", e);
    return [];
  }
};

export const saveTodayTransactions = (transactions: DailyTransaction[]): void => {
  try {
    localStorage.setItem('delivery_today_transactions', JSON.stringify(transactions));
  } catch (e) {
    console.error("Error saving today transactions", e);
  }
};

// FIXED VALUE & GOAL MANAGEMENT (Start of Day)
export const getFixedValue = (): number | null => {
  try {
    const stored = localStorage.getItem('delivery_fixed_value');
    return stored ? parseFloat(stored) : null;
  } catch (e) {
    return null;
  }
};

export const setFixedValue = (value: number): void => {
  try {
    localStorage.setItem('delivery_fixed_value', value.toString());
  } catch (e) {
    console.error("Error saving fixed value", e);
  }
};

export const getDailyGoal = (): number | null => {
  try {
    const stored = localStorage.getItem('delivery_daily_goal');
    return stored ? parseFloat(stored) : null;
  } catch (e) {
    return null;
  }
};

export const setDailyGoal = (value: number): void => {
  try {
    localStorage.setItem('delivery_daily_goal', value.toString());
  } catch (e) {
    console.error("Error saving daily goal", e);
  }
};

export const getHistory = (): DeliveryRecord[] => {
  try {
    const stored = localStorage.getItem('delivery_history');
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error("Error reading history", e);
    return [];
  }
};

export const saveHistory = (history: DeliveryRecord[]): void => {
  try {
    localStorage.setItem('delivery_history', JSON.stringify(history));
  } catch (e) {
    console.error("Error saving history", e);
  }
};

export const clearAllData = (): void => {
  try {
    localStorage.clear();
  } catch (e) {
    console.error("Error clearing data", e);
  }
};

export const getTheme = (): Theme => {
  try {
    const stored = localStorage.getItem('app_theme');
    if (!stored && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return (stored as Theme) || 'light';
  } catch (e) {
    return 'light';
  }
};

export const setTheme = (theme: Theme): void => {
  try {
    localStorage.setItem('app_theme', theme);
  } catch (e) {
    console.error("Error saving theme", e);
  }
};

// Address Book Methods

export const getAddresses = (): SavedAddress[] => {
  try {
    const stored = localStorage.getItem('saved_addresses');
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error("Error reading addresses", e);
    return [];
  }
};

export const saveAddresses = (addresses: SavedAddress[]): void => {
  try {
    localStorage.setItem('saved_addresses', JSON.stringify(addresses));
  } catch (e) {
    console.error("Error saving addresses", e);
  }
};

// Bank Details Methods
export const getBankDetails = (): UserBankDetails | null => {
  try {
    const stored = localStorage.getItem('user_bank_details');
    return stored ? JSON.parse(stored) : null;
  } catch (e) {
    return null;
  }
};

export const saveBankDetails = (details: UserBankDetails): void => {
  try {
    localStorage.setItem('user_bank_details', JSON.stringify(details));
  } catch (e) {
    console.error("Error saving bank details", e);
  }
};

// Reminder Methods

export const getReminderTime = (): string => {
  try {
    return localStorage.getItem('custom_reminder_time') || '';
  } catch (e) {
    return '';
  }
};

export const setReminderTime = (time: string): void => {
  try {
    localStorage.setItem('custom_reminder_time', time);
  } catch (e) {
    console.error("Error saving reminder time", e);
  }
};


// Maintenance Methods (Updated to v2)
export const getMaintenanceData = (): MaintenanceData | null => {
  try {
    // Check v2 first
    const stored = localStorage.getItem('vehicle_maintenance_v2');
    if (stored) return JSON.parse(stored);

    // Migration from v1 if exists
    const oldStored = localStorage.getItem('vehicle_maintenance');
    if (oldStored) {
      const oldData = JSON.parse(oldStored);
      const newData: MaintenanceData = {
        currentKm: oldData.currentKm || 0,
        items: [
          {
            id: 'oil-legacy',
            name: 'Troca de Óleo',
            lastChangedKm: oldData.lastOilChangeKm || 0,
            intervalKm: oldData.oilChangeInterval || 5000
          }
        ]
      };
      // Save new, delete old
      localStorage.setItem('vehicle_maintenance_v2', JSON.stringify(newData));
      localStorage.removeItem('vehicle_maintenance');
      return newData;
    }

    return null;
  } catch (e) {
    return null;
  }
};

export const saveMaintenanceData = (data: MaintenanceData): void => {
  try {
    localStorage.setItem('vehicle_maintenance_v2', JSON.stringify(data));
  } catch (e) {
    console.error("Error saving maintenance data", e);
  }
};

// --- NAVIGATION STATE ---
export const saveNavigationState = (state: NavigationState): void => {
  try {
    localStorage.setItem('navigation_state', JSON.stringify(state));
  } catch (e) {
    console.error("Error saving navigation state", e);
  }
};

export const getNavigationState = (): NavigationState | null => {
  try {
    const stored = localStorage.getItem('navigation_state');
    return stored ? JSON.parse(stored) : null;
  } catch (e) {
    return null;
  }
};

export const clearNavigationState = (): void => {
  try {
    localStorage.removeItem('navigation_state');
  } catch (e) {
    console.error("Error clearing navigation state", e);
  }
};

// --- PROMOTION DETAILS ---
export const getPromotionDetails = (): PromotionDetails | null => {
    try {
        const stored = localStorage.getItem('promotion_details');
        return stored ? JSON.parse(stored) : null;
    } catch (e) {
        return null;
    }
};

export const savePromotionDetails = (details: PromotionDetails): void => {
    try {
        localStorage.setItem('promotion_details', JSON.stringify(details));
    } catch (e) {
        console.error("Error saving promotion details", e);
    }
};

// --- CHAT ASSISTANT HISTORY ---
export const getAssistantHistory = (): ChatMessage[] => {
    try {
        const stored = localStorage.getItem('chat_assistant_history');
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        return [];
    }
};

export const saveAssistantHistory = (messages: ChatMessage[]): void => {
    try {
        localStorage.setItem('chat_assistant_history', JSON.stringify(messages));
    } catch (e) {
        console.error("Error saving chat history", e);
    }
};

export const clearAssistantHistory = (): void => {
    try {
        localStorage.removeItem('chat_assistant_history');
    } catch (e) {
        console.error("Error clearing assistant history", e);
    }
};


// --- AI REMINDERS ---
export const getReminders = (): Reminder[] => {
    try {
        const stored = localStorage.getItem('ai_reminders');
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        return [];
    }
};

export const saveReminders = (reminders: Reminder[]): void => {
    try {
        localStorage.setItem('ai_reminders', JSON.stringify(reminders));
    } catch (e) {
        console.error("Error saving reminders", e);
    }
};

// --- EMERGENCY BUTTON POSITION ---
export const saveEmergencyButtonPosition = (pos: { x: number, y: number }) => {
    try {
        localStorage.setItem('emergency_button_pos', JSON.stringify(pos));
    } catch (e) {
        console.error("Error saving button position", e);
    }
};

export const getEmergencyButtonPosition = (): { x: number, y: number } | null => {
    try {
        const stored = localStorage.getItem('emergency_button_pos');
        return stored ? JSON.parse(stored) : null;
    } catch (e) {
        return null;
    }
};

// --- COOKIE PREFERENCES ---
export const getCookiePreferences = (): CookiePreferences => {
    try {
        const stored = localStorage.getItem('app_cookie_preferences');
        if (stored) {
            return JSON.parse(stored);
        }
        // Default to all enabled
        return { functionality: true, analytics: true, performance: true };
    } catch (e) {
        return { functionality: true, analytics: true, performance: true };
    }
};

export const saveCookiePreferences = (prefs: CookiePreferences): void => {
    try {
        localStorage.setItem('app_cookie_preferences', JSON.stringify(prefs));
    } catch (e) {
        console.error("Error saving cookie preferences", e);
    }
};

// --- SAVED ROUTES (NEW) ---
export const getSavedRoutes = (): SavedRoute[] => {
  try {
    const stored = localStorage.getItem('saved_routes');
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    return [];
  }
};

export const saveSavedRoutes = (routes: SavedRoute[]): void => {
  try {
    localStorage.setItem('saved_routes', JSON.stringify(routes));
  } catch (e) {
    console.error("Error saving routes", e);
  }
};

// --- NOTIFICATION PREFERENCES (NEW) ---
export const getNotificationPreferences = (): NotificationPreferences => {
    try {
        const stored = localStorage.getItem('notification_preferences');
        return stored ? JSON.parse(stored) : {
            new_orders: true,
            order_updates: true,
            system_alerts: true,
            marketing: true,
            sound_enabled: true
        };
    } catch (e) {
        return {
            new_orders: true,
            order_updates: true,
            system_alerts: true,
            marketing: true,
            sound_enabled: true
        };
    }
};

export const saveNotificationPreferences = (prefs: NotificationPreferences): void => {
    try {
        localStorage.setItem('notification_preferences', JSON.stringify(prefs));
    } catch (e) {
        console.error("Error saving notification preferences", e);
    }
};

// --- TASK LIST (NEW) ---
export const getTasks = (): Task[] => {
  try {
    const stored = localStorage.getItem('task_list');
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    return [];
  }
};

export const saveTasks = (tasks: Task[]): void => {
  try {
    localStorage.setItem('task_list', JSON.stringify(tasks));
  } catch (e) {
    console.error("Error saving tasks", e);
  }
};


// --- BACKUP & RESTORE ---
const KEYS_TO_BACKUP: StorageKey[] = [
  'delivery_today_transactions',
  'delivery_history',
  'saved_addresses',
  'custom_reminder_time',
  'delivery_fixed_value',
  'delivery_daily_goal',
  'user_bank_details',
  'vehicle_maintenance_v2',
  'promotion_details',
  'chat_assistant_history',
  'ai_reminders',
  'app_cookie_preferences',
  'saved_routes',
  'notification_preferences',
  'task_list'
];

export const createBackup = (): string => {
  const backupData: { [key: string]: any } = {};
  KEYS_TO_BACKUP.forEach(key => {
    try {
      const item = localStorage.getItem(key);
      if (item !== null) {
        backupData[key] = JSON.parse(item);
      }
    } catch (e) {
      // Could be a non-JSON item, handle gracefully
      const item = localStorage.getItem(key);
      if (item !== null) backupData[key] = item;
    }
  });
  return JSON.stringify(backupData, null, 2);
};

export const restoreBackup = (jsonString: string): boolean => {
  try {
    const backupData = JSON.parse(jsonString);
    clearAllData(); // Clear before restoring to avoid conflicts
    Object.keys(backupData).forEach(key => {
      let value = backupData[key];
      // Ensure complex objects are stringified before setting
      if (typeof value === 'object') {
        value = JSON.stringify(value);
      }
      localStorage.setItem(key, value);
    });
    return true;
  } catch (e) {
    console.error("Failed to restore backup", e);
    return false;
  }
};
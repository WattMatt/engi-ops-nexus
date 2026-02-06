import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useIdleTracker } from './useIdleTracker';

interface SessionSettings {
  auto_logout_enabled: boolean;
  auto_logout_time: string; // HH:MM:SS format
  auto_logout_timezone: string;
}

/**
 * Clear all local storage, session storage, IndexedDB, and Cache API
 */
const clearAllStorage = async () => {
  console.log('[SessionMonitor] Clearing all storage...');

  // Clear localStorage
  localStorage.clear();

  // Clear sessionStorage
  sessionStorage.clear();

  // Clear IndexedDB databases
  try {
    const databases = await indexedDB.databases();
    for (const db of databases) {
      if (db.name) {
        indexedDB.deleteDatabase(db.name);
        console.log(`[SessionMonitor] Deleted IndexedDB: ${db.name}`);
      }
    }
  } catch (error) {
    console.warn('[SessionMonitor] Could not clear IndexedDB:', error);
  }

  // Clear Cache API
  try {
    const cacheNames = await caches.keys();
    for (const cacheName of cacheNames) {
      await caches.delete(cacheName);
      console.log(`[SessionMonitor] Deleted cache: ${cacheName}`);
    }
  } catch (error) {
    console.warn('[SessionMonitor] Could not clear Cache API:', error);
  }

  console.log('[SessionMonitor] All storage cleared');
};

/**
 * Get current time in a specific timezone
 */
const getCurrentTimeInTimezone = (timezone: string): { hours: number; minutes: number } => {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const hours = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
    const minutes = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
    return { hours, minutes };
  } catch (error) {
    console.warn('[SessionMonitor] Invalid timezone, using local time:', error);
    const now = new Date();
    return { hours: now.getHours(), minutes: now.getMinutes() };
  }
};

/**
 * Parse time string (HH:MM:SS) to hours and minutes
 */
const parseTimeString = (timeStr: string): { hours: number; minutes: number } => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return { hours: hours || 0, minutes: minutes || 0 };
};

/**
 * Check if current time is within the logout window (configured time +/- 2 minutes)
 */
const isWithinLogoutWindow = (
  currentTime: { hours: number; minutes: number },
  logoutTime: { hours: number; minutes: number }
): boolean => {
  const currentMinutes = currentTime.hours * 60 + currentTime.minutes;
  const logoutMinutes = logoutTime.hours * 60 + logoutTime.minutes;
  
  // Check if within 2 minutes of logout time
  const diff = Math.abs(currentMinutes - logoutMinutes);
  
  // Handle midnight crossing
  const adjustedDiff = Math.min(diff, 1440 - diff);
  
  return adjustedDiff <= 2;
};

/**
 * Hook to monitor session and trigger automatic logout at configured times
 * 
 * Features:
 * - Checks every 60 seconds if auto-logout is enabled
 * - Compares current time against configured logout time (accounting for timezone)
 * - Triggers logout if within the scheduled window
 * - Grace period: delays logout by 30 minutes if user is active
 * - Clears all local storage, IndexedDB, and caches on logout
 */
export const useSessionMonitor = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isIdle } = useIdleTracker({ idleTimeout: 5 * 60 * 1000 }); // 5 minutes
  const lastLogoutCheckRef = useRef<string | null>(null);
  const graceDelayUntilRef = useRef<number | null>(null);

  // Fetch session settings from company_settings
  const { data: settings } = useQuery({
    queryKey: ['session-security-settings'],
    queryFn: async (): Promise<SessionSettings | null> => {
      const { data, error } = await supabase
        .from('company_settings')
        .select('auto_logout_enabled, auto_logout_time, auto_logout_timezone')
        .limit(1)
        .maybeSingle();

      if (error) {
        console.warn('[SessionMonitor] Error fetching settings:', error);
        return null;
      }

      return data as SessionSettings | null;
    },
    staleTime: 60 * 1000, // Cache for 1 minute
    refetchInterval: 60 * 1000, // Refetch every minute
  });

  const performLogout = useCallback(async () => {
    console.log('[SessionMonitor] Performing automatic logout...');
    
    // Show notification
    toast.info('Session expired - please log in again', {
      duration: 5000,
      description: 'Your session has been automatically ended for security.',
    });

    try {
      // Sign out from Supabase
      await supabase.auth.signOut();
      
      // Clear React Query cache
      queryClient.clear();
      
      // Clear all local storage
      await clearAllStorage();
      
      // Navigate to auth page
      navigate('/auth');
    } catch (error) {
      console.error('[SessionMonitor] Error during logout:', error);
      // Force navigation even on error
      navigate('/auth');
    }
  }, [navigate, queryClient]);

  useEffect(() => {
    if (!settings?.auto_logout_enabled) {
      return;
    }

    const checkInterval = setInterval(async () => {
      // Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return;
      }

      // Get current time in configured timezone
      const currentTime = getCurrentTimeInTimezone(settings.auto_logout_timezone);
      const logoutTime = parseTimeString(settings.auto_logout_time);

      // Create a unique key for this minute to prevent multiple logouts
      const checkKey = `${currentTime.hours}:${currentTime.minutes}`;
      
      if (isWithinLogoutWindow(currentTime, logoutTime)) {
        // Prevent duplicate logout in same minute
        if (lastLogoutCheckRef.current === checkKey) {
          return;
        }

        // Check grace period - if user is active, delay by 30 minutes
        if (!isIdle) {
          const now = Date.now();
          if (!graceDelayUntilRef.current) {
            // Set grace period
            graceDelayUntilRef.current = now + 30 * 60 * 1000; // 30 minutes
            console.log('[SessionMonitor] User is active, delaying logout by 30 minutes');
            toast.warning('Scheduled logout delayed', {
              description: 'You were active, logout delayed by 30 minutes.',
              duration: 5000,
            });
            return;
          } else if (now < graceDelayUntilRef.current) {
            // Still within grace period
            return;
          }
        }

        // Mark this minute as checked
        lastLogoutCheckRef.current = checkKey;
        
        // Perform logout
        await performLogout();
      } else {
        // Reset grace delay when outside logout window
        graceDelayUntilRef.current = null;
        // Reset the check key when outside window
        lastLogoutCheckRef.current = null;
      }
    }, 60 * 1000); // Check every 60 seconds

    return () => {
      clearInterval(checkInterval);
    };
  }, [settings, isIdle, performLogout]);

  return null;
};

import { useEffect, useRef, useCallback, useState } from 'react';
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

const COUNTDOWN_SECONDS = 60;

/**
 * Clear all local storage, session storage, IndexedDB, and Cache API
 */
const clearAllStorage = async () => {
  console.log('[SessionMonitor] Clearing all storage...');
  localStorage.clear();
  sessionStorage.clear();

  try {
    const databases = await indexedDB.databases();
    for (const db of databases) {
      if (db.name) {
        indexedDB.deleteDatabase(db.name);
      }
    }
  } catch (error) {
    console.warn('[SessionMonitor] Could not clear IndexedDB:', error);
  }

  try {
    const cacheNames = await caches.keys();
    for (const cacheName of cacheNames) {
      await caches.delete(cacheName);
    }
  } catch (error) {
    console.warn('[SessionMonitor] Could not clear Cache API:', error);
  }
};

const getCurrentTimeInTimezone = (timezone: string): { hours: number; minutes: number; seconds: number } => {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const hours = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
    const minutes = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
    const seconds = parseInt(parts.find(p => p.type === 'second')?.value || '0', 10);
    return { hours, minutes, seconds };
  } catch (error) {
    console.warn('[SessionMonitor] Invalid timezone, using local time:', error);
    const now = new Date();
    return { hours: now.getHours(), minutes: now.getMinutes(), seconds: now.getSeconds() };
  }
};

const parseTimeString = (timeStr: string): { hours: number; minutes: number } => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return { hours: hours || 0, minutes: minutes || 0 };
};

/**
 * Get seconds until the logout time. Returns negative if already past.
 */
const getSecondsUntilLogout = (
  currentTime: { hours: number; minutes: number; seconds: number },
  logoutTime: { hours: number; minutes: number }
): number => {
  const currentTotalSeconds = currentTime.hours * 3600 + currentTime.minutes * 60 + currentTime.seconds;
  const logoutTotalSeconds = logoutTime.hours * 3600 + logoutTime.minutes * 60;
  
  let diff = logoutTotalSeconds - currentTotalSeconds;
  // Handle midnight crossing
  if (diff < -43200) diff += 86400; // more than 12h behind → it's ahead across midnight
  
  return diff;
};

/**
 * Hook to monitor session and trigger automatic logout at configured times.
 * Shows a 60-second countdown dialog before logging out.
 */
export const useSessionMonitor = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isIdle } = useIdleTracker({ idleTimeout: 5 * 60 * 1000 });
  const lastLogoutCheckRef = useRef<string | null>(null);
  const graceDelayUntilRef = useRef<number | null>(null);

  // Countdown dialog state
  const [showCountdown, setShowCountdown] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(COUNTDOWN_SECONDS);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  });

  const performLogout = useCallback(async () => {
    console.log('[SessionMonitor] Performing automatic logout...');
    stopCountdown();

    toast.info('Session expired – please log in again', {
      duration: 5000,
      description: 'Your session has been automatically ended for security.',
    });

    try {
      await supabase.auth.signOut();
      queryClient.clear();
      await clearAllStorage();
      navigate('/auth');
    } catch (error) {
      console.error('[SessionMonitor] Error during logout:', error);
      navigate('/auth');
    }
  }, [navigate, queryClient]);

  const stopCountdown = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setShowCountdown(false);
    setSecondsRemaining(COUNTDOWN_SECONDS);
  }, []);

  const startCountdown = useCallback(() => {
    console.log('[SessionMonitor] Starting 60-second countdown dialog');
    setSecondsRemaining(COUNTDOWN_SECONDS);
    setShowCountdown(true);

    countdownIntervalRef.current = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          // Time's up – perform logout
          performLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [performLogout]);

  const handleStayLoggedIn = useCallback(() => {
    console.log('[SessionMonitor] User chose to stay logged in');
    stopCountdown();
    // Push grace period forward by 30 minutes so it doesn't immediately re-trigger
    graceDelayUntilRef.current = Date.now() + 30 * 60 * 1000;
    toast.success('Session extended', {
      description: 'Your session has been extended for 30 minutes.',
      duration: 3000,
    });
  }, [stopCountdown]);

  const handleLogoutNow = useCallback(() => {
    performLogout();
  }, [performLogout]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  // Main check loop
  useEffect(() => {
    if (!settings?.auto_logout_enabled) return;

    const checkInterval = setInterval(async () => {
      // Don't check if countdown is already showing
      if (showCountdown) return;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const currentTime = getCurrentTimeInTimezone(settings.auto_logout_timezone);
      const logoutTime = parseTimeString(settings.auto_logout_time);
      const secondsUntil = getSecondsUntilLogout(currentTime, logoutTime);

      // Show countdown when ≤60 seconds away and >0 (not yet past)
      const shouldWarn = secondsUntil > 0 && secondsUntil <= COUNTDOWN_SECONDS;
      // Already past the time (within 2-min window)
      const shouldLogout = secondsUntil <= 0 && secondsUntil > -120;

      if (shouldWarn || shouldLogout) {
        const checkKey = `${currentTime.hours}:${currentTime.minutes}`;
        if (lastLogoutCheckRef.current === checkKey) return;

        // Grace period for active users
        if (!isIdle) {
          const now = Date.now();
          if (!graceDelayUntilRef.current) {
            graceDelayUntilRef.current = now + 30 * 60 * 1000;
            console.log('[SessionMonitor] User is active, showing countdown instead of instant logout');
          } else if (now < graceDelayUntilRef.current) {
            return;
          }
        }

        lastLogoutCheckRef.current = checkKey;

        if (shouldWarn) {
          startCountdown();
        } else {
          startCountdown(); // Still show dialog even if slightly past
        }
      } else {
        graceDelayUntilRef.current = null;
        lastLogoutCheckRef.current = null;
      }
    }, 10 * 1000); // Check every 10 seconds for more precise countdown triggering

    return () => clearInterval(checkInterval);
  }, [settings, isIdle, showCountdown, startCountdown]);

  return {
    showCountdown,
    secondsRemaining,
    handleStayLoggedIn,
    handleLogoutNow,
  };
};

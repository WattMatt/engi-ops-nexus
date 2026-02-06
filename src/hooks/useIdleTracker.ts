import { useState, useEffect, useCallback, useRef } from 'react';

interface UseIdleTrackerOptions {
  idleTimeout?: number; // in milliseconds, default 5 minutes
  events?: string[];
}

interface IdleState {
  isIdle: boolean;
  lastActivity: Date;
  idleDuration: number; // in milliseconds
}

/**
 * Hook to track user activity and determine if they are idle
 * Used for grace period handling in automatic session expiry
 */
export const useIdleTracker = (options: UseIdleTrackerOptions = {}): IdleState => {
  const { 
    idleTimeout = 5 * 60 * 1000, // 5 minutes default
    events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click']
  } = options;

  const [lastActivity, setLastActivity] = useState<Date>(new Date());
  const [isIdle, setIsIdle] = useState(false);
  const [idleDuration, setIdleDuration] = useState(0);
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const updateLastActivity = useCallback(() => {
    const now = new Date();
    setLastActivity(now);
    setIsIdle(false);
    setIdleDuration(0);

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout for idle detection
    timeoutRef.current = setTimeout(() => {
      setIsIdle(true);
    }, idleTimeout);
  }, [idleTimeout]);

  useEffect(() => {
    // Add event listeners for activity detection
    events.forEach(event => {
      window.addEventListener(event, updateLastActivity, { passive: true });
    });

    // Initialize the timeout
    updateLastActivity();

    // Update idle duration every second when idle
    intervalRef.current = setInterval(() => {
      const now = new Date();
      const duration = now.getTime() - lastActivity.getTime();
      if (duration >= idleTimeout) {
        setIsIdle(true);
        setIdleDuration(duration);
      }
    }, 1000);

    return () => {
      // Cleanup
      events.forEach(event => {
        window.removeEventListener(event, updateLastActivity);
      });
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [events, idleTimeout, updateLastActivity, lastActivity]);

  return {
    isIdle,
    lastActivity,
    idleDuration
  };
};

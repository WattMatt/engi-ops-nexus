/**
 * Tests for Network Status Hook
 * Tests online/offline detection and event handling
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// Mock Capacitor modules before importing the hook
vi.mock('@capacitor/network', () => ({
  Network: {
    getStatus: vi.fn().mockResolvedValue({ connected: true, connectionType: 'wifi' }),
    addListener: vi.fn().mockResolvedValue({ remove: vi.fn() }),
  },
}));

vi.mock('@/utils/platform', () => ({
  isNative: vi.fn().mockReturnValue(false),
  isPluginAvailable: vi.fn().mockReturnValue(false),
}));

// Import after mocking
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

describe('useNetworkStatus Hook', () => {
  let originalOnLine: boolean;

  beforeEach(() => {
    // Store original navigator.onLine value
    originalOnLine = navigator.onLine;
    
    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      value: originalOnLine,
      writable: true,
      configurable: true,
    });
  });

  describe('Initial State', () => {
    it('should return connected state from navigator.onLine', async () => {
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useNetworkStatus());
      
      expect(result.current.isConnected).toBe(true);
    });

    it('should return disconnected when navigator.onLine is false', async () => {
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useNetworkStatus());
      
      expect(result.current.isConnected).toBe(false);
    });
  });

  describe('Network Events (Web Fallback)', () => {
    it('should update state when going online', async () => {
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useNetworkStatus());
      
      expect(result.current.isConnected).toBe(false);

      // Simulate going online
      act(() => {
        Object.defineProperty(navigator, 'onLine', {
          value: true,
          writable: true,
          configurable: true,
        });
        window.dispatchEvent(new Event('online'));
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
        expect(result.current.connectionType).toBe('wifi');
      });
    });

    it('should update state when going offline', async () => {
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useNetworkStatus());
      
      expect(result.current.isConnected).toBe(true);

      // Simulate going offline
      act(() => {
        Object.defineProperty(navigator, 'onLine', {
          value: false,
          writable: true,
          configurable: true,
        });
        window.dispatchEvent(new Event('offline'));
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(false);
        expect(result.current.connectionType).toBe('none');
      });
    });
  });

  describe('Connection Type Helpers', () => {
    it('should correctly identify wifi connection', async () => {
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useNetworkStatus());
      
      // Trigger online event to set connection type
      act(() => {
        window.dispatchEvent(new Event('online'));
      });

      await waitFor(() => {
        expect(result.current.isWifi).toBe(true);
        expect(result.current.isCellular).toBe(false);
      });
    });
  });

  describe('Refresh Status', () => {
    it('should return current status on refresh', async () => {
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useNetworkStatus());
      
      let status;
      await act(async () => {
        status = await result.current.refreshStatus();
      });

      expect(status).toBeDefined();
      expect(status?.connected).toBe(true);
    });
  });

  describe('Cleanup', () => {
    it('should remove event listeners on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
      
      const { unmount } = renderHook(() => useNetworkStatus());
      
      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));
      
      removeEventListenerSpy.mockRestore();
    });
  });
});

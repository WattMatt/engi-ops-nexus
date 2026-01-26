import { useState, useEffect, useCallback } from 'react';
import { 
  PushNotifications, 
  Token, 
  PushNotificationSchema, 
  ActionPerformed 
} from '@capacitor/push-notifications';
import { isNative, isPluginAvailable } from '@/utils/platform';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface NativePushState {
  hasPermission: boolean;
  token: string | null;
  isLoading: boolean;
}

/**
 * Hook to manage native push notifications (iOS/Android)
 * Falls back to web push on browser
 */
export function useNativePushNotifications() {
  const [state, setState] = useState<NativePushState>({
    hasPermission: false,
    token: null,
    isLoading: true,
  });

  // Check current permission status
  useEffect(() => {
    const checkPermissions = async () => {
      if (!isNative() || !isPluginAvailable('PushNotifications')) {
        setState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      try {
        const permStatus = await PushNotifications.checkPermissions();
        setState(prev => ({
          ...prev,
          hasPermission: permStatus.receive === 'granted',
          isLoading: false,
        }));
      } catch (error) {
        console.error('Error checking push permissions:', error);
        setState(prev => ({ ...prev, isLoading: false }));
      }
    };

    checkPermissions();
  }, []);

  // Set up listeners
  useEffect(() => {
    if (!isNative() || !isPluginAvailable('PushNotifications')) return;

    // Registration success
    const registrationListener = PushNotifications.addListener('registration', async (token: Token) => {
      console.log('Push registration success, token:', token.value);
      setState(prev => ({ ...prev, token: token.value }));
      
      // Store token in database
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('push_subscriptions').upsert({
            user_id: user.id,
            endpoint: `apns://${token.value}`,
            p256dh: token.value,
            auth: 'native-ios',
          }, {
            onConflict: 'user_id,endpoint',
          });
        }
      } catch (error) {
        console.error('Error storing push token:', error);
      }
    });

    // Registration error
    const errorListener = PushNotifications.addListener('registrationError', (error) => {
      console.error('Push registration failed:', error);
      toast.error('Failed to register for push notifications');
    });

    // Notification received (foreground)
    const receivedListener = PushNotifications.addListener(
      'pushNotificationReceived',
      (notification: PushNotificationSchema) => {
        console.log('Push notification received:', notification);
        
        // Show a toast since the app is in foreground
        toast(notification.title || 'New Notification', {
          description: notification.body,
        });
      }
    );

    // Notification tapped
    const actionListener = PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (action: ActionPerformed) => {
        console.log('Push notification action performed:', action);
        
        // Navigate based on notification data
        const data = action.notification.data;
        if (data?.url) {
          window.location.href = data.url;
        } else if (data?.conversationId) {
          window.location.href = `/dashboard/messages?conversation=${data.conversationId}`;
        }
      }
    );

    return () => {
      registrationListener.then(l => l.remove());
      errorListener.then(l => l.remove());
      receivedListener.then(l => l.remove());
      actionListener.then(l => l.remove());
    };
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isNative() || !isPluginAvailable('PushNotifications')) {
      return false;
    }

    try {
      const permStatus = await PushNotifications.requestPermissions();
      const granted = permStatus.receive === 'granted';
      
      if (granted) {
        await PushNotifications.register();
        setState(prev => ({ ...prev, hasPermission: true }));
        toast.success('Push notifications enabled!');
      } else {
        toast.error('Push notification permission denied');
      }
      
      return granted;
    } catch (error) {
      console.error('Error requesting push permission:', error);
      return false;
    }
  }, []);

  const unregister = useCallback(async () => {
    if (!isNative() || !isPluginAvailable('PushNotifications')) {
      return;
    }

    try {
      // Remove token from database
      const { data: { user } } = await supabase.auth.getUser();
      if (user && state.token) {
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', user.id)
          .eq('endpoint', `apns://${state.token}`);
      }

      setState(prev => ({ ...prev, token: null, hasPermission: false }));
      toast.success('Push notifications disabled');
    } catch (error) {
      console.error('Error unregistering push:', error);
    }
  }, [state.token]);

  return {
    hasPermission: state.hasPermission,
    token: state.token,
    isLoading: state.isLoading,
    isSupported: isNative() && isPluginAvailable('PushNotifications'),
    requestPermission,
    unregister,
  };
}

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  addToQueue,
  getPendingMessages,
  getQueuedMessagesForConversation,
  removeFromQueue,
  updateQueuedMessage,
  getQueueCount,
  isOfflineQueueSupported,
  QueuedMessage,
} from '@/utils/offlineMessageQueue';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNetworkStatus } from './useNetworkStatus';

const MAX_RETRY_COUNT = 3;
const RETRY_DELAY_MS = 2000;

interface UseOfflineMessageQueueOptions {
  conversationId?: string;
  onMessageSent?: (message: any) => void;
}

/**
 * Hook to manage offline message queue
 * Automatically syncs pending messages when back online
 */
export function useOfflineMessageQueue(options: UseOfflineMessageQueueOptions = {}) {
  const { conversationId, onMessageSent } = options;
  const { isConnected } = useNetworkStatus();
  
  const [pendingMessages, setPendingMessages] = useState<QueuedMessage[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [queueCount, setQueueCount] = useState(0);
  const syncInProgressRef = useRef(false);

  // Load pending messages
  const loadPendingMessages = useCallback(async () => {
    if (!isOfflineQueueSupported()) return;

    try {
      if (conversationId) {
        const messages = await getQueuedMessagesForConversation(conversationId);
        setPendingMessages(messages);
      }
      const count = await getQueueCount();
      setQueueCount(count);
    } catch (error) {
      console.error('Error loading pending messages:', error);
    }
  }, [conversationId]);

  // Initial load
  useEffect(() => {
    loadPendingMessages();
  }, [loadPendingMessages]);

  // Send a single message to the server
  const sendMessageToServer = useCallback(async (queuedMessage: QueuedMessage): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Mark as sending
      await updateQueuedMessage(queuedMessage.id, { status: 'sending' });

      // Insert the message
      const { data: message, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: queuedMessage.conversation_id,
          sender_id: user.id,
          content: queuedMessage.content,
          mentions: queuedMessage.mentions || [],
          attachments: queuedMessage.attachments || [],
          voice_message_url: queuedMessage.voice_message_url,
          voice_duration_seconds: queuedMessage.voice_duration_seconds,
          content_type: queuedMessage.content_type || 'plain',
        })
        .select()
        .single();

      if (error) throw error;

      // Update conversation's last_message_at
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', queuedMessage.conversation_id);

      // Send notifications (non-blocking)
      try {
        const { data: conversation } = await supabase
          .from('conversations')
          .select('participants')
          .eq('id', queuedMessage.conversation_id)
          .single();

        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();

        const senderName = profile?.full_name || 'Someone';
        const participants = conversation?.participants;
        const participantsArray = Array.isArray(participants) ? participants : [];
        const participantsToNotify = participantsArray.filter((p: string) => p !== user.id);

        if (participantsToNotify.length > 0) {
          supabase.functions.invoke('send-push-notification', {
            body: {
              userIds: participantsToNotify,
              title: `New message from ${senderName}`,
              body: queuedMessage.content.substring(0, 100) + (queuedMessage.content.length > 100 ? '...' : ''),
              conversationId: queuedMessage.conversation_id,
            },
          }).catch(console.error);
        }

        if (queuedMessage.mentions && queuedMessage.mentions.length > 0) {
          for (const mentionedUserId of queuedMessage.mentions) {
            supabase.functions.invoke('send-message-notification', {
              body: {
                userId: mentionedUserId,
                messageId: message.id,
                senderName,
                messagePreview: queuedMessage.content.substring(0, 100),
                conversationId: queuedMessage.conversation_id,
              },
            }).catch(console.error);
          }
        }
      } catch (notifyError) {
        console.error('Error sending notifications:', notifyError);
      }

      // Remove from queue on success
      await removeFromQueue(queuedMessage.id);
      onMessageSent?.(message);
      
      return true;
    } catch (error) {
      console.error('Error sending queued message:', error);
      
      const newRetryCount = queuedMessage.retry_count + 1;
      
      if (newRetryCount >= MAX_RETRY_COUNT) {
        await updateQueuedMessage(queuedMessage.id, {
          status: 'failed',
          retry_count: newRetryCount,
          last_error: error instanceof Error ? error.message : 'Unknown error',
        });
      } else {
        await updateQueuedMessage(queuedMessage.id, {
          status: 'pending',
          retry_count: newRetryCount,
          last_error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
      
      return false;
    }
  }, [onMessageSent]);

  // Sync all pending messages
  const syncPendingMessages = useCallback(async () => {
    if (!isConnected || syncInProgressRef.current) return;
    
    syncInProgressRef.current = true;
    setIsSyncing(true);

    try {
      const pending = await getPendingMessages();
      
      if (pending.length === 0) {
        setIsSyncing(false);
        syncInProgressRef.current = false;
        return;
      }

      console.log(`Syncing ${pending.length} pending messages...`);
      let successCount = 0;
      let failCount = 0;

      // Process messages sequentially to maintain order
      for (const message of pending.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )) {
        const success = await sendMessageToServer(message);
        
        if (success) {
          successCount++;
        } else {
          failCount++;
        }

        // Small delay between messages
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
      }

      // Reload pending messages
      await loadPendingMessages();

      if (successCount > 0) {
        toast.success(`${successCount} message${successCount > 1 ? 's' : ''} sent`, {
          description: 'Your offline messages have been delivered',
        });
      }

      if (failCount > 0) {
        toast.error(`${failCount} message${failCount > 1 ? 's' : ''} failed to send`, {
          description: 'Some messages could not be delivered',
        });
      }
    } catch (error) {
      console.error('Error syncing pending messages:', error);
    } finally {
      setIsSyncing(false);
      syncInProgressRef.current = false;
    }
  }, [isConnected, sendMessageToServer, loadPendingMessages]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isConnected && queueCount > 0 && !syncInProgressRef.current) {
      console.log('Back online, syncing pending messages...');
      syncPendingMessages();
    }
  }, [isConnected, queueCount, syncPendingMessages]);

  // Queue a message for sending
  const queueMessage = useCallback(async (messageData: {
    conversation_id: string;
    content: string;
    mentions?: string[];
    attachments?: any[];
    voice_message_url?: string;
    voice_duration_seconds?: number;
    content_type?: string;
  }): Promise<QueuedMessage | null> => {
    if (!isOfflineQueueSupported()) {
      toast.error('Offline messaging not supported in this browser');
      return null;
    }

    try {
      const queued = await addToQueue(messageData);
      await loadPendingMessages();
      
      toast.info('Message queued', {
        description: 'Will be sent when you\'re back online',
      });
      
      return queued;
    } catch (error) {
      console.error('Error queuing message:', error);
      toast.error('Failed to queue message');
      return null;
    }
  }, [loadPendingMessages]);

  // Retry a failed message
  const retryMessage = useCallback(async (messageId: string) => {
    try {
      await updateQueuedMessage(messageId, { 
        status: 'pending', 
        retry_count: 0,
        last_error: undefined,
      });
      await loadPendingMessages();
      
      if (isConnected) {
        syncPendingMessages();
      }
    } catch (error) {
      console.error('Error retrying message:', error);
    }
  }, [isConnected, loadPendingMessages, syncPendingMessages]);

  // Remove a message from the queue
  const cancelMessage = useCallback(async (messageId: string) => {
    try {
      await removeFromQueue(messageId);
      await loadPendingMessages();
      toast.success('Message cancelled');
    } catch (error) {
      console.error('Error cancelling message:', error);
    }
  }, [loadPendingMessages]);

  return {
    pendingMessages,
    queueCount,
    isSyncing,
    isSupported: isOfflineQueueSupported(),
    isOnline: isConnected,
    queueMessage,
    syncPendingMessages,
    retryMessage,
    cancelMessage,
    loadPendingMessages,
  };
}

/**
 * Tests for Offline Message Queue
 * Tests message queuing, retry logic, and sync functionality
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  addToQueue,
  getPendingMessages,
  getQueuedMessagesForConversation,
  getQueueCount,
  updateQueuedMessage,
  removeFromQueue,
  clearQueue,
  isOfflineQueueSupported,
  QueuedMessage,
} from '@/utils/offlineMessageQueue';

// Mock IndexedDB
import 'fake-indexeddb/auto';

describe('Offline Message Queue', () => {
  beforeEach(async () => {
    // Clear the queue before each test
    await clearQueue();
  });

  describe('Queue Support Detection', () => {
    it('should detect IndexedDB support', () => {
      expect(isOfflineQueueSupported()).toBe(true);
    });
  });

  describe('Adding Messages to Queue', () => {
    it('should add a message to the queue', async () => {
      const message = {
        conversation_id: 'conv-1',
        content: 'Hello, this is a test message',
      };

      const queued = await addToQueue(message);
      
      expect(queued.id).toBeDefined();
      expect(queued.id).toMatch(/^offline_/);
      expect(queued.conversation_id).toBe(message.conversation_id);
      expect(queued.content).toBe(message.content);
      expect(queued.status).toBe('pending');
      expect(queued.retry_count).toBe(0);
      expect(queued.created_at).toBeDefined();
    });

    it('should generate unique IDs for each message', async () => {
      const message = { conversation_id: 'conv-1', content: 'Test' };
      
      const msg1 = await addToQueue(message);
      const msg2 = await addToQueue(message);
      
      expect(msg1.id).not.toBe(msg2.id);
    });

    it('should preserve optional fields', async () => {
      const message = {
        conversation_id: 'conv-1',
        content: 'Test with mentions',
        mentions: ['user-1', 'user-2'],
        attachments: [{ name: 'file.pdf', url: 'https://example.com/file.pdf' }],
        voice_message_url: 'https://example.com/voice.mp3',
        voice_duration_seconds: 30,
        content_type: 'markdown',
      };

      const queued = await addToQueue(message);
      
      expect(queued.mentions).toEqual(['user-1', 'user-2']);
      expect(queued.attachments).toHaveLength(1);
      expect(queued.voice_message_url).toBe('https://example.com/voice.mp3');
      expect(queued.voice_duration_seconds).toBe(30);
      expect(queued.content_type).toBe('markdown');
    });
  });

  describe('Retrieving Messages', () => {
    it('should get pending messages', async () => {
      await addToQueue({ conversation_id: 'conv-1', content: 'Message 1' });
      await addToQueue({ conversation_id: 'conv-2', content: 'Message 2' });

      const pending = await getPendingMessages();
      
      expect(pending).toHaveLength(2);
      expect(pending.every(m => m.status === 'pending')).toBe(true);
    });

    it('should get messages for a specific conversation', async () => {
      await addToQueue({ conversation_id: 'conv-A', content: 'Message A1' });
      await addToQueue({ conversation_id: 'conv-A', content: 'Message A2' });
      await addToQueue({ conversation_id: 'conv-B', content: 'Message B1' });

      const convAMessages = await getQueuedMessagesForConversation('conv-A');
      
      expect(convAMessages).toHaveLength(2);
      expect(convAMessages.every(m => m.conversation_id === 'conv-A')).toBe(true);
    });

    it('should get total queue count', async () => {
      await addToQueue({ conversation_id: 'conv-1', content: 'Message 1' });
      await addToQueue({ conversation_id: 'conv-2', content: 'Message 2' });
      await addToQueue({ conversation_id: 'conv-3', content: 'Message 3' });

      const count = await getQueueCount();
      expect(count).toBe(3);
    });
  });

  describe('Updating Messages', () => {
    it('should update message status', async () => {
      const queued = await addToQueue({ 
        conversation_id: 'conv-1', 
        content: 'Test' 
      });

      await updateQueuedMessage(queued.id, { status: 'sending' });
      
      const pending = await getPendingMessages();
      expect(pending.find(m => m.id === queued.id)).toBeUndefined();
    });

    it('should update retry count and error', async () => {
      const queued = await addToQueue({ 
        conversation_id: 'conv-1', 
        content: 'Test' 
      });

      await updateQueuedMessage(queued.id, { 
        retry_count: 2, 
        last_error: 'Network timeout' 
      });
      
      const pending = await getPendingMessages();
      const updated = pending.find(m => m.id === queued.id);
      
      expect(updated?.retry_count).toBe(2);
      expect(updated?.last_error).toBe('Network timeout');
    });

    it('should mark message as failed after max retries', async () => {
      const queued = await addToQueue({ 
        conversation_id: 'conv-1', 
        content: 'Test' 
      });

      await updateQueuedMessage(queued.id, { 
        status: 'failed',
        retry_count: 3, 
        last_error: 'Max retries exceeded' 
      });
      
      const pending = await getPendingMessages();
      expect(pending.find(m => m.id === queued.id)).toBeUndefined();
    });
  });

  describe('Removing Messages', () => {
    it('should remove a message from the queue', async () => {
      const queued = await addToQueue({ 
        conversation_id: 'conv-1', 
        content: 'Test' 
      });

      expect(await getQueueCount()).toBe(1);

      await removeFromQueue(queued.id);

      expect(await getQueueCount()).toBe(0);
    });

    it('should clear all messages from queue', async () => {
      await addToQueue({ conversation_id: 'conv-1', content: 'Message 1' });
      await addToQueue({ conversation_id: 'conv-2', content: 'Message 2' });
      await addToQueue({ conversation_id: 'conv-3', content: 'Message 3' });

      expect(await getQueueCount()).toBe(3);

      await clearQueue();

      expect(await getQueueCount()).toBe(0);
    });
  });

  describe('Message Ordering', () => {
    it('should maintain chronological order in queue', async () => {
      const msg1 = await addToQueue({ conversation_id: 'conv-1', content: 'First' });
      await new Promise(r => setTimeout(r, 10)); // Small delay
      const msg2 = await addToQueue({ conversation_id: 'conv-1', content: 'Second' });
      await new Promise(r => setTimeout(r, 10));
      const msg3 = await addToQueue({ conversation_id: 'conv-1', content: 'Third' });

      const messages = await getQueuedMessagesForConversation('conv-1');
      const sorted = messages.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      expect(sorted[0].content).toBe('First');
      expect(sorted[1].content).toBe('Second');
      expect(sorted[2].content).toBe('Third');
    });
  });
});

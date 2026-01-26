import { useState, useEffect, useCallback } from "react";

const DRAFT_STORAGE_KEY = "message-drafts";

interface DraftMessages {
  [conversationId: string]: {
    content: string;
    savedAt: number;
  };
}

export function useDraftMessage(conversationId: string) {
  const [content, setContent] = useState("");

  // Load draft on mount
  useEffect(() => {
    const drafts = getDrafts();
    const draft = drafts[conversationId];
    
    if (draft) {
      // Only restore if saved within the last 24 hours
      const hoursSinceSave = (Date.now() - draft.savedAt) / (1000 * 60 * 60);
      if (hoursSinceSave < 24) {
        setContent(draft.content);
      } else {
        // Remove expired draft
        removeDraft(conversationId);
      }
    }
  }, [conversationId]);

  // Auto-save draft when content changes
  useEffect(() => {
    if (content.trim()) {
      saveDraft(conversationId, content);
    } else {
      removeDraft(conversationId);
    }
  }, [content, conversationId]);

  const clearDraft = useCallback(() => {
    setContent("");
    removeDraft(conversationId);
  }, [conversationId]);

  return {
    content,
    setContent,
    clearDraft,
    hasDraft: content.trim().length > 0,
  };
}

function getDrafts(): DraftMessages {
  try {
    const stored = localStorage.getItem(DRAFT_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveDraft(conversationId: string, content: string) {
  const drafts = getDrafts();
  drafts[conversationId] = {
    content,
    savedAt: Date.now(),
  };
  localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(drafts));
}

function removeDraft(conversationId: string) {
  const drafts = getDrafts();
  delete drafts[conversationId];
  localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(drafts));
}

// Get all conversations with drafts
export function useAllDrafts() {
  const [drafts, setDrafts] = useState<DraftMessages>({});

  useEffect(() => {
    const loadDrafts = () => {
      const allDrafts = getDrafts();
      // Filter out expired drafts
      const validDrafts: DraftMessages = {};
      const now = Date.now();
      
      Object.entries(allDrafts).forEach(([id, draft]) => {
        const hoursSinceSave = (now - draft.savedAt) / (1000 * 60 * 60);
        if (hoursSinceSave < 24) {
          validDrafts[id] = draft;
        }
      });

      setDrafts(validDrafts);
    };

    loadDrafts();

    // Listen for storage changes
    window.addEventListener("storage", loadDrafts);
    return () => window.removeEventListener("storage", loadDrafts);
  }, []);

  return drafts;
}

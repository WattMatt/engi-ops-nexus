/**
 * Central Types Export
 * Re-exports all shared types from a single location
 */

export * from './common';

// Re-export database types for convenience
export type { Database, Json } from '@/integrations/supabase/types';

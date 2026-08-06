/**
 * Strict Supabase fetch helper for PDF build functions.
 *
 * PDF buildFns historically destructured only `data` from Supabase query
 * results; a failed fetch therefore produced an *empty* PDF instead of an
 * error (silent data loss). Wrap every query in a buildFn with throwOnError
 * so failures propagate to the pipeline's catch, which surfaces them as a
 * destructive toast.
 *
 * Usage:
 *   const categories = throwOnError(
 *     await supabase.from('cost_categories').select('*').eq('id', id),
 *     'cost categories',
 *   ) || [];
 */

export interface SupabaseResultLike<T> {
  data: T;
  error: { message?: string } | null;
}

/**
 * Returns `result.data`, throwing a labelled Error if the query failed.
 * The label should name the data being fetched (it is user-visible in the
 * error toast, e.g. "Failed to load cost categories").
 */
export function throwOnError<T>(result: SupabaseResultLike<T>, label: string): T {
  if (result.error) {
    throw new Error(`Failed to load ${label}: ${result.error.message ?? 'query failed'}`);
  }
  return result.data;
}

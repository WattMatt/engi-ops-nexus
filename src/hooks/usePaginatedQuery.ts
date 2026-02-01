import { useState, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

export interface PaginationState {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

type TableName = keyof Database['public']['Tables'];

export interface UsePaginatedQueryOptions<T> {
  queryKey: string[];
  tableName: TableName;
  selectFields?: string;
  filters?: Record<string, any>;
  orFilters?: string;
  orderBy?: { column: string; ascending?: boolean };
  pageSize?: number;
  enabled?: boolean;
  transform?: (data: any[]) => T[];
}

export interface UsePaginatedQueryResult<T> {
  data: T[];
  pagination: PaginationState;
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  setPageSize: (size: number) => void;
  refetch: () => void;
}

/**
 * A hook for server-side paginated queries with Supabase.
 * Uses range-based pagination for efficient large dataset handling.
 */
export function usePaginatedQuery<T = any>({
  queryKey,
  tableName,
  selectFields = '*',
  filters = {},
  orFilters,
  orderBy,
  pageSize: initialPageSize = 50,
  enabled = true,
  transform,
}: UsePaginatedQueryOptions<T>): UsePaginatedQueryResult<T> {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(initialPageSize);

  // Build the count query
  const countQueryKey = [...queryKey, 'count', JSON.stringify(filters), orFilters];
  
  const { data: totalCount = 0 } = useQuery({
    queryKey: countQueryKey,
    queryFn: async () => {
      // Use type assertion to work with dynamic table names
      let query = (supabase
        .from(tableName) as any)
        .select('*', { count: 'exact', head: true });

      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            query = query.in(key, value);
          } else {
            query = query.eq(key, value);
          }
        }
      });

      // Apply OR filters if provided
      if (orFilters) {
        query = query.or(orFilters);
      }

      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    },
    enabled,
    staleTime: 30000, // Cache count for 30 seconds
  });

  // Calculate pagination values
  const totalPages = Math.ceil(totalCount / pageSize);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // Build the data query key with pagination
  const dataQueryKey = [...queryKey, 'data', page, pageSize, JSON.stringify(filters), orFilters];

  const {
    data: rawData = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: dataQueryKey,
    queryFn: async () => {
      // Use type assertion to work with dynamic table names
      let query = (supabase
        .from(tableName) as any)
        .select(selectFields)
        .range(from, to);

      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            query = query.in(key, value);
          } else {
            query = query.eq(key, value);
          }
        }
      });

      // Apply OR filters if provided
      if (orFilters) {
        query = query.or(orFilters);
      }

      // Apply ordering
      if (orderBy) {
        query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true });
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled,
    staleTime: 10000, // Cache data for 10 seconds
  });

  // Transform data if needed
  const data = useMemo(() => {
    if (transform) {
      return transform(rawData);
    }
    return rawData as T[];
  }, [rawData, transform]);

  // Navigation functions
  const goToPage = useCallback((newPage: number) => {
    const validPage = Math.max(1, Math.min(newPage, totalPages || 1));
    setPage(validPage);
  }, [totalPages]);

  const nextPage = useCallback(() => {
    if (page < totalPages) {
      setPage(p => p + 1);
    }
  }, [page, totalPages]);

  const prevPage = useCallback(() => {
    if (page > 1) {
      setPage(p => p - 1);
    }
  }, [page]);

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setPage(1); // Reset to first page when page size changes
  }, []);

  // Prefetch next page for smoother navigation
  const prefetchNextPage = useCallback(() => {
    if (page < totalPages) {
      const nextFrom = page * pageSize;
      const nextTo = nextFrom + pageSize - 1;
      const nextPageQueryKey = [...queryKey, 'data', page + 1, pageSize, JSON.stringify(filters), orFilters];
      
      queryClient.prefetchQuery({
        queryKey: nextPageQueryKey,
        queryFn: async () => {
          let query = (supabase
            .from(tableName) as any)
            .select(selectFields)
            .range(nextFrom, nextTo);

          Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              if (Array.isArray(value)) {
                query = query.in(key, value);
              } else {
                query = query.eq(key, value);
              }
            }
          });

          if (orFilters) {
            query = query.or(orFilters);
          }

          if (orderBy) {
            query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true });
          }

          const { data } = await query;
          return data || [];
        },
        staleTime: 10000,
      });
    }
  }, [page, totalPages, pageSize, queryKey, tableName, selectFields, filters, orFilters, orderBy, queryClient]);

  // Prefetch on data load
  useMemo(() => {
    if (!isLoading && !isFetching) {
      prefetchNextPage();
    }
  }, [isLoading, isFetching, prefetchNextPage]);

  return {
    data,
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages,
    },
    isLoading,
    isFetching,
    error: error as Error | null,
    goToPage,
    nextPage,
    prevPage,
    setPageSize,
    refetch,
  };
}

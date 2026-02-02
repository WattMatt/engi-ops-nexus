/**
 * Test Utilities for Component Testing
 * Provides common testing patterns and wrapper components
 */
import { ReactElement, ReactNode } from "react";
import { render, RenderOptions, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { vi, Mock } from "vitest";

// Re-export useful testing utilities
export { screen, fireEvent, waitFor, within };

// Create a test QueryClient with no retries
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

interface AllProvidersProps {
  children: ReactNode;
  queryClient?: QueryClient;
}

/**
 * Wrapper component with all common providers
 */
export function AllProviders({ children, queryClient }: AllProvidersProps) {
  const client = queryClient || createTestQueryClient();
  
  return (
    <QueryClientProvider client={client}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
}

interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  queryClient?: QueryClient;
}

/**
 * Custom render function with all providers
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: CustomRenderOptions
) {
  const { queryClient, ...renderOptions } = options || {};
  
  return render(ui, {
    wrapper: ({ children }) => (
      <AllProviders queryClient={queryClient}>{children}</AllProviders>
    ),
    ...renderOptions,
  });
}

// Note: We manually export the render utilities above, not via export *
// because @testing-library/react v16+ relies on @testing-library/dom for screen/fireEvent
export { renderWithProviders as render };

// ============================================
// Mock Helpers
// ============================================

/**
 * Create a mock Supabase client for testing
 */
export function createMockSupabaseClient() {
  const mockFrom = vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    then: vi.fn().mockResolvedValue({ data: [], error: null }),
  }));

  return {
    from: mockFrom,
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      signIn: vi.fn().mockResolvedValue({ data: null, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ data: { path: "test-path" }, error: null }),
        download: vi.fn().mockResolvedValue({ data: new Blob(), error: null }),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: "https://example.com/test" } })),
        remove: vi.fn().mockResolvedValue({ data: [], error: null }),
      })),
    },
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
}

/**
 * Wait for async state updates
 */
export async function waitForLoadingToFinish() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Create a deferred promise for controlled async testing
 */
export function createDeferred<T>() {
  let resolve: (value: T) => void;
  let reject: (error: Error) => void;
  
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return {
    promise,
    resolve: resolve!,
    reject: reject!,
  };
}

// ============================================
// Assertion Helpers
// ============================================

/**
 * Assert element is visible (not hidden by CSS)
 */
export function assertVisible(element: HTMLElement) {
  expect(element).toBeVisible();
  expect(element).not.toHaveStyle({ display: "none" });
  expect(element).not.toHaveStyle({ visibility: "hidden" });
}

/**
 * Assert element has accessible name
 */
export function assertAccessibleName(element: HTMLElement, name: string) {
  expect(element).toHaveAccessibleName(name);
}

// ============================================
// Data Factories
// ============================================

let idCounter = 0;

/**
 * Generate unique test IDs
 */
export function generateTestId(prefix = "test") {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

/**
 * Create a mock user for testing
 */
export function createMockUser(overrides = {}) {
  return {
    id: generateTestId("user"),
    email: "test@example.com",
    full_name: "Test User",
    avatar_url: null,
    role: "user",
    ...overrides,
  };
}

/**
 * Create a mock project for testing
 */
export function createMockProject(overrides = {}) {
  return {
    id: generateTestId("project"),
    name: "Test Project",
    project_number: "TP-001",
    status: "active",
    client_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

// Reset counter between tests
export function resetTestIdCounter() {
  idCounter = 0;
}

import "@testing-library/jest-dom";

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock IntersectionObserver
class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin: string = '';
  readonly thresholds: ReadonlyArray<number> = [];
  readonly scrollMargin: string = '0px';
  
  constructor(
    _callback: IntersectionObserverCallback,
    _options?: IntersectionObserverInit
  ) {}
  
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] { return []; }
}
global.IntersectionObserver = MockIntersectionObserver;

// Mock crypto.randomUUID
if (!global.crypto) {
  global.crypto = {} as Crypto;
}
if (!global.crypto.randomUUID) {
  global.crypto.randomUUID = () => 
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    }) as `${string}-${string}-${string}-${string}-${string}`;
}

// Mock scrollTo
window.scrollTo = () => {};

// Mock console methods to reduce noise in tests
const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
  // Filter out expected React errors during testing
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Warning:') || args[0].includes('React'))
  ) {
    return;
  }
  originalConsoleError(...args);
};

// support/vitest.setup.ts
import { vi } from 'vitest';

// Neutral default fetch (tests override with vi.stubGlobal('fetch', mock))
vi.stubGlobal('fetch', undefined);

// Testing Library helpers & fetch poly (kept after mocks)
import '@testing-library/jest-dom';
import 'whatwg-fetch';

// E2E-style bypass flags used by your contexts
// @ts-expect-error
globalThis.Cypress = true;
globalThis.__E2E_REQUIRE_AUTH__ = false;

// requestAnimationFrame (a few libs & React use it)
if (!globalThis.requestAnimationFrame) {
  globalThis.requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(cb, 0);
}

// Simple HTMLAudioElement mock for preview buttons
class HTMLAudioElementMock {
  play = vi.fn().mockResolvedValue(undefined);
  pause = vi.fn();
  load = vi.fn();
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
}
globalThis.Audio = HTMLAudioElementMock as any;

// Observers (grids, lazy images, etc.)
class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.IntersectionObserver = NoopObserver as any;
globalThis.ResizeObserver = NoopObserver as any;

// matchMedia (some UI/Router bits probe this)
if (!globalThis.matchMedia) {
  globalThis.matchMedia = vi.fn().mockImplementation(() => ({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},      // legacy
    removeListener: () => {},   // legacy
    dispatchEvent: () => false,
  })) as any;
}

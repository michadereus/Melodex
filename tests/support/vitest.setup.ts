// support/vitest.setup.ts
import '@testing-library/jest-dom';
import 'whatwg-fetch';

// ---- Melodex test-only globals (bypass auth for inline selection) ----
// @ts-expect-error
globalThis.Cypress = true;
globalThis.__E2E_REQUIRE_AUTH__ = false;

// ---- Small browser API shims that components expect ----
import { vi } from 'vitest';

// requestAnimationFrame (used by libs/React)
if (!globalThis.requestAnimationFrame) {
  globalThis.requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(cb, 0);
}

// Audio usage in preview buttons
class HTMLAudioElementMock {
  play = vi.fn().mockResolvedValue(undefined);
  pause = vi.fn();
  load = vi.fn();
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
}
// @ts-expect-error
globalThis.Audio = HTMLAudioElementMock;

// Intersection/Resize observers (grids, lazy images)
class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.IntersectionObserver = NoopObserver as any;
globalThis.ResizeObserver = NoopObserver as any;

// matchMedia (some UI libs check this)
if (!globalThis.matchMedia) {
  globalThis.matchMedia = vi.fn().mockImplementation(() => ({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},      // legacy
    removeListener: () => {},   // legacy
    dispatchEvent: () => false,
  }));
}

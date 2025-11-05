// UI-009 — ExportModal: renders with 0 items; confirm disabled; empty-state hint visible
// Style aligned with ui-011 and other UI specs.
// @ts-nocheck
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React, { type ReactNode, type ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';

import Rankings from '../../melodex-front-end/src/components/Rankings.jsx';
import SongProvider from '../../melodex-front-end/src/contexts/SongContext.jsx';
import { UserProvider } from '../../melodex-front-end/src/contexts/UserContext.jsx';
import { VolumeProvider } from '../../melodex-front-end/src/contexts/VolumeContext.jsx';

function Providers({ children }: { children?: ReactNode }): ReactElement {
  return (
    <MemoryRouter initialEntries={['/rankings']}>
      <UserProvider>
        <SongProvider>
          <VolumeProvider>{children}</VolumeProvider>
        </SongProvider>
      </UserProvider>
    </MemoryRouter>
  );
}

function installFetchMockEmpty() {
  const fetchMock = vi.fn(async (input: RequestInfo) => {
    const url = typeof input === 'string' ? input : (input as Request).url;

    if (url.includes('/auth/session')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ connected: true }),
        text: async () => JSON.stringify({ connected: true }),
      } as any;
    }

    if (url.includes('/api/user-songs/ranked')) {
      // Core of UI-009: zero items returned → modal shows empty-state and disabled confirm
      return {
        ok: true,
        status: 200,
        json: async () => [],
        text: async () => '[]',
      } as any;
    }

    if (url.includes('/api/user-songs/deezer-info')) {
      // Not used for this flow; keep it harmless
      return {
        ok: true,
        status: 200,
        json: async () => [],
        text: async () => '[]',
      } as any;
    }

    // Default pass-through
    return {
      ok: true,
      status: 200,
      json: async () => ({}),
      text: async () => '{}',
    } as any;
  });

  // @ts-expect-error override global
  global.fetch = fetchMock;

  // Match your existing test harness flags
  // (bypass the session preflight logic when running under tests)
  // @ts-expect-error
  window.Cypress = true;
  // @ts-expect-error
  window.__E2E_REQUIRE_AUTH__ = false;

  return fetchMock;
}

describe('UI-009 — ExportModal (0 items)', () => {
  it('opens with 0 items: shows empty-state and disables Confirm', async () => {
    installFetchMockEmpty();

    render(
      <Providers>
        <Rankings />
      </Providers>
    );

    // Open the modal via the CTA exactly like your other specs
    const cta = await screen.findByTestId('export-spotify-cta');
    expect(cta).toBeInTheDocument();

    fireEvent.click(cta);

    // Modal heading should be present
    expect(
      await screen.findByRole('heading', { name: /Export to Spotify/i })
    ).toBeInTheDocument();

    // Confirm button present but disabled when 0 items
    const confirmBtn = await screen.findByTestId('export-confirm');
    expect(confirmBtn).toBeInTheDocument();
    expect(confirmBtn).toBeDisabled();

    // Empty-state hint (same copy your ui-011 checks)
    expect(
      screen.getByText(/No ranked songs yet for this filter\./i)
    ).toBeInTheDocument();
  });
});

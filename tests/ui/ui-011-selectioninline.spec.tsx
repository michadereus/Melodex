import { describe, it, expect, beforeEach, vi } from 'vitest';
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

// Focused fetch mock for this spec
function installFetchMock({ rankedSongs }: { rankedSongs: any[] }) {
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
      return {
        ok: true,
        status: 200,
        json: async () => rankedSongs,
        text: async () => JSON.stringify(rankedSongs),
      } as any;
    }

    if (url.includes('/api/user-songs/deezer-info')) {
      return {
        ok: true,
        status: 200,
        json: async () => [],
        text: async () => '[]',
      } as any;
    }

    return {
      ok: true,
      status: 200,
      json: async () => ({}),
      text: async () => '{}',
    } as any;
  });

  vi.stubGlobal('fetch', fetchMock as any);
  return fetchMock;
}

const SONGS = [
  { _id: 's1', deezerID: '111', songName: 'Song A', artist: 'Artist A', ranking: 1200, albumCover: 'http://example.com/coverA.jpg', previewURL: 'http://example.com/prevA.mp3' },
  { _id: 's2', deezerID: '222', songName: 'Song B', artist: 'Artist B', ranking: 1100, albumCover: 'http://example.com/coverB.jpg', previewURL: 'http://example.com/prevB.mp3' },
  { _id: 's3', deezerID: '333', songName: 'Song C', artist: 'Artist C', ranking: 1000, albumCover: 'http://example.com/coverC.jpg', previewURL: 'http://example.com/prevC.mp3' },
];

describe('UI-011 — Selection (inline): Export disabled at 0 selected; hint visible', () => {
  beforeEach(() => {
    // E2E bypass flags your providers check
    // @ts-expect-error
    window.Cypress = true;
    // @ts-expect-error
    window.__E2E_REQUIRE_AUTH__ = false;
  });

  it('disables Export and shows empty-state hint when filter resolves to zero songs', async () => {
    installFetchMock({ rankedSongs: [] });

    render(
      <Providers>
        <Rankings />
      </Providers>
    );

    const cta = await screen.findByTestId('export-spotify-cta');
    expect(cta).toBeInTheDocument();

    fireEvent.click(cta);

    expect(await screen.findByRole('heading', { name: /Export to Spotify/i })).toBeInTheDocument();

    const confirmBtn = await screen.findByTestId('export-confirm');
    expect(confirmBtn).toBeDisabled();

    expect(screen.getByText(/No ranked songs yet for this filter\./i)).toBeInTheDocument();
  });

  it('disables Export when user unchecks all items (0 selected)', async () => {
    installFetchMock({ rankedSongs: SONGS });

    render(
      <Providers>
        <Rankings />
      </Providers>
    );

    const cta = await screen.findByTestId('export-spotify-cta');
    fireEvent.click(cta);

    const checkboxes = await screen.findAllByRole('checkbox');
    expect(checkboxes.length).toBe(SONGS.length);

    for (const box of checkboxes) {
      expect(box).toBeChecked();
      fireEvent.click(box);
      expect(box).not.toBeChecked();
    }

    const confirmBtns = await screen.findAllByTestId('export-confirm');
    for (const btn of confirmBtns) {
      expect(btn).toBeDisabled();
    }

    const headings = screen.getAllByRole('heading', { name: /Export to Spotify/i });
    expect(headings.length).toBeGreaterThan(0);
  });
});

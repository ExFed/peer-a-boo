import './style.css'
import { generateRandomId } from './dictionary';
import type { CleanupHandle } from './baby-station';
import { querySelectorOrThrow } from './utils';

/**
 * Supported station roles for the application.
 */
type StationKind = 'baby' | 'parent';

const appEl = document.querySelector<HTMLDivElement>('#app');
if (!appEl) {
    throw new Error('App container not found');
}

appEl.innerHTML = `
  <div class="app-shell">
    <div id="landing-view" class="landing-container">
      <h1 class="landing-title"><span class="shiny">Peer-a-Boo</span>👻</h1>

      <div class="room-input-group">
        <input type="text" id="peer-id-input" class="room-input" placeholder="Enter Room ID" spellcheck="false" />
      </div>

      <div class="role-selection">
        <button id="btn-baby" type="button" class="role-card">
          <span class="role-icon">📹</span>
          <span class="role-title">Baby Station</span>
        </button>
        <button id="btn-parent" type="button" class="role-card">
          <span class="role-icon">👀</span>
          <span class="role-title">Parent Station</span>
        </button>
      </div>

      <footer class="landing-footer">
        <a href="https://github.com/exfed/peer-a-boo" target="_blank" rel="noopener noreferrer" class="github-link">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
          <span>Source Code</span>
        </a>
        <div class="app-version">
          ${__APP_VERSION__}
        </div>
      </footer>
    </div>
    <div id="station-container"></div>
  </div>
`

const btnBaby = querySelectorOrThrow<HTMLButtonElement>(document, '#btn-baby');
const btnParent = querySelectorOrThrow<HTMLButtonElement>(document, '#btn-parent');
const stationContainer = querySelectorOrThrow<HTMLDivElement>(document, '#station-container');
const roomIdInput = querySelectorOrThrow<HTMLInputElement>(document, '#peer-id-input');

let currentCleanup: CleanupHandle | null = null;
const selectionParent = querySelectorOrThrow<HTMLElement>(document, '#landing-view');

function cleanupCurrentStation() {
    if (currentCleanup) {
        currentCleanup.cleanup();
        currentCleanup = null;
    }
}

function setSelectionVisible(shouldShow: boolean) {
    if (selectionParent) {
        selectionParent.style.display = shouldShow ? '' : 'none';
    }
}

function updateUrl(
    station: StationKind | null,
    currentRoomId: string | null,
    replace = false,
) {
    const url = new URL(window.location.href);

    if (station && currentRoomId) {
        url.searchParams.set('station', station);
        url.searchParams.set('roomId', currentRoomId);
    } else {
        url.searchParams.delete('station');
        url.searchParams.delete('roomId');
    }

    const state = { station, roomId: currentRoomId };
    if (replace) {
        history.replaceState(state, '', url);
    } else {
        history.pushState(state, '', url);
    }
}

async function renderStation(
    station: StationKind | null,
    roomId: string | null,
    options: { replaceHistory?: boolean; skipHistory?: boolean } = {},
) {
    cleanupCurrentStation();

    const shouldUpdateHistory = !options.skipHistory;

    if (!station || !roomId) {
        stationContainer.innerHTML = '';
        setSelectionVisible(true);
        if (shouldUpdateHistory) {
            updateUrl(null, null, Boolean(options.replaceHistory));
        }
        return;
    }

    roomIdInput.value = roomId;
    setSelectionVisible(false);
    stationContainer.innerHTML =
        `<p>Initializing ${station} Station...</p>`;

    if (shouldUpdateHistory) {
        updateUrl(station, roomId, Boolean(options.replaceHistory));
    }

    try {
        if (station === 'baby') {
            const module = await import('./baby-station');
            currentCleanup = await module.initBabyStation(
                stationContainer,
                roomId,
            );
        } else {
            const module = await import('./parent-station');
            currentCleanup = await module.initParentStation(
                stationContainer,
                roomId,
            );
        }
    } catch (err) {
        console.error('Failed to initialize station', err);
        stationContainer.innerHTML =
            '<p>Failed to initialize station. See console for details.</p>';
    }
}

// Generate random ID
roomIdInput.value = generateRandomId();

// Check for roomId in URL
const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get('roomId');
const station = urlParams.get('station') || 'parent';

const initialStation: StationKind | null =
    station === 'baby' || station === 'parent' ? station : null;

if (initialStation && roomId) {
    renderStation(initialStation, roomId, {
        skipHistory: true,
        replaceHistory: true,
    });
}

btnBaby.addEventListener('click', async () => {
    const roomId = roomIdInput!.value.trim();
    if (!roomId) {
        alert('Please enter a Room identifier');
        return;
    }
    renderStation('baby', roomId);
});

btnParent.addEventListener('click', async () => {
    const roomId = roomIdInput!.value.trim();
    if (!roomId) {
        alert('Please enter a Room identifier');
        return;
    }
    renderStation('parent', roomId);
});

window.addEventListener('popstate', (event) => {
    const state = event.state as
        | { station: StationKind | null; roomId: string | null }
        | null;
    const params = new URLSearchParams(window.location.search);
    const stationParam = params.get('station');
    const roomIdParam = params.get('roomId');

    const nextStation = state?.station
        ?? (stationParam === 'baby' || stationParam === 'parent'
            ? stationParam
            : null);
    const nextRoomId = state?.roomId ?? roomIdParam ?? roomIdInput.value;

    cleanupCurrentStation();
    renderStation(nextStation, nextStation ? nextRoomId : null, {
        skipHistory: true,
    });
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    cleanupCurrentStation();
});

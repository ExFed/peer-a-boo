import './style.css'
import { generateRandomId } from './dictionary';
import type { CleanupHandle } from './baby-station';

const appEl = document.querySelector<HTMLDivElement>('#app');
if (!appEl) {
    throw new Error('App container not found');
}

appEl.innerHTML = `
  <div>
    <h1>Peer-a-Boo 👻</h1>
    <div class="card">
      <div style="margin-bottom: 1rem;">
        <input type="text" id="peer-id-input" style="padding: 0.6em; font-size: 1em; width: 250px; text-align: center;" />
      </div>
      <button id="btn-baby" type="button">📹 Baby Station</button>
      <button id="btn-parent" type="button">👀 Parent Station</button>
    </div>
    <div id="station-container"></div>
  </div>
`

const btnBaby = document.querySelector<HTMLButtonElement>('#btn-baby');
const btnParent = document.querySelector<HTMLButtonElement>('#btn-parent');
const stationContainer = document.querySelector<HTMLDivElement>('#station-container');
const peerIdInput = document.querySelector<HTMLInputElement>('#peer-id-input');

if (!btnBaby || !btnParent || !stationContainer || !peerIdInput) {
    throw new Error('Required elements not found');
}

let currentCleanup: CleanupHandle | null = null;

function cleanupCurrentStation() {
    if (currentCleanup) {
        currentCleanup.cleanup();
        currentCleanup = null;
    }
}

// Generate random ID
peerIdInput.value = generateRandomId();

// Check for babyId in URL
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.has('babyId')) {
    const babyId = urlParams.get('babyId')!;
    peerIdInput.value = babyId;

    // Auto-load Parent Station
    stationContainer.innerHTML = '<p>Initializing Parent Station...</p>';
    import('./parent-station').then(async (module) => {
        cleanupCurrentStation();
        currentCleanup = await module.initParentStation(stationContainer!, babyId);
    });
    hideSelection();
}

btnBaby.addEventListener('click', async () => {
    const peerId = peerIdInput!.value.trim();
    if (!peerId) {
        alert('Please enter a Room identifier');
        return;
    }
    stationContainer!.innerHTML = '<p>Initializing Baby Station...</p>';
    const module = await import('./baby-station');
    cleanupCurrentStation();
    currentCleanup = await module.initBabyStation(stationContainer!, peerId);
    hideSelection();
});

btnParent.addEventListener('click', async () => {
    const peerId = peerIdInput!.value.trim();
    if (!peerId) {
        alert('Please enter a Room identifier');
        return;
    }
    stationContainer!.innerHTML = '<p>Initializing Parent Station...</p>';
    const module = await import('./parent-station');
    cleanupCurrentStation();
    currentCleanup = await module.initParentStation(stationContainer!, peerId);
    hideSelection();
});

function hideSelection() {
    const parent = btnBaby?.parentElement;
    if (parent) {
        parent.style.display = 'none';
    }
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    cleanupCurrentStation();
});

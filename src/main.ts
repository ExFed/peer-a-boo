import './style.css'
import { generateRandomId } from './dictionary';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div>
    <h1>Peer-a-Boo 👻</h1>
    <div class="card">
      <div style="margin-bottom: 1rem;">
        <input type="text" id="peer-id-input" style="padding: 0.6em; font-size: 1em; width: 250px; text-align: center;" />
      </div>
      <button id="btn-baby" type="button">I am the Baby Station (Camera)</button>
      <button id="btn-parent" type="button">I am the Parent Station (Monitor)</button>
    </div>
    <div id="station-container"></div>
  </div>
`

const btnBaby = document.querySelector<HTMLButtonElement>('#btn-baby')!;
const btnParent = document.querySelector<HTMLButtonElement>('#btn-parent')!;
const stationContainer = document.querySelector<HTMLDivElement>('#station-container')!;
const peerIdInput = document.querySelector<HTMLInputElement>('#peer-id-input')!;

// Generate random ID
peerIdInput.value = generateRandomId();

// Check for babyId in URL
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.has('babyId')) {
  const babyId = urlParams.get('babyId')!;
  peerIdInput.value = babyId;

  // Auto-load Parent Station
  stationContainer.innerHTML = '<p>Initializing Parent Station...</p>';
  import('./parent-station').then(module => module.initParentStation(stationContainer, babyId));
  hideSelection();
}

btnBaby.addEventListener('click', () => {
  const peerId = peerIdInput.value.trim();
  if (!peerId) {
    alert('Please enter a Peer identifier');
    return;
  }
  // TODO: Load Baby Station Logic
  stationContainer.innerHTML = '<p>Initializing Baby Station...</p>';
  import('./baby-station').then(module => module.initBabyStation(stationContainer, peerId));
  hideSelection();
});

btnParent.addEventListener('click', () => {
  const peerId = peerIdInput.value.trim();
  if (!peerId) {
    alert('Please enter a Peer identifier');
    return;
  }
  // TODO: Load Parent Station Logic
  stationContainer.innerHTML = '<p>Initializing Parent Station...</p>';
  import('./parent-station').then(module => module.initParentStation(stationContainer, peerId));
  hideSelection();
});

function hideSelection() {
  btnBaby.parentElement!.style.display = 'none';
}

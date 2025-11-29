import './style.css'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div>
    <h1>Peer-a-Boo 👻</h1>
    <div class="card">
      <button id="btn-baby" type="button">I am the Baby Station (Camera)</button>
      <button id="btn-parent" type="button">I am the Parent Station (Monitor)</button>
    </div>
    <div id="station-container"></div>
  </div>
`

const btnBaby = document.querySelector<HTMLButtonElement>('#btn-baby')!;
const btnParent = document.querySelector<HTMLButtonElement>('#btn-parent')!;
const stationContainer = document.querySelector<HTMLDivElement>('#station-container')!;

// Check for babyId in URL
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.has('babyId')) {
  // Auto-load Parent Station
  stationContainer.innerHTML = '<p>Initializing Parent Station...</p>';
  import('./parent-station').then(module => module.initParentStation(stationContainer));
  hideSelection();
}

btnBaby.addEventListener('click', () => {
  // TODO: Load Baby Station Logic
  stationContainer.innerHTML = '<p>Initializing Baby Station...</p>';
  import('./baby-station').then(module => module.initBabyStation(stationContainer));
  hideSelection();
});

btnParent.addEventListener('click', () => {
  // TODO: Load Parent Station Logic
  stationContainer.innerHTML = '<p>Initializing Parent Station...</p>';
  import('./parent-station').then(module => module.initParentStation(stationContainer));
  hideSelection();
});

function hideSelection() {
  btnBaby.parentElement!.style.display = 'none';
}

import { Peer } from 'peerjs';
import { requestWakeLock } from './utils';

export function initParentStation(container: HTMLElement) {
  requestWakeLock();
  container.innerHTML = `
    <h2>Parent Station</h2>
    <div id="input-area">
      <input type="text" id="remote-id-input" placeholder="Enter Baby Station ID" style="padding: 8px; width: 200px;" />
      <button id="btn-connect">Connect</button>
    </div>
    <div id="status"></div>
    <div style="margin-top: 20px;">
      <video id="remote-video" autoplay playsinline controls style="max-width: 100%; border: 2px solid #646cff;"></video>
    </div>
  `;

  const inputArea = container.querySelector<HTMLDivElement>('#input-area')!;
  const remoteIdInput = container.querySelector<HTMLInputElement>('#remote-id-input')!;
  const btnConnect = container.querySelector<HTMLButtonElement>('#btn-connect')!;
  const statusEl = container.querySelector('#status')!;
  const videoEl = container.querySelector<HTMLVideoElement>('#remote-video')!;

  // Check for ID in URL
  const urlParams = new URLSearchParams(window.location.search);
  const sharedId = urlParams.get('babyId');
  if (sharedId) {
    remoteIdInput.value = sharedId;
  }

  btnConnect.addEventListener('click', () => {
    const remoteId = remoteIdInput.value.trim();
    if (!remoteId) return;

    statusEl.textContent = "Connecting to signaling server...";
    inputArea.classList.add('hidden');

    const peer = new Peer();

    peer.on('open', () => {
      statusEl.textContent = `Connected to server. Calling Baby Station (${remoteId})...`;

      // Create a dummy stream to initiate the call
      // Some browsers require a track to be present
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const stream = canvas.captureStream();

      const call = peer.call(remoteId, stream);

      call.on('stream', (remoteStream) => {
        statusEl.textContent = "Connected! Monitoring...";
        videoEl.srcObject = remoteStream;
        videoEl.play().catch(e => console.error("Auto-play failed", e));
      });

      call.on('close', () => {
        statusEl.textContent = "Call closed.";
        inputArea.classList.remove('hidden');
      });

      call.on('error', (err) => {
        console.error(err);
        statusEl.textContent = "Call error: " + err;
        inputArea.classList.remove('hidden');
      });
    });

    peer.on('error', (err) => {
      console.error(err);
      statusEl.textContent = "Peer error: " + err.type;
      inputArea.classList.remove('hidden');
    });
  });
}

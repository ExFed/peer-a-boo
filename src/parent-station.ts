import { Peer } from 'peerjs';
import { requestWakeLock } from './utils';

export function initParentStation(container: HTMLElement, remoteId: string) {
  requestWakeLock();
  container.innerHTML = `
    <h2>Parent Station</h2>
    <div id="status">Connecting to ${remoteId}...</div>
    <div style="margin-top: 20px;">
      <video id="remote-video" autoplay playsinline controls style="max-width: 100%; border: 2px solid #646cff;"></video>
    </div>
  `;

  const statusEl = container.querySelector('#status')!;
  const videoEl = container.querySelector<HTMLVideoElement>('#remote-video')!;

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
    });
    
    call.on('error', (err) => {
      console.error(err);
      statusEl.textContent = "Call error: " + err;
    });
  });

  peer.on('error', (err) => {
    console.error(err);
    statusEl.textContent = "Peer error: " + err.type;
  });
}

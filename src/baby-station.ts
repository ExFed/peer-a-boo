import { Peer } from 'peerjs';
import type { MediaConnection } from 'peerjs';
import QRCode from 'qrcode';
import { requestWakeLock, stopMediaStream } from './utils';

export interface CleanupHandle {
    cleanup: () => void;
}

export async function initBabyStation(
    container: HTMLElement,
    peerId: string
): Promise<CleanupHandle> {
    const wakeLockHandle = await requestWakeLock();
    let stream: MediaStream | null = null;
    let peer: Peer | null = null;
    let activeCall: MediaConnection | null = null;

    const cleanup = () => {
        if (activeCall) {
            activeCall.close();
            activeCall = null;
        }
        if (peer) {
            peer.destroy();
            peer = null;
        }
        stopMediaStream(stream);
        stream = null;
        wakeLockHandle?.release();
        console.log('Baby Station cleaned up');
    };

    container.innerHTML = `
    <h2>Baby Station</h2>
    <div id="status">Initializing...</div>
    <div id="id-display" class="hidden">
      <p>Scan this code or enter ID on Parent device:</p>
      <canvas id="qr-code"></canvas>
      <br>
      <h3 id="peer-id" style="font-family: monospace; background: #333; padding: 10px; border-radius: 4px; display: inline-block;"></h3>
    </div>
    <div style="margin-top: 20px;">
      <video id="local-video" autoplay muted playsinline style="max-width: 100%; border: 2px solid #646cff;"></video>
    </div>
  `;

    const statusEl = container.querySelector<HTMLElement>('#status');
    const idDisplayEl = container.querySelector<HTMLElement>('#id-display');
    const peerIdEl = container.querySelector<HTMLElement>('#peer-id');
    const videoEl = container.querySelector<HTMLVideoElement>('#local-video');
    const canvasEl = container.querySelector<HTMLCanvasElement>('#qr-code');

    if (!statusEl || !idDisplayEl || !peerIdEl || !videoEl || !canvasEl) {
        console.error('Required elements not found');
        return { cleanup };
    }

    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        videoEl.srcObject = stream;
        statusEl.textContent = 'Camera started. Connecting to signaling server...';

        peer = new Peer(peerId);

        peer.on('open', (id) => {
            statusEl.textContent = 'Ready. Waiting for parent to connect...';
            idDisplayEl.classList.remove('hidden');
            peerIdEl.textContent = id;

            const url = new URL(window.location.href);
            url.searchParams.set('babyId', id);

            QRCode.toCanvas(canvasEl, url.toString(), { width: 200, margin: 1 }, (error) => {
                if (error) console.error(error);
            });
        });

        peer.on('call', (call) => {
            console.log('Incoming call from parent...');
            statusEl.textContent = 'Parent connected! Streaming...';
            activeCall = call;
            call.answer(stream!);
        });

        peer.on('error', (err) => {
            console.error(err);
            statusEl.textContent = 'Error: ' + err.type;
        });
    } catch (err) {
        console.error('Failed to get local stream', err);
        statusEl.textContent = 'Error accessing camera/mic: ' + (err as Error).message;
    }

    return { cleanup };
}

import { Peer } from 'peerjs';
import type { MediaConnection } from 'peerjs';
import { requestWakeLock, stopMediaStream } from './utils';

export interface CleanupHandle {
    cleanup: () => void;
}

export async function initParentStation(
    container: HTMLElement,
    remoteId: string
): Promise<CleanupHandle> {
    const wakeLockHandle = await requestWakeLock();
    let peer: Peer | null = null;
    let activeCall: MediaConnection | null = null;
    let dummyStream: MediaStream | null = null;
    let remoteStream: MediaStream | null = null;

    const cleanup = () => {
        if (activeCall) {
            activeCall.close();
            activeCall = null;
        }
        if (peer) {
            peer.destroy();
            peer = null;
        }
        stopMediaStream(dummyStream);
        dummyStream = null;
        stopMediaStream(remoteStream);
        remoteStream = null;
        wakeLockHandle?.release();
        console.log('Parent Station cleaned up');
    };

    container.innerHTML = `
    <h2>Parent Station</h2>
    <div id="status">Connecting to ${remoteId}...</div>
    <div style="margin-top: 20px;">
      <video id="remote-video" autoplay playsinline controls style="max-width: 100%; border: 2px solid #646cff;"></video>
    </div>
  `;

    const statusEl = container.querySelector<HTMLElement>('#status');
    const videoEl = container.querySelector<HTMLVideoElement>('#remote-video');

    if (!statusEl || !videoEl) {
        console.error('Required elements not found');
        return { cleanup };
    }

    peer = new Peer();

    peer.on('open', () => {
        statusEl.textContent = `Connected to server. Calling Baby Station (${remoteId})...`;

        // Create a dummy stream to initiate the call
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        dummyStream = canvas.captureStream();

        activeCall = peer!.call(remoteId, dummyStream);

        activeCall.on('stream', (stream) => {
            remoteStream = stream;
            statusEl.textContent = 'Connected! Monitoring...';
            videoEl.srcObject = stream;
            videoEl.play().catch((e) => console.error('Auto-play failed', e));
        });

        activeCall.on('close', () => {
            statusEl.textContent = 'Call closed.';
        });

        activeCall.on('error', (err) => {
            console.error(err);
            statusEl.textContent = 'Call error: ' + err;
        });
    });

    peer.on('error', (err) => {
        console.error(err);
        statusEl.textContent = 'Peer error: ' + err.type;
    });

    return { cleanup };
}

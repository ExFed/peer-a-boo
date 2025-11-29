import { Peer } from 'peerjs';
import type { MediaConnection } from 'peerjs';
import { requestWakeLock, stopMediaStream, createAudioLevelMeter } from './utils';
import type { AudioLevelMeterHandle } from './utils';

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
    let dummyAudioCtx: AudioContext | null = null;
    let remoteStream: MediaStream | null = null;
    let audioMeterHandle: AudioLevelMeterHandle | null = null;

    const cleanup = () => {
        if (audioMeterHandle) {
            audioMeterHandle.stop();
            audioMeterHandle = null;
        }
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
        if (dummyAudioCtx) {
            dummyAudioCtx.close();
            dummyAudioCtx = null;
        }
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
    <div class="audio-level-container">
      <label>Audio Level:</label>
      <div class="audio-level-track">
        <div id="audio-level-meter" class="audio-level-meter"></div>
      </div>
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

        // Create a dummy stream with both video and audio tracks
        // This ensures PeerJS negotiates both media types
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;

        // Create silent audio track using AudioContext
        const audioCtx = new AudioContext();
        dummyAudioCtx = audioCtx;
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        gainNode.gain.value = 0; // Silent
        oscillator.connect(gainNode);
        const dest = audioCtx.createMediaStreamDestination();
        gainNode.connect(dest);
        oscillator.start();

        // Combine video and audio into one stream
        dummyStream = new MediaStream([
            ...canvas.captureStream().getVideoTracks(),
            ...dest.stream.getAudioTracks()
        ]);

        activeCall = peer!.call(remoteId, dummyStream);

        activeCall.on('stream', (stream) => {
            remoteStream = stream;
            console.log('Received stream tracks:', stream.getTracks().map(t => `${t.kind}: ${t.label} (enabled: ${t.enabled})`));
            statusEl.textContent = 'Connected! Monitoring...';
            videoEl.srcObject = stream;
            videoEl.play().catch((e) => console.error('Auto-play failed', e));

            // Set up audio level meter if stream has audio tracks
            const meterEl = container.querySelector<HTMLElement>('#audio-level-meter');
            if (meterEl && stream.getAudioTracks().length > 0) {
                audioMeterHandle = createAudioLevelMeter(stream, (level) => {
                    meterEl.style.width = `${level * 100}%`;
                });
            } else if (meterEl) {
                console.warn('No audio tracks in received stream');
            }
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

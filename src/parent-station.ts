import { Peer } from 'peerjs';
import type { MediaConnection } from 'peerjs';
import { requestWakeLock, stopMediaStream, createAudioLevelMeter, querySelectorOrThrow } from './utils';
import type { AudioLevelMeterHandle } from './utils';

export interface CleanupHandle {
    cleanup: () => void;
}

export async function initParentStation(
    container: HTMLElement,
    roomId: string
): Promise<CleanupHandle> {
    const wakeLockHandle = await requestWakeLock();
    let peer: Peer | null = null;
    let activeCall: MediaConnection | null = null;
    let dummyStream: MediaStream | null = null;
    let dummyAudioCtx: AudioContext | null = null;
    let remoteStream: MediaStream | null = null;
    let audioMeterHandle: AudioLevelMeterHandle | null = null;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;
    let isConnected = false;

    const cleanup = () => {
        if (retryTimeout) {
            clearTimeout(retryTimeout);
            retryTimeout = null;
        }
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

    // Note that PeerJS keeps call connections open for 5s until giving up;
    // setting minDelay to less than 5s causes retry logic to fail
    const minDelay = 5000; // ms
    const randomFactor = 0.5; // 50%

    function getNextDelay(): number {
        return minDelay + Math.random() * randomFactor * minDelay;
    }

    function createDummyStream() {
        // Clean up existing dummy stream resources
        if (dummyAudioCtx) {
            dummyAudioCtx.close();
        }
        stopMediaStream(dummyStream);

        // Create a dummy stream with both video and audio tracks
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

        return dummyStream;
    }

    function scheduleRetry() {
        if (retryTimeout) {
            clearTimeout(retryTimeout);
        }
        const delay = getNextDelay();
        statusEl!.textContent = `Connecting to server... Retry in ${Math.round(delay / 1000)}s`;
        retryTimeout = setTimeout(attemptCall, delay);
    }

    function attemptCall() {
        if (!peer || peer.destroyed) {
            // Peer was destroyed, recreate it
            initPeer();
            return;
        }

        if (!peer.open) {
            // Peer not connected to server yet, wait and retry
            scheduleRetry();
            return;
        }

        console.log(`Connection open: ${peer}`);

        statusEl!.textContent = `Calling Baby Station...`;

        const stream = createDummyStream();
        activeCall = peer.call(roomId, stream);

        activeCall.on('stream', (incomingStream) => {
            isConnected = true;
            remoteStream = incomingStream;
            console.log('Received stream tracks:', incomingStream.getTracks().map(t => `${t.kind}: ${t.label} (enabled: ${t.enabled})`));
            statusEl!.textContent = 'Connected! Monitoring...';
            videoEl!.srcObject = incomingStream;
            videoEl!.play().catch((e) => console.error('Auto-play failed', e));

            // Set up audio level meter if stream has audio tracks
            if (meterEl && incomingStream.getAudioTracks().length > 0) {
                if (audioMeterHandle) {
                    audioMeterHandle.stop();
                }
                audioMeterHandle = createAudioLevelMeter(incomingStream, (level) => {
                    meterEl.style.width = `${level * 100}%`;
                });
            } else if (meterEl) {
                console.warn('No audio tracks in received stream');
            }
        });

        activeCall.on('close', () => {
            isConnected = false;
            scheduleRetry();
        });

        activeCall.on('error', (err) => {
            console.error('Call error:', err);
            isConnected = false;
            scheduleRetry();
        });
    }

    function initPeer() {
        if (peer) {
            peer.destroy();
        }

        peer = new Peer();

        peer.on('open', () => {
            console.log('Connected to signaling server');
            attemptCall();
        });

        peer.on('disconnected', () => {
            console.log('Disconnected from signaling server');
            if (!isConnected) {
                scheduleRetry();
            }
        });

        peer.on('error', (err) => {
            console.error('Peer error:', err);
            statusEl!.textContent = `Peer error: ${err.type}. Retrying...`;
            scheduleRetry();
        });
    }

    container.innerHTML = `
    <h2>Parent Station ${roomId}</h2>
    <div id="status">...</div>
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

    const statusEl = querySelectorOrThrow<HTMLElement>(container, '#status');
    const videoEl = querySelectorOrThrow<HTMLVideoElement>(container, '#remote-video');
    const meterEl = querySelectorOrThrow<HTMLElement>(container, '#audio-level-meter');

    // Start the connection process
    initPeer();

    return { cleanup };
}

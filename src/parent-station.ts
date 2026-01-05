import { Peer } from 'peerjs';
import type { MediaConnection } from 'peerjs';
import { requestWakeLock, stopMediaStream, createAudioLevelMeter, querySelectorOrThrow } from './utils';
import type { AudioLevelMeterHandle } from './utils';
import { createMotionDetector } from './motion-detection';
import type { MotionDetectorHandle } from './motion-detection';

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
    let motionDetectorHandle: MotionDetectorHandle | null = null;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;
    let motionAlertTimeout: ReturnType<typeof setTimeout> | null = null;
    let isConnected = false;
    let isCleaningUp = false;

    const cleanup = () => {
        isCleaningUp = true;
        if (retryTimeout) {
            clearTimeout(retryTimeout);
            retryTimeout = null;
        }
        if (motionAlertTimeout) {
            clearTimeout(motionAlertTimeout);
            motionAlertTimeout = null;
        }
        if (motionDetectorHandle) {
            motionDetectorHandle.stop();
            motionDetectorHandle = null;
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
        if (isCleaningUp) {
            return;
        }
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
    <div id="motion-alert" class="motion-alert hidden">Motion Detected!</div>
    <div style="margin-top: 20px; position: relative;">
      <video id="remote-video" autoplay playsinline controls style="max-width: 100%; border: 2px solid #646cff;"></video>
    </div>
    <div class="audio-level-container">
      <label>Audio Level:</label>
      <div class="audio-level-track">
        <div id="audio-level-meter" class="audio-level-meter"></div>
      </div>
    </div>
    <div class="motion-level-container">
      <label>Motion Level:</label>
      <div class="motion-level-track">
        <div id="motion-level-meter" class="motion-level-meter"></div>
      </div>
    </div>
    <div class="motion-controls">
      <label for="motion-sensitivity">Sensitivity:</label>
      <input type="range" id="motion-sensitivity" min="1" max="100" value="50" />
      <span id="sensitivity-value">50</span>
      <label class="pause-toggle">
        <input type="checkbox" id="pause-motion" />
        Pause Detection
      </label>
    </div>
  `;

    const statusEl = querySelectorOrThrow<HTMLElement>(container, '#status');
    const videoEl = querySelectorOrThrow<HTMLVideoElement>(container, '#remote-video');
    const meterEl = querySelectorOrThrow<HTMLElement>(container, '#audio-level-meter');
    const motionMeterEl = querySelectorOrThrow<HTMLElement>(container, '#motion-level-meter');
    const motionAlertEl = querySelectorOrThrow<HTMLElement>(container, '#motion-alert');
    const sensitivitySlider = querySelectorOrThrow<HTMLInputElement>(container, '#motion-sensitivity');
    const sensitivityValue = querySelectorOrThrow<HTMLElement>(container, '#sensitivity-value');
    const pauseCheckbox = querySelectorOrThrow<HTMLInputElement>(container, '#pause-motion');

    function showMotionAlert() {
        motionAlertEl.classList.remove('hidden');
        if (motionAlertTimeout) {
            clearTimeout(motionAlertTimeout);
        }
        motionAlertTimeout = setTimeout(() => {
            motionAlertEl.classList.add('hidden');
        }, 2000);
    }

    function setupMotionDetection() {
        if (motionDetectorHandle) {
            motionDetectorHandle.stop();
        }

        motionDetectorHandle = createMotionDetector(videoEl, {
            onMotionLevel: (level) => {
                motionMeterEl.style.width = `${level * 100}%`;
            },
            onMotionAlert: showMotionAlert,
        });

        const sliderValue = parseInt(sensitivitySlider.value, 10);
        const threshold = (101 - sliderValue) / 1000;
        motionDetectorHandle.setThreshold(threshold);
        motionDetectorHandle.start();
    }

    sensitivitySlider.addEventListener('input', () => {
        const value = parseInt(sensitivitySlider.value, 10);
        sensitivityValue.textContent = String(value);
        if (motionDetectorHandle) {
            const threshold = (101 - value) / 1000;
            motionDetectorHandle.setThreshold(threshold);
        }
    });

    pauseCheckbox.addEventListener('change', () => {
        if (motionDetectorHandle) {
            motionDetectorHandle.setPaused(pauseCheckbox.checked);
        }
    });

    videoEl.addEventListener('play', () => {
        if (!motionDetectorHandle) {
            setupMotionDetection();
        }
    });

    // Start the connection process
    initPeer();

    return { cleanup };
}

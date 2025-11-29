import { Peer } from 'peerjs';
import type { MediaConnection } from 'peerjs';
import QRCode from 'qrcode';
import { requestWakeLock, stopMediaStream, enumerateMediaDevices } from './utils';

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
    let deviceChangeHandler: (() => void) | null = null;

    const cleanup = () => {
        if (deviceChangeHandler) {
            navigator.mediaDevices.removeEventListener('devicechange', deviceChangeHandler);
            deviceChangeHandler = null;
        }
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
    <div id="device-selection" class="device-selection">
      <div class="device-select-group">
        <label for="camera-select">Camera:</label>
        <select id="camera-select"></select>
      </div>
      <div class="device-select-group">
        <label for="microphone-select">Microphone:</label>
        <select id="microphone-select"></select>
      </div>
    </div>
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
    const cameraSelect = container.querySelector<HTMLSelectElement>('#camera-select');
    const micSelect = container.querySelector<HTMLSelectElement>('#microphone-select');

    if (!statusEl || !idDisplayEl || !peerIdEl || !videoEl || !canvasEl || !cameraSelect || !micSelect) {
        console.error('Required elements not found');
        return { cleanup };
    }

    // Populate device dropdowns
    async function populateDevices() {
        const devices = await enumerateMediaDevices();

        cameraSelect!.innerHTML = devices.cameras
            .map(d => `<option value="${d.deviceId}">${d.label}</option>`)
            .join('');

        micSelect!.innerHTML = devices.microphones
            .map(d => `<option value="${d.deviceId}">${d.label}</option>`)
            .join('');
    }

    // Start or restart media stream with selected devices
    async function startStream() {
        stopMediaStream(stream);

        const constraints: MediaStreamConstraints = {
            video: cameraSelect!.value
                ? { deviceId: { exact: cameraSelect!.value } }
                : true,
            audio: micSelect!.value
                ? { deviceId: { exact: micSelect!.value } }
                : true
        };

        stream = await navigator.mediaDevices.getUserMedia(constraints);
        videoEl!.srcObject = stream;

        // Update active call if connected
        if (activeCall) {
            const videoTrack = stream.getVideoTracks()[0];
            const audioTrack = stream.getAudioTracks()[0];
            const senders = activeCall.peerConnection?.getSenders();
            senders?.forEach(sender => {
                if (sender.track?.kind === 'video' && videoTrack) {
                    sender.replaceTrack(videoTrack);
                } else if (sender.track?.kind === 'audio' && audioTrack) {
                    sender.replaceTrack(audioTrack);
                }
            });
        }
    }

    // Handle device changes
    cameraSelect.addEventListener('change', () => {
        startStream().catch(err => {
            console.error('Failed to switch camera', err);
            statusEl!.textContent = 'Error switching camera: ' + (err as Error).message;
        });
    });

    micSelect.addEventListener('change', () => {
        startStream().catch(err => {
            console.error('Failed to switch microphone', err);
            statusEl!.textContent = 'Error switching microphone: ' + (err as Error).message;
        });
    });

    // Listen for device hot-plug
    deviceChangeHandler = () => {
        populateDevices().catch(err => console.error('Failed to refresh devices', err));
    };
    navigator.mediaDevices.addEventListener('devicechange', deviceChangeHandler);

    try {
        // Initial device enumeration and stream start
        await populateDevices();
        await startStream();
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

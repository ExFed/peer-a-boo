import { Peer } from 'peerjs';
import type { MediaConnection, DataConnection } from 'peerjs';
import QRCode from 'qrcode';
import { requestWakeLock, stopMediaStream, enumerateMediaDevices, getOrientationAngle } from './utils';

export interface CleanupHandle {
    cleanup: () => void;
}

export interface OrientationMessage {
    type: 'orientation';
    angle: number;
}

export async function initBabyStation(
    container: HTMLElement,
    peerId: string
): Promise<CleanupHandle> {
    const wakeLockHandle = await requestWakeLock();
    let stream: MediaStream | null = null;
    let peer: Peer | null = null;
    let activeCall: MediaConnection | null = null;
    let activeDataConnection: DataConnection | null = null;
    let deviceChangeHandler: (() => void) | null = null;
    let orientationChangeHandler: (() => void) | null = null;
    let useScreenOrientationAPI = false;

    // Send current orientation to connected parent station
    function sendOrientationUpdate() {
        if (activeDataConnection && activeDataConnection.open) {
            const message: OrientationMessage = {
                type: 'orientation',
                angle: getOrientationAngle()
            };
            activeDataConnection.send(message);
            console.log('Sent orientation update:', message.angle);
        }
    }

    const cleanup = () => {
        if (orientationChangeHandler) {
            if (useScreenOrientationAPI && screen.orientation) {
                screen.orientation.removeEventListener('change', orientationChangeHandler);
            } else {
                window.removeEventListener('orientationchange', orientationChangeHandler);
            }
            orientationChangeHandler = null;
        }
        if (deviceChangeHandler) {
            navigator.mediaDevices.removeEventListener('devicechange', deviceChangeHandler);
            deviceChangeHandler = null;
        }
        if (activeDataConnection) {
            activeDataConnection.close();
            activeDataConnection = null;
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

    // Populate device dropdowns, preserving current selection if possible
    async function populateDevices() {
        const currentCamera = cameraSelect!.value;
        const currentMic = micSelect!.value;

        const devices = await enumerateMediaDevices();

        console.log('Enumerated devices:', devices);

        cameraSelect!.innerHTML = devices.cameras
            .map(d => `<option value="${d.deviceId}">${d.label}</option>`)
            .join('');

        micSelect!.innerHTML = devices.microphones
            .map(d => `<option value="${d.deviceId}">${d.label}</option>`)
            .join('');

        // Restore previous selection if still available
        if (currentCamera && devices.cameras.some(d => d.deviceId === currentCamera)) {
            cameraSelect!.value = currentCamera;
        }
        if (currentMic && devices.microphones.some(d => d.deviceId === currentMic)) {
            micSelect!.value = currentMic;
        }
    }

    // Start or restart media stream with selected devices
    async function startStream(preferBackCamera = false): Promise<MediaStream> {
        stopMediaStream(stream);

        // Build video constraints
        let videoConstraints: MediaTrackConstraints | boolean = true;
        if (cameraSelect!.value) {
            videoConstraints = { deviceId: { exact: cameraSelect!.value } };
        } else if (preferBackCamera) {
            // On mobile, prefer back-facing camera for baby monitoring
            videoConstraints = { facingMode: { ideal: 'environment' } };
        }

        const constraints: MediaStreamConstraints = {
            video: videoConstraints,
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

        return stream;
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
        // Initial enumeration may be limited before permission grant
        await populateDevices();

        // Start stream preferring back camera (for baby monitoring)
        const currentStream = await startStream(true);

        // Re-enumerate devices after permission is granted to get full list
        await populateDevices();

        // Update dropdown to reflect actual selected device
        const videoTrack = currentStream.getVideoTracks()[0];
        const audioTrack = currentStream.getAudioTracks()[0];
        if (videoTrack) {
            const settings = videoTrack.getSettings();
            if (settings.deviceId) {
                cameraSelect.value = settings.deviceId;
            }
        }
        if (audioTrack) {
            const settings = audioTrack.getSettings();
            if (settings.deviceId) {
                micSelect.value = settings.deviceId;
            }
        }

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
            console.log('Stream tracks:', stream?.getTracks().map(t => `${t.kind}: ${t.label} (enabled: ${t.enabled})`));
            statusEl.textContent = 'Parent connected! Streaming...';
            activeCall = call;
            call.answer(stream!);
        });

        // Handle data connection for orientation updates
        peer.on('connection', (conn) => {
            console.log('Data connection from parent...');
            // Close previous data connection if it exists
            if (activeDataConnection && activeDataConnection.open) {
                console.log('Closing previous data connection...');
                activeDataConnection.close();
            }
            activeDataConnection = conn;
            
            conn.on('open', () => {
                console.log('Data connection opened');
                // Send initial orientation
                sendOrientationUpdate();
            });

            conn.on('close', () => {
                console.log('Data connection closed');
                if (activeDataConnection === conn) {
                    activeDataConnection = null;
                }
            });
        });

        // Set up orientation change listener
        orientationChangeHandler = () => {
            sendOrientationUpdate();
        };
        
        // Use Screen Orientation API if available, fall back to window.orientationchange
        if (screen.orientation) {
            useScreenOrientationAPI = true;
            screen.orientation.addEventListener('change', orientationChangeHandler);
        } else {
            useScreenOrientationAPI = false;
            window.addEventListener('orientationchange', orientationChangeHandler);
        }

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

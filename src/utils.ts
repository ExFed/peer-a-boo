export interface WakeLockHandle {
    release: () => Promise<void>;
}

export async function requestWakeLock(): Promise<WakeLockHandle | null> {
    if (!('wakeLock' in navigator)) {
        console.warn('Wake Lock API not supported.');
        return null;
    }

    let wakeLock: WakeLockSentinel | null = null;

    const handleVisibilityChange = async () => {
        if (document.visibilityState === 'visible' && 'wakeLock' in navigator) {
            try {
                wakeLock = await navigator.wakeLock.request('screen');
                console.log('Wake Lock re-acquired');
            } catch (err) {
                console.error('Failed to re-acquire wake lock:', err);
            }
        }
    };

    try {
        wakeLock = await navigator.wakeLock.request('screen');
        console.log('Wake Lock is active!');

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return {
            release: async () => {
                document.removeEventListener('visibilitychange', handleVisibilityChange);
                if (wakeLock && !wakeLock.released) {
                    await wakeLock.release();
                    console.log('Wake Lock released');
                }
                wakeLock = null;
            }
        };
    } catch (err) {
        console.error('Failed to acquire wake lock:', err);
        return null;
    }
}

// Helper to stop all tracks in a media stream
export function stopMediaStream(stream: MediaStream | null): void {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
}

export interface MediaDeviceInfo {
    deviceId: string;
    label: string;
}

export interface MediaDevices {
    cameras: MediaDeviceInfo[];
    microphones: MediaDeviceInfo[];
}

// Enumerate available media devices (cameras and microphones)
export async function enumerateMediaDevices(): Promise<MediaDevices> {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras: MediaDeviceInfo[] = [];
    const microphones: MediaDeviceInfo[] = [];

    devices.forEach((device) => {
        if (device.kind === 'videoinput') {
            cameras.push({
                deviceId: device.deviceId,
                label: device.label || `Camera ${cameras.length + 1}`
            });
        } else if (device.kind === 'audioinput') {
            microphones.push({
                deviceId: device.deviceId,
                label: device.label || `Microphone ${microphones.length + 1}`
            });
        }
    });

    return { cameras, microphones };
}

export interface AudioLevelMeterHandle {
    stop: () => void;
}

// Create an audio level meter from a media stream
export function createAudioLevelMeter(
    stream: MediaStream,
    onLevel: (level: number) => void
): AudioLevelMeterHandle {
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    let animationId: number | null = null;

    const update = () => {
        analyser.getByteTimeDomainData(dataArray);

        // Calculate RMS level
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
            const value = (dataArray[i] - 128) / 128;
            sum += value * value;
        }
        const rms = Math.sqrt(sum / dataArray.length);
        const level = Math.min(1, rms * 3); // Scale up for visibility

        onLevel(level);
        animationId = requestAnimationFrame(update);
    };

    update();

    return {
        stop: () => {
            if (animationId !== null) {
                cancelAnimationFrame(animationId);
            }
            source.disconnect();
            audioContext.close();
        }
    };
}

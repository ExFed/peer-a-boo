/**
 * Handle returned by requestWakeLock for releasing the wake lock.
 */
export interface WakeLockHandle {
    release: () => Promise<void>;
}

/**
 * Queries for an element and throws an error if not found.
 * @param parent - The parent node to search within
 * @param selector - The CSS selector to search for
 * @returns The found element
 * @throws Error if the element is not found
 */
export function querySelectorOrThrow<E extends Element = Element>(
    parent: ParentNode,
    selector: string,
): E {
    const element = parent.querySelector<E>(selector);
    if (!element) {
        throw new Error(`Element not found for selector: ${selector}`);
    }
    return element;
}

/**
 * Requests a screen wake lock to prevent the device from sleeping.
 * Automatically re-acquires the lock when the page becomes visible again.
 * @returns A handle to release the wake lock, or null if the API is not supported or the request fails
 */
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

/**
 * Stops all tracks in a media stream.
 * @param stream - The media stream to stop
 */
export function stopMediaStream(stream: MediaStream | null): void {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
}

/**
 * Information about a media device.
 */
export interface MediaDeviceInfo {
    deviceId: string;
    label: string;
}

/**
 * Collection of available cameras and microphones.
 */
export interface MediaDevices {
    cameras: MediaDeviceInfo[];
    microphones: MediaDeviceInfo[];
}

/**
 * Enumerates available media devices (cameras and microphones).
 * @returns A promise that resolves to an object containing lists of cameras and microphones
 */
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

/**
 * Handle for stopping an audio level meter.
 */
export interface AudioLevelMeterHandle {
    stop: () => void;
}

/**
 * Handle for updating and stopping a decaying meter.
 */
export interface DecayingMeterHandle {
    update: (level: number) => void;
    stop: () => void;
}

/**
 * Configuration options for a decaying meter.
 */
export interface DecayingMeterOptions {
    /** Rate at which the meter decays in milliseconds */
    decayRate?: number;
    /** Level above which the 'warning' class is added (0-1) */
    warningThreshold?: number;
    /** Level above which the 'danger' class is added (0-1) */
    dangerThreshold?: number;
}

/**
 * Creates a decaying meter that tracks peak values and smoothly decays over time.
 * @param meterEl - The HTML element to update with meter width and color classes
 * @param options - Configuration for decay rate and color thresholds
 * @returns Handle with update() to set new levels and stop() to cleanup
 */
export function createDecayingMeter(
    meterEl: HTMLElement,
    options: DecayingMeterOptions = {}
): DecayingMeterHandle {
    const {
        decayRate = 100,
        warningThreshold = 0.5,
        dangerThreshold = 0.75,
    } = options;

    let currentLevel = 0;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const applyLevel = () => {
        meterEl.style.width = `${currentLevel * 100}%`;

        meterEl.classList.remove('warning', 'danger');
        if (currentLevel > dangerThreshold) {
            meterEl.classList.add('danger');
        } else if (currentLevel > warningThreshold) {
            meterEl.classList.add('warning');
        }
    };

    intervalId = setInterval(() => {
        if (currentLevel > 0) {
            currentLevel = Math.max(0, currentLevel - 0.1);
            applyLevel();
        }
    }, decayRate);

    return {
        update: (level: number) => {
            if (level > currentLevel) {
                currentLevel = level;
                applyLevel();
            }
        },
        stop: () => {
            if (intervalId !== null) {
                clearInterval(intervalId);
                intervalId = null;
            }
        }
    };
}

/**
 * Creates an audio level meter from a media stream.
 * @param stream - The media stream to analyze
 * @param onLevel - Callback function that receives the current audio level (0-1)
 * @returns Handle for stopping the meter
 */
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

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
            const value = (dataArray[i] - 128) / 128;
            sum += value * value;
        }
        const rms = Math.sqrt(sum / dataArray.length);
        const level = Math.min(1, rms * 3);

        onLevel(level);
        animationId = requestAnimationFrame(update);
    };

    if (audioContext.state === 'suspended') {
        audioContext.resume().then(update);
    } else {
        update();
    }

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

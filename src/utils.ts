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

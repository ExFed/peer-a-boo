export async function requestWakeLock() {
    if ('wakeLock' in navigator) {
        try {
            // @ts-ignore - Types might not be fully up to date in the environment
            const wakeLock = await navigator.wakeLock.request('screen');
            console.log('Wake Lock is active!');

            // Re-request wake lock if visibility changes (e.g. tab switch)
            document.addEventListener('visibilitychange', async () => {
                if (document.visibilityState === 'visible') {
                    // @ts-ignore
                    await navigator.wakeLock.request('screen');
                    console.log('Wake Lock re-acquired');
                }
            });

            return wakeLock;
        } catch (err: any) {
            console.error(`${err.name}, ${err.message}`);
        }
    } else {
        console.warn('Wake Lock API not supported.');
    }
}

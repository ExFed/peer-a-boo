export interface MotionDetectorConfig {
    sampleWidth: number;
    sampleHeight: number;
    frameSkip: number;
    stabilizationFrames: number;
    alertCooldownMs: number;
}

export interface MotionDetectorHandle {
    start: () => void;
    stop: () => void;
    setThreshold: (threshold: number) => void;
    getThreshold: () => number;
    setPaused: (paused: boolean) => void;
    isPaused: () => boolean;
}

export interface MotionCallbacks {
    onMotionLevel: (level: number) => void;
    onMotionAlert: () => void;
}

const DEFAULT_CONFIG: MotionDetectorConfig = {
    sampleWidth: 160,
    sampleHeight: 120,
    frameSkip: 2,
    stabilizationFrames: 10,
    alertCooldownMs: 2000,
};

export function createMotionDetector(
    video: HTMLVideoElement,
    callbacks: MotionCallbacks,
    config: Partial<MotionDetectorConfig> = {}
): MotionDetectorHandle {
    const cfg: MotionDetectorConfig = { ...DEFAULT_CONFIG, ...config };

    const canvas = document.createElement('canvas');
    canvas.width = cfg.sampleWidth;
    canvas.height = cfg.sampleHeight;
    const maybeCtx = canvas.getContext('2d', { willReadFrequently: true });
    if (!maybeCtx) {
        throw new Error('Failed to get 2D context for motion detection canvas');
    }
    const ctx = maybeCtx;

    let previousFrameData: Uint8ClampedArray | null = null;
    let frameCount = 0;
    let skipCounter = 0;
    let animationId: number | null = null;
    let threshold = 0.05;
    let paused = false;
    let lastAlertTime = 0;
    let isRunning = false;

    function toGrayscale(imageData: ImageData): Float32Array {
        const data = imageData.data;
        const pixelCount = data.length / 4;
        const gray = new Float32Array(pixelCount);

        for (let i = 0; i < pixelCount; i++) {
            const offset = i * 4;
            // Luminance: 0.299*R + 0.587*G + 0.114*B
            gray[i] = (
                0.299 * data[offset] +
                0.587 * data[offset + 1] +
                0.114 * data[offset + 2]
            ) / 255;
        }

        return gray;
    }

    function calculateMotionScore(
        current: Float32Array,
        previous: Float32Array
    ): number {
        if (current.length !== previous.length) {
            return 0;
        }

        let totalDiff = 0;
        for (let i = 0; i < current.length; i++) {
            totalDiff += Math.abs(current[i] - previous[i]);
        }

        return totalDiff / current.length;
    }

    function processFrame() {
        if (!isRunning) return;

        animationId = requestAnimationFrame(processFrame);

        skipCounter++;
        if (skipCounter <= cfg.frameSkip) {
            return;
        }
        skipCounter = 0;

        if (video.readyState < 2 || video.paused || paused) {
            return;
        }

        ctx.drawImage(video, 0, 0, cfg.sampleWidth, cfg.sampleHeight);
        const imageData = ctx.getImageData(0, 0, cfg.sampleWidth, cfg.sampleHeight);
        const currentGray = toGrayscale(imageData);

        frameCount++;

        if (frameCount <= cfg.stabilizationFrames) {
            previousFrameData = new Uint8ClampedArray(currentGray.length);
            for (let i = 0; i < currentGray.length; i++) {
                previousFrameData[i] = Math.round(currentGray[i] * 255);
            }
            callbacks.onMotionLevel(0);
            return;
        }

        if (previousFrameData) {
            const previousGray = new Float32Array(previousFrameData.length);
            for (let i = 0; i < previousFrameData.length; i++) {
                previousGray[i] = previousFrameData[i] / 255;
            }

            const motionScore = calculateMotionScore(currentGray, previousGray);
            const displayLevel = Math.min(1, motionScore * 5);
            callbacks.onMotionLevel(displayLevel);

            const now = Date.now();
            if (motionScore > threshold && now - lastAlertTime > cfg.alertCooldownMs) {
                lastAlertTime = now;
                callbacks.onMotionAlert();
            }
        }

        previousFrameData = new Uint8ClampedArray(currentGray.length);
        for (let i = 0; i < currentGray.length; i++) {
            previousFrameData[i] = Math.round(currentGray[i] * 255);
        }
    }

    return {
        start() {
            if (isRunning) return;
            isRunning = true;
            frameCount = 0;
            skipCounter = 0;
            previousFrameData = null;
            lastAlertTime = 0;
            animationId = requestAnimationFrame(processFrame);
        },

        stop() {
            isRunning = false;
            if (animationId !== null) {
                cancelAnimationFrame(animationId);
                animationId = null;
            }
            previousFrameData = null;
        },

        setThreshold(newThreshold: number) {
            threshold = Math.max(0.01, Math.min(0.5, newThreshold));
        },

        getThreshold() {
            return threshold;
        },

        setPaused(isPaused: boolean) {
            paused = isPaused;
            if (paused) {
                previousFrameData = null;
                frameCount = 0;
            }
        },

        isPaused() {
            return paused;
        },
    };
}

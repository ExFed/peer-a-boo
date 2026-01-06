/**
 * Configuration for the motion detector.
 */
export interface MotionDetectorConfig {
    /** Width of the downsampled video frame for analysis */
    sampleWidth: number;
    /** Height of the downsampled video frame for analysis */
    sampleHeight: number;
    /** Number of frames to skip between analyses */
    frameSkip: number;
    /** Number of initial frames to ignore to allow camera to stabilize */
    stabilizationFrames: number;
    /** Minimum time between motion alerts in milliseconds */
    alertCooldownMs: number;
}

/**
 * Handle for controlling the motion detector.
 */
export interface MotionDetectorHandle {
    /** Starts the motion detection loop */
    start: () => void;
    /** Stops the motion detection loop */
    stop: () => void;
    /** Sets the motion sensitivity threshold (lower is more sensitive) */
    setThreshold: (threshold: number) => void;
    /** Gets the current motion sensitivity threshold */
    getThreshold: () => number;
    /** Pauses or resumes motion alerts without stopping the loop */
    setPaused: (paused: boolean) => void;
    /** Checks if motion alerts are currently paused */
    isPaused: () => boolean;
}

/**
 * Callbacks for motion detection events.
 */
export interface MotionCallbacks {
    /** Called when a new motion level is calculated (0-1) */
    onMotionLevel: (level: number) => void;
    /** Called when motion exceeds the threshold and cooldown has passed */
    onMotionAlert: () => void;
}

const DEFAULT_CONFIG: MotionDetectorConfig = {
    sampleWidth: 160,
    sampleHeight: 120,
    frameSkip: 2,
    stabilizationFrames: 10,
    alertCooldownMs: 2000,
};

/**
 * Creates a motion detector that analyzes a video element using frame differencing.
 * @param video - The HTML video element to analyze
 * @param callbacks - Event callbacks for motion level updates and alerts
 * @param config - Optional configuration to override defaults
 * @returns Handle for controlling the motion detector
 */
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
            gray[i] = (
                0.299 * data[offset] +
                0.587 * data[offset + 1] +
                0.114 * data[offset + 2]
            ) / 255;
        }

        return gray;
    }

    /**
     * Applies a Laplacian high-pass filter to emphasize edges/high-frequency detail.
     * This isolates small-scale motion (squirming) from large-scale motion (camera shake).
     * Laplacian kernel: [0, -1, 0, -1, 4, -1, 0, -1, 0]
     */
    function applyLaplacian(
        data: Float32Array, 
        width: number, 
        height: number
    ): Float32Array {
        const result = new Float32Array(data.length);
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = y * width + x;
                const laplacian = 
                    4 * data[idx] -
                    data[idx - 1] -
                    data[idx + 1] -
                    data[idx - width] -
                    data[idx + width];
                result[idx] = Math.abs(laplacian);
            }
        }
        
        return result;
    }

    function calculateMotionScore(
        current: Float32Array,
        previous: Float32Array
    ): number {
        if (current.length !== previous.length) {
            return 0;
        }

        const diff = new Float32Array(current.length);
        for (let i = 0; i < current.length; i++) {
            diff[i] = Math.abs(current[i] - previous[i]);
        }
        
        const highFreqMotion = applyLaplacian(diff, cfg.sampleWidth, cfg.sampleHeight);
        
        let totalHighFreq = 0;
        for (let i = 0; i < highFreqMotion.length; i++) {
            totalHighFreq += highFreqMotion[i];
        }

        return totalHighFreq / highFreqMotion.length;
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
            const displayLevel = Math.min(1, motionScore * 10);
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

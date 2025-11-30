# Motion Alert

Motion sensitivity slider (basic frame differencing, on-device).

## Implementation Steps

1. Set up frame capture on Parent Station
   - Create an off-screen `<canvas>` element matching video dimensions
   - Draw video frames to canvas using `drawImage()` at regular intervals
   - Extract pixel data via `getImageData()`

2. Implement frame differencing algorithm
   - Store the previous frame's pixel data
   - Compare current frame to previous frame pixel-by-pixel
   - Calculate absolute difference for each RGB channel
   - Sum differences to get a motion score

3. Add sensitivity slider UI
   - Add a range input for motion sensitivity threshold
   - Lower threshold = more sensitive to small movements
   - Display current motion level as a visual indicator

4. Optimize for performance
   - Downsample frames (e.g., 160x120) before comparison
   - Skip frames (e.g., compare every 3rd frame) to reduce CPU usage
   - Use grayscale conversion to simplify comparison
   - Run detection in `requestAnimationFrame` or `setInterval`

5. Trigger motion alert
   - Fire alert when motion score exceeds threshold
   - Implement cooldown period between alerts (e.g., 2 seconds)
   - Show on-screen "Motion Detected!" banner
   - Optional: highlight region of motion on video overlay

6. Handle edge cases
   - Ignore initial frames while algorithm stabilizes
   - Account for lighting changes (gradual vs sudden)
   - Provide "pause detection" toggle during parent interaction

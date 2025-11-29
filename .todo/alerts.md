# Alerts

## Audio Trigger

Sound level threshold (cry-like volume spike) with on-screen alert.

### Implementation Steps

1. Create audio analyzer on the Parent Station
   - Use `AudioContext` and `AnalyserNode` from the received remote stream
   - Extract the audio track via `remoteStream.getAudioTracks()[0]`
   - Create a `MediaStreamAudioSourceNode` from the audio track

2. Implement volume level detection
   - Use `analyser.getByteFrequencyData()` to sample audio levels
   - Calculate RMS (root mean square) or peak amplitude from frequency data
   - Run analysis in a `requestAnimationFrame` loop for continuous monitoring

3. Add threshold configuration UI
   - Add a slider control for sensitivity (e.g., 0-100 scale)
   - Store threshold value in component state
   - Display current audio level as a visual meter for calibration

4. Trigger alert when threshold exceeded
   - Compare current audio level against configured threshold
   - Implement debounce/cooldown to prevent rapid repeated alerts
   - Show on-screen alert banner (e.g., "Sound Detected!")
   - Optional: play a local notification sound or trigger vibration

5. Add alert history/log (optional)
   - Track timestamps of audio alerts
   - Display recent alerts in a collapsible list

---

## Motion Trigger

Motion sensitivity slider (basic frame differencing, on-device).

### Implementation Steps

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

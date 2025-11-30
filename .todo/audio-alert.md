# Audio Alert

Sound level threshold (cry-like volume spike) with on-screen alert.

## Implementation Steps

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
   - Play a local notification sound or trigger vibration

5. Add alert history/log (optional)
   - Track timestamps of audio alerts
   - Display recent alerts in a collapsible list

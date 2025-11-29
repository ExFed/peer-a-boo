# Peer-a-Boo MVP (LAN-only, No Backend)

Date: 2025-11-29T03:12:17.260Z

Goal
- Web-based baby monitor over same subnet (LAN) using purely P2P WebRTC.
- Static-hosted client. No signaling backend; manual out-of-band pairing via QR codes/text.

Scope
- Roles: Station (laptop in baby room) and Viewer (phone on same Wi‑Fi).
- 1:1 connection. No recording or cloud storage. Local-only alerts optional.

Protocols
- WebRTC (RTCPeerConnection) for audio/video/data.
- SRTP/DTLS via WebRTC for encrypted media.
- Host/mDNS ICE candidates only (LAN). No STUN/TURN.
- HTTPS for static hosting.

Languages
- TypeScript/JavaScript, HTML, CSS.

Libraries
- Native Web APIs: getUserMedia, RTCPeerConnection, MediaStream, MediaDevices.
- Optional helpers: simple-peer or PeerJS (can start raw for control).
- Build: Vite or esbuild.
- UI: Svelte/Preact or Vanilla + Tailwind (small bundle).
- QR: qrcode or qr-code-styling.
- Optional detection: WebAudio API for sound level; MediaPipe/TensorFlow.js for motion (later).

Manual Signaling Plan (LAN)
- Disable trickle ICE; wait for icegatheringstate === "complete" to shrink payload.
- Compress SDP (optional): deflate -> base64 to keep QR size manageable.
- Exchange via QR or copy/paste:
  1) Station generates Offer SDP, shows QR.
  2) Viewer scans QR, sets RemoteDescription, creates Answer, shows QR back.
  3) Station scans Answer QR, sets RemoteDescription. Connection establishes over LAN.

Connection Config
- RTCPeerConnection({
  iceServers: [],             // no STUN/TURN
  // Keep defaults so host/mDNS candidates are allowed
})
- Constraints:
  - Audio: echoCancellation:true, noiseSuppression:true, autoGainControl:true.
  - Video: prefer low resolution (e.g., 640x360 @ 15–24fps) for battery/bandwidth.
- Codec hints:
  - Audio: Opus.
  - Video: VP8/H.264; allow browser defaults. Consider limiting to one video codec to reduce SDP size.

UX Requirements
- Station: start/stop camera/mic, preview, audio level meter, room code/QR display, scan Answer.
- Viewer: connect via QR, low-latency playback, mute/unmute, reconnect button.
- Responsive layout; dark mode; clear pairing instructions.

Features Missing Without Backend (accepted tradeoffs)
- No auto-discovery/pairing; manual QR exchange.
- No remote push alerts when Viewer disconnected.
- Limited reconnect; may need re-pair on IP change/sleep.
- Single viewer; no multi-session coordination.
- No telemetry/diagnostics server.

Security & Privacy
- HTTPS-only hosting; CSP and secure headers.
- Ephemeral pairing: sessions reset on refresh; no persistence.
- No recordings by default. All processing on-device.

MVP Milestones
- M1: Static app skeleton
  - Build setup (Vite), minimal UI for Station/Viewer roles.
  - getUserMedia on Station, display preview.
- M2: Manual signaling via QR (non-trickle ICE)
  - Generate Offer (Station), QR render; scan on Viewer; generate Answer; QR back.
  - Establish WebRTC media stream over LAN.
- M3: UX polish
  - Audio meter, mute/unmute, connection status, error messages.
  - Save last role selection in localStorage.
- M4: Reliability
  - Reconnect flow button, ICE failure messaging, guidance to re-scan.
  - Connectivity checks: show candidate types used (host/mDNS).
- M5: Optional local alerts
  - On-Station sound level threshold (cry-like volume spike) with on-screen alert.
  - Motion sensitivity slider (basic frame differencing, on-device).

Testing Plan
- Devices: laptop (Station) + Android/iOS (Viewer) on same Wi‑Fi.
- Scenarios: IP change, sleep/wake, Wi‑Fi roam; verify re-pairing steps.
- Performance: CPU/battery while streaming; audio intelligibility; latency.

Deployment
- Host static site on GitHub Pages/Netlify/Vercel.
- Ensure HTTPS and service worker for offline assets (optional; no background network).

Implementation Notes
- Keep SDPs small: no trickle ICE, limit codecs/resolutions, avoid datachannel unless needed.
- QR size target: <= 2–3 KB payload; compress if needed.
- Provide copy/paste fallback if camera access to scan isn’t granted on Station.

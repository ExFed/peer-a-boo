# Peer-a-Boo: Web-Based P2P Baby Monitor

## 1. Technology Stack

### Protocols

* **WebRTC (Web Real-Time Communication)**: The core protocol for peer-to-peer audio and video streaming. It allows the browser to send media directly to another browser without a media server.
* **HTTPS**: Required for WebRTC (browsers block camera/mic access on insecure origins, except localhost).

### Languages

* **HTML5**: Structure.
* **CSS3**: Styling (responsive for phone/laptop).
* **TypeScript**: Application logic.

### Libraries & Tools

* **PeerJS**: A wrapper around WebRTC that simplifies the signaling process (finding peers). It provides a free cloud-hosted signaling server for the handshake.
* **Vite**: Build tool for fast development and static site generation.
* **QRCode** (e.g., `qrcode` package): To easily share the connection ID from the laptop (Baby) to the phone (Parent) by scanning the screen.
* **NoSleep.js** (or native Wake Lock API): To prevent the phone/laptop from going to sleep while monitoring.

### Hosting (Static)

* **GitHub Pages / Netlify / Vercel**: Since the app is purely client-side, it can be hosted on any static hosting provider.

## 2. Architecture

* **Signaling**: We will use PeerJS's public cloud signaling server to establish the initial connection. No custom backend code is required.
* **Data Flow**:
    1. **Baby Station (Laptop)**: Initiates a Peer connection. Generates a unique ID.
    2. **Signaling**: The ID is shared (via link or QR code) to the Parent Station.
    3. **Parent Station (Phone)**: Uses the ID to connect to the Baby Station via PeerJS.
    4. **Media Stream**: Once connected, the Baby Station streams Audio/Video directly to the Parent Station via WebRTC.

## 3. Basic Plan

### Phase 1: Project Initialization

1. Set up a new project using **Vite** (Vanilla TypeScript).
2. Install dependencies: `peerjs`, `qrcode`.
3. Configure for static deployment.

### Phase 2: Core Logic (The "Baby" Station)

1. Request access to `navigator.mediaDevices.getUserMedia` (Video + Audio).
2. Initialize `Peer` instance.
3. Display the local video stream on the screen (muted locally).
4. Generate a "Room identifier" and display it as a QR Code or shareable link.

### Phase 3: Core Logic (The "Parent" Station)

1. Create an input field to enter the "Room identifier" (or read from URL query param).
2. Initialize `Peer` instance.
3. Connect to the Baby Station's Room identifier.
4. Receive the remote stream and play it in a `<video>` element.
5. Ensure audio is enabled (browsers often block autoplaying audio; may need a "Start Monitoring" button).

### Phase 4: Polish & Reliability

1. **Reconnection logic**: Handle network drops.
2. **Wake Lock**: Implement `navigator.wakeLock` to keep screens on.
3. **UI/UX**: Clear distinction between "Sender" and "Receiver" modes.

### Phase 5: Deployment

1. Build the static assets.
2. Deploy to a static host.

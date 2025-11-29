# Peer-a-Boo 👻

A web-based P2P baby monitor using WebRTC.

## Features

- **Baby Station**: Streams video/audio from the device. Generates a QR code for easy pairing.
- **Parent Station**: Connects to the Baby Station to monitor.
- **P2P**: Direct connection using PeerJS (no video server required).
- **Wake Lock**: Prevents devices from sleeping while monitoring.

## How to Run Locally

1. Install dependencies:

    ```bash
    npm install
    ```

2. Start the development server:

    ```bash
    npm run dev
    ```

3. Open `http://localhost:5173` in your browser.

## How to Use

1. **Baby Station**:
    - Open the app on the device you want to leave with the baby (e.g., Laptop).
    - Click "I am the Baby Station".
    - Allow camera/microphone access.
    - A QR code and ID will appear.

2. **Parent Station**:
    - Open the app on your monitoring device (e.g., Phone).
    - **Option A**: Scan the QR code from the Baby Station.
    - **Option B**: Click "I am the Parent Station" and manually enter the ID displayed on the Baby Station.
    - Click "Connect".

## Deployment (Important for Mobile)

To use this on a mobile phone (Parent Station) connecting to a laptop (Baby Station), you **must** deploy this to a secure HTTPS host (like GitHub Pages, Vercel, or Netlify).

**Why?**
Browsers block Camera/Microphone access on insecure (HTTP) origins, except for `localhost`. Since your phone cannot access `localhost` on your laptop, you need a public HTTPS URL.

### Deploy to GitHub Pages

1. Push this code to a GitHub repository.
2. Go to the repository **Settings** > **Pages**.
3. Under **Build and deployment**, select **GitHub Actions** as the source.
4. The included workflow (`.github/workflows/deploy.yml`) will automatically build and deploy the app to GitHub Pages on every push to `main`.

### Deploy to Netlify/Vercel

1. Run `npm run build`.
2. Upload the `dist` folder to your hosting provider.

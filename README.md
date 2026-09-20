# CinemaCast 🎬
### Ultra HD 4K Video Streaming & Synchronized Watch Party with Crystal-Clear Voice DSP

CinemaCast is a modern, low-latency web application that allows you to stream your own local video files from your laptop to friends on their laptops, phones, and tablets with synchronized playback, high-bitrate Opus stereo audio, and a custom **Web Audio Voice & Dialogue Clarity DSP Engine**.

---

## 🌟 Key Features

### 🎙️ Speech & Voice Clarity DSP Engine
- **5.1 / 7.1 Surround Downmix Matrix**: Fixes the classic screen sharing bug where the Center dialogue channel is lost in stereo downmixing, ensuring speech is always crisp and audible above background music.
- **Formant Peaking Equalizer**: Targets the 2.5kHz–3.2kHz human speech intelligibility band for crystal-clear vocals.
- **80Hz Low-Rumble Cut**: Removes muffled cinematic sub-bass that masks voices.
- **Night Mode Dynamic Range Compressor**: Automatically amplifies soft whispers while leveling loud explosions and sound effects.
- **Master Preamp Gain**: Up to 300% volume boost for quiet video files.

### ⚡ Ultra-Low Latency 4K / HD Video Streaming
- **WebRTC Peer-to-Peer Pipeline**: Sub-second latency (<200ms) with direct peer streaming.
- **Custom Bitrate Tuning**: Up to 50 Mbps 4K UHD video and 510 kbps Opus Studio Master stereo audio.
- **Multi-Format Support**: Works directly in-browser with `.mp4`, `.mkv`, `.webm`, `.mov`, `.avi`, `.m4v`, and `.ts`.

### 📱 Cross-Device Watch Party Experience
- **Instant QR Code & Share Link**: Friends can scan the QR code from their iPhone, iPad, Android phone, tablet, or laptop to join without installing software.
- **Host-Authoritative Timeline Sync**: Real-time Play, Pause, Seek, and Speed synchronization with millisecond drift correction.
- **2-Way Voice Chat**: Built-in microphone talkback bar with speaking halos and independent audio controls.
- **Live Chat & Reaction Bursts**: Chat with scene timestamp tags and floating emoji animations.
- **Subtitles Support**: Load external `.srt` and `.vtt` subtitles with custom styling.
- **Telemetry Diagnostics HUD**: Real-time stats showing resolution, FPS, current bitrate in Mbps, audio bitrate, and latency.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ or 20+
- npm or bun

### 1. Installation
```bash
# Clone the repository
git clone <your-repo-url>
cd CinemaCast

# Install dependencies
npm install
```

### 2. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Production Build & Start
```bash
# Build the production frontend and backend bundle
npm run build

# Start the standalone production server
npm start
```

---

## 🌐 Browser Support

| Browser | Platform | Video Streaming | Audio DSP | Voice Chat |
| :--- | :--- | :---: | :---: | :---: |
| **Google Chrome** | Windows / macOS / Linux / Android | ✅ 4K / 60fps | ✅ Full DSP | ✅ Full |
| **Safari / iOS** | iPhone / iPad / macOS | ✅ Full HD | ✅ Full DSP | ✅ Full |
| **Mozilla Firefox** | Windows / macOS / Linux | ✅ Full HD | ✅ Full DSP | ✅ Full |
| **Microsoft Edge** | Windows / macOS | ✅ 4K / 60fps | ✅ Full DSP | ✅ Full |

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Motion, Lucide React
- **Audio Processing**: Web Audio API (`AudioContext`, `BiquadFilterNode`, `DynamicsCompressorNode`, `GainNode`, `AnalyserNode`)
- **Real-Time Streaming**: WebRTC (`RTCPeerConnection`, `MediaStream`, custom SDP bitrate munging)
- **Signaling Server**: Node.js, Express, WebSocket (`ws`)
- **Build System**: Vite 8, esbuild, tsx

---

## 📄 License
MIT License

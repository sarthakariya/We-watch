import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Tv,
  Film,
  Sparkles,
  Users,
  Volume2,
  Radio,
  Sliders,
  Laptop,
  Smartphone,
  Tablet,
  Share2,
  Activity,
  Zap,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  CheckCircle,
  HelpCircle,
  Play,
} from 'lucide-react';
import { useWebRTCStream } from './hooks/useWebRTCStream';
import { Header } from './components/Header';
import { VideoPlayer } from './components/VideoPlayer';
import { AudioDspControls } from './components/AudioDspControls';
import { FileSourceSelector } from './components/FileSourceSelector';
import { WatchPartyPanel } from './components/WatchPartyPanel';
import { InviteModal } from './components/InviteModal';
import { TelemetryHUD } from './components/TelemetryHUD';
import { SampleVideo } from './types';
import { parseSrtOrVtt, SubtitleCue } from './utils/subtitleParser';
import { SAMPLE_VIDEOS } from './utils/sampleVideos';

export default function App() {
  // Read initial room from URL params if present
  const searchParams = new URLSearchParams(window.location.search);
  const initialRoomFromUrl = searchParams.get('room');

  const [hasStarted, setHasStarted] = useState<boolean>(!!initialRoomFromUrl);
  const [initialMode, setInitialMode] = useState<'host' | 'viewer'>(
    initialRoomFromUrl ? 'viewer' : 'host'
  );
  const [joinRoomInput, setJoinRoomInput] = useState<string>(initialRoomFromUrl || '');

  // Active Modals
  const [showAudioSettings, setShowAudioSettings] = useState<boolean>(false);
  const [showInviteModal, setShowInviteModal] = useState<boolean>(false);
  const [showTelemetryModal, setShowTelemetryModal] = useState<boolean>(false);
  const [showFilePicker, setShowFilePicker] = useState<boolean>(false);

  // Subtitles state
  const [subtitlesCues, setSubtitlesCues] = useState<SubtitleCue[]>([]);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);

  // Custom WebRTC & Audio Streaming Hook
  const {
    roomId,
    setRoomId,
    roomTitle,
    setRoomTitle,
    myPeerId,
    displayName,
    setDisplayName,
    isHost,
    setIsHost,
    hostPeerId,
    peers,
    isConnected,
    connectionStatus,
    audioConfig,
    setAudioConfig,
    updateAudioConfig,
    applyVoicePreset,
    videoConfig,
    setVideoConfig,
    localVideoFile,
    videoSourceUrl,
    videoTitle,
    remoteStream,
    playbackState,
    broadcastPlaybackState,
    chatMessages,
    sendChatMessage,
    floatingReactions,
    sendReaction,
    isMicEnabled,
    toggleMicrophone,
    telemetry,
    attachVideoSource,
    webAudioEngine,
  } = useWebRTCStream(initialRoomFromUrl || undefined, initialMode === 'host');

  // Load sample video by default on host start for instant visual readiness
  useEffect(() => {
    if (isHost && !videoSourceUrl && videoElementRef.current) {
      // Autoload high quality test sample so host sees player immediately
      attachVideoSource(
        videoElementRef.current,
        SAMPLE_VIDEOS[0].url,
        SAMPLE_VIDEOS[0].title
      );
    }
  }, [isHost, videoSourceUrl, attachVideoSource]);

  // Handle local video file pick
  const handleSelectFile = (file: File) => {
    if (videoElementRef.current) {
      attachVideoSource(videoElementRef.current, file, file.name);
      setShowFilePicker(false);
    }
  };

  // Handle sample video pick
  const handleSelectSample = (sample: SampleVideo) => {
    if (videoElementRef.current) {
      attachVideoSource(videoElementRef.current, sample.url, sample.title);
      setShowFilePicker(false);
    }
  };

  // Handle subtitle upload
  const handleSelectSubtitle = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = parseSrtOrVtt(text);
      setSubtitlesCues(parsed);
    } catch (err) {
      console.warn('Failed to parse subtitle file:', err);
    }
  };

  // Find active subtitle cue matching current time
  const currentSubtitleCue = useMemo(() => {
    if (subtitlesCues.length === 0 || !playbackState.currentTime) return null;
    const curTime = playbackState.currentTime;
    const match = subtitlesCues.find(
      (cue) => curTime >= cue.startTime && curTime <= cue.endTime
    );
    return match ? match.text : null;
  }, [subtitlesCues, playbackState.currentTime]);

  // Landing / Welcome Setup screen if user hasn't chosen a mode yet
  if (!hasStarted) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Glow background accents */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-xl w-full bg-zinc-900/90 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative z-10 text-zinc-100">
          {/* Logo & Headline */}
          <div className="text-center mb-6">
            <div className="inline-flex p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-3 shadow-inner">
              <Tv className="w-8 h-8" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              CinemaCast
            </h1>
            <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
              Stream high-resolution local video files to distant friends with crystal-clear voice clarity, 5.1 surround dialogue downmix, and synced low latency.
            </p>
          </div>

          {/* Key Audio Clarity Highlight */}
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 mb-6 text-xs text-amber-200/90 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-amber-300 font-semibold block mb-0.5">
                Solves The Missing Voice Screen-Sharing Problem:
              </strong>
              Standard screen shares drop the Center speech channel in 5.1/7.1 movie files. CinemaCast's built-in Web Audio DSP restores and enhances dialogue while streaming 4K video at up to 50 Mbps.
            </div>
          </div>

          {/* Mode Selector Cards */}
          <div className="space-y-3">
            {/* Option 1: Host a Stream */}
            <button
              onClick={() => {
                setIsHost(true);
                setHasStarted(true);
              }}
              className="w-full group p-4 rounded-2xl bg-gradient-to-r from-zinc-950 to-zinc-900 hover:from-amber-950/40 hover:to-zinc-900 border border-zinc-800 hover:border-amber-500/50 text-left transition-all shadow-md flex items-center justify-between"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 group-hover:scale-105 transition-transform">
                  <Laptop className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors flex items-center gap-1.5">
                    Stream from My Laptop
                    <span className="px-2 py-0.2 text-[10px] rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                      Host (4K UHD)
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    I have the video file. Stream to friends with high bitrate & voice boost.
                  </p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-zinc-500 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
            </button>

            {/* Option 2: Join a Stream */}
            <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 text-left space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 shrink-0">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Join as a Viewer (Phone, Tab, Laptop)
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Watch friend's high-bitrate stream with ultra-low latency.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={joinRoomInput}
                  onChange={(e) => setJoinRoomInput(e.target.value.toUpperCase())}
                  placeholder="Enter 6-digit Room Code"
                  className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-100 font-mono placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                />
                <button
                  onClick={() => {
                    if (joinRoomInput.trim()) {
                      setRoomId(joinRoomInput.trim());
                      setIsHost(false);
                      setHasStarted(true);
                    }
                  }}
                  disabled={!joinRoomInput.trim()}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-zinc-950 font-bold text-xs transition-colors"
                >
                  Join Room
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-amber-500 selection:text-black">
      {/* Header Navigation */}
      <Header
        roomId={roomId}
        roomTitle={videoTitle}
        isHost={isHost}
        peers={peers}
        isConnected={isConnected}
        audioConfig={audioConfig}
        onOpenInviteModal={() => setShowInviteModal(true)}
        onOpenAudioSettings={() => setShowAudioSettings(true)}
        onOpenTelemetry={() => setShowTelemetryModal(true)}
      />

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 lg:p-6 grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2 Columns: Video Player & Controls & File Selection */}
        <div className="lg:col-span-2 space-y-4">
          {/* Main Video Player Container */}
          <VideoPlayer
            isHost={isHost}
            videoSourceUrl={videoSourceUrl}
            remoteStream={remoteStream}
            playbackState={playbackState}
            onBroadcastPlayback={broadcastPlaybackState}
            audioConfig={audioConfig}
            onOpenAudioSettings={() => setShowAudioSettings(true)}
            videoConfig={videoConfig}
            onUpdateVideoConfig={(updates) =>
              setVideoConfig((prev) => ({ ...prev, ...updates }))
            }
            floatingReactions={floatingReactions}
            telemetry={telemetry}
            isMicEnabled={isMicEnabled}
            onToggleMic={toggleMicrophone}
            videoTitle={videoTitle}
            onVideoElementReady={(el) => {
              videoElementRef.current = el;
            }}
            subtitlesCueText={currentSubtitleCue}
          />

          {/* Host Controls / File Switcher Banner */}
          {isHost && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-zinc-900/60 p-3 rounded-2xl border border-zinc-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Film className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">
                      Currently Streaming: {videoTitle}
                    </span>
                    <span className="text-[11px] text-zinc-400">
                      Broadcasting to {peers.length} active device{peers.length === 1 ? '' : 's'} in 4K UHD
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setShowFilePicker(!showFilePicker)}
                  className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 transition-colors"
                >
                  {showFilePicker ? 'Close File Picker' : 'Change Video / Drop File'}
                </button>
              </div>

              {/* Collapsible File Picker */}
              {showFilePicker && (
                <FileSourceSelector
                  onSelectFile={handleSelectFile}
                  onSelectSample={handleSelectSample}
                  onSelectSubtitle={handleSelectSubtitle}
                  currentTitle={videoTitle}
                  hasLoadedMedia={!!videoSourceUrl}
                />
              )}
            </div>
          )}

          {/* Quick Voice Enhancement Bar (Visible on both Host and Viewer sides) */}
          <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 text-amber-400 border border-amber-500/30">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs sm:text-sm font-bold text-white">
                    Voice & Dialogue Clarity Engine
                  </h4>
                  <span className="px-2 py-0.2 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-mono border border-emerald-500/20">
                    {audioConfig.preset.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Center Speech Matrix +{audioConfig.dialogueBoost}dB • Opus {audioConfig.opusBitrateKbps}kbps Studio Master
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() =>
                  updateAudioConfig({
                    dialogueBoost: audioConfig.dialogueBoost > 0 ? 0 : 8,
                  })
                }
                className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  audioConfig.dialogueBoost > 0
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                }`}
              >
                {audioConfig.dialogueBoost > 0 ? 'Dialogue Boost Active' : 'Boost Dialogue'}
              </button>

              <button
                onClick={() => setShowAudioSettings(true)}
                className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 transition-colors flex items-center gap-1.5"
              >
                <Sliders className="w-3.5 h-3.5 text-amber-400" />
                <span>EQ Controls</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right 1 Column: Watch Party Social Panel (Chat, Viewers, Mic) */}
        <div className="lg:col-span-1">
          <WatchPartyPanel
            peers={peers}
            chatMessages={chatMessages}
            onSendMessage={sendChatMessage}
            onSendReaction={sendReaction}
            isMicEnabled={isMicEnabled}
            onToggleMic={toggleMicrophone}
            currentVideoTime={playbackState.currentTime}
            myPeerId={myPeerId}
            isHost={isHost}
          />
        </div>
      </main>

      {/* Audio DSP Equalizer & Voice Clarity Modal */}
      {showAudioSettings && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <AudioDspControls
            audioConfig={audioConfig}
            onUpdateConfig={updateAudioConfig}
            onApplyPreset={applyVoicePreset}
            webAudioEngine={webAudioEngine}
            onClose={() => setShowAudioSettings(false)}
          />
        </div>
      )}

      {/* Invite QR Code Modal */}
      {showInviteModal && (
        <InviteModal roomId={roomId} onClose={() => setShowInviteModal(false)} />
      )}

      {/* Telemetry Diagnostics Modal */}
      {showTelemetryModal && (
        <TelemetryHUD
          telemetry={telemetry}
          audioConfig={audioConfig}
          videoConfig={videoConfig}
          isHost={isHost}
          onClose={() => setShowTelemetryModal(false)}
        />
      )}
    </div>
  );
}

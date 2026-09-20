import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Sparkles,
  Zap,
  Settings,
  Activity,
  Mic,
  MicOff,
  Radio,
  RotateCcw,
  FastForward,
  Subtitles,
  PictureInPicture,
} from 'lucide-react';
import {
  AudioDspConfig,
  VideoStreamConfig,
  PlaybackSyncState,
  FloatingReaction,
  StreamTelemetry,
} from '../types';

interface VideoPlayerProps {
  isHost: boolean;
  videoSourceUrl: string | null;
  remoteStream: MediaStream | null;
  playbackState: PlaybackSyncState;
  onBroadcastPlayback: (isPlaying: boolean, currentTime: number, duration?: number, rate?: number) => void;
  audioConfig: AudioDspConfig;
  onOpenAudioSettings: () => void;
  videoConfig: VideoStreamConfig;
  onUpdateVideoConfig: (updates: Partial<VideoStreamConfig>) => void;
  floatingReactions: FloatingReaction[];
  telemetry: StreamTelemetry;
  isMicEnabled: boolean;
  onToggleMic: () => void;
  videoTitle: string;
  onVideoElementReady?: (el: HTMLVideoElement) => void;
  subtitlesCueText?: string | null;
}

export function VideoPlayer({
  isHost,
  videoSourceUrl,
  remoteStream,
  playbackState,
  onBroadcastPlayback,
  audioConfig,
  onOpenAudioSettings,
  videoConfig,
  onUpdateVideoConfig,
  floatingReactions,
  telemetry,
  isMicEnabled,
  onToggleMic,
  videoTitle,
  onVideoElementReady,
  subtitlesCueText,
}: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [isHoveringScrubber, setIsHoveringScrubber] = useState(false);
  const [scrubberHoverTime, setScrubberHoverTime] = useState(0);
  const [scrubberHoverX, setScrubberHoverX] = useState(0);
  const [lastSyncedSequence, setLastSyncedSequence] = useState(-1);
  const [needsAudioUnlock, setNeedsAudioUnlock] = useState(false);

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Expose video element to parent when mounted
  useEffect(() => {
    if (videoRef.current && onVideoElementReady) {
      onVideoElementReady(videoRef.current);
    }
  }, [onVideoElementReady]);

  // Connect remote stream if viewer with browser auto-play policy catch
  useEffect(() => {
    if (!isHost && videoRef.current && remoteStream) {
      videoRef.current.srcObject = remoteStream;
      videoRef.current
        .play()
        .then(() => {
          setNeedsAudioUnlock(false);
        })
        .catch(() => {
          // If browser blocked unmuted autoplay, mute and try again, then prompt user to unmute
          if (videoRef.current) {
            videoRef.current.muted = true;
            setIsMuted(true);
            videoRef.current.play().catch(() => {});
            setNeedsAudioUnlock(true);
          }
        });
    }
  }, [isHost, remoteStream]);

  const unlockAudio = () => {
    if (videoRef.current) {
      videoRef.current.muted = false;
      setIsMuted(false);
      videoRef.current.volume = 1.0;
      setVolume(1.0);
      setNeedsAudioUnlock(false);
    }
  };

  // Handle Playback State Sync from Host to Viewer
  useEffect(() => {
    if (isHost || !videoRef.current) return;

    if (playbackState.sequence > lastSyncedSequence) {
      setLastSyncedSequence(playbackState.sequence);

      // Time drift calculation
      const serverElapsed = (Date.now() - playbackState.serverTimestamp) / 1000;
      const targetTime = playbackState.isPlaying
        ? playbackState.currentTime + serverElapsed
        : playbackState.currentTime;

      // Only seek if drift is > 0.4s to avoid stutter
      const currentDrift = Math.abs(videoRef.current.currentTime - targetTime);
      if (currentDrift > 0.4) {
        videoRef.current.currentTime = targetTime;
      }

      if (playbackState.isPlaying && videoRef.current.paused) {
        videoRef.current.play().catch(() => {});
        setIsPlaying(true);
      } else if (!playbackState.isPlaying && !videoRef.current.paused) {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  }, [playbackState, isHost, lastSyncedSequence]);

  // Handle User Play/Pause
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;

    if (videoRef.current.paused) {
      videoRef.current.play().then(() => {
        setIsPlaying(true);
        if (isHost) {
          onBroadcastPlayback(true, videoRef.current!.currentTime, duration);
        }
      }).catch(console.warn);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
      if (isHost) {
        onBroadcastPlayback(false, videoRef.current.currentTime, duration);
      }
    }
  }, [isHost, duration, onBroadcastPlayback]);

  // Handle Scrubbing
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      if (isHost) {
        onBroadcastPlayback(isPlaying, time, duration);
      }
    }
  };

  // Skip 10 seconds
  const handleSkip = (seconds: number) => {
    if (!videoRef.current) return;
    const newTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds));
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    if (isHost) {
      onBroadcastPlayback(isPlaying, newTime, duration);
    }
  };

  // Fullscreen toggle
  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Picture in picture
  const togglePiP = async () => {
    if (!videoRef.current) return;
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture().catch(() => {});
    } else if (document.pictureInPictureEnabled) {
      await videoRef.current.requestPictureInPicture().catch(() => {});
    }
  };

  // Auto hide controls on mouse inactivity
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
        setShowQualityMenu(false);
      }
    }, 3500);
  };

  // Time format helper
  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) {
      return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Progress percentage
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-zinc-800/80 group select-none"
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        playsInline
        crossOrigin="anonymous"
        onTimeUpdate={() => {
          if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
          }
        }}
        onDurationChange={() => {
          if (videoRef.current) {
            setDuration(videoRef.current.duration || 0);
          }
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onClick={togglePlay}
        className="w-full h-full object-contain cursor-pointer"
      />

      {/* Floating Reactions Overlay */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
        {floatingReactions.map((reaction) => (
          <div
            key={reaction.id}
            style={{ left: `${reaction.xPercent}%`, bottom: '20%' }}
            className="absolute animate-float-reaction flex flex-col items-center"
          >
            <span className="text-3xl sm:text-4xl filter drop-shadow-lg">{reaction.emoji}</span>
            <span className="text-[10px] text-white/80 font-mono bg-black/60 px-1.5 py-0.5 rounded-full mt-0.5">
              {reaction.senderName}
            </span>
          </div>
        ))}
      </div>

      {/* Subtitles Overlay */}
      {subtitlesCueText && (
        <div className="absolute bottom-16 sm:bottom-20 left-1/2 -translate-x-1/2 max-w-xl text-center z-20 px-4 pointer-events-none">
          <span className="inline-block px-3 py-1.5 rounded-lg bg-black/80 text-white font-medium text-sm sm:text-base md:text-lg backdrop-blur-sm border border-white/10 shadow-lg leading-snug">
            {subtitlesCueText}
          </span>
        </div>
      )}

      {/* Tap to Unmute / Audio Autoplay Banner */}
      {needsAudioUnlock && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 animate-bounce">
          <button
            onClick={unlockAudio}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow-2xl border border-amber-300 transition-transform active:scale-95"
          >
            <Volume2 className="w-4 h-4" />
            <span>Browser Muted Audio — Tap to Unmute Stream</span>
          </button>
        </div>
      )}

      {/* Top HUD Stats Badge */}
      <div
        className={`absolute top-3 left-3 right-3 flex items-center justify-between z-30 transition-opacity duration-300 pointer-events-auto ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-md bg-black/70 backdrop-blur-md border border-zinc-700/60 text-xs font-mono font-semibold text-amber-400 flex items-center gap-1.5 shadow">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            {videoConfig.resolutionLabel}
          </span>
          <span className="hidden sm:inline-flex px-2 py-1 rounded-md bg-black/70 backdrop-blur-md border border-zinc-700/60 text-[11px] font-mono text-zinc-300">
            {telemetry.fps} FPS
          </span>
          <span className="hidden sm:inline-flex px-2 py-1 rounded-md bg-black/70 backdrop-blur-md border border-zinc-700/60 text-[11px] font-mono text-amber-300">
            {telemetry.videoBitrateMbps} Mbps
          </span>
          <span className="px-2 py-1 rounded-md bg-amber-500/20 backdrop-blur-md border border-amber-500/40 text-[11px] font-mono text-amber-300 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            Opus {audioConfig.opusBitrateKbps}k (+{audioConfig.dialogueBoost}dB Voice)
          </span>
        </div>

        {/* Mic Quick Indicator */}
        <button
          onClick={onToggleMic}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md backdrop-blur-md text-xs font-medium transition-all ${
            isMicEnabled
              ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 shadow-emerald-500/20 shadow'
              : 'bg-black/70 border border-zinc-700/60 text-zinc-400 hover:text-zinc-200'
          }`}
          title="Toggle your microphone for live watch party voice talk"
        >
          {isMicEnabled ? <Mic className="w-3.5 h-3.5 text-emerald-400 animate-pulse" /> : <MicOff className="w-3.5 h-3.5" />}
          <span className="hidden md:inline">{isMicEnabled ? 'Mic Live' : 'Mic Off'}</span>
        </button>
      </div>

      {/* Center Play/Pause Large Pulse Button (When Hovered or Paused) */}
      {!isPlaying && (
        <div
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/40 z-10 cursor-pointer backdrop-blur-[2px]"
        >
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-amber-500/90 hover:bg-amber-400 text-black flex items-center justify-center shadow-2xl shadow-amber-500/30 transform hover:scale-105 transition-all">
            <Play className="w-8 h-8 sm:w-10 sm:h-10 ml-1 text-zinc-950 fill-zinc-950" />
          </div>
        </div>
      )}

      {/* Bottom Controls Bar */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-3 sm:p-4 z-30 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Timeline Scrubber */}
        <div className="relative mb-2 group/scrubber">
          <input
            type="range"
            min="0"
            max={duration || 100}
            step="0.1"
            value={currentTime}
            onChange={handleSeek}
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
              setScrubberHoverTime(percent * duration);
              setScrubberHoverX(e.clientX - rect.left);
              setIsHoveringScrubber(true);
            }}
            onMouseLeave={() => setIsHoveringScrubber(false)}
            className="w-full h-1.5 hover:h-2.5 bg-zinc-800/80 rounded-lg appearance-none cursor-pointer transition-all"
            style={{
              background: `linear-gradient(to right, #f59e0b 0%, #f59e0b ${progressPercent}%, rgba(63, 63, 70, 0.6) ${progressPercent}%, rgba(63, 63, 70, 0.6) 100%)`,
            }}
          />

          {/* Hover Time Tooltip */}
          {isHoveringScrubber && duration > 0 && (
            <div
              style={{ left: `${scrubberHoverX}px` }}
              className="absolute -top-7 -translate-x-1/2 px-2 py-0.5 bg-zinc-900 text-amber-400 text-[11px] font-mono rounded shadow border border-zinc-700 pointer-events-none"
            >
              {formatTime(scrubberHoverTime)}
            </div>
          )}
        </div>

        {/* Buttons Row */}
        <div className="flex items-center justify-between text-zinc-200">
          {/* Left: Play, Skip, Time */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={togglePlay}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-white" />}
            </button>

            <button
              onClick={() => handleSkip(-10)}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-zinc-300 hover:text-white"
              title="Rewind 10s"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={() => handleSkip(10)}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-zinc-300 hover:text-white"
              title="Forward 10s"
            >
              <FastForward className="w-4 h-4" />
            </button>

            {/* Volume Control */}
            <div className="flex items-center gap-1.5 group/volume">
              <button
                onClick={() => {
                  if (videoRef.current) {
                    videoRef.current.muted = !isMuted;
                    setIsMuted(!isMuted);
                  }
                }}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-red-400" />
                ) : (
                  <Volume2 className="w-4 h-4 text-zinc-200" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setVolume(val);
                  if (videoRef.current) {
                    videoRef.current.volume = val;
                    videoRef.current.muted = val === 0;
                    setIsMuted(val === 0);
                  }
                }}
                className="w-14 sm:w-20 h-1.5 bg-zinc-700 rounded-lg cursor-pointer opacity-80 group-hover/volume:opacity-100 transition-opacity"
              />
            </div>

            {/* Time Stamp */}
            <span className="text-xs font-mono text-zinc-400 select-none">
              <span className="text-zinc-200">{formatTime(currentTime)}</span> / {formatTime(duration)}
            </span>
          </div>

          {/* Right: Dialogue Boost Quick Button, Quality Selector, Fullscreen */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Dialogue Boost Button */}
            <button
              onClick={onOpenAudioSettings}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-semibold transition-all"
              title="Voice & Center Dialogue Equalizer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Voice Boost</span>
            </button>

            {/* Quality Menu Popover */}
            <div className="relative">
              <button
                onClick={() => setShowQualityMenu(!showQualityMenu)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700/80 text-xs font-mono text-zinc-200"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>{videoConfig.preset.toUpperCase()}</span>
              </button>

              {showQualityMenu && (
                <div className="absolute right-0 bottom-full mb-2 w-52 bg-zinc-900 border border-zinc-700 rounded-xl p-2 shadow-2xl z-50 text-xs">
                  <div className="text-[11px] font-bold text-zinc-400 px-2 py-1 mb-1 border-b border-zinc-800 font-mono">
                    STREAM QUALITY & BITRATE
                  </div>
                  {[
                    { key: '4k_cinema', label: '4K Cinema UHD (35-50 Mbps)', res: '3840x2160', fps: 60 },
                    { key: '1440p_pro', label: '1440p Pro (20 Mbps)', res: '2560x1440', fps: 60 },
                    { key: '1080p_60', label: '1080p 60FPS (10 Mbps)', res: '1920x1080', fps: 60 },
                    { key: '720p_smooth', label: '720p Mobile (4 Mbps)', res: '1280x720', fps: 30 },
                  ].map((item) => (
                    <button
                      key={item.key}
                      onClick={() => {
                        onUpdateVideoConfig({
                          preset: item.key as VideoStreamConfig['preset'],
                          resolutionLabel: item.res,
                          targetFps: item.fps,
                        });
                        setShowQualityMenu(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-colors flex items-center justify-between ${
                        videoConfig.preset === item.key
                          ? 'bg-amber-500/20 text-amber-300 font-bold'
                          : 'text-zinc-300 hover:bg-zinc-800'
                      }`}
                    >
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* PiP */}
            <button
              onClick={togglePiP}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-zinc-300 hover:text-white hidden sm:block"
              title="Picture in Picture"
            >
              <PictureInPicture className="w-4 h-4" />
            </button>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-zinc-300 hover:text-white"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

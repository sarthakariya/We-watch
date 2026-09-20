export type StreamQualityPreset = '4k_cinema' | '1440p_pro' | '1080p_60' | '720p_smooth' | 'adaptive';

export interface VideoStreamConfig {
  preset: StreamQualityPreset;
  maxBitrateMbps: number; // 2 to 50 Mbps
  targetFps: number; // 24, 30, 60
  resolutionLabel: string;
  width: number;
  height: number;
  lowLatencyMode: boolean;
}

export type VoicePreset = 'crystal_dialogue' | 'cinema_dynamic' | 'night_mode' | 'vocal_isolation' | 'bass_speech' | 'studio_flat';

export interface AudioDspConfig {
  masterGain: number; // 0.0 to 3.0 (300% volume boost)
  dialogueBoost: number; // 0 to +15 dB boost on dialogue center frequencies
  preset: VoicePreset;
  surroundDownmixMode: 'matrix_5_1_dialogue' | 'stereo_standard' | 'center_isolated';
  speechEqLowCut: boolean; // 80Hz rumble cut
  speechEqClarity: number; // -10 to +15 dB around 2.5kHz
  speechEqAir: number; // -10 to +10 dB around 8kHz
  speechEqBody: number; // -10 to +10 dB around 500Hz
  compressorEnabled: boolean; // Dynamic range leveling (night mode)
  compressorThreshold: number; // -35 to -10 dB
  compressorRatio: number; // 2 to 10
  opusBitrateKbps: number; // 128, 256, 320, 510 kbps
  stereoFullSpectrum: boolean; // force unconstrained opus stereo
  bypassDsp: boolean;
}

export interface PeerInfo {
  peerId: string;
  displayName: string;
  deviceType: 'laptop' | 'phone' | 'tablet' | 'desktop';
  isHost: boolean;
  isMuted: boolean;
  isSpeaking: boolean;
  joinedAt: number;
  latencyMs?: number;
  fps?: number;
  bitrateMbps?: number;
  packetLossPercent?: number;
  resolution?: string;
  telemetry?: {
    latencyMs?: number;
    fps?: number;
    bitrateMbps?: number;
    packetLossPercent?: number;
  };
}

export interface PlaybackSyncState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  serverTimestamp: number;
  sequence: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  videoTimestamp?: number;
  type: 'chat' | 'system' | 'reaction';
}

export interface FloatingReaction {
  id: string;
  emoji: string;
  senderName: string;
  xPercent: number;
  timestamp: number;
}

export interface SubtitleTrack {
  id: string;
  label: string;
  language: string;
  cues: { startTime: number; endTime: number; text: string }[];
}

export interface StreamTelemetry {
  rttMs: number;
  fps: number;
  videoBitrateMbps: number;
  audioBitrateKbps: number;
  packetLossPercent: number;
  jitterMs: number;
  resolution: string;
  codec: string;
}

export interface SampleVideo {
  id: string;
  title: string;
  description: string;
  duration: string;
  resolution: string;
  hasMultiChannel: boolean;
  url: string;
  thumbnail: string;
}

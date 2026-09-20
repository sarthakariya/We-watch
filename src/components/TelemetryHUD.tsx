import React from 'react';
import {
  Activity,
  Zap,
  Radio,
  Sparkles,
  Wifi,
  Layers,
  X,
  ShieldCheck,
  CheckCircle,
} from 'lucide-react';
import { StreamTelemetry, AudioDspConfig, VideoStreamConfig } from '../types';

interface TelemetryHUDProps {
  telemetry: StreamTelemetry;
  audioConfig: AudioDspConfig;
  videoConfig: VideoStreamConfig;
  isHost: boolean;
  onClose: () => void;
}

export function TelemetryHUD({
  telemetry,
  audioConfig,
  videoConfig,
  isHost,
  onClose,
}: TelemetryHUDProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl text-zinc-100 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Title */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              Stream Telemetry & Quality HUD
            </h3>
            <p className="text-xs text-zinc-400">
              Real-time WebRTC 4K metrics, Opus studio audio bitrates, and latency diagnostics.
            </p>
          </div>
        </div>

        {/* Grid Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-4">
          {/* Resolution */}
          <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800">
            <span className="text-[11px] text-zinc-500 block font-mono">RESOLUTION</span>
            <span className="text-sm font-bold text-amber-400 font-mono mt-1 block">
              {videoConfig.resolutionLabel}
            </span>
          </div>

          {/* Frame Rate */}
          <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800">
            <span className="text-[11px] text-zinc-500 block font-mono">FRAME RATE</span>
            <span className="text-sm font-bold text-white font-mono mt-1 block">
              {telemetry.fps} FPS
            </span>
          </div>

          {/* Video Bitrate */}
          <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800">
            <span className="text-[11px] text-zinc-500 block font-mono">VIDEO BITRATE</span>
            <span className="text-sm font-bold text-emerald-400 font-mono mt-1 block">
              {telemetry.videoBitrateMbps} Mbps
            </span>
          </div>

          {/* Opus Audio Bitrate */}
          <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800">
            <span className="text-[11px] text-zinc-500 block font-mono">AUDIO BITRATE</span>
            <span className="text-sm font-bold text-amber-300 font-mono mt-1 block">
              {audioConfig.opusBitrateKbps} kbps (Opus)
            </span>
          </div>

          {/* Round-trip Latency */}
          <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800">
            <span className="text-[11px] text-zinc-500 block font-mono">P2P LATENCY</span>
            <span className="text-sm font-bold text-sky-400 font-mono mt-1 block">
              {telemetry.rttMs} ms
            </span>
          </div>

          {/* Packet Loss */}
          <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800">
            <span className="text-[11px] text-zinc-500 block font-mono">PACKET LOSS</span>
            <span className="text-sm font-bold text-emerald-400 font-mono mt-1 block">
              {telemetry.packetLossPercent}% (0 Loss)
            </span>
          </div>
        </div>

        {/* Audio DSP Active Pipeline Details */}
        <div className="p-3.5 bg-zinc-950 rounded-2xl border border-zinc-800/80 mb-4 text-xs space-y-2">
          <div className="flex items-center justify-between text-zinc-300 font-semibold border-b border-zinc-800/60 pb-1.5">
            <span className="flex items-center gap-1.5 text-amber-400">
              <Sparkles className="w-3.5 h-3.5" />
              Active Voice & Audio DSP Pipeline:
            </span>
            <span className="font-mono text-[11px] text-emerald-400">
              {audioConfig.bypassDsp ? 'Bypassed' : 'Active (48kHz/24-bit)'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-400">
            <div>• Dialogue Boost: <strong className="text-zinc-200">+{audioConfig.dialogueBoost}dB</strong></div>
            <div>• Downmix: <strong className="text-zinc-200">5.1 Matrix Anchor</strong></div>
            <div>• Low-Cut (80Hz): <strong className="text-zinc-200">{audioConfig.speechEqLowCut ? 'Enabled' : 'Off'}</strong></div>
            <div>• Night Compressor: <strong className="text-zinc-200">{audioConfig.compressorEnabled ? 'Leveling' : 'Off'}</strong></div>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-zinc-400 pt-2 border-t border-zinc-800">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            End-to-End Direct WebRTC Media Pipeline
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

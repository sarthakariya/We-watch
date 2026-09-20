import { useState } from 'react';
import {
  Radio,
  Tv,
  Users,
  Copy,
  Check,
  QrCode,
  Sparkles,
  Activity,
  Laptop,
  Smartphone,
  Tablet,
  Volume2,
} from 'lucide-react';
import { PeerInfo, AudioDspConfig } from '../types';

interface HeaderProps {
  roomId: string;
  roomTitle: string;
  isHost: boolean;
  peers: PeerInfo[];
  isConnected: boolean;
  audioConfig: AudioDspConfig;
  onOpenInviteModal: () => void;
  onOpenAudioSettings: () => void;
  onOpenTelemetry: () => void;
  onToggleHostMode?: () => void;
}

export function Header({
  roomId,
  roomTitle,
  isHost,
  peers,
  isConnected,
  audioConfig,
  onOpenInviteModal,
  onOpenAudioSettings,
  onOpenTelemetry,
}: HeaderProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    const url = `${window.location.origin}/?room=${roomId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const totalParticipants = peers.length + 1; // peers + self

  return (
    <header className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-40 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Brand & Live Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 shadow-lg shadow-amber-500/20 text-black font-black">
            <Tv className="w-5 h-5 text-zinc-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                CinemaCast
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                {isHost ? 'BROADCASTING 4K' : 'RECEIVING 4K'}
              </span>
            </div>
            <p className="text-xs text-zinc-400 hidden sm:block truncate max-w-xs md:max-w-md">
              {roomTitle}
            </p>
          </div>
        </div>

        {/* Room Code & Share Controls */}
        <div className="flex items-center gap-2">
          {/* Room Pill */}
          <div className="hidden md:flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-1 text-xs">
            <span className="text-zinc-400 px-2 font-mono">ROOM</span>
            <span className="font-mono font-bold text-amber-400 px-2 py-0.5 bg-zinc-800 rounded">
              {roomId}
            </span>
            <button
              onClick={handleCopyLink}
              title="Copy invite link"
              className="px-2 py-1 hover:bg-zinc-700 rounded text-zinc-300 transition-colors flex items-center gap-1"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          {/* QR Code / Invite Button */}
          <button
            onClick={onOpenInviteModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-zinc-200 transition-all shadow-sm"
          >
            <QrCode className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Invite Phone/Tab</span>
            <span className="sm:hidden">Invite</span>
          </button>

          {/* Audio Voice Clarity DSP Quick Status */}
          <button
            onClick={onOpenAudioSettings}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-xs font-medium text-amber-300 transition-all"
            title="Voice & Audio Settings"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Voice Engine</span>
            <span className="px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 text-[10px] font-mono">
              +{audioConfig.dialogueBoost}dB
            </span>
          </button>

          {/* Telemetry HUD button */}
          <button
            onClick={onOpenTelemetry}
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-400 hover:text-zinc-200 transition-all font-mono"
            title="Stream Diagnostics & Bitrate Telemetry"
          >
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>4K 60FPS</span>
          </button>

          {/* Viewers Counter Pill */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-300">
            <Users className="w-3.5 h-3.5 text-zinc-400" />
            <span>{totalParticipants}</span>
          </div>
        </div>
      </div>
    </header>
  );
}

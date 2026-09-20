import React, { useEffect, useRef, useState } from 'react';
import {
  Sparkles,
  Volume2,
  Sliders,
  Radio,
  Moon,
  Mic,
  Clapperboard,
  Waves,
  ShieldCheck,
  Check,
  Zap,
  Info,
} from 'lucide-react';
import { AudioDspConfig, VoicePreset } from '../types';
import { VOICE_PRESETS_DATA } from '../utils/audioDspPresets';
import { WebAudioEngine } from '../utils/webAudioEngine';

interface AudioDspControlsProps {
  audioConfig: AudioDspConfig;
  onUpdateConfig: (updates: Partial<AudioDspConfig>) => void;
  onApplyPreset: (preset: VoicePreset) => void;
  webAudioEngine: WebAudioEngine | null;
  onClose?: () => void;
}

export function AudioDspControls({
  audioConfig,
  onUpdateConfig,
  onApplyPreset,
  webAudioEngine,
  onClose,
}: AudioDspControlsProps) {
  const [activeTab, setActiveTab] = useState<'presets' | 'equalizer' | 'dynamics' | 'bitrate'>('presets');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Audio Spectrum visualizer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = webAudioEngine?.getAnalyser();
    const dataArray = new Uint8Array(analyser ? analyser.frequencyBinCount : 128);

    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render);
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // Background grid
      ctx.strokeStyle = 'rgba(39, 39, 42, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height * 0.5);
      ctx.lineTo(width, height * 0.5);
      ctx.stroke();

      if (analyser) {
        analyser.getByteFrequencyData(dataArray);
      } else {
        // Subtle idle wave if no active media playing yet
        for (let i = 0; i < dataArray.length; i++) {
          dataArray[i] = Math.max(8, Math.sin(Date.now() / 300 + i / 5) * 18 + 20);
        }
      }

      const barWidth = (width / dataArray.length) * 2.2;
      let x = 0;

      // Draw vocal band highlight zone (between 300Hz and 3.5kHz, roughly indices 8 to 40)
      const vocalStart = (8 / dataArray.length) * width * 2.2;
      const vocalEnd = (38 / dataArray.length) * width * 2.2;
      ctx.fillStyle = 'rgba(245, 158, 11, 0.08)';
      ctx.fillRect(vocalStart, 0, Math.min(width - vocalStart, vocalEnd - vocalStart), height);

      for (let i = 0; i < dataArray.length; i++) {
        const barHeight = (dataArray[i] / 255) * height * 0.9;
        const isVocalRange = i >= 8 && i <= 38;

        if (isVocalRange) {
          ctx.fillStyle = '#f59e0b'; // Amber for dialogue range
        } else if (i < 8) {
          ctx.fillStyle = '#71717a'; // Muted for sub-bass
        } else {
          ctx.fillStyle = '#38bdf8'; // Sky blue for highs
        }

        ctx.fillRect(x, height - barHeight, barWidth - 1, barHeight);
        x += barWidth;
        if (x > width) break;
      }
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [webAudioEngine]);

  const getPresetIcon = (iconName: string) => {
    switch (iconName) {
      case 'Sparkles':
        return <Sparkles className="w-5 h-5 text-amber-400" />;
      case 'Clapperboard':
        return <Clapperboard className="w-5 h-5 text-amber-400" />;
      case 'Moon':
        return <Moon className="w-5 h-5 text-indigo-400" />;
      case 'Mic':
        return <Mic className="w-5 h-5 text-rose-400" />;
      case 'Radio':
        return <Radio className="w-5 h-5 text-emerald-400" />;
      default:
        return <Sliders className="w-5 h-5 text-zinc-400" />;
    }
  };

  return (
    <div className="bg-zinc-900/95 border border-zinc-800 rounded-2xl p-4 sm:p-6 shadow-2xl backdrop-blur-xl max-w-2xl w-full text-zinc-100">
      {/* Header with Problem Resolution Badge */}
      <div className="flex items-start justify-between pb-4 border-b border-zinc-800 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
              <Sparkles className="w-5 h-5" />
            </span>
            <h2 className="text-base sm:text-lg font-bold text-white">
              Cinema Voice & Speech Clarity Engine
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Fixes missing voice in video streams by matrixing 5.1 Center dialogue channels and applying real-time speech enhancement.
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 text-sm"
          >
            ✕
          </button>
        )}
      </div>

      {/* Real-time Spectrum Visualizer */}
      <div className="mt-4 bg-zinc-950 rounded-xl p-3 border border-zinc-800/80">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-zinc-400 flex items-center gap-1.5 font-mono">
            <Waves className="w-3.5 h-3.5 text-amber-400" />
            SPECTRUM ANALYZER
          </span>
          <span className="text-amber-400 text-[11px] font-medium flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block"></span>
            Highlighted: Human Speech Zone (300Hz - 3.4kHz)
          </span>
        </div>
        <canvas
          ref={canvasRef}
          width={560}
          height={64}
          className="w-full h-16 rounded bg-zinc-950"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-zinc-800 mt-4 pb-2 text-xs font-medium">
        <button
          onClick={() => setActiveTab('presets')}
          className={`px-3 py-1.5 rounded-lg transition-colors ${
            activeTab === 'presets'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Voice Presets
        </button>
        <button
          onClick={() => setActiveTab('equalizer')}
          className={`px-3 py-1.5 rounded-lg transition-colors ${
            activeTab === 'equalizer'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Speech EQ & Downmix
        </button>
        <button
          onClick={() => setActiveTab('dynamics')}
          className={`px-3 py-1.5 rounded-lg transition-colors ${
            activeTab === 'dynamics'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Night Mode / Whisper Boost
        </button>
        <button
          onClick={() => setActiveTab('bitrate')}
          className={`px-3 py-1.5 rounded-lg transition-colors ${
            activeTab === 'bitrate'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Opus Bitrate (510 kbps)
        </button>
      </div>

      {/* Tab 1: Presets */}
      {activeTab === 'presets' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-4 max-h-72 overflow-y-auto pr-1">
          {(Object.keys(VOICE_PRESETS_DATA) as VoicePreset[]).map((key) => {
            const preset = VOICE_PRESETS_DATA[key];
            const isSelected = audioConfig.preset === key && !audioConfig.bypassDsp;
            return (
              <button
                key={key}
                onClick={() => onApplyPreset(key)}
                className={`flex items-start gap-3 p-3 rounded-xl text-left border transition-all ${
                  isSelected
                    ? 'bg-amber-500/10 border-amber-500/50 shadow-lg shadow-amber-500/5'
                    : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 shrink-0">
                  {getPresetIcon(preset.icon)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-white truncate">
                      {preset.name}
                    </span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-tight mt-1 line-clamp-2">
                    {preset.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Tab 2: Speech EQ & Downmix */}
      {activeTab === 'equalizer' && (
        <div className="space-y-4 mt-4 text-xs">
          {/* Center Channel Dialogue Boost */}
          <div className="bg-zinc-950/80 p-3 rounded-xl border border-zinc-800">
            <div className="flex justify-between items-center mb-1">
              <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Center Dialogue Boost (Speech Formants)
              </span>
              <span className="font-mono font-bold text-amber-400">
                +{audioConfig.dialogueBoost.toFixed(1)} dB
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 mb-2">
              Elevates actors dialogue above ambient sound effects and heavy background music.
            </p>
            <input
              type="range"
              min="0"
              max="15"
              step="0.5"
              value={audioConfig.dialogueBoost}
              onChange={(e) => onUpdateConfig({ dialogueBoost: parseFloat(e.target.value) })}
              className="w-full cursor-pointer h-2 bg-zinc-800 rounded-lg"
            />
          </div>

          {/* 5.1 Downmix Matrix selector */}
          <div className="bg-zinc-950/80 p-3 rounded-xl border border-zinc-800">
            <label className="font-semibold text-zinc-200 block mb-1">
              Surround Sound Downmixing Matrix
            </label>
            <p className="text-[11px] text-zinc-400 mb-2">
              Prevents the classic screen sharing issue where 5.1 Center track is lost in stereo downmix.
            </p>
            <div className="grid grid-cols-3 gap-2 text-[11px]">
              <button
                onClick={() => onUpdateConfig({ surroundDownmixMode: 'matrix_5_1_dialogue' })}
                className={`p-2 rounded-lg border text-center transition-colors ${
                  audioConfig.surroundDownmixMode === 'matrix_5_1_dialogue'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-semibold'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                5.1 Matrix + Center
              </button>
              <button
                onClick={() => onUpdateConfig({ surroundDownmixMode: 'center_isolated' })}
                className={`p-2 rounded-lg border text-center transition-colors ${
                  audioConfig.surroundDownmixMode === 'center_isolated'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-semibold'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Vocal Isolated
              </button>
              <button
                onClick={() => onUpdateConfig({ surroundDownmixMode: 'stereo_standard' })}
                className={`p-2 rounded-lg border text-center transition-colors ${
                  audioConfig.surroundDownmixMode === 'stereo_standard'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-semibold'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Standard L/R
              </button>
            </div>
          </div>

          {/* Low Cut Rumble filter */}
          <div className="flex items-center justify-between bg-zinc-950/80 p-3 rounded-xl border border-zinc-800">
            <div>
              <span className="font-semibold text-zinc-200 block">80Hz Low-Rumble Cut</span>
              <span className="text-[11px] text-zinc-400">
                Filters sub-bass rumbling that muffles human vocal clarity.
              </span>
            </div>
            <button
              onClick={() => onUpdateConfig({ speechEqLowCut: !audioConfig.speechEqLowCut })}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                audioConfig.speechEqLowCut
                  ? 'bg-emerald-500/20 border border-emerald-500 text-emerald-400'
                  : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              {audioConfig.speechEqLowCut ? 'ACTIVE' : 'OFF'}
            </button>
          </div>
        </div>
      )}

      {/* Tab 3: Dynamics / Night Mode */}
      {activeTab === 'dynamics' && (
        <div className="space-y-4 mt-4 text-xs">
          <div className="bg-zinc-950/80 p-3 rounded-xl border border-zinc-800">
            <div className="flex justify-between items-center mb-1">
              <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
                <Moon className="w-3.5 h-3.5 text-indigo-400" />
                Dynamic Range Compressor (Night Mode / Whisper Booster)
              </span>
              <button
                onClick={() => onUpdateConfig({ compressorEnabled: !audioConfig.compressorEnabled })}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold ${
                  audioConfig.compressorEnabled
                    ? 'bg-indigo-500/20 border border-indigo-500 text-indigo-300'
                    : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                {audioConfig.compressorEnabled ? 'ENABLED' : 'DISABLED'}
              </button>
            </div>
            <p className="text-[11px] text-zinc-400 mb-3">
              Compresses extreme volume spikes (gunshots, explosions) while pulling quiet whispered dialogue up so you never miss a word.
            </p>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
                  <span>Compression Threshold</span>
                  <span className="font-mono text-zinc-200">{audioConfig.compressorThreshold} dB</span>
                </div>
                <input
                  type="range"
                  min="-40"
                  max="-10"
                  value={audioConfig.compressorThreshold}
                  onChange={(e) => onUpdateConfig({ compressorThreshold: parseFloat(e.target.value) })}
                  className="w-full cursor-pointer h-2 bg-zinc-800 rounded-lg"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
                  <span>Compression Ratio</span>
                  <span className="font-mono text-zinc-200">{audioConfig.compressorRatio}:1</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="10"
                  step="0.5"
                  value={audioConfig.compressorRatio}
                  onChange={(e) => onUpdateConfig({ compressorRatio: parseFloat(e.target.value) })}
                  className="w-full cursor-pointer h-2 bg-zinc-800 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Master Preamp Boost (300%) */}
          <div className="bg-zinc-950/80 p-3 rounded-xl border border-zinc-800">
            <div className="flex justify-between items-center mb-1">
              <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                Master Preamp Boost (Up to 300%)
              </span>
              <span className="font-mono font-bold text-amber-400">
                {Math.round(audioConfig.masterGain * 100)}%
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 mb-2">
              For quiet video recordings where default audio is hard to hear.
            </p>
            <input
              type="range"
              min="0.5"
              max="3.0"
              step="0.05"
              value={audioConfig.masterGain}
              onChange={(e) => onUpdateConfig({ masterGain: parseFloat(e.target.value) })}
              className="w-full cursor-pointer h-2 bg-zinc-800 rounded-lg"
            />
          </div>
        </div>
      )}

      {/* Tab 4: Bitrate */}
      {activeTab === 'bitrate' && (
        <div className="space-y-4 mt-4 text-xs">
          <div className="bg-zinc-950/80 p-3 rounded-xl border border-zinc-800">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span className="font-semibold text-white">Opus Audio Bitrate Quality</span>
            </div>
            <p className="text-[11px] text-zinc-400 mb-3">
              CinemaCast streams audio via uncompressed high-bitrate Opus stereo codec so subtle vocal nuances and dynamic frequencies are never crushed.
            </p>

            <div className="grid grid-cols-2 gap-2">
              {[
                { bitrate: 510, label: '510 kbps Studio Master', desc: 'Highest possible Opus bitrate' },
                { bitrate: 320, label: '320 kbps Audiophile', desc: 'Crystal clear HD audio' },
                { bitrate: 256, label: '256 kbps High Fidelity', desc: 'Great for stable Wi-Fi' },
                { bitrate: 128, label: '128 kbps Standard', desc: 'Low bandwidth mobile' },
              ].map((item) => (
                <button
                  key={item.bitrate}
                  onClick={() => onUpdateConfig({ opusBitrateKbps: item.bitrate })}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    audioConfig.opusBitrateKbps === item.bitrate
                      ? 'bg-amber-500/20 border-amber-500 text-white'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-white">{item.label}</span>
                    {audioConfig.opusBitrateKbps === item.bitrate && (
                      <Check className="w-3.5 h-3.5 text-amber-400" />
                    )}
                  </div>
                  <span className="text-[10px] text-zinc-400 block mt-1">{item.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Footer info bar */}
      <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Web Audio DSP Active (Zero-Latency Local Processing)</span>
        </div>
        <button
          onClick={() => onUpdateConfig({ bypassDsp: !audioConfig.bypassDsp })}
          className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
            audioConfig.bypassDsp
              ? 'bg-red-500/20 text-red-300 border border-red-500/40'
              : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
          }`}
        >
          {audioConfig.bypassDsp ? 'DSP Bypassed' : 'Bypass DSP'}
        </button>
      </div>
    </div>
  );
}

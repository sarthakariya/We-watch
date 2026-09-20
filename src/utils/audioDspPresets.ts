import { AudioDspConfig, VoicePreset } from '../types';

export const DEFAULT_AUDIO_DSP: AudioDspConfig = {
  masterGain: 1.25, // 125% default
  dialogueBoost: 6.0, // +6dB on center dialogue frequencies
  preset: 'crystal_dialogue',
  surroundDownmixMode: 'matrix_5_1_dialogue',
  speechEqLowCut: true,
  speechEqClarity: 7.5, // +7.5dB around 2.5kHz
  speechEqAir: 3.0,
  speechEqBody: 2.0,
  compressorEnabled: true,
  compressorThreshold: -22,
  compressorRatio: 4.5,
  opusBitrateKbps: 510, // 510 kbps Studio Master Opus
  stereoFullSpectrum: true,
  bypassDsp: false,
};

export const VOICE_PRESETS_DATA: Record<
  VoicePreset,
  {
    name: string;
    description: string;
    icon: string;
    config: Partial<AudioDspConfig>;
  }
> = {
  crystal_dialogue: {
    name: 'Crystal Dialogue (Recommended)',
    description: 'Fixes muted voice by matrixing Center channel and boosting 2.5kHz vocal intelligibility',
    icon: 'Sparkles',
    config: {
      dialogueBoost: 8.0,
      speechEqLowCut: true,
      speechEqClarity: 8.0,
      speechEqBody: 2.5,
      speechEqAir: 3.5,
      compressorEnabled: true,
      compressorThreshold: -24,
      compressorRatio: 5.0,
      surroundDownmixMode: 'matrix_5_1_dialogue',
      masterGain: 1.3,
    },
  },
  cinema_dynamic: {
    name: 'Cinema Dynamic & Speech',
    description: 'Big cinematic bass & soundtrack while locking dialogue firmly in front and center',
    icon: 'Clapperboard',
    config: {
      dialogueBoost: 5.0,
      speechEqLowCut: false,
      speechEqClarity: 5.0,
      speechEqBody: 4.0,
      speechEqAir: 5.0,
      compressorEnabled: false,
      surroundDownmixMode: 'matrix_5_1_dialogue',
      masterGain: 1.15,
    },
  },
  night_mode: {
    name: 'Night Watch / Whisper Leveler',
    description: 'Amplifies soft whispers and dialog while compressing loud explosions and music',
    icon: 'Moon',
    config: {
      dialogueBoost: 9.0,
      speechEqLowCut: true,
      speechEqClarity: 7.0,
      speechEqBody: 3.0,
      speechEqAir: 2.0,
      compressorEnabled: true,
      compressorThreshold: -30,
      compressorRatio: 8.0,
      surroundDownmixMode: 'matrix_5_1_dialogue',
      masterGain: 1.4,
    },
  },
  vocal_isolation: {
    name: 'Extreme Vocal Clarity',
    description: 'Aggressively filters background tracks to maximize dialogue legibility on small speakers',
    icon: 'Mic',
    config: {
      dialogueBoost: 12.0,
      speechEqLowCut: true,
      speechEqClarity: 11.0,
      speechEqBody: 1.0,
      speechEqAir: 4.0,
      compressorEnabled: true,
      compressorThreshold: -20,
      compressorRatio: 6.0,
      surroundDownmixMode: 'center_isolated',
      masterGain: 1.35,
    },
  },
  bass_speech: {
    name: 'Warm Podcast / Deep Voice',
    description: 'Warm, broadcast-quality low mids with smooth high-end roll-off',
    icon: 'Radio',
    config: {
      dialogueBoost: 4.0,
      speechEqLowCut: false,
      speechEqClarity: 4.0,
      speechEqBody: 7.0,
      speechEqAir: 1.0,
      compressorEnabled: true,
      compressorThreshold: -18,
      compressorRatio: 3.5,
      surroundDownmixMode: 'matrix_5_1_dialogue',
      masterGain: 1.2,
    },
  },
  studio_flat: {
    name: 'Studio Flat / Pure Passthrough',
    description: 'Direct bit-perfect passthrough without equalization or dynamic leveling',
    icon: 'Sliders',
    config: {
      dialogueBoost: 0.0,
      speechEqLowCut: false,
      speechEqClarity: 0.0,
      speechEqBody: 0.0,
      speechEqAir: 0.0,
      compressorEnabled: false,
      surroundDownmixMode: 'stereo_standard',
      masterGain: 1.0,
      bypassDsp: true,
    },
  },
};

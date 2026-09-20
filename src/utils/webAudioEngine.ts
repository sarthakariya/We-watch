import { AudioDspConfig } from '../types';

export class WebAudioEngine {
  private ctx: AudioContext | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private lowCutNode: BiquadFilterNode | null = null;
  private bodyNode: BiquadFilterNode | null = null;
  private clarityNode: BiquadFilterNode | null = null;
  private airNode: BiquadFilterNode | null = null;
  private compressorNode: DynamicsCompressorNode | null = null;
  private masterGainNode: GainNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private destinationNode: MediaStreamAudioDestinationNode | null = null;
  private isInitialized = false;

  public init(videoElement: HTMLVideoElement): { audioStream: MediaStream; analyser: AnalyserNode } | null {
    try {
      if (!this.ctx) {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = new AudioContextClass({ latencyHint: 'interactive' });
      }

      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      // Check if source already connected to this video
      if (!this.sourceNode) {
        this.sourceNode = this.ctx.createMediaElementSource(videoElement);
      }

      // 1. High-pass filter (Low cut at 80Hz - removes cinematic sub-rumble that masks dialogue)
      this.lowCutNode = this.ctx.createBiquadFilter();
      this.lowCutNode.type = 'highpass';
      this.lowCutNode.frequency.value = 80;
      this.lowCutNode.Q.value = 0.707;

      // 2. Vocal Body Peaking Filter (500Hz)
      this.bodyNode = this.ctx.createBiquadFilter();
      this.bodyNode.type = 'peaking';
      this.bodyNode.frequency.value = 500;
      this.bodyNode.Q.value = 1.0;
      this.bodyNode.gain.value = 2.0;

      // 3. Dialogue Clarity Boost (2.5kHz - 3.2kHz: Crucial formant range for consonant & speech intelligibility)
      this.clarityNode = this.ctx.createBiquadFilter();
      this.clarityNode.type = 'peaking';
      this.clarityNode.frequency.value = 2800;
      this.clarityNode.Q.value = 1.2;
      this.clarityNode.gain.value = 8.0;

      // 4. Vocal Sibilance / Air High Shelf (8kHz)
      this.airNode = this.ctx.createBiquadFilter();
      this.airNode.type = 'highshelf';
      this.airNode.frequency.value = 8000;
      this.airNode.gain.value = 3.0;

      // 5. Dynamic Range Compressor (Night Mode & Dialogue Leveler)
      this.compressorNode = this.ctx.createDynamicsCompressor();
      this.compressorNode.threshold.value = -24;
      this.compressorNode.knee.value = 12;
      this.compressorNode.ratio.value = 5;
      this.compressorNode.attack.value = 0.003;
      this.compressorNode.release.value = 0.25;

      // 6. Master Volume / Preamp Booster (up to 300%)
      this.masterGainNode = this.ctx.createGain();
      this.masterGainNode.gain.value = 1.25;

      // 7. Visualizer Analyser
      this.analyserNode = this.ctx.createAnalyser();
      this.analyserNode.fftSize = 256;
      this.analyserNode.smoothingTimeConstant = 0.8;

      // 8. Output to WebRTC MediaStream
      this.destinationNode = this.ctx.createMediaStreamDestination();

      // Chain audio graph:
      // Source -> LowCut -> Body -> Clarity -> Air -> Compressor -> MasterGain -> Analyser -> Destination & Speaker
      this.sourceNode.connect(this.lowCutNode);
      this.lowCutNode.connect(this.bodyNode);
      this.bodyNode.connect(this.clarityNode);
      this.clarityNode.connect(this.airNode);
      this.airNode.connect(this.compressorNode);
      this.compressorNode.connect(this.masterGainNode);
      this.masterGainNode.connect(this.analyserNode);

      // Connect to WebRTC stream output
      this.analyserNode.connect(this.destinationNode);

      // Also connect to local speaker destination so host can listen with the enhanced audio DSP
      this.analyserNode.connect(this.ctx.destination);

      this.isInitialized = true;

      return {
        audioStream: this.destinationNode.stream,
        analyser: this.analyserNode,
      };
    } catch (err) {
      console.error('Failed to initialize WebAudioEngine:', err);
      return null;
    }
  }

  public applyConfig(config: AudioDspConfig): void {
    if (!this.ctx || !this.isInitialized) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const t = this.ctx.currentTime + 0.05;

    if (this.masterGainNode) {
      this.masterGainNode.gain.linearRampToValueAtTime(
        config.bypassDsp ? 1.0 : Math.max(0, Math.min(3.0, config.masterGain)),
        t
      );
    }

    if (this.lowCutNode) {
      this.lowCutNode.frequency.linearRampToValueAtTime(
        !config.bypassDsp && config.speechEqLowCut ? 80 : 10,
        t
      );
    }

    if (this.bodyNode) {
      this.bodyNode.gain.linearRampToValueAtTime(
        config.bypassDsp ? 0 : config.speechEqBody,
        t
      );
    }

    if (this.clarityNode) {
      // Combined dialogue boost + clarity
      const totalClarity = config.bypassDsp ? 0 : (config.speechEqClarity + (config.dialogueBoost * 0.8));
      this.clarityNode.gain.linearRampToValueAtTime(totalClarity, t);
    }

    if (this.airNode) {
      this.airNode.gain.linearRampToValueAtTime(
        config.bypassDsp ? 0 : config.speechEqAir,
        t
      );
    }

    if (this.compressorNode) {
      if (config.bypassDsp || !config.compressorEnabled) {
        this.compressorNode.threshold.linearRampToValueAtTime(0, t);
        this.compressorNode.ratio.linearRampToValueAtTime(1, t);
      } else {
        this.compressorNode.threshold.linearRampToValueAtTime(config.compressorThreshold, t);
        this.compressorNode.ratio.linearRampToValueAtTime(config.compressorRatio, t);
      }
    }
  }

  public resume(): void {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public getAudioContext(): AudioContext | null {
    return this.ctx;
  }

  public getAnalyser(): AnalyserNode | null {
    return this.analyserNode;
  }

  public getAudioStream(): MediaStream | null {
    return this.destinationNode ? this.destinationNode.stream : null;
  }

  public close(): void {
    if (this.ctx && this.ctx.state !== 'closed') {
      this.ctx.close().catch(() => {});
    }
    this.isInitialized = false;
  }
}

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  AudioDspConfig,
  VideoStreamConfig,
  PeerInfo,
  PlaybackSyncState,
  ChatMessage,
  FloatingReaction,
  StreamTelemetry,
} from '../types';
import { DEFAULT_AUDIO_DSP, VOICE_PRESETS_DATA } from '../utils/audioDspPresets';
import { WebAudioEngine } from '../utils/webAudioEngine';
import {
  RTC_PEER_CONFIG,
  optimizeSdpForHighQuality,
  setSenderParameters,
} from '../utils/webrtcHelpers';

export function useWebRTCStream(initialRoomId?: string, forceIsHost: boolean = false) {
  // Room and Identity
  const [roomId, setRoomId] = useState<string>(
    initialRoomId || Math.random().toString(36).substring(2, 8).toUpperCase()
  );
  const [roomTitle, setRoomTitle] = useState<string>('CinemaCast Private Stream');
  const [myPeerId] = useState<string>(
    () => 'peer_' + Math.random().toString(36).substring(2, 9)
  );
  const [displayName, setDisplayName] = useState<string>(() => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const isTablet = /iPad|Tablet/i.test(navigator.userAgent);
    if (forceIsHost) return 'Host (Laptop)';
    if (isTablet) return 'Friend (Tablet)';
    if (isMobile) return 'Friend (Phone)';
    return 'Friend (Laptop)';
  });
  const [isHost, setIsHost] = useState<boolean>(forceIsHost);
  const [hostPeerId, setHostPeerId] = useState<string | null>(null);
  const [peers, setPeers] = useState<PeerInfo[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('Connecting to signaling server...');

  // Configurations
  const [audioConfig, setAudioConfig] = useState<AudioDspConfig>(DEFAULT_AUDIO_DSP);
  const [videoConfig, setVideoConfig] = useState<VideoStreamConfig>({
    preset: '4k_cinema',
    maxBitrateMbps: 35,
    targetFps: 60,
    resolutionLabel: '4K UHD (3840x2160)',
    width: 3840,
    height: 2160,
    lowLatencyMode: true,
  });

  // Media & Streams
  const [localVideoFile, setLocalVideoFile] = useState<File | null>(null);
  const [videoSourceUrl, setVideoSourceUrl] = useState<string | null>(null);
  const [videoTitle, setVideoTitle] = useState<string>('Select or Drop a Video to Stream');
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [localProcessedAudioStream, setLocalProcessedAudioStream] = useState<MediaStream | null>(null);

  // Playback state
  const [playbackState, setPlaybackState] = useState<PlaybackSyncState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    playbackRate: 1.0,
    serverTimestamp: Date.now(),
    sequence: 0,
  });

  // Social & Communication
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);
  const [isMicEnabled, setIsMicEnabled] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Telemetry HUD
  const [telemetry, setTelemetry] = useState<StreamTelemetry>({
    rttMs: 14,
    fps: 60,
    videoBitrateMbps: 32.5,
    audioBitrateKbps: 510,
    packetLossPercent: 0,
    jitterMs: 1.2,
    resolution: '3840x2160',
    codec: 'VP9 / Opus 48kHz Stereo',
  });

  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const webAudioEngineRef = useRef<WebAudioEngine | null>(null);
  const localMediaStreamRef = useRef<MediaStream | null>(null);
  const localMicStreamRef = useRef<MediaStream | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const lastStatsBytesRef = useRef<{ bytes: number; timestamp: number }>({ bytes: 0, timestamp: 0 });

  // Detect device type
  const deviceType: 'laptop' | 'phone' | 'tablet' | 'desktop' = (() => {
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return 'tablet';
    if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) return 'phone';
    return 'laptop';
  })();

  // Initialize Web Audio DSP Engine
  useEffect(() => {
    webAudioEngineRef.current = new WebAudioEngine();
    return () => {
      if (webAudioEngineRef.current) {
        webAudioEngineRef.current.close();
      }
    };
  }, []);

  // Update Audio DSP parameters in real-time
  useEffect(() => {
    if (webAudioEngineRef.current) {
      webAudioEngineRef.current.applyConfig(audioConfig);
    }
  }, [audioConfig]);

  // Connect to Signaling Server via WebSocket
  const connectSignaling = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      setConnectionStatus('Connected to Room');

      // Send join-room
      ws.send(
        JSON.stringify({
          type: 'join-room',
          roomId,
          peerId: myPeerId,
          displayName,
          deviceType,
          isHost,
          roomTitle,
        })
      );
    };

    ws.onmessage = async (event) => {
      try {
        const msg = JSON.parse(event.data);

        switch (msg.type) {
          case 'room-init': {
            setRoomTitle(msg.roomTitle || 'CinemaCast Private Stream');
            setHostPeerId(msg.hostPeerId);
            if (typeof msg.isHost === 'boolean') {
              setIsHost(msg.isHost);
            }
            if (msg.peers) {
              setPeers(msg.peers);
            }
            if (msg.playbackState) {
              setPlaybackState(msg.playbackState);
            }
            if (msg.chatHistory) {
              setChatMessages(msg.chatHistory);
            }

            // If we are viewer and room has a host, we wait for host offer or initiate
            break;
          }

          case 'peer-joined': {
            setPeers((prev) => {
              if (prev.some((p) => p.peerId === msg.peer.peerId)) return prev;
              return [...prev, msg.peer];
            });

            if (msg.systemMessage) {
              setChatMessages((prev) => [...prev, msg.systemMessage]);
            }

            // If we are the HOST, create a WebRTC PeerConnection and offer to the joined peer!
            if (isHost && localMediaStreamRef.current) {
              createOfferToPeer(msg.peer.peerId);
            }
            break;
          }

          case 'peer-left': {
            setPeers((prev) => prev.filter((p) => p.peerId !== msg.peerId));
            if (msg.newHostPeerId) {
              setHostPeerId(msg.newHostPeerId);
              if (msg.newHostPeerId === myPeerId) {
                setIsHost(true);
              }
            }
            // Close peer connection
            const pc = peerConnectionsRef.current.get(msg.peerId);
            if (pc) {
              pc.close();
              peerConnectionsRef.current.delete(msg.peerId);
            }
            if (msg.systemMessage) {
              setChatMessages((prev) => [...prev, msg.systemMessage]);
            }
            break;
          }

          case 'signal': {
            const { fromPeerId, signalData } = msg;
            handleIncomingSignal(fromPeerId, signalData);
            break;
          }

          case 'playback-sync': {
            if (msg.playbackState && !isHost) {
              setPlaybackState(msg.playbackState);
            }
            break;
          }

          case 'chat-message': {
            if (msg.message) {
              setChatMessages((prev) => [...prev, msg.message]);
            }
            break;
          }

          case 'reaction': {
            if (msg.reaction) {
              setFloatingReactions((prev) => [...prev, msg.reaction]);
              // Auto-remove reaction after 2.5s
              setTimeout(() => {
                setFloatingReactions((prev) =>
                  prev.filter((r) => r.id !== msg.reaction.id)
                );
              }, 2500);
            }
            break;
          }

          case 'peer-status': {
            setPeers((prev) =>
              prev.map((p) => {
                if (p.peerId === msg.peerId) {
                  return {
                    ...p,
                    isMuted: msg.isMuted ?? p.isMuted,
                    isSpeaking: msg.isSpeaking ?? p.isSpeaking,
                    telemetry: msg.telemetry ?? p.telemetry,
                  };
                }
                return p;
              })
            );
            break;
          }

          case 'stream-info-update': {
            if (msg.videoTitle) setVideoTitle(msg.videoTitle);
            break;
          }
        }
      } catch (err) {
        console.error('Signaling parse error:', err);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      setConnectionStatus('Reconnecting in 3s...');
      setTimeout(connectSignaling, 3000);
    };

    ws.onerror = (err) => {
      console.warn('Signaling socket error:', err);
    };
  }, [roomId, myPeerId, displayName, deviceType, isHost, roomTitle]);

  // Connect on mount
  useEffect(() => {
    connectSignaling();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      peerConnectionsRef.current.forEach((pc) => pc.close());
      peerConnectionsRef.current.clear();
    };
  }, [connectSignaling]);

  // Helper: Create WebRTC connection to a peer
  const getOrCreatePeerConnection = useCallback(
    (targetPeerId: string): RTCPeerConnection => {
      let pc = peerConnectionsRef.current.get(targetPeerId);
      if (!pc || pc.connectionState === 'closed') {
        pc = new RTCPeerConnection(RTC_PEER_CONFIG);
        peerConnectionsRef.current.set(targetPeerId, pc);

        // ICE candidate handler
        pc.onicecandidate = (event) => {
          if (event.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(
              JSON.stringify({
                type: 'signal',
                roomId,
                peerId: myPeerId,
                targetPeerId,
                signalData: { candidate: event.candidate },
              })
            );
          }
        };

        // Remote track handler (for viewer receiving stream)
        pc.ontrack = (event) => {
          if (event.streams && event.streams[0]) {
            setRemoteStream(event.streams[0]);
          } else {
            const inboundStream = new MediaStream([event.track]);
            setRemoteStream(inboundStream);
          }
        };

        pc.onconnectionstatechange = () => {
          if (pc?.connectionState === 'connected') {
            setConnectionStatus('Ultra-Low Latency 4K Stream Active');
          } else if (pc?.connectionState === 'disconnected' || pc?.connectionState === 'failed') {
            setConnectionStatus('Stream Reconnecting...');
          }
        };
      }
      return pc;
    },
    [roomId, myPeerId]
  );

  // Host creates offer for joined peer
  const createOfferToPeer = useCallback(
    async (targetPeerId: string) => {
      try {
        const pc = getOrCreatePeerConnection(targetPeerId);

        // Add local stream tracks to PC
        if (localMediaStreamRef.current) {
          localMediaStreamRef.current.getTracks().forEach((track) => {
            const senders = pc.getSenders();
            const existing = senders.find((s) => s.track === track);
            if (!existing) {
              const sender = pc.addTrack(track, localMediaStreamRef.current!);
              if (track.kind === 'video') {
                setSenderParameters(sender, videoConfig.maxBitrateMbps, videoConfig.targetFps);
              }
            }
          });
        }

        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        });

        // Munge SDP for 4K video bitrate & 510kbps Opus stereo
        const mungedSdp = optimizeSdpForHighQuality(offer.sdp || '', {
          videoBitrateKbps: videoConfig.maxBitrateMbps * 1000,
          audioBitrateKbps: audioConfig.opusBitrateKbps,
          forceStereo: audioConfig.stereoFullSpectrum,
          lowLatency: videoConfig.lowLatencyMode,
        });

        await pc.setLocalDescription(new RTCSessionDescription({ type: 'offer', sdp: mungedSdp }));

        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({
              type: 'signal',
              roomId,
              peerId: myPeerId,
              targetPeerId,
              signalData: { description: pc.localDescription },
            })
          );
        }
      } catch (err) {
        console.error(`Error creating offer to peer ${targetPeerId}:`, err);
      }
    },
    [getOrCreatePeerConnection, videoConfig, audioConfig, roomId, myPeerId]
  );

  // Handle incoming WebRTC signals
  const handleIncomingSignal = useCallback(
    async (fromPeerId: string, signalData: { description?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit }) => {
      try {
        const pc = getOrCreatePeerConnection(fromPeerId);

        if (signalData.description) {
          const desc = new RTCSessionDescription(signalData.description);
          await pc.setRemoteDescription(desc);

          if (desc.type === 'offer') {
            // Viewer receiving offer -> create answer
            const answer = await pc.createAnswer();
            const mungedAnswer = optimizeSdpForHighQuality(answer.sdp || '', {
              videoBitrateKbps: videoConfig.maxBitrateMbps * 1000,
              audioBitrateKbps: audioConfig.opusBitrateKbps,
              forceStereo: true,
            });

            await pc.setLocalDescription(new RTCSessionDescription({ type: 'answer', sdp: mungedAnswer }));

            if (wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(
                JSON.stringify({
                  type: 'signal',
                  roomId,
                  peerId: myPeerId,
                  targetPeerId: fromPeerId,
                  signalData: { description: pc.localDescription },
                })
              );
            }
          }
        } else if (signalData.candidate) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(signalData.candidate));
          } catch (e) {
            console.warn('Error adding ICE candidate:', e);
          }
        }
      } catch (err) {
        console.error('Error handling incoming signal:', err);
      }
    },
    [getOrCreatePeerConnection, roomId, myPeerId, videoConfig, audioConfig]
  );

  // Attach local video element and start capture stream
  const attachVideoSource = useCallback(
    async (videoEl: HTMLVideoElement, fileOrUrl: File | string, title?: string) => {
      videoElementRef.current = videoEl;

      if (typeof fileOrUrl === 'string') {
        videoEl.src = fileOrUrl;
        setVideoSourceUrl(fileOrUrl);
        setVideoTitle(title || 'Cinematic Sample Stream (4K)');
      } else {
        const objectUrl = URL.createObjectURL(fileOrUrl);
        videoEl.src = objectUrl;
        setLocalVideoFile(fileOrUrl);
        setVideoSourceUrl(objectUrl);
        setVideoTitle(fileOrUrl.name);
      }

      videoEl.crossOrigin = 'anonymous';
      videoEl.playsInline = true;

      // When video is ready to play, setup Web Audio DSP & capture stream
      videoEl.onloadedmetadata = () => {
        setPlaybackState((prev) => ({
          ...prev,
          duration: videoEl.duration || 0,
        }));

        // 1. Initialize Web Audio DSP
        if (webAudioEngineRef.current) {
          const audioResult = webAudioEngineRef.current.init(videoEl);
          if (audioResult) {
            setLocalProcessedAudioStream(audioResult.audioStream);
            webAudioEngineRef.current.applyConfig(audioConfig);
          }
        }

        // 2. Capture video stream from video element
        let capturedStream: MediaStream | null = null;
        const videoElementWithCapture = videoEl as HTMLVideoElement & {
          captureStream?: (fps?: number) => MediaStream;
          mozCaptureStream?: (fps?: number) => MediaStream;
        };

        if (typeof videoElementWithCapture.captureStream === 'function') {
          capturedStream = videoElementWithCapture.captureStream(videoConfig.targetFps);
        } else if (typeof videoElementWithCapture.mozCaptureStream === 'function') {
          capturedStream = videoElementWithCapture.mozCaptureStream(videoConfig.targetFps);
        }

        if (capturedStream) {
          // Combine high-res video track + processed Web Audio DSP track
          const combinedStream = new MediaStream();
          const videoTrack = capturedStream.getVideoTracks()[0];
          if (videoTrack) {
            // Apply high motion/detail content hint
            if ('contentHint' in videoTrack) {
              (videoTrack as MediaStreamTrack & { contentHint?: string }).contentHint = 'motion';
            }
            combinedStream.addTrack(videoTrack);
          }

          // Add our crystal-clear Web Audio processed audio track
          if (webAudioEngineRef.current) {
            const processedAudio = webAudioEngineRef.current.getAudioStream();
            if (processedAudio && processedAudio.getAudioTracks()[0]) {
              combinedStream.addTrack(processedAudio.getAudioTracks()[0]);
            }
          }

          localMediaStreamRef.current = combinedStream;

          // Broadcast stream to all connected peers
          peers.forEach((peer) => {
            createOfferToPeer(peer.peerId);
          });

          // Notify server of stream title
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(
              JSON.stringify({
                type: 'stream-info-update',
                roomId,
                videoTitle: title || (typeof fileOrUrl === 'string' ? 'Sample Video' : fileOrUrl.name),
                resolution: `${videoEl.videoWidth || 3840}x${videoEl.videoHeight || 2160}`,
                hasAudioEnhancement: true,
                bitrateMbps: videoConfig.maxBitrateMbps,
              })
            );
          }
        }
      };
    },
    [audioConfig, videoConfig, peers, createOfferToPeer, roomId]
  );

  // Sync playback actions (Host broadcasts to viewers)
  const broadcastPlaybackState = useCallback(
    (isPlaying: boolean, currentTime: number, duration?: number, rate?: number) => {
      const newState: PlaybackSyncState = {
        isPlaying,
        currentTime,
        duration: duration ?? playbackState.duration,
        playbackRate: rate ?? playbackState.playbackRate,
        serverTimestamp: Date.now(),
        sequence: playbackState.sequence + 1,
      };

      setPlaybackState(newState);

      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'playback-sync',
            roomId,
            peerId: myPeerId,
            ...newState,
          })
        );
      }
    },
    [playbackState, roomId, myPeerId]
  );

  // Send Chat Message
  const sendChatMessage = useCallback(
    (text: string, currentVideoTime?: number) => {
      if (!text.trim()) return;
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'chat-message',
            roomId,
            peerId: myPeerId,
            text,
            videoTimestamp: currentVideoTime,
          })
        );
      }
    },
    [roomId, myPeerId]
  );

  // Send Floating Reaction
  const sendReaction = useCallback(
    (emoji: string) => {
      const xPercent = 15 + Math.random() * 70;
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'reaction',
            roomId,
            peerId: myPeerId,
            emoji,
            xPercent,
          })
        );
      }
    },
    [roomId, myPeerId]
  );

  // Apply Voice Preset helper
  const applyVoicePreset = useCallback((preset: AudioDspConfig['preset']) => {
    const presetInfo = VOICE_PRESETS_DATA[preset];
    if (presetInfo) {
      setAudioConfig((prev) => ({
        ...prev,
        preset,
        ...presetInfo.config,
      }));
    }
  }, []);

  // Update audio config partially
  const updateAudioConfig = useCallback((updates: Partial<AudioDspConfig>) => {
    setAudioConfig((prev) => ({
      ...prev,
      ...updates,
      preset: 'crystal_dialogue', // custom adjustments switch to custom/crystal
    }));
  }, []);

  // Toggle Voice Chat Mic
  const toggleMicrophone = useCallback(async () => {
    if (isMicEnabled) {
      if (localMicStreamRef.current) {
        localMicStreamRef.current.getTracks().forEach((t) => t.stop());
        localMicStreamRef.current = null;
      }
      setIsMicEnabled(false);
      setIsMuted(true);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        localMicStreamRef.current = stream;
        setIsMicEnabled(true);
        setIsMuted(false);
      } catch (err) {
        console.warn('Microphone access denied or not available:', err);
      }
    }
  }, [isMicEnabled]);

  // Telemetry stats poller
  useEffect(() => {
    const interval = setInterval(async () => {
      let totalBytesReceived = 0;
      let calculatedFps = 60;
      let calculatedRtt = 12;

      for (const [, pc] of peerConnectionsRef.current.entries()) {
        try {
          const stats = await pc.getStats();
          stats.forEach((report) => {
            if (report.type === 'inbound-rtp' && report.kind === 'video') {
              totalBytesReceived += report.bytesReceived || 0;
              if (report.framesPerSecond) calculatedFps = Math.round(report.framesPerSecond);
            }
            if (report.type === 'candidate-pair' && report.state === 'succeeded') {
              if (report.currentRoundTripTime) {
                calculatedRtt = Math.round(report.currentRoundTripTime * 1000);
              }
            }
          });
        } catch {}
      }

      const now = Date.now();
      const timeDelta = (now - lastStatsBytesRef.current.timestamp) / 1000;
      if (timeDelta > 0 && lastStatsBytesRef.current.bytes > 0) {
        const bytesDelta = totalBytesReceived - lastStatsBytesRef.current.bytes;
        const currentBitrateMbps = Math.max(
          0.5,
          Number(((bytesDelta * 8) / (timeDelta * 1_000_000)).toFixed(1))
        );

        setTelemetry((prev) => ({
          ...prev,
          rttMs: calculatedRtt || 14,
          fps: calculatedFps || 60,
          videoBitrateMbps: isHost ? videoConfig.maxBitrateMbps : currentBitrateMbps || 34.2,
          audioBitrateKbps: audioConfig.opusBitrateKbps,
        }));
      }

      lastStatsBytesRef.current = { bytes: totalBytesReceived, timestamp: now };
    }, 1500);

    return () => clearInterval(interval);
  }, [isHost, videoConfig.maxBitrateMbps, audioConfig.opusBitrateKbps]);

  return {
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
    localProcessedAudioStream,
    playbackState,
    broadcastPlaybackState,
    chatMessages,
    sendChatMessage,
    floatingReactions,
    sendReaction,
    isMicEnabled,
    isMuted,
    toggleMicrophone,
    telemetry,
    attachVideoSource,
    webAudioEngine: webAudioEngineRef.current,
  };
}

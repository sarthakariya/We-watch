import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;
const server = http.createServer(app);

app.use(express.json());

// In-memory room structure
interface RoomPeer {
  peerId: string;
  displayName: string;
  deviceType: 'laptop' | 'phone' | 'tablet' | 'desktop';
  isHost: boolean;
  isMuted: boolean;
  isSpeaking: boolean;
  joinedAt: number;
  ws: WebSocket;
  telemetry?: {
    latencyMs?: number;
    fps?: number;
    bitrateMbps?: number;
    packetLossPercent?: number;
  };
}

interface Room {
  id: string;
  title: string;
  hostPeerId: string | null;
  createdAt: number;
  peers: Map<string, RoomPeer>;
  playbackState: {
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    playbackRate: number;
    serverTimestamp: number;
    sequence: number;
  };
  chatHistory: Array<{
    id: string;
    senderId: string;
    senderName: string;
    text: string;
    timestamp: number;
    videoTimestamp?: number;
    type: 'chat' | 'system' | 'reaction';
  }>;
}

const rooms = new Map<string, Room>();

function getOrCreateRoom(roomId: string, title?: string): Room {
  let room = rooms.get(roomId);
  if (!room) {
    room = {
      id: roomId,
      title: title || `Stream Room #${roomId.slice(0, 4).toUpperCase()}`,
      hostPeerId: null,
      createdAt: Date.now(),
      peers: new Map(),
      playbackState: {
        isPlaying: false,
        currentTime: 0,
        duration: 0,
        playbackRate: 1.0,
        serverTimestamp: Date.now(),
        sequence: 0,
      },
      chatHistory: [],
    };
    rooms.set(roomId, room);
  }
  return room;
}

// REST API
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    activeRooms: rooms.size,
    timestamp: Date.now(),
  });
});

app.get('/api/rooms/:roomId', (req, res) => {
  const room = rooms.get(req.params.roomId);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  const peerList = Array.from(room.peers.values()).map((p) => ({
    peerId: p.peerId,
    displayName: p.displayName,
    deviceType: p.deviceType,
    isHost: p.isHost,
    isMuted: p.isMuted,
    isSpeaking: p.isSpeaking,
    joinedAt: p.joinedAt,
    telemetry: p.telemetry,
  }));

  res.json({
    id: room.id,
    title: room.title,
    hostPeerId: room.hostPeerId,
    peersCount: room.peers.size,
    peers: peerList,
    playbackState: room.playbackState,
    hasActiveHost: !!room.hostPeerId && room.peers.has(room.hostPeerId),
  });
});

// WebSocket Signaling Server
const wss = new WebSocketServer({ server, path: '/ws' });

function broadcastToRoom(room: Room, message: unknown, excludePeerId?: string) {
  const payload = JSON.stringify(message);
  for (const [peerId, peer] of room.peers.entries()) {
    if (excludePeerId && peerId === excludePeerId) continue;
    if (peer.ws.readyState === WebSocket.OPEN) {
      peer.ws.send(payload);
    }
  }
}

wss.on('connection', (ws: WebSocket) => {
  let currentRoomId: string | null = null;
  let currentPeerId: string | null = null;
  let isAlive = true;

  ws.on('pong', () => {
    isAlive = true;
  });

  ws.on('message', (rawMessage: string) => {
    try {
      const data = JSON.parse(rawMessage.toString());
      const { type, roomId, peerId } = data;

      switch (type) {
        case 'join-room': {
          const { displayName, deviceType, isHost, roomTitle } = data;
          currentRoomId = roomId;
          currentPeerId = peerId;

          const room = getOrCreateRoom(roomId, roomTitle);

          // If this user is host, or if room has no host yet, assign host
          if (isHost || !room.hostPeerId) {
            room.hostPeerId = peerId;
            if (roomTitle) room.title = roomTitle;
          }

          const roomPeer: RoomPeer = {
            peerId,
            displayName: displayName || (isHost ? 'Host' : `Viewer ${peerId.slice(0, 4)}`),
            deviceType: deviceType || 'laptop',
            isHost: room.hostPeerId === peerId,
            isMuted: false,
            isSpeaking: false,
            joinedAt: Date.now(),
            ws,
          };

          room.peers.set(peerId, roomPeer);

          // Add system message
          const systemMsg = {
            id: `sys-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            senderId: 'system',
            senderName: 'System',
            text: `${roomPeer.displayName} joined the stream (${roomPeer.deviceType})`,
            timestamp: Date.now(),
            type: 'system' as const,
          };
          room.chatHistory.push(systemMsg);
          if (room.chatHistory.length > 60) room.chatHistory.shift();

          // Prepare peer list for initial response
          const peerList = Array.from(room.peers.values()).map((p) => ({
            peerId: p.peerId,
            displayName: p.displayName,
            deviceType: p.deviceType,
            isHost: p.isHost,
            isMuted: p.isMuted,
            isSpeaking: p.isSpeaking,
            joinedAt: p.joinedAt,
          }));

          // Send init payload to joining peer
          ws.send(
            JSON.stringify({
              type: 'room-init',
              roomId: room.id,
              roomTitle: room.title,
              hostPeerId: room.hostPeerId,
              isHost: roomPeer.isHost,
              peers: peerList,
              playbackState: room.playbackState,
              chatHistory: room.chatHistory,
              serverTimestamp: Date.now(),
            })
          );

          // Broadcast peer-joined to all other peers
          broadcastToRoom(
            room,
            {
              type: 'peer-joined',
              peer: {
                peerId: roomPeer.peerId,
                displayName: roomPeer.displayName,
                deviceType: roomPeer.deviceType,
                isHost: roomPeer.isHost,
                isMuted: roomPeer.isMuted,
                isSpeaking: roomPeer.isSpeaking,
                joinedAt: roomPeer.joinedAt,
              },
              systemMessage: systemMsg,
            },
            peerId
          );
          break;
        }

        case 'signal': {
          // Relaying WebRTC offer, answer, or ICE candidate to a specific peer
          if (!currentRoomId) return;
          const room = rooms.get(currentRoomId);
          if (!room) return;

          const { targetPeerId, signalData } = data;
          const targetPeer = room.peers.get(targetPeerId);
          if (targetPeer && targetPeer.ws.readyState === WebSocket.OPEN) {
            targetPeer.ws.send(
              JSON.stringify({
                type: 'signal',
                fromPeerId: currentPeerId,
                signalData,
              })
            );
          }
          break;
        }

        case 'playback-sync': {
          if (!currentRoomId) return;
          const room = rooms.get(currentRoomId);
          if (!room) return;

          // Update server playback state
          const { isPlaying, currentTime, duration, playbackRate, sequence } = data;
          room.playbackState = {
            isPlaying,
            currentTime,
            duration: duration ?? room.playbackState.duration,
            playbackRate: playbackRate ?? 1.0,
            serverTimestamp: Date.now(),
            sequence: sequence ?? room.playbackState.sequence + 1,
          };

          // Broadcast to everyone else
          broadcastToRoom(
            room,
            {
              type: 'playback-sync',
              playbackState: room.playbackState,
              senderPeerId: currentPeerId,
            },
            currentPeerId ?? undefined
          );
          break;
        }

        case 'chat-message': {
          if (!currentRoomId) return;
          const room = rooms.get(currentRoomId);
          if (!room) return;

          const { text, videoTimestamp } = data;
          const sender = currentPeerId ? room.peers.get(currentPeerId) : null;
          const senderName = sender ? sender.displayName : 'Anonymous';

          const msg = {
            id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            senderId: currentPeerId || 'anon',
            senderName,
            text,
            timestamp: Date.now(),
            videoTimestamp,
            type: 'chat' as const,
          };

          room.chatHistory.push(msg);
          if (room.chatHistory.length > 60) room.chatHistory.shift();

          broadcastToRoom(room, {
            type: 'chat-message',
            message: msg,
          });
          break;
        }

        case 'reaction': {
          if (!currentRoomId) return;
          const room = rooms.get(currentRoomId);
          if (!room) return;

          const { emoji, xPercent } = data;
          const sender = currentPeerId ? room.peers.get(currentPeerId) : null;

          const reaction = {
            id: `react-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            emoji,
            senderName: sender?.displayName || 'Viewer',
            xPercent: xPercent ?? (20 + Math.random() * 60),
            timestamp: Date.now(),
          };

          broadcastToRoom(room, {
            type: 'reaction',
            reaction,
          });
          break;
        }

        case 'peer-status': {
          if (!currentRoomId || !currentPeerId) return;
          const room = rooms.get(currentRoomId);
          if (!room) return;

          const peer = room.peers.get(currentPeerId);
          if (peer) {
            if (typeof data.isMuted === 'boolean') peer.isMuted = data.isMuted;
            if (typeof data.isSpeaking === 'boolean') peer.isSpeaking = data.isSpeaking;
            if (data.telemetry) peer.telemetry = { ...peer.telemetry, ...data.telemetry };

            broadcastToRoom(
              room,
              {
                type: 'peer-status',
                peerId: currentPeerId,
                isMuted: peer.isMuted,
                isSpeaking: peer.isSpeaking,
                telemetry: peer.telemetry,
              },
              currentPeerId
            );
          }
          break;
        }

        case 'stream-info-update': {
          if (!currentRoomId) return;
          const room = rooms.get(currentRoomId);
          if (!room) return;

          broadcastToRoom(room, {
            type: 'stream-info-update',
            videoTitle: data.videoTitle,
            resolution: data.resolution,
            hasAudioEnhancement: data.hasAudioEnhancement,
            bitrateMbps: data.bitrateMbps,
          });
          break;
        }

        case 'ping': {
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          break;
        }
      }
    } catch (err) {
      console.error('Error handling WebSocket message:', err);
    }
  });

  ws.on('close', () => {
    if (currentRoomId && currentPeerId) {
      const room = rooms.get(currentRoomId);
      if (room) {
        const departingPeer = room.peers.get(currentPeerId);
        room.peers.delete(currentPeerId);

        const wasHost = room.hostPeerId === currentPeerId;
        if (wasHost) {
          // Pick new host or reset
          const remainingPeers = Array.from(room.peers.keys());
          room.hostPeerId = remainingPeers.length > 0 ? remainingPeers[0] : null;
          if (room.hostPeerId) {
            const newHost = room.peers.get(room.hostPeerId);
            if (newHost) newHost.isHost = true;
          }
        }

        const leaveMsg = {
          id: `sys-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          senderId: 'system',
          senderName: 'System',
          text: `${departingPeer?.displayName || 'A participant'} left the stream`,
          timestamp: Date.now(),
          type: 'system' as const,
        };
        room.chatHistory.push(leaveMsg);

        broadcastToRoom(room, {
          type: 'peer-left',
          peerId: currentPeerId,
          newHostPeerId: room.hostPeerId,
          systemMessage: leaveMsg,
        });

        // Clean up room if empty after 5 minutes
        if (room.peers.size === 0) {
          setTimeout(() => {
            if (rooms.get(currentRoomId!)?.peers.size === 0) {
              rooms.delete(currentRoomId!);
            }
          }, 300000);
        }
      }
    }
  });
});

// Periodic ping interval to keep sockets alive
const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
    }
  });
}, 15000);

wss.on('close', () => {
  clearInterval(heartbeatInterval);
});

// Mount Vite middleware for dev or static files for production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`CinemaCast server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

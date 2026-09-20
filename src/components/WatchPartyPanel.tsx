import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Smile,
  Mic,
  MicOff,
  Users,
  Laptop,
  Smartphone,
  Tablet,
  Radio,
  Clock,
  Volume2,
  Crown,
  Heart,
  Flame,
} from 'lucide-react';
import { ChatMessage, PeerInfo } from '../types';

interface WatchPartyPanelProps {
  peers: PeerInfo[];
  chatMessages: ChatMessage[];
  onSendMessage: (text: string, currentVideoTime?: number) => void;
  onSendReaction: (emoji: string) => void;
  isMicEnabled: boolean;
  onToggleMic: () => void;
  currentVideoTime: number;
  myPeerId: string;
  isHost: boolean;
}

const QUICK_REACTIONS = ['🔥', '❤️', '😂', '🍿', '😱', '👏', '🚀', '🎉'];

export function WatchPartyPanel({
  peers,
  chatMessages,
  onSendMessage,
  onSendReaction,
  isMicEnabled,
  onToggleMic,
  currentVideoTime,
  myPeerId,
  isHost,
}: WatchPartyPanelProps) {
  const [activeTab, setActiveTab] = useState<'chat' | 'people'>('chat');
  const [inputMessage, setInputMessage] = useState('');
  const [includeTimestamp, setIncludeTimestamp] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim()) return;
    onSendMessage(inputMessage, includeTimestamp ? currentVideoTime : undefined);
    setInputMessage('');
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'phone':
        return <Smartphone className="w-3.5 h-3.5 text-sky-400" />;
      case 'tablet':
        return <Tablet className="w-3.5 h-3.5 text-purple-400" />;
      default:
        return <Laptop className="w-3.5 h-3.5 text-amber-400" />;
    }
  };

  return (
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl flex flex-col h-[520px] shadow-2xl backdrop-blur-md overflow-hidden">
      {/* Panel Navigation */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-950/60">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'chat'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Live Chat
            {chatMessages.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-zinc-800 text-[10px] text-zinc-300 font-mono">
                {chatMessages.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('people')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'people'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Watchers ({peers.length + 1})
          </button>
        </div>

        {/* Live Voice Chat Button */}
        <button
          onClick={onToggleMic}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
            isMicEnabled
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm shadow-emerald-500/20'
              : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
          }`}
          title="Toggle 2-Way Watch Party Voice Chat"
        >
          {isMicEnabled ? (
            <>
              <Mic className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>Voice Live</span>
            </>
          ) : (
            <>
              <MicOff className="w-3.5 h-3.5 text-zinc-400" />
              <span>Join Voice</span>
            </>
          )}
        </button>
      </div>

      {/* Tab 1: Chat Message List */}
      {activeTab === 'chat' && (
        <div className="flex-1 flex flex-col justify-between overflow-hidden">
          {/* Scrollable messages container */}
          <div ref={chatScrollRef} className="flex-1 p-3 space-y-2.5 overflow-y-auto">
            {chatMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 text-zinc-500">
                <Smile className="w-8 h-8 text-zinc-600 mb-2" />
                <p className="text-xs font-medium">No messages yet</p>
                <p className="text-[11px] text-zinc-600 mt-0.5">
                  Send a reaction or start talking with your watch party!
                </p>
              </div>
            ) : (
              chatMessages.map((msg) => {
                const isMe = msg.senderId === myPeerId;
                const isSystem = msg.type === 'system';

                if (isSystem) {
                  return (
                    <div key={msg.id} className="text-center my-1">
                      <span className="inline-block px-2.5 py-0.5 rounded-full bg-zinc-800/80 text-[10px] text-zinc-400 font-mono">
                        {msg.text}
                      </span>
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[11px] font-bold text-zinc-400">
                        {isMe ? 'You' : msg.senderName}
                      </span>
                      {msg.videoTimestamp !== undefined && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-500/10 border border-amber-500/20 text-[10px] font-mono text-amber-400 flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          {formatTime(msg.videoTimestamp)}
                        </span>
                      )}
                    </div>
                    <div
                      className={`max-w-[85%] px-3 py-1.5 rounded-2xl text-xs leading-relaxed ${
                        isMe
                          ? 'bg-amber-500 text-zinc-950 font-medium rounded-tr-xs'
                          : 'bg-zinc-800 text-zinc-100 rounded-tl-xs'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Quick Reaction Bar */}
          <div className="px-3 py-1.5 border-t border-zinc-800/80 bg-zinc-950/40 flex items-center justify-around">
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => onSendReaction(emoji)}
                className="text-lg hover:scale-130 active:scale-95 transition-transform duration-150 p-1"
                title={`Send ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Chat Input */}
          <form onSubmit={handleSend} className="p-2.5 border-t border-zinc-800 bg-zinc-950/90">
            <div className="flex items-center gap-2 mb-1.5 px-1">
              <button
                type="button"
                onClick={() => setIncludeTimestamp(!includeTimestamp)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                  includeTimestamp
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Clock className="w-3 h-3" />
                <span>Tag Scene @ {formatTime(currentVideoTime)}</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Type a message to your stream..."
                className="flex-1 bg-zinc-900 border border-zinc-700/80 rounded-xl px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim()}
                className="p-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:hover:bg-amber-500 text-zinc-950 font-bold transition-all shadow-md shadow-amber-500/10"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 2: Participants / Devices */}
      {activeTab === 'people' && (
        <div className="flex-1 p-3 overflow-y-auto space-y-2">
          {/* Self Card */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold text-xs">
                  {isHost ? <Crown className="w-4 h-4" /> : 'YOU'}
                </div>
                {isMicEnabled && (
                  <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-zinc-950 animate-ping"></span>
                )}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white">
                    You ({isHost ? 'Stream Host' : 'Viewer'})
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-mono mt-0.5">
                  <span>Ultra-Low Latency</span>
                  <span>•</span>
                  <span className="text-emerald-400">Connected</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isMicEnabled ? (
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-mono">
                  Mic Active
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 text-[10px] font-mono">
                  Muted
                </span>
              )}
            </div>
          </div>

          {/* Remote Peers List */}
          {peers.map((peer) => (
            <div
              key={peer.peerId}
              className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/50 border border-zinc-800/80"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                  {getDeviceIcon(peer.deviceType)}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-zinc-200">
                      {peer.displayName}
                    </span>
                    {peer.isHost && (
                      <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-mono mt-0.5">
                    <span className="capitalize">{peer.deviceType}</span>
                    <span>•</span>
                    <span className="text-emerald-400">
                      {peer.latencyMs ? `${peer.latencyMs}ms ping` : 'P2P Synced'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {peer.isSpeaking ? (
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[10px] font-mono animate-pulse">
                    Speaking
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded bg-zinc-800/60 text-zinc-500 text-[10px] font-mono">
                    Listening
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

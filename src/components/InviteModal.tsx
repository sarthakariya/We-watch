import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  QrCode,
  Copy,
  Check,
  Smartphone,
  Tablet,
  Laptop,
  Share2,
  X,
  Sparkles,
} from 'lucide-react';

interface InviteModalProps {
  roomId: string;
  onClose: () => void;
}

export function InviteModal({ roomId, onClose }: InviteModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const shareUrl = `${window.location.origin}/?room=${roomId}`;

  useEffect(() => {
    QRCode.toDataURL(shareUrl, {
      width: 260,
      margin: 2,
      color: {
        dark: '#09090b',
        light: '#f59e0b', // Amber theme QR
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Failed to generate QR code:', err));
  }, [shareUrl]);

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 max-w-md w-full shadow-2xl relative text-zinc-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Title */}
        <div className="text-center mb-5">
          <div className="inline-flex p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-2 shadow-inner">
            <QrCode className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white">
            Instant Stream Invite
          </h3>
          <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">
            Scan with iPhone, Android, iPad, or tablet camera to watch together with low latency.
          </p>
        </div>

        {/* QR Code Container */}
        <div className="flex flex-col items-center justify-center p-4 bg-zinc-950 rounded-2xl border border-zinc-800 mb-4 shadow-inner">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="Scan to join stream"
              className="w-48 h-48 rounded-xl shadow-md border-4 border-amber-500/30"
            />
          ) : (
            <div className="w-48 h-48 rounded-xl bg-zinc-900 animate-pulse flex items-center justify-center text-xs text-zinc-500 font-mono">
              Generating QR...
            </div>
          )}
          <span className="text-[11px] font-mono text-amber-400 mt-2 font-bold tracking-wider">
            ROOM CODE: {roomId}
          </span>
        </div>

        {/* Share Link & Copy */}
        <div className="space-y-2 mb-4">
          <label className="text-xs font-semibold text-zinc-300 block">
            Direct Shareable URL
          </label>
          <div className="flex items-center gap-2 bg-zinc-950 p-2 rounded-xl border border-zinc-800">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="flex-1 bg-transparent text-xs text-zinc-300 font-mono px-2 outline-none truncate"
            />
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs flex items-center gap-1 transition-colors shadow"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Device Compatibility Guide */}
        <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800/80 text-xs">
          <div className="flex items-center justify-between text-zinc-400 text-[11px] font-medium mb-2">
            <span className="flex items-center gap-1 text-zinc-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Works on all devices:
            </span>
            <span className="text-emerald-400 font-mono">No Install Needed</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-[10px] text-zinc-300">
            <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800/60 flex flex-col items-center gap-1">
              <Smartphone className="w-4 h-4 text-sky-400" />
              <span>Phones</span>
            </div>
            <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800/60 flex flex-col items-center gap-1">
              <Tablet className="w-4 h-4 text-purple-400" />
              <span>iPads / Tabs</span>
            </div>
            <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800/60 flex flex-col items-center gap-1">
              <Laptop className="w-4 h-4 text-amber-400" />
              <span>Laptops / PCs</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

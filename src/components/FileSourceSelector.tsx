import React, { useRef, useState } from 'react';
import {
  Upload,
  Film,
  Sparkles,
  Play,
  FileVideo,
  CheckCircle2,
  HelpCircle,
  FileText,
} from 'lucide-react';
import { SAMPLE_VIDEOS } from '../utils/sampleVideos';
import { SampleVideo } from '../types';

interface FileSourceSelectorProps {
  onSelectFile: (file: File) => void;
  onSelectSample: (sample: SampleVideo) => void;
  onSelectSubtitle?: (file: File) => void;
  currentTitle: string;
  hasLoadedMedia: boolean;
}

export function FileSourceSelector({
  onSelectFile,
  onSelectSample,
  onSelectSubtitle,
  currentTitle,
  hasLoadedMedia,
}: FileSourceSelectorProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const subtitleInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [selectedSubName, setSelectedSubName] = useState<string | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('video/') || /\.(mp4|mkv|webm|mov|avi|m4v|ts)$/i.test(file.name)) {
        setSelectedFileName(file.name);
        onSelectFile(file);
      } else if (/\.(srt|vtt)$/i.test(file.name) && onSelectSubtitle) {
        setSelectedSubName(file.name);
        onSelectSubtitle(file);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setSelectedFileName(file.name);
      onSelectFile(file);
    }
  };

  const handleSubChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && onSelectSubtitle) {
      const file = e.target.files[0];
      setSelectedSubName(file.name);
      onSelectSubtitle(file);
    }
  };

  return (
    <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-4 sm:p-6 shadow-xl backdrop-blur-md">
      {/* Title & Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
            <Film className="w-4 h-4 text-amber-400" />
            Host Video File Selection
          </h3>
          <p className="text-xs text-zinc-400">
            Select any local video file on your laptop. Streamed directly in 4K/Full HD with voice clarity enhancement.
          </p>
        </div>

        {hasLoadedMedia && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
            <span className="truncate max-w-[200px]">{currentTitle}</span>
          </div>
        )}
      </div>

      {/* Drag & Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-6 sm:p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
          isDragging
            ? 'border-amber-500 bg-amber-500/10 scale-[1.01]'
            : 'border-zinc-700/80 hover:border-amber-500/50 bg-zinc-950/60 hover:bg-zinc-950/90'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*,.mkv,.mp4,.webm,.mov,.avi,.m4v,.ts"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-amber-600/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
          <Upload className="w-7 h-7" />
        </div>

        <div>
          <p className="text-sm font-semibold text-white">
            {selectedFileName ? (
              <span className="text-amber-400 font-mono">{selectedFileName}</span>
            ) : (
              'Click to browse or drop your local video file here'
            )}
          </p>
          <p className="text-xs text-zinc-400 mt-1">
            Supports MP4, MKV, WebM, MOV, AVI, M4V — 4K UHD, 1080p 60fps & multi-channel 5.1 audio
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
          <span className="px-2 py-0.5 rounded bg-zinc-800 text-[10px] font-mono text-zinc-300">
            4K 60FPS Supported
          </span>
          <span className="px-2 py-0.5 rounded bg-zinc-800 text-[10px] font-mono text-zinc-300">
            5.1 Surround Speech Matrix
          </span>
          <span className="px-2 py-0.5 rounded bg-zinc-800 text-[10px] font-mono text-zinc-300">
            Zero File Size Limit
          </span>
        </div>
      </div>

      {/* Subtitles Upload Optional Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 mt-3 p-2.5 rounded-xl bg-zinc-950/40 border border-zinc-800/60 text-xs">
        <div className="flex items-center gap-2 text-zinc-300">
          <FileText className="w-4 h-4 text-zinc-400" />
          <span>Subtitles (.srt / .vtt file):</span>
          <span className="text-zinc-400 italic">
            {selectedSubName || 'None loaded (optional)'}
          </span>
        </div>
        <button
          onClick={() => subtitleInputRef.current?.click()}
          className="px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors"
        >
          {selectedSubName ? 'Change Subtitles' : 'Add Subtitles (.srt)'}
        </button>
        <input
          ref={subtitleInputRef}
          type="file"
          accept=".srt,.vtt"
          onChange={handleSubChange}
          className="hidden"
        />
      </div>

      {/* Quick Test Samples */}
      <div className="mt-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Or try instant 4K / HD sample streams:
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {SAMPLE_VIDEOS.map((sample) => (
            <button
              key={sample.id}
              onClick={() => {
                setSelectedFileName(null);
                onSelectSample(sample);
              }}
              className="group flex items-start gap-2.5 p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800 hover:border-amber-500/50 text-left transition-all hover:bg-zinc-950"
            >
              <div className="relative w-16 h-12 rounded-lg overflow-hidden shrink-0 bg-zinc-900 border border-zinc-800">
                <img
                  src={sample.thumbnail}
                  alt={sample.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <Play className="w-4 h-4 text-white drop-shadow" />
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-zinc-200 truncate group-hover:text-amber-400 transition-colors">
                  {sample.title}
                </p>
                <div className="flex items-center gap-2 mt-1 text-[10px] text-zinc-400 font-mono">
                  <span>{sample.duration}</span>
                  <span>•</span>
                  <span className="text-amber-400/90">{sample.resolution}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

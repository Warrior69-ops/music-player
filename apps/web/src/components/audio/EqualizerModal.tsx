'use client';

import React from 'react';
import {
  X,
  Sliders,
  RotateCcw,
  Power,
  Volume2,
  Zap,
  Sparkles,
} from 'lucide-react';
import {
  useEqualizerStore,
  EQ_FREQUENCIES,
  EQ_PRESETS,
} from '@/store/useEqualizerStore';
import { motion, AnimatePresence } from 'framer-motion';

export function EqualizerModal() {
  const {
    isEnabled,
    activePresetId,
    bands,
    bassBoost,
    preamp,
    isModalOpen,
    toggleEnabled,
    setBandGain,
    setBassBoost,
    setPreamp,
    applyPreset,
    resetToFlat,
    setIsModalOpen,
  } = useEqualizerStore();

  if (!isModalOpen) return null;

  function formatFreqLabel(freq: number): string {
    if (freq >= 1000) {
      return `${freq / 1000}k`;
    }
    return `${freq}`;
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
        {/* Backdrop blur overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsModalOpen(false)}
          className="absolute inset-0 bg-black/60 backdrop-blur-md"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
          className="relative w-full max-w-2xl liquid-glass-card rounded-3xl border border-white/15 overflow-hidden shadow-[0_25px_70px_rgba(0,0,0,0.8)] z-10"
          style={{
            WebkitBackdropFilter: 'blur(30px) saturate(135%)',
            backdropFilter: 'blur(30px) saturate(135%)',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  10-Band Graphic Equalizer
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/20 text-purple-200 border border-primary/30">
                    DSP Engine
                  </span>
                </h3>
                <p className="text-xs text-zinc-400">
                  Precision hardware frequency tuning & audio enhancer
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Power / Bypass Button */}
              <button
                onClick={toggleEnabled}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  isEnabled
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                    : 'bg-white/5 text-zinc-500 border-white/10'
                }`}
                title={isEnabled ? 'EQ is Active' : 'EQ is Bypassed'}
              >
                <Power className="w-3.5 h-3.5" />
                <span>{isEnabled ? 'Active' : 'Bypass'}</span>
              </button>

              {/* Close Button */}
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className={`p-6 space-y-6 transition-opacity ${isEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
            {/* Presets Carousel */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  Genre Presets
                </span>
                {activePresetId === 'custom' && (
                  <span className="text-[10px] font-semibold text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                    Custom Tuning
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none">
                {EQ_PRESETS.map((preset) => {
                  const isActive = activePresetId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => applyPreset(preset.id)}
                      className={`relative px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                        isActive
                          ? 'text-white border border-primary/40 shadow-[0_0_14px_rgba(168,85,247,0.3)]'
                          : 'text-zinc-400 hover:text-white bg-white/[0.04] border border-white/5 hover:border-white/10'
                      }`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="eqPresetPill"
                          className="absolute inset-0 rounded-xl bg-primary/25 -z-10"
                          transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                        />
                      )}
                      {preset.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 10 Vertical Equalizer Sliders */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/8 shadow-inner">
              <div className="grid grid-cols-10 gap-1.5 sm:gap-3 items-end h-48 sm:h-52">
                {EQ_FREQUENCIES.map((freq, idx) => {
                  const gain = bands[idx] ?? 0;
                  // Slider percentage from -12dB (0%) to +12dB (100%), 0dB = 50%
                  const percent = Math.round(((gain + 12) / 24) * 100);

                  return (
                    <div key={freq} className="flex flex-col items-center justify-between h-full group">
                      {/* Gain dB Readout */}
                      <span
                        className={`text-[10px] font-mono font-bold transition-colors ${
                          gain > 0
                            ? 'text-purple-300'
                            : gain < 0
                            ? 'text-rose-300'
                            : 'text-zinc-500'
                        }`}
                      >
                        {gain > 0 ? `+${gain}` : gain}
                      </span>

                      {/* Vertical Slider Track Container */}
                      <div className="relative w-7 sm:w-8 h-32 sm:h-36 flex items-center justify-center">
                        {/* Center Zero Detent Line */}
                        <div className="absolute w-full h-[1px] bg-white/20 top-1/2 -translate-y-1/2 pointer-events-none z-0" />

                        {/* Slider Track background */}
                        <div className="w-1.5 h-full rounded-full bg-white/10 overflow-hidden relative">
                          <div
                            className="absolute bottom-0 w-full rounded-full transition-all duration-75"
                            style={{
                              height: `${percent}%`,
                              background:
                                gain > 0
                                  ? 'linear-gradient(to top, rgba(168,85,247,0.5), #c084fc)'
                                  : gain < 0
                                  ? 'linear-gradient(to top, #f43f5e, rgba(244,63,94,0.4))'
                                  : 'rgba(255,255,255,0.3)',
                            }}
                          />
                        </div>

                        {/* Native Vertical Range Input */}
                        <input
                          type="range"
                          min="-12"
                          max="12"
                          step="1"
                          value={gain}
                          onChange={(e) => setBandGain(idx, Number(e.target.value))}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          style={{
                            writingMode: 'vertical-lr',
                            direction: 'rtl',
                          }}
                        />

                        {/* Visual Slider Thumb */}
                        <div
                          className="absolute w-4 h-4 rounded-full bg-white border border-purple-400 shadow-md pointer-events-none transform transition-transform group-hover:scale-125"
                          style={{
                            bottom: `calc(${percent}% - 8px)`,
                          }}
                        />
                      </div>

                      {/* Frequency Label */}
                      <span className="text-[10px] font-semibold text-zinc-400 group-hover:text-white transition-colors">
                        {formatFreqLabel(freq)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Controls: Bass Booster & Preamp Gain */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Bass Boost */}
              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/8 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                    <Zap className="w-4 h-4 text-purple-400" />
                    <span>Punchy Bass Boost</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-purple-300">
                    {bassBoost}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={bassBoost}
                  onChange={(e) => setBassBoost(Number(e.target.value))}
                  className="w-full accent-primary h-1.5 bg-white/10 rounded-full cursor-pointer"
                />
              </div>

              {/* Preamp Gain */}
              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/8 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                    <Volume2 className="w-4 h-4 text-purple-400" />
                    <span>Preamp Headroom</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-purple-300">
                    {preamp > 0 ? `+${preamp}` : preamp} dB
                  </span>
                </div>
                <input
                  type="range"
                  min="-12"
                  max="12"
                  step="1"
                  value={preamp}
                  onChange={(e) => setPreamp(Number(e.target.value))}
                  className="w-full accent-primary h-1.5 bg-white/10 rounded-full cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-3.5 border-t border-white/10 bg-black/20">
            <button
              onClick={resetToFlat}
              className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition-colors px-3 py-1.5 rounded-xl hover:bg-white/5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to Flat (0 dB)</span>
            </button>

            <button
              onClick={() => setIsModalOpen(false)}
              className="px-5 py-2 rounded-xl bg-white text-black font-bold text-xs hover:bg-zinc-200 transition-all hover:scale-105 active:scale-95 shadow-md"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

'use client';

import React, { useEffect, useRef } from 'react';
import { getAudioAnalyser } from '@/hooks/useAudioPlayer';

interface AudioVisualizerCanvasProps {
  mode: 'waves' | 'bars' | 'radial';
  isPlaying?: boolean;
  className?: string;
}

export function AudioVisualizerCanvas({
  mode,
  isPlaying = true,
  className = '',
}: AudioVisualizerCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameId = useRef<number | null>(null);
  const phaseRef = useRef<number>(0);
  const peaksRef = useRef<number[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.offsetWidth * window.devicePixelRatio || 800);
    let height = (canvas.height = canvas.offsetHeight * window.devicePixelRatio || 400);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth * window.devicePixelRatio || 800;
      height = canvas.height = canvas.offsetHeight * window.devicePixelRatio || 400;
    };
    window.addEventListener('resize', handleResize);

    const bufferLength = 128;
    const freqData = new Uint8Array(bufferLength);
    const timeData = new Uint8Array(bufferLength);

    const render = () => {
      animFrameId.current = requestAnimationFrame(render);
      const analyser = getAudioAnalyser();

      if (analyser && isPlaying) {
        analyser.getByteFrequencyData(freqData);
        analyser.getByteTimeDomainData(timeData);
      } else {
        // Subtle ambient idle breathing when paused or waiting for audio
        for (let i = 0; i < bufferLength; i++) {
          freqData[i] = Math.max(0, freqData[i] * 0.95);
          timeData[i] = 128;
        }
      }

      ctx.clearRect(0, 0, width, height);
      phaseRef.current += 0.02;

      // Calculate bass power for reactive glow
      let bassSum = 0;
      for (let i = 0; i < 12; i++) {
        bassSum += freqData[i];
      }
      const bassAvg = bassSum / 12 / 255; // 0 to 1

      if (mode === 'waves') {
        renderAuroraWaves(ctx, width, height, timeData, freqData, phaseRef.current, bassAvg);
      } else if (mode === 'bars') {
        renderGlassBars(ctx, width, height, freqData, peaksRef, bassAvg);
      } else if (mode === 'radial') {
        renderRadialPulse(ctx, width, height, freqData, bassAvg, phaseRef.current);
      }
    };

    render();

    return () => {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [mode, isPlaying]);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full block ${className}`}
      style={{ display: 'block' }}
    />
  );
}

/** 1. Aurora Sine Waves */
function renderAuroraWaves(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  timeData: Uint8Array,
  freqData: Uint8Array,
  phase: number,
  bass: number
) {
  const midY = height * 0.55;
  const layers = [
    {
      color1: 'rgba(168, 85, 247, 0.45)', // purple
      color2: 'rgba(126, 34, 206, 0.02)',
      speed: 1.0,
      amp: (height * 0.22) * (0.5 + bass * 0.8),
      freqMult: 1.0,
    },
    {
      color1: 'rgba(6, 182, 212, 0.4)', // cyan
      color2: 'rgba(8, 145, 178, 0.02)',
      speed: 1.3,
      amp: (height * 0.18) * (0.4 + bass * 0.7),
      freqMult: 1.4,
    },
    {
      color1: 'rgba(236, 72, 153, 0.4)', // fuchsia
      color2: 'rgba(190, 24, 93, 0.02)',
      speed: 0.8,
      amp: (height * 0.15) * (0.3 + bass * 0.6),
      freqMult: 0.8,
    },
  ];

  ctx.globalCompositeOperation = 'screen';

  layers.forEach((layer) => {
    ctx.beginPath();
    ctx.moveTo(0, height);

    const step = width / (timeData.length - 1);

    for (let i = 0; i < timeData.length; i++) {
      const x = i * step;
      const normalizedTime = (timeData[i] - 128) / 128; // -1 to 1
      const normalizedFreq = (freqData[i] || 0) / 255;

      const sine = Math.sin(phase * layer.speed + (i / timeData.length) * Math.PI * 3 * layer.freqMult);
      const displacement = (normalizedTime * 0.6 + sine * 0.4) * layer.amp * (0.5 + normalizedFreq * 0.5);
      const y = midY + displacement;

      if (i === 0) {
        ctx.lineTo(x, y);
      } else {
        const prevX = (i - 1) * step;
        const prevTime = (timeData[i - 1] - 128) / 128;
        const prevFreq = (freqData[i - 1] || 0) / 255;
        const prevSine = Math.sin(phase * layer.speed + ((i - 1) / timeData.length) * Math.PI * 3 * layer.freqMult);
        const prevY = midY + (prevTime * 0.6 + prevSine * 0.4) * layer.amp * (0.5 + prevFreq * 0.5);

        const cx = (prevX + x) / 2;
        const cy = (prevY + y) / 2;
        ctx.quadraticCurveTo(prevX, prevY, cx, cy);
      }
    }

    ctx.lineTo(width, height);
    ctx.closePath();

    const grad = ctx.createLinearGradient(0, midY - layer.amp, 0, height);
    grad.addColorStop(0, layer.color1);
    grad.addColorStop(1, layer.color2);

    ctx.fillStyle = grad;
    ctx.fill();

    // Luminous top stroke
    ctx.lineWidth = 2.5 * window.devicePixelRatio;
    ctx.strokeStyle = layer.color1.replace(/0\.\d+\)/, '0.85)');
    ctx.stroke();
  });

  ctx.globalCompositeOperation = 'source-over';
}

/** 2. Glass Spectrum Bars */
function renderGlassBars(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  freqData: Uint8Array,
  peaksRef: React.MutableRefObject<number[]>,
  bass: number
) {
  const barCount = 48;
  const spacing = 4 * window.devicePixelRatio;
  const totalSpacing = spacing * (barCount - 1);
  const barWidth = Math.max(3, (width - totalSpacing - 40 * window.devicePixelRatio) / barCount);
  const startX = (width - (barCount * barWidth + totalSpacing)) / 2;
  const baseY = height * 0.68;
  const maxHeight = height * 0.45;

  if (peaksRef.current.length !== barCount) {
    peaksRef.current = new Array(barCount).fill(0);
  }

  for (let i = 0; i < barCount; i++) {
    // Distribute logarithmic-like indices
    const dataIdx = Math.floor(Math.pow(i / barCount, 1.4) * (freqData.length - 1));
    const val = freqData[dataIdx] || 0;
    const barHeight = Math.max(4 * window.devicePixelRatio, (val / 255) * maxHeight);

    const x = startX + i * (barWidth + spacing);
    const y = baseY - barHeight;

    // Peak decay
    if (barHeight > peaksRef.current[i]) {
      peaksRef.current[i] = barHeight;
    } else {
      peaksRef.current[i] = Math.max(0, peaksRef.current[i] - 1.2 * window.devicePixelRatio);
    }
    const peakY = baseY - peaksRef.current[i];

    // Pillar gradient
    const grad = ctx.createLinearGradient(x, y, x, baseY);
    grad.addColorStop(0, '#c084fc'); // purple-400
    grad.addColorStop(0.5, '#a855f7'); // primary
    grad.addColorStop(1, 'rgba(168, 85, 247, 0.15)');

    ctx.fillStyle = grad;
    roundRect(ctx, x, y, barWidth, barHeight, barWidth / 2);
    ctx.fill();

    // Floating peak cap
    ctx.fillStyle = '#ffffff';
    roundRect(ctx, x, peakY - 3 * window.devicePixelRatio, barWidth, 2.5 * window.devicePixelRatio, 1);
    ctx.fill();

    // Mirrored glassy reflection beneath
    const reflHeight = barHeight * 0.35;
    const reflGrad = ctx.createLinearGradient(x, baseY, x, baseY + reflHeight);
    reflGrad.addColorStop(0, 'rgba(168, 85, 247, 0.25)');
    reflGrad.addColorStop(1, 'rgba(168, 85, 247, 0.0)');

    ctx.fillStyle = reflGrad;
    roundRect(ctx, x, baseY + 2 * window.devicePixelRatio, barWidth, reflHeight, barWidth / 2);
    ctx.fill();
  }
}

/** 3. Cosmic Vinyl Pulse */
function renderRadialPulse(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  freqData: Uint8Array,
  bass: number,
  phase: number
) {
  const centerX = width / 2;
  const centerY = height / 2;
  const minDim = Math.min(width, height);
  const baseRadius = minDim * 0.22 * (1 + bass * 0.2);
  const spokeCount = 64;

  // Expanding shockwave ripples on heavy bass
  if (bass > 0.45) {
    const shockRadius = baseRadius * (1.2 + Math.sin(phase * 4) * 0.2);
    ctx.beginPath();
    ctx.arc(centerX, centerY, shockRadius, 0, Math.PI * 2);
    ctx.lineWidth = 2 * window.devicePixelRatio;
    ctx.strokeStyle = `rgba(168, 85, 247, ${Math.max(0, 0.4 - (shockRadius / minDim))})`;
    ctx.stroke();
  }

  // Inner glowing orb
  const innerGrad = ctx.createRadialGradient(
    centerX,
    centerY,
    baseRadius * 0.1,
    centerX,
    centerY,
    baseRadius
  );
  innerGrad.addColorStop(0, 'rgba(168, 85, 247, 0.35)');
  innerGrad.addColorStop(0.7, 'rgba(6, 182, 212, 0.15)');
  innerGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = innerGrad;
  ctx.beginPath();
  ctx.arc(centerX, centerY, baseRadius, 0, Math.PI * 2);
  ctx.fill();

  // Radial frequency spikes
  for (let i = 0; i < spokeCount; i++) {
    const angle = (i / spokeCount) * Math.PI * 2 + phase * 0.2;
    const dataIdx = Math.floor((i / spokeCount) * (freqData.length / 2));
    const val = (freqData[dataIdx] || 0) / 255;
    const spokeLen = minDim * 0.16 * val;

    const x1 = centerX + Math.cos(angle) * baseRadius;
    const y1 = centerY + Math.sin(angle) * baseRadius;
    const x2 = centerX + Math.cos(angle) * (baseRadius + spokeLen);
    const y2 = centerY + Math.sin(angle) * (baseRadius + spokeLen);

    const spikeGrad = ctx.createLinearGradient(x1, y1, x2, y2);
    spikeGrad.addColorStop(0, 'rgba(168, 85, 247, 0.8)');
    spikeGrad.addColorStop(1, 'rgba(6, 182, 212, 0.9)');

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = spikeGrad;
    ctx.lineWidth = 3 * window.devicePixelRatio;
    ctx.lineCap = 'round';
    ctx.stroke();
  }
}

/** Helper to draw rounded rectangle on canvas */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

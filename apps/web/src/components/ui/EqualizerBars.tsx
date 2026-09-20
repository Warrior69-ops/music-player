'use client';

import React from 'react';

interface EqualizerBarsProps {
  isPlaying?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  barColor?: string;
}

export const EqualizerBars: React.FC<EqualizerBarsProps> = ({
  isPlaying = true,
  size = 'md',
  className = '',
  barColor,
}) => {
  // Dimensions based on size variant - 3 rounded bars matching reference
  const sizeMap = {
    xs: { container: 'h-3 w-2.5 gap-[1px]', barWidth: 'w-[1.5px]' },
    sm: { container: 'h-4 w-3.5 gap-[1.5px]', barWidth: 'w-[2px]' },
    md: { container: 'h-5 w-4.5 gap-[2px]', barWidth: 'w-[2.5px]' },
    lg: { container: 'h-7 w-6 gap-[3px]', barWidth: 'w-[3.5px]' },
  };

  const { container, barWidth } = sizeMap[size] || sizeMap.md;

  // Ultra-vibrant purple gradient from obsidian violet up to radiant electric purple
  const defaultGradient =
    'bg-gradient-to-t from-violet-600 via-primary to-purple-300 shadow-[0_0_8px_rgba(139,92,246,0.7)]';
  const colorClass = barColor || defaultGradient;

  return (
    <div
      aria-label={isPlaying ? 'Audio playing' : 'Audio paused'}
      className={`inline-flex items-end justify-center ${container} ${className}`}
    >
      {/* Bar 1 (left) */}
      <span
        className={`${barWidth} rounded-full ${colorClass} transition-all duration-300 ${
          isPlaying ? 'animate-eq-1' : 'h-[30%]'
        }`}
      />
      {/* Bar 2 (center) */}
      <span
        className={`${barWidth} rounded-full ${colorClass} transition-all duration-300 ${
          isPlaying ? 'animate-eq-2' : 'h-[75%]'
        }`}
      />
      {/* Bar 3 (right) */}
      <span
        className={`${barWidth} rounded-full ${colorClass} transition-all duration-300 ${
          isPlaying ? 'animate-eq-3' : 'h-[45%]'
        }`}
      />
    </div>
  );
};


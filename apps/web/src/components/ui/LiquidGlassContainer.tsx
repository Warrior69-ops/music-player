'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LiquidGlassProps {
  children: React.ReactNode;
  expandedContent?: React.ReactNode;
  isExpanded?: boolean;
  className?: string;
}

export const LiquidGlassContainer: React.FC<LiquidGlassProps> = ({
  children,
  expandedContent,
  isExpanded = false,
  className = '',
}) => {
  return (
    <motion.div
      layout
      transition={{
        type: 'spring',
        stiffness: 420,
        damping: 34,
        mass: 0.5,
      }}
      className={`overflow-hidden transform-gpu will-change-transform border border-white/10 transition-colors ${
        isExpanded
          ? 'w-full max-w-2xl rounded-3xl p-6 bg-zinc-950/90 shadow-2xl'
          : 'w-fit rounded-full px-6 py-2.5 bg-zinc-950/65 shadow-md'
      } ${className}`}
      style={{
        WebkitBackdropFilter: 'blur(28px) saturate(135%)',
        backdropFilter: 'blur(28px) saturate(135%)',
      }}
    >
      {/* Primary compact content */}
      <div className="flex items-center gap-4">
        {children}
      </div>

      {/* Fluidly revealed content when expanded */}
      <AnimatePresence>
        {isExpanded && expandedContent && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="pt-4 mt-3 border-t border-white/[0.08]"
          >
            {expandedContent}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

interface LiquidPillProps {
  layoutId?: string;
  className?: string;
}

/** Reusable fluid spring pill indicator for active tabs, navigation, and hover highlights */
export const LiquidActivePill: React.FC<LiquidPillProps> = ({
  layoutId = 'liquidActiveHoverPill',
  className = '',
}) => {
  return (
    <motion.div
      layoutId={layoutId}
      className={`absolute inset-0 rounded-full bg-white/[0.10] border border-white/10 shadow-[0_0_12px_rgba(168,85,247,0.25)] ${className}`}
      transition={{ type: 'spring', stiffness: 420, damping: 34, mass: 0.5 }}
    />
  );
};

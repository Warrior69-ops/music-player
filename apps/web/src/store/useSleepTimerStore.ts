import { create } from 'zustand';
import { usePlayerStore } from './usePlayerStore';
import { toast } from 'sonner';

interface SleepTimerState {
  isActive: boolean;
  mode: 'duration' | 'end-of-song' | null;
  totalSeconds: number;
  remainingSeconds: number;
  originalVolume: number;
  isFadingOut: boolean;
  isModalOpen: boolean;

  startTimer: (minutes: number) => void;
  startEndOfSongTimer: (remainingSec: number) => void;
  addTime: (minutes: number) => void;
  cancelTimer: () => void;
  setIsModalOpen: (open: boolean) => void;
  toggleModal: () => void;
}

let timerInterval: NodeJS.Timeout | null = null;

export const useSleepTimerStore = create<SleepTimerState>((set, get) => ({
  isActive: false,
  mode: null,
  totalSeconds: 0,
  remainingSeconds: 0,
  originalVolume: 1,
  isFadingOut: false,
  isModalOpen: false,

  startTimer: (minutes: number) => {
    if (timerInterval) clearInterval(timerInterval);

    const totalSeconds = Math.max(1, Math.round(minutes * 60));
    const currentVol = usePlayerStore.getState().volume;

    set({
      isActive: true,
      mode: 'duration',
      totalSeconds,
      remainingSeconds: totalSeconds,
      originalVolume: currentVol > 0 ? currentVol : 1,
      isFadingOut: false,
      isModalOpen: false,
    });

    toast.success(`Sleep timer set for ${minutes} minute${minutes > 1 ? 's' : ''} 🌙`);

    timerInterval = setInterval(() => {
      const state = get();
      if (!state.isActive) {
        if (timerInterval) clearInterval(timerInterval);
        return;
      }

      const nextRemaining = state.remainingSeconds - 1;

      if (nextRemaining <= 0) {
        if (timerInterval) clearInterval(timerInterval);

        // Pause playback
        const { setIsPlaying, setVolume } = usePlayerStore.getState();
        setIsPlaying(false);
        // Restore volume for the next morning
        setVolume(state.originalVolume);

        set({
          isActive: false,
          mode: null,
          remainingSeconds: 0,
          totalSeconds: 0,
          isFadingOut: false,
        });

        toast.info('Sleep timer finished. Sleep well! 🌙');
      } else {
        // Smooth 15-second Web Audio volume fade-out
        if (nextRemaining <= 15) {
          set({ remainingSeconds: nextRemaining, isFadingOut: true });
        } else {
          set({ remainingSeconds: nextRemaining, isFadingOut: false });
        }
      }
    }, 1000);
  },

  startEndOfSongTimer: (remainingSec: number) => {
    if (timerInterval) clearInterval(timerInterval);

    const safeSec = Math.max(1, Math.round(remainingSec));
    const currentVol = usePlayerStore.getState().volume;

    set({
      isActive: true,
      mode: 'end-of-song',
      totalSeconds: safeSec,
      remainingSeconds: safeSec,
      originalVolume: currentVol > 0 ? currentVol : 1,
      isFadingOut: false,
      isModalOpen: false,
    });

    toast.success('Sleep timer will stop playback when current song ends 🌙');

    // Lightweight UI-only ticker: updates the countdown badge display.
    // Actual playback stopping is handled by the onEnded handler in useAudioPlayer.ts
    timerInterval = setInterval(() => {
      const state = get();
      if (!state.isActive || state.mode !== 'end-of-song') {
        if (timerInterval) clearInterval(timerInterval);
        return;
      }

      const nextRemaining = state.remainingSeconds - 1;

      if (nextRemaining <= 0) {
        // Song hasn't ended yet via onEnded (user might have paused).
        // Keep the timer alive but clamp at 0 so the badge shows 0:00.
        set({ remainingSeconds: 0 });
        if (timerInterval) clearInterval(timerInterval);
      } else {
        set({ remainingSeconds: nextRemaining });
      }
    }, 1000);
  },

  addTime: (minutes: number) => {
    const extraSec = Math.round(minutes * 60);
    set((state) => ({
      remainingSeconds: state.remainingSeconds + extraSec,
      totalSeconds: state.totalSeconds + extraSec,
      isFadingOut: false,
    }));
    // If was in fadeout, restore volume
    const orig = get().originalVolume;
    usePlayerStore.getState().setVolume(orig);
    toast.success(`Added ${minutes}m to sleep timer 🌙`);
  },

  cancelTimer: () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    const orig = get().originalVolume;
    usePlayerStore.getState().setVolume(orig);

    set({
      isActive: false,
      mode: null,
      remainingSeconds: 0,
      totalSeconds: 0,
      isFadingOut: false,
    });

    toast.info('Sleep timer cancelled');
  },

  setIsModalOpen: (open) => set({ isModalOpen: open }),
  toggleModal: () => set((state) => ({ isModalOpen: !state.isModalOpen })),
}));

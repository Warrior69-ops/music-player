import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const EQ_FREQUENCIES = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000] as const;
export type EqFrequency = typeof EQ_FREQUENCIES[number];

export interface EqPreset {
  id: string;
  name: string;
  bands: number[]; // 10 values in dB (-12 to +12)
  bassBoost?: number; // 0 to 100%
  preamp?: number; // -12 to +12 dB
}

export const EQ_PRESETS: EqPreset[] = [
  {
    id: 'flat',
    name: 'Flat',
    bands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    bassBoost: 0,
    preamp: 0,
  },
  {
    id: 'bass-boost',
    name: 'Bass Boost',
    bands: [7, 6, 4, 2, 0, 0, 0, 0, 1, 2],
    bassBoost: 75,
    preamp: -1,
  },
  {
    id: 'electronic',
    name: 'Electronic / EDM',
    bands: [5, 4, 2, 0, -2, 2, 1, 3, 5, 4],
    bassBoost: 50,
    preamp: 0,
  },
  {
    id: 'rock',
    name: 'Rock',
    bands: [4, 3, 1, -1, -2, 1, 2, 3, 4, 4],
    bassBoost: 30,
    preamp: 0,
  },
  {
    id: 'pop',
    name: 'Pop',
    bands: [1, 2, 3, 4, 3, 0, -1, 1, 2, 3],
    bassBoost: 20,
    preamp: 0,
  },
  {
    id: 'vocal',
    name: 'Vocal Booster',
    bands: [-2, -2, -1, 2, 4, 4, 3, 2, 0, -1],
    bassBoost: 0,
    preamp: 0,
  },
  {
    id: 'acoustic',
    name: 'Acoustic',
    bands: [3, 2, 1, 1, 2, 2, 3, 3, 2, 2],
    bassBoost: 15,
    preamp: 0,
  },
  {
    id: 'hiphop',
    name: 'Hip-Hop',
    bands: [6, 5, 3, 1, -1, 0, 1, 2, 3, 3],
    bassBoost: 60,
    preamp: -1,
  },
];

interface EqualizerState {
  isEnabled: boolean;
  activePresetId: string;
  bands: number[]; // 10 values
  bassBoost: number; // 0 - 100
  preamp: number; // -12 to +12 dB
  isModalOpen: boolean;

  setIsEnabled: (enabled: boolean) => void;
  toggleEnabled: () => void;
  setBandGain: (index: number, gainDb: number) => void;
  setBassBoost: (val: number) => void;
  setPreamp: (val: number) => void;
  applyPreset: (presetId: string) => void;
  resetToFlat: () => void;
  setIsModalOpen: (open: boolean) => void;
  toggleModal: () => void;
}

export const useEqualizerStore = create<EqualizerState>()(
  persist(
    (set, get) => ({
      isEnabled: true,
      activePresetId: 'flat',
      bands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      bassBoost: 0,
      preamp: 0,
      isModalOpen: false,

      setIsEnabled: (enabled) => set({ isEnabled: enabled }),
      toggleEnabled: () => set((state) => ({ isEnabled: !state.isEnabled })),

      setBandGain: (index, gainDb) => {
        const clamped = Math.max(-12, Math.min(12, gainDb));
        const newBands = [...get().bands];
        newBands[index] = clamped;
        set({
          bands: newBands,
          activePresetId: 'custom',
        });
      },

      setBassBoost: (val) => {
        const clamped = Math.max(0, Math.min(100, val));
        set({ bassBoost: clamped, activePresetId: 'custom' });
      },

      setPreamp: (val) => {
        const clamped = Math.max(-12, Math.min(12, val));
        set({ preamp: clamped, activePresetId: 'custom' });
      },

      applyPreset: (presetId) => {
        const preset = EQ_PRESETS.find((p) => p.id === presetId);
        if (preset) {
          set({
            activePresetId: preset.id,
            bands: [...preset.bands],
            bassBoost: preset.bassBoost ?? 0,
            preamp: preset.preamp ?? 0,
          });
        }
      },

      resetToFlat: () => {
        set({
          activePresetId: 'flat',
          bands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          bassBoost: 0,
          preamp: 0,
        });
      },

      setIsModalOpen: (open) => set({ isModalOpen: open }),
      toggleModal: () => set((state) => ({ isModalOpen: !state.isModalOpen })),
    }),
    {
      name: 'melø-equalizer-settings',
      partialize: (state) => ({
        isEnabled: state.isEnabled,
        activePresetId: state.activePresetId,
        bands: state.bands,
        bassBoost: state.bassBoost,
        preamp: state.preamp,
      }),
    }
  )
);

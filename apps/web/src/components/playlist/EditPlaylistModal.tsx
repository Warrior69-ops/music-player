'use client';

import React, { useState, useEffect } from 'react';
import { X, GripVertical, ChevronUp, ChevronDown, Trash2, Loader2, Save } from 'lucide-react';
import { PlaylistCover } from '../ui/PlaylistCover';
import { Track } from '@/store/usePlayerStore';
import api from '@/lib/api';
import { toast } from 'sonner';

interface EditPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlist: {
    _id: string;
    name: string;
    description?: string;
    tracks?: Track[];
  };
  onSuccess: () => void;
}

export function EditPlaylistModal({
  isOpen,
  onClose,
  playlist,
  onSuccess,
}: EditPlaylistModalProps) {
  const [name, setName] = useState(playlist.name || '');
  const [description, setDescription] = useState(playlist.description || '');
  const [tracks, setTracks] = useState<Track[]>(playlist.tracks || []);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(playlist.name || '');
      setDescription(playlist.description || '');
      setTracks(playlist.tracks || []);
    }
  }, [isOpen, playlist]);

  if (!isOpen) return null;

  // ── Option C: Step Arrows Reordering ─────────────────────────────────────
  const moveTrack = (from: number, to: number) => {
    if (to < 0 || to >= tracks.length || from === to) return;
    const updated = [...tracks];
    const [movedItem] = updated.splice(from, 1);
    updated.splice(to, 0, movedItem);
    setTracks(updated);
  };

  const removeTrack = (index: number) => {
    setTracks(tracks.filter((_, idx) => idx !== index));
  };

  // ── Option C: Drag and Drop Handlers ──────────────────────────────────────
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    // Set transparent drag image or standard ghost
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== targetIndex) {
      moveTrack(draggedIndex, targetIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // ── Save Changes (Atomic PUT /playlists/:id) ──────────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Playlist name cannot be empty');
      return;
    }

    setIsSaving(true);
    try {
      await api.put(`/playlists/${playlist._id}`, {
        name: name.trim(),
        description: description.trim(),
        tracks,
      });
      toast.success('Playlist updated successfully');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update playlist');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl max-h-[90vh] bg-zinc-950/95 border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-xl font-bold text-white">Edit Playlist</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-muted-foreground hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Metadata Row: Cover Preview + Inputs */}
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <div className="flex flex-col items-center gap-2 shrink-0">
              <PlaylistCover tracks={tracks} className="w-32 h-32 rounded-xl shadow-lg" />
              <span className="text-[11px] text-muted-foreground">Dynamic Cover</span>
            </div>

            <div className="flex-1 w-full space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Playlist Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My Playlist"
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-muted-foreground focus:outline-none focus:border-primary/50 text-sm transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add an optional description"
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-muted-foreground focus:outline-none focus:border-primary/50 text-sm transition-colors resize-none"
                />
              </div>
            </div>
          </div>

          {/* Track Reordering Section (Option C) */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Reorder Tracks</h3>
                <p className="text-xs text-muted-foreground">
                  Drag tracks using the handle, or click the arrows to move up/down.
                </p>
              </div>
              <span className="text-xs text-muted-foreground font-mono">
                {tracks.length} track{tracks.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Scrollable Track Reorder List */}
            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1 select-none scrollbar-thin scrollbar-thumb-white/10">
              {tracks.length > 0 ? (
                tracks.map((track, idx) => {
                  const isDragging = draggedIndex === idx;
                  const isDragOver = dragOverIndex === idx;

                  return (
                    <div
                      key={`${track.providerTrackId || idx}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDrop={(e) => handleDrop(e, idx)}
                      onDragEnd={handleDragEnd}
                      className={`flex items-center gap-3 px-3 py-2 rounded-xl bg-white/5 border transition-all duration-150 ${
                        isDragging ? 'opacity-40 border-primary/50 scale-[0.98]' : 'border-white/5'
                      } ${
                        isDragOver ? 'border-primary bg-primary/10' : 'hover:bg-white/10'
                      }`}
                    >
                      {/* Drag Handle */}
                      <div
                        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-white p-1"
                        title="Drag to reorder"
                      >
                        <GripVertical className="w-4 h-4" />
                      </div>

                      {/* Track Position */}
                      <span className="text-xs font-mono text-muted-foreground w-5 text-center shrink-0">
                        {idx + 1}
                      </span>

                      {/* Track Art Thumbnail */}
                      <div className="w-9 h-9 rounded-md overflow-hidden bg-white/10 shrink-0">
                        {track.albumArt ? (
                          <img src={track.albumArt} alt={track.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-white/5" />
                        )}
                      </div>

                      {/* Track Details */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-white truncate">{track.title}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{track.artist}</p>
                      </div>

                      {/* Option C Stepper Controls: Up / Down Arrows */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveTrack(idx, idx - 1)}
                          disabled={idx === 0}
                          className="p-1 rounded text-muted-foreground hover:text-white disabled:opacity-25 disabled:cursor-not-allowed hover:bg-white/10"
                          title="Move up"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveTrack(idx, idx + 1)}
                          disabled={idx === tracks.length - 1}
                          className="p-1 rounded text-muted-foreground hover:text-white disabled:opacity-25 disabled:cursor-not-allowed hover:bg-white/10"
                          title="Move down"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Remove Track Button */}
                      <button
                        type="button"
                        onClick={() => removeTrack(idx)}
                        className="p-1.5 rounded text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Remove track"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-6 text-xs text-muted-foreground">
                  No tracks in this playlist.
                </div>
              )}
            </div>
          </div>

          {/* Footer Save / Cancel */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-black text-xs font-semibold shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

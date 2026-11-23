import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Lock, Pencil, Trash2, Users } from 'lucide-react';
import AnimatedMoodAvatar from './AnimatedMoodAvatar.jsx';
import MoodPicker from './MoodPicker.jsx';
import ReplyThread from './ReplyThread.jsx';
import StoryComposer from './StoryComposer.jsx';
import VisibilityToggle from './VisibilityToggle.jsx';
import { MOODS, timeAgo } from '../moods.js';

export default function StoryCard({ story, meId, actions }) {
  const [editing, setEditing] = useState(false);
  const mine = story.authorId === meId;
  const shared = story.visibility === 'shared';
  const myReaction = story.reactions.find((r) => r.userId === meId)?.mood ?? null;

  if (editing) {
    return <StoryComposer initial={story} submitLabel="Simpan" onCancel={() => setEditing(false)}
      onSubmit={async (v) => { const ok = await actions.edit(story.id, v); if (ok) setEditing(false); return ok; }} />;
  }
  return (
    <motion.article layout initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.94 }}
      transition={{ type: 'spring', stiffness: 260, damping: 26 }} className={`card relative space-y-3.5 ${mine && !shared ? 'card-private' : ''}`}>
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="shrink-0 w-12 h-12 flex items-center justify-center">
            {story.mood ? <AnimatedMoodAvatar mood={story.mood} tone={mine ? 'peach' : 'lilac'} size={48} />
              : <div className="w-10 h-10 rounded-full flex items-center justify-center font-display font-bold text-white text-sm" style={{ background: mine ? 'var(--accent)' : 'var(--accent2)' }}>{story.authorName[0]}</div>}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-base">{mine ? 'Kamu' : story.authorName}</span>
              {story.mood && <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${MOODS[story.mood].color}33` }}>{MOODS[story.mood].label}</span>}
            </div>
            <div className="text-xs opacity-60">{timeAgo(story.createdAt)}{story.editedAt ? ' · diedit' : ''}</div>
          </div>
        </div>
        {mine && (
          <AnimatePresence mode="wait" initial={false}>
            <motion.span key={story.visibility} initial={{ scale: 0.6, rotate: -20, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }}
              className="inline-flex items-center gap-1 text-xs font-bold rounded-full px-2.5 py-1 text-white shadow-sm" style={{ background: shared ? 'var(--accent)' : 'var(--accent2)' }}>
              {shared ? <Users size={12} /> : <Lock size={12} />}{shared ? 'Dibagikan' : 'Private'}
            </motion.span>
          </AnimatePresence>
        )}
      </header>

      <p className="whitespace-pre-wrap break-words leading-relaxed text-base">{story.body}</p>

      {story.reactions.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {story.reactions.map((r) => (
            <span key={r.userId} className="inline-flex items-center gap-1 rounded-full pl-1 pr-2.5 text-xs font-bold bg-chip">
              <AnimatedMoodAvatar mood={r.mood} tone={r.userId === meId ? 'peach' : 'lilac'} size={26} />{r.userId === meId ? 'Kamu' : r.userName}: {MOODS[r.mood].label}
            </span>))}
        </div>
      )}

      {mine && (
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--border)]">
          <VisibilityToggle id={`card-${story.id}`} value={story.visibility} onChange={(v) => actions.setVisibility(story.id, v)} />
          <div className="flex items-center gap-2">
            <button className="btn-soft !py-1.5 !px-3 !text-xs font-bold" aria-label="Edit cerita" onClick={() => setEditing(true)}><Pencil size={14} />Edit</button>
            <button className="btn-soft !py-1.5 !px-2.5 !text-xs text-red-500 hover:text-red-600" aria-label="Hapus cerita" onClick={() => window.confirm('Hapus cerita ini?') && actions.remove(story.id)}><Trash2 size={14} /></button>
          </div>
        </div>
      )}

      {!mine && (
        <div className="pt-2 border-t border-[var(--border)]">
          <div className="text-xs font-bold mb-1 opacity-70">Reaksi mood kamu</div>
          <MoodPicker value={myReaction} onChange={(m) => actions.react(story.id, m)} allowClear tone="peach" size={36} label={false} />
        </div>
      )}

      {shared
        ? <ReplyThread story={story} meId={meId} actions={actions} />
        : <p className="text-xs opacity-60 flex items-center gap-1.5 pt-1"><Lock size={12} />Balasan terbuka setelah cerita dibagikan.</p>}
    </motion.article>
  );
}

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageCircle, Send, Trash2, Smile } from 'lucide-react';
import AnimatedMoodAvatar from './AnimatedMoodAvatar.jsx';
import MoodPicker from './MoodPicker.jsx';
import { timeAgo } from '../moods.js';

export default function ReplyThread({ story, meId, actions }) {
  const [open, setOpen] = useState(story.replies.length > 0);
  const [text, setText] = useState('');
  const [mood, setMood] = useState(null);
  const [pick, setPick] = useState(false);
  const [busy, setBusy] = useState(false);

  const send = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    const ok = await actions.reply(story.id, text.trim(), mood);
    setBusy(false);
    if (ok) { setText(''); setMood(null); setPick(false); }
  };

  return (
    <div className="mt-3">
      <button className="btn-soft" onClick={() => setOpen(!open)} aria-expanded={open}><MessageCircle size={16} />{story.replies.length ? `${story.replies.length} balasan` : 'Balas'}</button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="pt-3 space-y-2">
              <AnimatePresence initial={false}>
                {story.replies.map((r) => {
                  const mine = r.authorId === meId;
                  return (
                    <motion.div key={r.id} layout initial={{ opacity: 0, y: 8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                      className={`flex items-end gap-2 ${mine ? 'flex-row-reverse' : ''}`}>
                      {r.mood && <AnimatedMoodAvatar mood={r.mood} tone={mine ? 'peach' : 'lilac'} size={34} />}
                      <div className={`group max-w-[80%] rounded-2xl px-3 py-2 ${mine ? 'bg-[var(--accent-soft)] rounded-br-md' : 'bg-chip rounded-bl-md'}`}>
                        <div className="whitespace-pre-wrap break-words">{r.body}</div>
                        <div className="text-[11px] opacity-60 mt-0.5 flex items-center gap-2">{r.authorName} · {timeAgo(r.createdAt)}
                          {mine && <button aria-label="Hapus balasan" className="opacity-0 group-hover:opacity-100 focus:opacity-100" onClick={() => actions.delReply(story.id, r.id)}><Trash2 size={12} /></button>}</div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              <div className="flex items-end gap-2">
                <button className="btn-soft !px-2" aria-label="Sematkan mood" onClick={() => setPick(!pick)}>
                  {mood ? <AnimatedMoodAvatar mood={mood} size={28} still /> : <Smile size={20} />}
                </button>
                <textarea rows={1} className="field !py-2" placeholder="Tulis balasan…" value={text} maxLength={1000} onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} />
                <button className="btn-warm !px-3" aria-label="Kirim balasan" disabled={!text.trim() || busy} onClick={send}><Send size={16} /></button>
              </div>
              <AnimatePresence>{pick && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden"><MoodPicker value={mood} onChange={(m) => { setMood(m); setPick(false); }} allowClear size={34} label={false} /></motion.div>}</AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

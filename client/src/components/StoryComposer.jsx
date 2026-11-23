import { useState } from 'react';
import { motion } from 'framer-motion';
import { Send } from 'lucide-react';
import MoodPicker from './MoodPicker.jsx';
import VisibilityToggle from './VisibilityToggle.jsx';

export default function StoryComposer({ initial, onSubmit, onCancel, submitLabel = 'Simpan cerita' }) {
  const [body, setBody] = useState(initial?.body || '');
  const [mood, setMood] = useState(initial?.mood || null);
  const [visibility, setVisibility] = useState(initial?.visibility || 'private');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!body.trim() || busy) return;
    setBusy(true);
    const ok = await onSubmit({ body: body.trim(), category: null, mood, visibility });
    setBusy(false);
    if (ok && !initial) { setBody(''); setMood(null); setVisibility('private'); }
  };

  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card space-y-4">
      <textarea className="field min-h-[120px] resize-y !p-3.5 text-base" placeholder="Ceritain apa aja… cuma kamu yang lihat sampai kamu bagikan." maxLength={5000}
        value={body} onChange={(e) => setBody(e.target.value)} aria-label="Isi cerita" />
      <div>
        <div className="text-xs font-bold mb-2 opacity-70">Mood kamu saat nulis (opsional)</div>
        <MoodPicker value={mood} onChange={setMood} allowClear size={40} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[var(--border)]">
        <VisibilityToggle id={`composer-${initial?.id ?? 'new'}`} value={visibility} onChange={setVisibility} />
        <div className="flex items-center gap-2">
          {onCancel && <button type="button" className="btn-soft !py-2 !px-4 text-sm font-bold" onClick={onCancel}>Batal</button>}
          <button type="button" className="btn-warm inline-flex items-center gap-2 !py-2 !px-4 text-sm font-bold shadow-md" disabled={!body.trim() || busy} onClick={submit}><Send size={15} />{submitLabel}</button>
        </div>
      </div>
    </motion.div>
  );
}

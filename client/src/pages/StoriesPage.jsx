import { useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { PenLine } from 'lucide-react';
import StoryCard from '../components/StoryCard.jsx';
import StoryComposer from '../components/StoryComposer.jsx';
import InviteCard from '../shell/InviteCard.jsx';

// Forum privat berdua: tulis cerita, Keep Private/Bagikan, balasan, reaksi mood.
export default function StoriesPage({ info, stories, actions }) {
  const [composing, setComposing] = useState(false);
  const [tab, setTab] = useState('all');
  const meId = info.user.id;
  const shown = useMemo(() => stories.filter((s) =>
    tab === 'all' || (tab === 'mine' && s.authorId === meId) || (tab === 'partner' && s.authorId !== meId) || (tab === 'private' && s.authorId === meId && s.visibility === 'private')
  ), [stories, tab, meId]);

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 pb-12 space-y-5">
      <h2 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight">Cerita</h2>
      <InviteCard info={info} />
      {composing
        ? <StoryComposer onCancel={() => setComposing(false)} onSubmit={async (v) => { const ok = await actions.add(v); if (ok) setComposing(false); return ok; }} />
        : <button className="card w-full flex items-center gap-3 text-left p-4 sm:p-5 opacity-90 hover:opacity-100 transition shadow-sm hover:shadow" onClick={() => setComposing(true)}><PenLine size={18} />Tulis cerita baru…</button>}

      {/* Filter tab bersih */}
      <div className="flex flex-wrap gap-2 pt-1">
        {[['all', 'Semua'], ['mine', 'Punyaku'], ['partner', info.partner?.name || 'Pasangan'], ['private', 'Private-ku']].map(([k, l]) =>
          <button key={k} className={`chip !px-4 !py-2 !text-sm font-bold ${tab === k ? 'chip-on shadow' : ''}`} onClick={() => setTab(k)}>{l}</button>)}
      </div>

      <div className="space-y-4 pt-1">
        <AnimatePresence initial={false}>{shown.map((s) => <StoryCard key={s.id} story={s} meId={meId} actions={actions} />)}</AnimatePresence>
        {shown.length === 0 && <p className="text-center opacity-60 py-10">Belum ada cerita di sini. Mulai tulis yang pertama, ya.</p>}
      </div>
    </div>
  );
}

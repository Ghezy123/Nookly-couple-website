import { useState } from 'react';
import { motion } from 'framer-motion';
import AnimatedMoodAvatar from './AnimatedMoodAvatar.jsx';

export default function AuthGate({ actions, error, loading }) {
  const [tab, setTab] = useState('create');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const go = () => (tab === 'create' ? actions.create(name) : actions.join(code, name));
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card w-full max-w-md space-y-4">
        <div className="flex justify-center gap-2 -mb-2"><AnimatedMoodAvatar mood="love" tone="peach" size={90} /><AnimatedMoodAvatar mood="happy" tone="lilac" size={90} /></div>
        <h1 className="font-display text-3xl font-bold text-center">Nookly</h1>
        <p className="text-center opacity-70 -mt-2">Ruang private berdua untuk cerita dan mood.</p>
        <div className="grid grid-cols-2 gap-2">
          {[['create', 'Buat ruang baru'], ['join', 'Gabung / Masuk']].map(([k, l]) => <button key={k} className={`chip !py-2 ${tab === k ? 'chip-on' : ''}`} onClick={() => setTab(k)}>{l}</button>)}
        </div>
        <input className="field" placeholder="Nama panggilanmu" maxLength={20} value={name} onChange={(e) => setName(e.target.value)} aria-label="Nama" />
        {tab === 'join' && <input className="field uppercase tracking-widest" placeholder="Kode undangan" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} aria-label="Kode undangan" />}
        {error && <p className="text-center font-semibold text-accent font-bold" role="alert">{error}</p>}
        <button className="btn-warm w-full" disabled={loading || !name.trim() || (tab === 'join' && code.length < 6)} onClick={go}>{tab === 'create' ? 'Buat ruang' : 'Masuk ke ruang'}</button>
      </motion.div>
    </div>
  );
}

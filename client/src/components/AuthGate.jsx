import { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import AnimatedMoodAvatar from './AnimatedMoodAvatar.jsx';

export default function AuthGate({ actions, error, loading }) {
  const [tab, setTab] = useState('create');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const go = () => (tab === 'create' ? actions.create(name, password) : actions.join(code, name, password));

  const isFormValid = name.trim().length > 0 && password.trim().length >= 4 && (tab === 'create' || code.trim().length >= 6);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card w-full max-w-md space-y-4">
        <div className="flex justify-center gap-2 -mb-2">
          <AnimatedMoodAvatar mood="love" tone="peach" size={90} />
          <AnimatedMoodAvatar mood="happy" tone="lilac" size={90} />
        </div>
        <h1 className="font-display text-3xl font-bold text-center">Nookly</h1>
        <p className="text-center opacity-70 -mt-2">Ruang private berdua untuk cerita dan mood.</p>

        <div className="grid grid-cols-2 gap-2">
          {[['create', 'Buat ruang baru'], ['join', 'Gabung / Masuk']].map(([k, l]) => (
            <button key={k} className={`chip !py-2 ${tab === k ? 'chip-on' : ''}`} onClick={() => setTab(k)}>
              {l}
            </button>
          ))}
        </div>

        <div className="space-y-2.5">
          <input
            className="field"
            placeholder="Nama panggilanmu"
            maxLength={20}
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="Nama"
          />

          {tab === 'join' && (
            <input
              className="field uppercase tracking-widest font-mono"
              placeholder="Kode undangan (6 digit)"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              aria-label="Kode undangan"
            />
          )}

          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              className="field pr-10"
              placeholder="Kata sandi / PIN akun (min. 4 karakter)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-label="Kata sandi"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 transition p-1"
              onClick={() => setShowPassword((v) => !v)}
              title={showPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {error && <p className="text-center font-semibold text-accent font-bold" role="alert">{error}</p>}

        <button
          className="btn-warm w-full"
          disabled={loading || !isFormValid}
          onClick={go}
        >
          {loading ? 'Memproses...' : tab === 'create' ? 'Buat ruang' : 'Masuk ke ruang'}
        </button>
      </motion.div>
    </div>
  );
}

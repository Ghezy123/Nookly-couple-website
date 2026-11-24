import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeftRight,
  Check,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  LogOut,
  Paintbrush,
  Settings,
  Sparkles,
  User,
  Users,
  X,
} from 'lucide-react';
import {
  DARK_DEFAULT,
  DEFAULTS,
  NITRO_PRESETS,
  SOLID_PRESETS,
  normalizeHex,
} from './settings.js';

export default function SettingsModal({
  settings,
  update,
  reset,
  theme,
  info,
  userName,
  onSaveName,
  onSavePassword,
  onClose,
  onLogout,
}) {
  // Main Navigation Category: 'appearance' | 'account'
  const [activeCategory, setActiveCategory] = useState('account');

  // Appearance Tabs: 'preset' | 'custom' | 'solid'
  const isSolidCurrent = !settings.bg2 || settings.bg2 === settings.bg;
  const initialThemeTab = settings.presetId ? 'preset' : (isSolidCurrent ? 'solid' : 'custom');
  const [themeTab, setThemeTab] = useState(initialThemeTab);
  const [darkFilter, setDarkFilter] = useState('all');

  // Name State
  const [nameInput, setNameInput] = useState(userName || '');
  const [savingName, setSavingName] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Password State
  const [passwordInput, setPasswordInput] = useState('');
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savedPasswordSuccess, setSavedPasswordSuccess] = useState(false);

  useEffect(() => {
    if (userName) setNameInput(userName);
  }, [userName]);

  const [c1, setC1] = useState(settings.bg || DEFAULTS.bg);
  const [c2, setC2] = useState(settings.bg2 || DEFAULTS.bg2);
  const [angle, setAngle] = useState(settings.angle ?? 135);

  useEffect(() => {
    setC1(settings.bg || DEFAULTS.bg);
    setC2(settings.bg2 || settings.bg || DEFAULTS.bg2);
    setAngle(settings.angle ?? 135);
  }, [settings.bg, settings.bg2, settings.angle]);

  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);

  const selectPreset = (p) =>
    update({ bg: p.from, bg2: p.to, angle: p.angle, presetId: p.id });

  const applyCustom = (newC1, newC2, newAngle = angle) => {
    setC1(newC1);
    setC2(newC2);
    setAngle(newAngle);
    const n1 = normalizeHex(newC1),
      n2 = normalizeHex(newC2);
    if (n1 && n2) update({ bg: n1, bg2: n2, angle: newAngle, presetId: null });
  };

  const selectSolid = (color) => update({ bg: color, bg2: null, presetId: null });

  const good = theme.ratio >= 4.5;
  const filtered = NITRO_PRESETS.filter((p) =>
    darkFilter === 'all' ? true : darkFilter === 'dark' ? p.dark : !p.dark
  );

  const THEME_TABS = [
    { id: 'preset', label: 'Gradasi' },
    { id: 'custom', label: 'Kustom' },
    { id: 'solid', label: 'Solid' },
  ];

  const handleCopyCode = () => {
    if (info?.inviteCode) {
      navigator.clipboard?.writeText(info.inviteCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Pengaturan"
        initial={{ scale: 0.94, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="card w-full max-w-md max-h-[88vh] flex flex-col p-5 sm:p-6 space-y-4 shadow-2xl rounded-3xl border border-[var(--border)] overflow-hidden font-display"
        style={{ background: 'var(--surface)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="flex items-center justify-between pb-2 border-b border-[var(--border)] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-accent/10 text-accent">
              <Settings size={20} />
            </div>
            <div>
              <h2 className="font-display text-lg sm:text-xl font-bold leading-tight">
                Pengaturan
              </h2>
              <p className="text-xs opacity-60">Kelola profil akun & tampilan Nookly</p>
            </div>
          </div>
          <button
            className="btn-soft !p-2 rounded-xl"
            aria-label="Tutup"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        {/* Category Switcher Tabs: Akun vs Tampilan */}
        <div className="flex gap-1.5 p-1 bg-[var(--chip)] rounded-2xl shrink-0">
          <button
            onClick={() => setActiveCategory('account')}
            className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition ${
              activeCategory === 'account'
                ? 'bg-[var(--accent)] text-white shadow-md'
                : 'opacity-70 hover:opacity-100'
            }`}
          >
            <User size={15} /> Profil & Akun
          </button>
          <button
            onClick={() => setActiveCategory('appearance')}
            className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition ${
              activeCategory === 'appearance'
                ? 'bg-[var(--accent)] text-white shadow-md'
                : 'opacity-70 hover:opacity-100'
            }`}
          >
            <Paintbrush size={15} /> Tema Latar
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4 text-xs">
          {/* ================= SECTION 1: PROFIL & AKUN ================= */}
          {activeCategory === 'account' && (
            <div className="space-y-4">
              {/* Card Nama Panggilan */}
              <div className="p-4 rounded-2xl bg-[var(--chip)] border border-[var(--border)] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs flex items-center gap-1.5 text-accent">
                    <User size={15} /> Nama Panggilan Kamu
                  </span>
                  <span className="text-[10px] opacity-60">
                    Slot {info?.user?.slot || 'A'}
                  </span>
                </div>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!nameInput.trim()) return;
                    setSavingName(true);
                    const ok = await onSaveName(nameInput.trim());
                    setSavingName(false);
                    if (ok) setSavedSuccess(true);
                  }}
                  className="space-y-2"
                >
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="field !py-2.5 px-3 text-xs font-bold flex-1 bg-[var(--surface)] border border-[var(--border)] focus:border-accent"
                      value={nameInput}
                      onChange={(e) => {
                        setNameInput(e.target.value);
                        setSavedSuccess(false);
                      }}
                      maxLength={20}
                      placeholder="Masukkan nama panggilan..."
                    />
                    <button
                      type="submit"
                      disabled={
                        savingName ||
                        !nameInput.trim() ||
                        nameInput.trim() === userName
                      }
                      className="btn-warm !py-2 !px-4 text-xs font-bold whitespace-nowrap disabled:opacity-40"
                    >
                      {savingName
                        ? 'Menyimpan...'
                        : savedSuccess
                        ? '✓ Tersimpan'
                        : 'Simpan'}
                    </button>
                  </div>
                  <p className="text-[10px] opacity-60">
                    Nama ini yang terlihat oleh pasanganmu di beranda, cerita, dan
                    buku kenangan.
                  </p>
                </form>
              </div>

              {/* Card Kata Sandi Akun */}
              <div className="p-4 rounded-2xl bg-[var(--chip)] border border-[var(--border)] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs flex items-center gap-1.5 text-accent">
                    <KeyRound size={15} /> Kata Sandi Akun
                  </span>
                  <span className="text-[10px] opacity-60">Keamanan</span>
                </div>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!passwordInput.trim() || passwordInput.trim().length < 4) return;
                    setSavingPassword(true);
                    const ok = await onSavePassword?.(passwordInput.trim());
                    setSavingPassword(false);
                    if (ok) {
                      setSavedPasswordSuccess(true);
                      setPasswordInput('');
                      setTimeout(() => setSavedPasswordSuccess(false), 3000);
                    }
                  }}
                  className="space-y-2"
                >
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type={showPasswordInput ? 'text' : 'password'}
                        className="field !py-2.5 px-3 pr-8 text-xs font-mono w-full bg-[var(--surface)] border border-[var(--border)] focus:border-accent"
                        value={passwordInput}
                        onChange={(e) => {
                          setPasswordInput(e.target.value);
                          setSavedPasswordSuccess(false);
                        }}
                        placeholder="Ketik kata sandi baru (min. 4)"
                        maxLength={50}
                      />
                      <button
                        type="button"
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100"
                        onClick={() => setShowPasswordInput((v) => !v)}
                        title={showPasswordInput ? 'Sembunyikan' : 'Tampilkan'}
                      >
                        {showPasswordInput ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    <button
                      type="submit"
                      disabled={savingPassword || passwordInput.trim().length < 4}
                      className="btn-warm !py-2 !px-4 text-xs font-bold whitespace-nowrap disabled:opacity-40"
                    >
                      {savingPassword
                        ? 'Menyimpan...'
                        : savedPasswordSuccess
                        ? '✓ Diperbarui'
                        : 'Ubah Sandi'}
                    </button>
                  </div>
                  <p className="text-[10px] opacity-60">
                    Kata sandi untuk masuk kembali jika sesi loginmu di perangkat ini berakhir.
                  </p>
                </form>
              </div>

              {/* Card Ruang Berdua */}
              <div className="p-4 rounded-2xl bg-[var(--chip)] border border-[var(--border)] space-y-3">
                <div className="flex items-center gap-1.5 font-bold text-xs text-accent">
                  <Users size={15} /> Ruang Berdua
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between py-1.5 border-b border-[var(--border)]">
                    <span className="opacity-70 text-[11px]">Pasangan:</span>
                    <span className="font-bold text-xs">
                      {info?.partner ? (
                        info.partner.name
                      ) : (
                        <span className="opacity-50 italic">
                          Menunggu pasangan bergabung...
                        </span>
                      )}
                    </span>
                  </div>

                  {info?.inviteCode && (
                    <div className="flex items-center justify-between py-1.5">
                      <div>
                        <div className="opacity-70 text-[11px]">Kode Undangan:</div>
                        <div className="font-mono text-sm font-extrabold tracking-widest text-accent">
                          {info.inviteCode}
                        </div>
                      </div>
                      <button
                        onClick={handleCopyCode}
                        className="btn-soft !py-1.5 !px-3 text-xs font-bold gap-1.5"
                      >
                        {copiedCode ? (
                          <>
                            <Check size={13} className="text-emerald-500" /> Tersalin!
                          </>
                        ) : (
                          <>
                            <Copy size={13} /> Salin Kode
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Sesi / Keluar */}
              <div className="p-3.5 rounded-2xl border border-red-500/20 bg-red-500/5 flex items-center justify-between">
                <div>
                  <p className="font-bold text-xs text-red-500">Keluar dari Ruang</p>
                  <p className="text-[10px] opacity-60">
                    Hapus sesi login dari perangkat ini
                  </p>
                </div>
                <button
                  className="btn-soft !text-xs !py-1.5 !px-3 text-red-500 hover:bg-red-500/10 border border-red-500/30"
                  onClick={onLogout}
                >
                  <LogOut size={13} /> Keluar
                </button>
              </div>
            </div>
          )}

          {/* ================= SECTION 2: TAMPILAN & TEMA ================= */}
          {activeCategory === 'appearance' && (
            <div className="space-y-4">
              {/* Sub-tabs Gradasi / Kustom / Solid */}
              <div className="flex gap-1 p-1 bg-[var(--chip)] rounded-2xl">
                {THEME_TABS.map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => setThemeTab(id)}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition ${
                      themeTab === id
                        ? 'bg-[var(--surface)] text-accent shadow-sm'
                        : 'opacity-60 hover:opacity-90'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Subtab: Preset Gradasi */}
              {themeTab === 'preset' && (
                <div className="space-y-3">
                  <div className="flex gap-1.5">
                    {[
                      ['all', 'Semua'],
                      ['dark', '🌙 Gelap'],
                      ['light', '🌸 Terang'],
                    ].map(([k, l]) => (
                      <button
                        key={k}
                        onClick={() => setDarkFilter(k)}
                        className={`chip !text-xs !py-1 ${
                          darkFilter === k ? 'chip-on' : ''
                        }`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-0.5">
                    {filtered.map((p) => {
                      const selected =
                        settings.presetId === p.id ||
                        (settings.bg === p.from && settings.bg2 === p.to);
                      return (
                        <button
                          key={p.id}
                          onClick={() => selectPreset(p)}
                          className={`relative h-14 rounded-2xl p-3 text-left overflow-hidden active:scale-95 transition-all ${
                            selected
                              ? 'ring-2 ring-[var(--accent)] shadow-md'
                              : 'border border-[var(--border)]'
                          }`}
                          style={{
                            background: `linear-gradient(${p.angle}deg, ${p.from} 0%, ${p.to} 100%)`,
                          }}
                        >
                          <span
                            className={`text-xs font-bold leading-tight ${
                              p.dark ? 'text-white/90 drop-shadow' : 'text-zinc-900'
                            }`}
                          >
                            {p.name}
                          </span>
                          {selected && (
                            <span className="absolute top-2 right-2 p-0.5 rounded-full bg-white text-zinc-900">
                              <Check size={11} strokeWidth={3} />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Subtab: Kustom Gradasi */}
              {themeTab === 'custom' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      ['Awal', c1, (v) => applyCustom(v, c2)],
                      ['Akhir', c2, (v) => applyCustom(c1, v)],
                    ].map(([label, val, fn]) => (
                      <div key={label} className="space-y-1">
                        <label className="text-[10px] font-bold opacity-70">
                          {label}
                        </label>
                        <div className="flex items-center gap-1.5 bg-[var(--chip)] rounded-xl p-1.5 border border-[var(--border)]">
                          <input
                            type="color"
                            value={normalizeHex(val) || '#888888'}
                            onChange={(e) => fn(e.target.value)}
                            className="w-8 h-8 rounded-lg bg-transparent cursor-pointer border-0 shrink-0"
                          />
                          <input
                            className="w-full bg-transparent text-xs font-mono font-bold outline-none uppercase"
                            value={val}
                            maxLength={7}
                            onChange={(e) => fn(e.target.value)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => applyCustom(c2, c1)}
                      className="btn-soft !text-xs !py-1.5 !px-3"
                    >
                      <ArrowLeftRight size={13} /> Tukar
                    </button>
                    <div className="flex items-center gap-1">
                      {[
                        [45, '45°'],
                        [90, '90°'],
                        [135, '135°'],
                        [180, '180°'],
                      ].map(([a, l]) => (
                        <button
                          key={a}
                          type="button"
                          onClick={() => applyCustom(c1, c2, a)}
                          className={`px-2 py-1 text-[11px] rounded-lg font-bold transition ${
                            angle === a
                              ? 'bg-[var(--accent)] text-white'
                              : 'bg-[var(--chip)] opacity-60'
                          }`}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div
                    className="w-full h-11 rounded-2xl border border-[var(--border)] flex items-center justify-center transition-all shadow-inner"
                    style={{
                      background: `linear-gradient(${angle}deg, ${
                        normalizeHex(c1) || '#888'
                      } 0%, ${normalizeHex(c2) || '#ccc'} 100%)`,
                    }}
                  >
                    <span className="text-[11px] font-bold px-3 py-0.5 rounded-full bg-black/40 text-white">
                      Pratinjau
                    </span>
                  </div>
                </div>
              )}

              {/* Subtab: Solid */}
              {themeTab === 'solid' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={normalizeHex(settings.bg) || '#ffffff'}
                      onChange={(e) => selectSolid(e.target.value)}
                      className="w-11 h-10 rounded-xl bg-transparent cursor-pointer"
                    />
                    <input
                      className="field text-xs font-mono font-bold uppercase"
                      value={settings.bg}
                      maxLength={7}
                      onChange={(e) => {
                        const n = normalizeHex(e.target.value);
                        if (n) selectSolid(n);
                      }}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {SOLID_PRESETS.map((c) => (
                      <button
                        key={c}
                        onClick={() => selectSolid(c)}
                        className="w-8 h-8 rounded-full transition active:scale-90"
                        style={{
                          background: c,
                          border:
                            isSolidCurrent && settings.bg === c
                              ? '3px solid var(--accent)'
                              : '2px solid var(--border)',
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Pengaturan Teks & Kontras */}
              <div className="border-t border-[var(--border)] pt-3 space-y-2">
                <div className="text-[10px] font-bold opacity-70 uppercase tracking-wider">
                  Warna Teks
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    ['auto', 'Otomatis'],
                    ['light', 'Terang'],
                    ['dark', 'Gelap'],
                  ].map(([k, l]) => (
                    <button
                      key={k}
                      onClick={() => update({ textMode: k })}
                      className={`chip justify-center !py-1.5 !text-xs ${
                        settings.textMode === k ? 'chip-on' : ''
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] flex items-center gap-1 font-semibold">
                  <span className={good ? 'text-emerald-500' : 'text-amber-500'}>
                    {good ? '✓' : '⚠'}
                  </span>
                  Kontras {theme.ratio.toFixed(1)}:1
                  <span className="font-normal opacity-60">
                    {good ? '' : '— coba Otomatis'}
                  </span>
                </p>
              </div>

              {/* Reset Tema */}
              <div className="pt-1">
                <button
                  className="btn-soft w-full justify-center !text-xs font-bold"
                  onClick={reset}
                >
                  Kembalikan Tema Bawaan
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

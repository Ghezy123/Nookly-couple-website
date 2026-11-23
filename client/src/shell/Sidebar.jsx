import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, Moon, Settings, Sun, X } from 'lucide-react';
import MoodMini from './MoodMini.jsx';
import { TABS } from './TabBar.jsx';

function Nav({ tab, onTab, after }) {
  return (
    <nav className="flex flex-col gap-1.5" aria-label="Menu utama">
      {TABS.map(([k, label, Icon]) => {
        const on = tab === k;
        return (
          <button key={k} onClick={() => { onTab(k); after?.(); }} aria-current={on ? 'page' : undefined} className="relative rounded-2xl px-4 py-3 text-left font-bold">
            {on && <motion.span layoutId="side-pill" className="absolute inset-0 rounded-2xl bg-accent" transition={{ type: 'spring', stiffness: 420, damping: 32 }} />}
            <motion.span className="relative flex items-center gap-3" style={{ color: on ? '#fff' : undefined }} whileHover={{ x: 4 }}><Icon size={20} />{label}</motion.span>
          </button>
        );
      })}
    </nav>
  );
}

function Panel({ tab, onTab, info, dark, onDark, onSettings, after }) {
  return (
    <div className="h-full flex flex-col p-4 gap-6">
      <div className="flex items-center gap-3 pt-1">
        <MoodMini me={info.user} partner={info.partner} onClick={() => { onTab('home'); after?.(); }} />
        <div className="min-w-0">
          <div className="font-display text-xl font-bold leading-tight">Nookly</div>
          <div className="text-xs opacity-70 truncate">{info.user.name}{info.partner ? ` & ${info.partner.name}` : ''}</div>
        </div>
      </div>
      <Nav tab={tab} onTab={onTab} after={after} />
      <div className="mt-auto flex gap-2">
        <button className="btn-soft flex-1 justify-center" onClick={onDark}>{dark ? <Sun size={17} /> : <Moon size={17} />}{dark ? 'Terang' : 'Gelap'}</button>
        <button className="btn-soft flex-1 justify-center" onClick={() => { onSettings(); after?.(); }}><Settings size={17} />Atur</button>
      </div>
    </div>
  );
}

// Desktop: sidebar tetap di kiri. HP/tablet: top bar + drawer geser.
export default function Sidebar(props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <aside className="hidden lg:block fixed inset-y-0 left-0 w-64 z-30 card !rounded-none !rounded-r-3xl"><Panel {...props} /></aside>
      <header className="lg:hidden fixed top-0 inset-x-0 h-14 z-30 card !rounded-none !rounded-b-2xl flex items-center justify-between px-3">
        <button className="btn-soft !p-2" aria-label="Buka menu" onClick={() => setOpen(true)}><Menu size={20} /></button>
        <span className="font-display text-lg font-bold">Nookly</span>
        <MoodMini me={props.info.user} partner={props.info.partner} onClick={() => props.onTab('home')} />
      </header>
      <AnimatePresence>
        {open && (
          <>
            <motion.div key="bd" className="lg:hidden fixed inset-0 z-40 bg-black/45" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
            <motion.aside key="dr" className="lg:hidden fixed inset-y-0 left-0 w-72 max-w-[85vw] z-50 card !rounded-none !rounded-r-3xl" style={{ background: 'var(--surface)' }}
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', stiffness: 380, damping: 36 }}>
              <button className="btn-soft !p-2 absolute top-3 right-3" aria-label="Tutup menu" onClick={() => setOpen(false)}><X size={18} /></button>
              <Panel {...props} after={() => setOpen(false)} />
            </motion.aside>
          </>)}
      </AnimatePresence>
    </>
  );
}

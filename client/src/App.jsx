import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Moon, Settings, Sun } from 'lucide-react';
import AuthGate from './components/AuthGate.jsx';
import BattleHub from './game/BattleHub.jsx';
import { useCoupleSpace } from './hooks/useCoupleSpace.js';
import Home from './pages/Home.jsx';
import StoriesPage from './pages/StoriesPage.jsx';
import MoodMini from './shell/MoodMini.jsx';
import Sidebar from './shell/Sidebar.jsx';
import { DARK_DEFAULT, DEFAULTS, deriveTheme, useSettings } from './theme/settings.js';
import SettingsModal from './theme/SettingsModal.jsx';
import TimelinePage from './timeline/TimelinePage';
import { createRestMemoryService } from './timeline/restService';

const timelineService = createRestMemoryService();

export default function App() {
  const { status, info, stories, error, setError, actions } = useCoupleSpace();
  const [settings, updateSettings, resetSettings] = useSettings();
  const theme = useMemo(() => deriveTheme(settings), [settings]);
  const [tab, setTab] = useState('home');
  const [showSettings, setShowSettings] = useState(false);
  const ready = info && status !== 'anon';
  const toggleDark = () => updateSettings(
    theme.dark
      ? { bg: DEFAULTS.bg, bg2: DEFAULTS.bg2, angle: DEFAULTS.angle, presetId: DEFAULTS.presetId, textMode: 'auto' }
      : { bg: DARK_DEFAULT.bg, bg2: DARK_DEFAULT.bg2, angle: DARK_DEFAULT.angle, presetId: DARK_DEFAULT.presetId, textMode: 'auto' }
  );

  // Halaman tetap ter-mount saat berpindah tab supaya state (game, form, dll.) tidak hilang.
  const page = (k, node) => <section key={k} hidden={tab !== k}>{node}</section>;
  const slots = ready ? { [info.user.slot]: { name: info.user.name }, ...(info.partner ? { [info.partner.slot]: { name: info.partner.name } } : {}) } : {};

  return (
    <div className="hub-root" style={theme.vars}>
      <div className="relative">
        {!ready ? <AuthGate actions={actions} error={error} loading={status === 'loading'} /> : (
          <>
            <Sidebar tab={tab} onTab={setTab} info={info} dark={theme.dark} onDark={toggleDark} onSettings={() => setShowSettings(true)} />
            <div className="lg:pl-64 pt-16 lg:pt-4"><main>
              {page('home', <Home info={info} onChangeMood={actions.setMood} go={setTab} />)}
              {page('stories', <StoriesPage info={info} stories={stories} actions={actions} />)}
              {page('memories', (
                <div className="pb-8"><TimelinePage service={timelineService} currentUser={info.user.slot} pollMs={15000}
                  users={{ A: { name: slots.A?.name ?? 'Pasangan', color: 'var(--accent)' }, B: { name: slots.B?.name ?? 'Pasangan', color: 'var(--accent2)' } }} /></div>))}
              {page('game', <div className="px-2"><BattleHub name={info.user.name} /></div>)}
            </main></div>
          </>)}
      </div>

      <AnimatePresence>
        {showSettings && (
          <SettingsModal
            settings={settings}
            update={updateSettings}
            reset={resetSettings}
            theme={theme}
            info={info}
            userName={info?.user?.name}
            onSaveName={actions.setName}
            onSavePassword={actions.setPassword}
            onClose={() => setShowSettings(false)}
            onLogout={() => { setShowSettings(false); actions.logout(); }}
          />
        )}
        {error && ready && (
          <motion.div key="err" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} role="alert" onClick={() => setError('')}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[80] rounded-2xl px-4 py-2 bg-accent text-white font-bold shadow-lg">{error}</motion.div>)}
      </AnimatePresence>
    </div>
  );
}

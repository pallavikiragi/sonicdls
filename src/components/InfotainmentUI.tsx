import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mic, Map as MapIcon, Bell, Navigation, Power, Settings, Music, 
  Volume2, ShieldAlert, CloudRain, Thermometer, Wind, CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { BrandTokens } from '../lib/audio';

export function InfotainmentUI({ 
  brand, 
  playComponent, 
  assignments,
  allTokens,
  onUpdateAssignment,
  onOpenSettings
}: { 
  brand: BrandTokens;
  playComponent: (id: string) => void;
  assignments: Record<string, string>;
  allTokens: string[];
  onUpdateAssignment: (element: string, token: string) => void;
  onOpenSettings?: () => void;
}) {
  // State for various HMI components
  const [isListening, setIsListening] = useState(false);
  const [acEnabled, setAcEnabled] = useState(true);
  const [defrostEnabled, setDefrostEnabled] = useState(false);
  const [engineStarted, setEngineStarted] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, title: 'Low Tire Pressure', desc: 'Rear left tire is at 28 PSI', type: 'warning' },
    { id: 2, title: 'System Update', desc: 'Update v2.4 available', type: 'info' }
  ]);

  const [showSoundSettings, setShowSoundSettings] = useState(false);

  // Long press logic for engine
  const [isPressing, setIsPressing] = useState(false);
  const [pressProgress, setPressProgress] = useState(0);
  const pressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startLongPress = () => {
    if (engineStarted) {
      setEngineStarted(false);
      playComponent(assignments['Engine Stop'] || 'ui.button.cancel');
      return;
    }
    setIsPressing(true);
    setPressProgress(0);
    playComponent(assignments['Engine Hold'] || 'ui.tab.switch');

    progressIntervalRef.current = setInterval(() => {
      setPressProgress(prev => Math.min(prev + 5, 100)); // 5% every 50ms = 1s total
    }, 50);

    pressTimerRef.current = setTimeout(() => {
      setIsPressing(false);
      setEngineStarted(true);
      setPressProgress(100);
      playComponent(assignments['Engine Start Success'] || 'nav.arrived');
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    }, 1000);
  };

  const endLongPress = () => {
    if (!engineStarted && isPressing) {
      setIsPressing(false);
      setPressProgress(0);
      if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    }
  };

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, []);

  const toggleVoice = () => {
    setIsListening(!isListening);
    playComponent(assignments['Voice Toggle'] || (isListening ? 'ui.button.cancel' : 'ui.button.confirm'));
  };

  const removeNotification = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    playComponent(assignments['Notification Dismiss'] || 'ui.button.cancel');
  };

  const elementsToMap = [
    { id: 'Map Tab', default: 'ui.tab.switch' },
    { id: 'Music Tab', default: 'ui.tab.switch' },
    { id: 'Settings Tab', default: 'ui.tab.switch' },
    { id: 'AC Toggle', default: 'ui.button.confirm' },
    { id: 'Defrost Toggle', default: 'ui.button.confirm' },
    { id: 'Voice Toggle', default: 'ui.button.confirm' },
    { id: 'Engine Hold', default: 'ui.tab.switch' },
    { id: 'Engine Start Success', default: 'nav.arrived' },
    { id: 'Engine Stop', default: 'ui.button.cancel' },
    { id: 'Notification Dismiss', default: 'ui.button.cancel' }
  ];

  return (
    <div className="flex-1 flex flex-col bg-app-bg p-4 md:p-8 overflow-y-auto items-center">
      {/* Container simulating a vehicle infotainment display */}
      <div className="w-full max-w-[1200px] h-[700px] bg-app-surface border border-app-border rounded-2xl shadow-2xl flex overflow-hidden relative">
        
        {/* LEFT SIDEBAR - NAV & CONTROLS */}
        <div className="w-24 bg-app-surface-light border-r border-app-border flex flex-col items-center py-6 gap-8 shrink-0 z-10 shadow-lg">
          <button 
            onClick={() => playComponent(assignments['Map Tab'] || 'ui.tab.switch')}
            className="p-3 text-app-accent bg-[#3B82F61A] rounded-xl hover:bg-app-accent hover:text-white transition-colors"
          >
            <MapIcon size={24} />
          </button>
          <button 
            onClick={() => playComponent(assignments['Music Tab'] || 'ui.tab.switch')}
            className="p-3 text-app-text-muted hover:text-app-text transition-colors"
          >
            <Music size={24} />
          </button>
          <button 
            onClick={() => {
              playComponent(assignments['Settings Tab'] || 'ui.tab.switch');
              if (onOpenSettings) onOpenSettings();
            }}
            className="p-3 text-app-text-muted hover:text-app-text transition-colors"
            title="Open Settings & Waveform Sampler"
          >
            <Settings size={24} />
          </button>

          <div className="mt-auto space-y-4 flex flex-col items-center">
            {/* Climate summary */}
            <div className="text-center">
              <Thermometer size={20} className="mx-auto text-app-text" />
              <span className="text-[10px] font-bold mt-1 text-app-text block">72°</span>
            </div>
          </div>
        </div>

        {/* MAIN AREA - MAP & WIDGETS */}
        <div className="flex-1 flex flex-col relative bg-zinc-900 overflow-hidden">
          {/* Faux Map Background */}
          <div className="absolute inset-0 pointer-events-none opacity-20"
               style={{
                 backgroundImage: 'linear-gradient(to right, #333 1px, transparent 1px), linear-gradient(to bottom, #333 1px, transparent 1px)',
                 backgroundSize: '40px 40px'
               }}
          />
          {/* Glowing route line on map */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M 10 90 Q 30 50 50 50 T 90 10" fill="none" stroke="currentColor" strokeWidth="2" className="text-app-accent" />
          </svg>
          {/* Nav icon in center */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="w-16 h-16 bg-app-accent/20 rounded-full flex items-center justify-center animate-pulse">
              <Navigation size={28} fill="currentColor" className="text-app-accent rotate-45" />
            </div>
          </div>

          {/* Top Bar overlay */}
          <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-10 pointer-events-none">
            <div className="bg-app-surface/90 backdrop-blur border border-app-border rounded-xl p-4 shadow-xl pointer-events-auto">
              <div className="flex items-center gap-3">
                <Navigation size={20} className="text-app-accent" />
                <div>
                  <div className="text-sm font-semibold text-app-text">Next turn in 2.4mi</div>
                  <div className="text-xs text-app-text-muted">I-80 West</div>
                </div>
              </div>
            </div>
            
            <div className="flex gap-4 pointer-events-auto">
              <div className="bg-app-surface/90 backdrop-blur border border-app-border rounded-xl px-4 py-2 flex items-center gap-2">
                <CloudRain size={16} className="text-blue-400" />
                <span className="text-sm font-medium text-app-text">64° Outside</span>
              </div>
            </div>
          </div>

          {/* Bottom Controls Overlay */}
          <div className="absolute bottom-6 left-6 right-6 flex gap-6 z-10">
            
            {/* Toggles Panel */}
            <div className="bg-app-surface/95 backdrop-blur border border-app-border p-5 rounded-2xl flex-1 shadow-2xl">
              <div className="text-xs uppercase tracking-widest font-bold text-app-text-muted mb-4">Climate Control</div>
              <div className="flex gap-4">
                <button 
                  onClick={() => {
                    const willBeEnabled = !acEnabled;
                    setAcEnabled(willBeEnabled);
                    playComponent(assignments['AC Toggle'] || (willBeEnabled ? 'ui.button.confirm' : 'ui.button.cancel'));
                  }}
                  className={`flex-1 flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${
                    acEnabled ? 'bg-[#3B82F61A] border-app-accent text-app-accent' : 'bg-app-surface-light border-app-border text-app-text-muted hover:border-app-text'
                  }`}
                >
                  <Wind size={24} className="mb-2" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">A/C</span>
                </button>
                <button 
                  onClick={() => {
                    const willBeEnabled = !defrostEnabled;
                    setDefrostEnabled(willBeEnabled);
                    playComponent(assignments['Defrost Toggle'] || (willBeEnabled ? 'ui.button.confirm' : 'ui.button.cancel'));
                  }}
                  className={`flex-1 flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${
                    defrostEnabled ? 'bg-[#F59E0B1A] border-app-amber text-app-amber' : 'bg-app-surface-light border-app-border text-app-text-muted hover:border-app-text'
                  }`}
                >
                  <Thermometer size={24} className="mb-2" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Defrost</span>
                </button>
              </div>
            </div>

            {/* Voice Assistant Panel */}
            <div className="bg-app-surface/95 backdrop-blur border border-app-border p-5 rounded-2xl flex-1 flex flex-col items-center justify-center shadow-2xl relative overflow-hidden">
              <AnimatePresence>
                {isListening && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                  >
                    <div className="w-32 h-32 rounded-full border border-app-accent/30 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]" />
                    <div className="absolute w-40 h-40 rounded-full border border-app-accent/10 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite_0.5s]" />
                  </motion.div>
                )}
              </AnimatePresence>
              
              <button 
                onClick={toggleVoice}
                className={`relative z-10 w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                  isListening 
                    ? 'bg-app-accent text-white shadow-[0_0_20px_rgba(59,130,246,0.5)]' 
                    : 'bg-app-surface-light border border-app-border text-app-text hover:border-app-accent hover:text-app-accent'
                }`}
              >
                <Mic size={28} />
              </button>
              <div className="text-[10px] font-bold uppercase tracking-wider text-app-text-muted mt-3">
                {isListening ? 'Listening...' : 'Voice Command'}
              </div>
            </div>

          </div>
        </div>

        {/* RIGHT SIDEBAR - SYSTEM & NOTIFICATIONS */}
        <div className="w-72 bg-app-surface-light border-l border-app-border flex flex-col z-10 shadow-lg relative">
          
          {/* Engine Start (Long Press) */}
          <div className="p-6 border-b border-app-border flex flex-col items-center">
            <div className="text-[10px] uppercase tracking-widest font-bold text-app-text-muted mb-6">Engine Control</div>
            
            <button
              onMouseDown={startLongPress}
              onMouseUp={endLongPress}
              onMouseLeave={endLongPress}
              onTouchStart={startLongPress}
              onTouchEnd={endLongPress}
              className="relative w-32 h-32 rounded-full flex items-center justify-center transition-transform hover:scale-105 select-none touch-none group"
            >
              {/* Progress Ring */}
              <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 100 100">
                <circle 
                  cx="50" cy="50" r="46" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="4" 
                  className="text-app-border" 
                />
                <circle 
                  cx="50" cy="50" r="46" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="4" 
                  className={engineStarted ? 'text-app-accent' : 'text-red-500'}
                  strokeDasharray={`${2 * Math.PI * 46}`}
                  strokeDashoffset={engineStarted ? 0 : `${2 * Math.PI * 46 * (1 - pressProgress / 100)}`}
                  style={{ transition: 'stroke-dashoffset 50ms linear' }}
                />
              </svg>
              
              <div className={`w-28 h-28 rounded-full flex flex-col items-center justify-center transition-colors ${
                engineStarted 
                  ? 'bg-app-accent/20 border-2 border-app-accent text-app-accent shadow-[0_0_20px_rgba(59,130,246,0.3)]' 
                  : isPressing
                    ? 'bg-red-500/20 border-2 border-red-500 text-red-500'
                    : 'bg-app-surface border border-app-border text-app-text group-hover:border-red-500/50'
              }`}>
                <Power size={32} className="mb-1" />
                <span className="text-[10px] font-bold uppercase tracking-widest">
                  {engineStarted ? 'Running' : 'Hold'}
                </span>
              </div>
            </button>
            <div className="text-[10px] text-app-text-muted mt-4 text-center">
              {engineStarted ? 'Press to Stop' : 'Hold to Start Engine'}
            </div>
          </div>

          {/* Notifications */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2 mb-2 px-2">
              <Bell size={14} className="text-app-text-muted" />
              <span className="text-xs font-bold uppercase tracking-widest text-app-text-muted">Alerts</span>
            </div>
            
            <AnimatePresence>
              {notifications.map(notif => (
                <motion.div 
                  key={notif.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className={`p-4 rounded-xl border relative cursor-pointer group ${
                    notif.type === 'warning' ? 'bg-[#F59E0B1A] border-app-amber' : 'bg-app-surface border-app-border hover:border-app-text-muted'
                  }`}
                  onClick={() => removeNotification(notif.id)}
                >
                  <div className="flex items-start gap-3">
                    {notif.type === 'warning' ? (
                      <AlertTriangle size={16} className="text-app-amber mt-0.5" />
                    ) : (
                      <InfoIcon size={16} className="text-app-accent mt-0.5" />
                    )}
                    <div>
                      <div className={`text-xs font-bold mb-1 ${notif.type === 'warning' ? 'text-app-amber' : 'text-app-text'}`}>
                        {notif.title}
                      </div>
                      <div className="text-[10px] text-app-text-muted leading-relaxed">
                        {notif.desc}
                      </div>
                    </div>
                  </div>
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[9px] uppercase tracking-wider text-app-text-muted">Dismiss</span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {notifications.length === 0 && (
              <div className="text-center py-8 text-app-text-muted flex flex-col items-center">
                <CheckCircle2 size={24} className="mb-2 opacity-50" />
                <span className="text-[10px] uppercase tracking-widest font-bold opacity-50">All Clear</span>
              </div>
            )}
          </div>

        </div>
        
        {/* EDIT SOUNDS BUTTON (Floating) */}
        <div className="absolute top-4 right-4 z-50">
          <button 
            onClick={() => setShowSoundSettings(!showSoundSettings)}
            className={`p-2 rounded-lg border shadow-lg backdrop-blur flex items-center gap-2 transition-all ${
              showSoundSettings 
                ? 'bg-app-accent text-white border-app-accent' 
                : 'bg-app-surface/80 text-app-text border-app-border hover:border-app-text'
            }`}
          >
            <Settings size={16} />
            <span className="text-xs font-bold uppercase tracking-wider">Sound Map</span>
          </button>
        </div>

        {/* SOUND SETTINGS PANEL */}
        <AnimatePresence>
          {showSoundSettings && (
            <motion.div 
              initial={{ opacity: 0, x: 300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 300 }}
              className="absolute top-0 right-0 bottom-0 w-80 bg-app-surface/95 backdrop-blur-xl border-l border-app-border shadow-2xl z-40 flex flex-col"
            >
              <div className="p-6 border-b border-app-border pt-16">
                <h3 className="text-sm font-bold text-app-text uppercase tracking-widest">Component Sound Map</h3>
                <p className="text-[10px] text-app-text-muted mt-2">Assign custom tokens from Explorer to prototype elements.</p>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {elementsToMap.map(el => (
                  <div key={el.id} className="flex flex-col gap-1.5 border-b border-app-border/50 pb-3 last:border-0">
                    <label className="text-[10px] uppercase tracking-wider text-app-text-muted font-bold">
                      {el.id}
                    </label>
                    <select
                      value={assignments[el.id] || ''}
                      onChange={e => onUpdateAssignment(el.id, e.target.value)}
                      className="bg-app-surface-light border border-app-border text-xs p-2 rounded text-app-text outline-none focus:border-app-accent"
                    >
                      <option value="">{el.default} (Default)</option>
                      {allTokens.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Quick fallback for InfoIcon if not imported (to prevent missing import errors)
function InfoIcon(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="16" x2="12" y2="12"></line>
      <line x1="12" y1="8" x2="12.01" y2="8"></line>
    </svg>
  );
}


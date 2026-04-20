import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../lib/LanguageContext';
import { cn } from '../lib/utils';
import { Power, Settings2, Cpu } from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { onSnapshot, doc, collection, query, orderBy, limit, updateDoc } from 'firebase/firestore';

const Particle: React.FC<{ delay: number }> = ({ delay }) => (
  <motion.div
    initial={{ y: -20, opacity: 0, x: Math.random() * 800 }}
    animate={{ 
      y: 500, 
      opacity: [0, 0.8, 0],
    }}
    transition={{ 
      duration: 2 + Math.random() * 1.5, 
      delay, 
      repeat: Infinity, 
      ease: "linear" 
    }}
    className="absolute w-[1px] h-10 bg-[#00E676]/60 blur-[1px]"
  />
);

const Plant: React.FC<{ x: number, delay: number, isGlowing: boolean }> = ({ x, delay, isGlowing }) => (
  <motion.div
    initial={{ scaleY: 0 }}
    animate={{ 
      scaleY: isGlowing ? [1, 1.1, 1] : 1,
      filter: isGlowing ? 'drop-shadow(0 0 15px rgba(0, 230, 118, 0.8))' : 'none'
    }}
    transition={{ 
      scaleY: isGlowing ? { duration: 2, repeat: Infinity } : { duration: 1, delay },
      filter: { duration: 0.5 }
    }}
    style={{ left: `${x}%` }}
    className="absolute bottom-0 w-4 group"
  >
    <div className={cn(
      "h-32 w-1 mx-auto relative transition-colors duration-500",
      isGlowing ? "bg-[#00E676]" : "bg-zinc-800"
    )}>
      <motion.div 
        animate={{ 
          scale: isGlowing ? [1, 1.5, 1] : 1,
          opacity: isGlowing ? [0.6, 1, 0.6] : 0.2
        }}
        className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-[#00E676] blur-sm" 
      />
      {[0, 1, 2, 3].map((i) => (
        <div 
          key={i} 
          className={cn(
            "absolute w-4 h-1.5 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(0,0,0,0.5)]",
            isGlowing ? "bg-[#00E676] shadow-[#00E676]/20" : "bg-zinc-800",
            i % 2 === 0 ? "left-1 -rotate-45" : "right-1 rotate-45"
          )}
          style={{ bottom: `${i * 20}%` }}
        />
      ))}
    </div>
  </motion.div>
);

export const LiveSimulation = () => {
  const { t } = useLanguage();
  const [isAutoMode, setIsAutoMode] = useState(true);
  const [isPumpOn, setIsPumpOn] = useState(false);
  const [stats, setStats] = useState({ soil: 74, temp: 27.8, humid: 72 });

  // Sync with Firestore Real-time
  useEffect(() => {
    // 1. Listen to System Status
    const statusUnsubscribe = onSnapshot(doc(db, 'system_config', 'status'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setIsAutoMode(!!data.is_auto_mode);
        setIsPumpOn(!!data.is_watering);
      }
    });

    // 2. Listen to Latest Sensor Data
    const sensorQuery = query(collection(db, 'sensor_data'), orderBy('timestamp', 'desc'), limit(1));
    const sensorUnsubscribe = onSnapshot(sensorQuery, (snapshot) => {
      if (!snapshot.empty) {
        const latest = snapshot.docs[0].data();
        setStats({ 
          soil: latest.soil_moisture || 0, 
          temp: latest.temp || 0, 
          humid: latest.humidity || 0 
        });
      }
    });

    return () => {
      statusUnsubscribe();
      sensorUnsubscribe();
    };
  }, []);

  const toggleAutoMode = async () => {
    const nextMode = !isAutoMode;
    // Optimistic update
    setIsAutoMode(nextMode);
    
    try {
      if (auth.currentUser) {
        await updateDoc(doc(db, 'system_config', 'status'), { 
          is_auto_mode: nextMode,
          lastUpdated: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error("Failed to update mode:", err);
      // Revert optimization if failed
      setIsAutoMode(!nextMode);
    }
  };

  const togglePump = async () => {
    if (isAutoMode) return; 
    const nextState = !isPumpOn;
    setIsPumpOn(nextState);
    
    try {
      if (auth.currentUser) {
        await updateDoc(doc(db, 'system_config', 'status'), { 
          is_watering: nextState,
          lastUpdated: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error("Failed to update pump:", err);
      setIsPumpOn(!nextState);
    }
  };


  return (
    <div className="space-y-8">
      <div className="relative w-full h-[600px] bg-[#020904] rounded-[3rem] overflow-hidden border border-[#00E676]/10 shadow-[0_0_100px_rgba(0,0,0,0.8)] group">
        <div className="absolute inset-0 bg-grid opacity-10 pointer-events-none" />
        <div className="scanline opacity-20" />

        <AnimatePresence>
          {isPumpOn && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 pointer-events-none"
            >
              {[...Array(30)].map((_, i) => (
                <Particle key={i} delay={i * 0.1} />
              ))}
              <div className="absolute inset-x-0 top-0 h-2 bg-[#00E676]/20 blur-xl animate-pulse" />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative z-10 p-12 h-full flex flex-col justify-between pointer-events-none">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <span className="text-[#00E676] text-[10px] font-black tracking-[0.4em] uppercase font-mono">{t('sim.stream')}</span>
                {isPumpOn && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-2 bg-[#00E676]/10 border border-[#00E676]/20 px-4 py-1 rounded-full"
                  >
                    <div className="w-1.5 h-1.5 bg-[#00E676] rounded-full animate-ping opacity-75" />
                    <span className="text-[10px] font-black text-[#00E676] uppercase tracking-widest font-mono">{t('sim.stabilizing')}</span>
                  </motion.div>
                )}
              </div>
              <h2 className="text-5xl md:text-7xl font-display font-black text-white max-w-2xl leading-[1.1] uppercase tracking-tight overflow-hidden">
                <motion.span 
                  initial={{ y: 100 }}
                  animate={{ y: 0 }}
                  transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                  className="block"
                >
                  {t('sim.title')}
                </motion.span>
              </h2>
            </div>

            <div className="flex flex-col items-end gap-3">
              <div className="flex items-center gap-3 bg-[#0D150F]/80 backdrop-blur-md border border-white/5 px-6 py-3 rounded-2xl shadow-2xl">
                <Cpu className={cn("w-4 h-4 transition-all duration-700", isAutoMode ? "text-[#00E676] animate-pulse" : "text-zinc-700")} />
                <span className="text-[10px] font-black text-white uppercase tracking-[0.3em] font-mono">
                   {t('sim.core')}_{isAutoMode ? t('sim.auto') : t('sim.manual')}
                </span>
              </div>
              <div className="text-[9px] font-black text-zinc-400 uppercase tracking-widest font-mono bg-black/40 px-6 py-2 rounded-xl">
                 {t('sim.uptime')}: 99.8% {t('sim.standby')}
              </div>
            </div>
          </div>

          <div className="flex justify-between items-end">
            <div className="grid gap-3 mb-10">
              {[
                { label: t('dashboard.soilHydro'), value: stats.soil, unit: '%', color: 'bg-[#00E676]' },
                { label: t('dashboard.thermal'), value: stats.temp, unit: '°C', color: 'bg-orange-500' },
                { label: t('dashboard.atmospheric'), value: stats.humid, unit: '%', color: 'bg-blue-500' }
              ].map((item, i) => (
                <div key={item.label} className="bg-[#0D150F]/90 backdrop-blur-md border border-[#00E676]/10 p-5 rounded-2xl w-72 shadow-2xl shadow-black/50">
                   <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] text-[#00E676] font-black uppercase tracking-[0.2em] font-mono">{item.label}</span>
                        <span className="text-sm text-white font-mono font-black">{item.value.toFixed(1)}{item.unit}</span>
                      </div>
                      <div className="h-1.5 bg-black/50 rounded-full overflow-hidden border border-white/5">
                        <motion.div animate={{ width: `${item.value}%` }} className={cn("h-full transition-all duration-1000", item.color, "shadow-[0_0_10px_currentColor]")} />
                      </div>
                   </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-32 px-12 pointer-events-none flex items-end justify-between pb-4">
          {[...Array(15)].map((_, i) => (
            <Plant key={i} x={i * 6 + 5} delay={i * 0.05} isGlowing={isPumpOn} />
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8 pb-10">
        <div className="bg-[#0D150F] border border-[#00E676]/10 rounded-[2.5rem] p-10 flex items-center justify-between group shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-grid opacity-5" />
          <div className="flex items-center gap-8 relative z-10">
            <div className={cn(
              "w-20 h-20 rounded-[2rem] flex items-center justify-center transition-all duration-700 shadow-2xl border-2",
              isAutoMode ? "bg-[#00E676]/10 text-[#00E676] border-[#00E676]/40 shadow-[#00E676]/10" : "bg-black/20 text-zinc-700 border-white/5"
            )}>
              <Settings2 className="w-10 h-10" />
            </div>
            <div>
              <h4 className="text-2xl font-display font-black text-white uppercase tracking-widest leading-none mb-3">{t('sim.status')} {t('sim.auto')}</h4>
              <p className="text-sm text-zinc-400 font-bold uppercase tracking-widest leading-none">{t('settings.thresholdsDesc')}</p>
            </div>
          </div>
          <button 
            onClick={toggleAutoMode}
            className={cn(
              "w-16 h-8 rounded-full relative transition-all duration-500 p-1 border",
              isAutoMode ? "bg-[#00E676] border-[#00E676]/50 shadow-[0_0_20px_rgba(0,230,118,0.4)]" : "bg-zinc-900 border-white/10 shadow-inner"
            )}
          >
            <motion.div 
              animate={{ x: isAutoMode ? 32 : 0 }}
              className="w-6 h-6 bg-white rounded-full shadow-lg" 
            />
          </button>
        </div>

        <div className={cn(
          "bg-[#0D150F] border border-[#00E676]/10 rounded-[2.5rem] p-10 flex items-center justify-between transition-all duration-500 shadow-2xl relative overflow-hidden",
          isAutoMode ? "opacity-20 pointer-events-none grayscale blur-sm scale-[0.98]" : "opacity-100"
        )}>
          <div className="absolute inset-0 bg-grid opacity-5" />
          <div className="flex items-center gap-8 relative z-10">
            <div className={cn(
              "w-20 h-20 rounded-[2rem] flex items-center justify-center transition-all duration-700 shadow-2xl border-2",
              isPumpOn ? "bg-[#00E676]/20 text-[#00E676] border-[#00E676]/40 shadow-[#00E676]/20 animate-pulse" : "bg-black/20 text-zinc-700 border-white/5"
            )}>
              <Power className="w-10 h-10" />
            </div>
            <div>
              <h4 className="text-2xl font-display font-black text-white uppercase tracking-widest leading-none mb-3">{t('sim.pump')}</h4>
              <p className="text-sm text-zinc-400 font-bold uppercase tracking-widest leading-none">{isPumpOn ? t('sim.active') : t('sim.standby')}</p>
            </div>
          </div>
          <button 
            onClick={togglePump}
            className={cn(
              "px-10 py-5 rounded-2xl font-black transition-all shadow-[0_0_30px_rgba(0,0,0,0.5)] active:scale-95 uppercase tracking-widest text-xs border border-white/10",
              isPumpOn 
                ? "bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500 hover:text-white" 
                : "bg-[#00E676]/10 text-[#00E676] border-[#00E676]/20 hover:bg-[#00E676] hover:text-[#050A06]"
            )}
          >
            {isPumpOn ? t('btn.stopPump') : t('btn.startPump')}
          </button>
        </div>
      </div>
    </div>
  );
};

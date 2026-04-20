import React, { useState, useEffect, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { 
  Sprout, 
  Droplets, 
  Thermometer, 
  Activity, 
  Calendar, 
  Clock, 
  Menu, 
  X, 
  ChevronRight, 
  Download, 
  Power, 
  BrainCircuit, 
  Home as HomeIcon,
  BarChart3,
  Leaf,
  Wind,
  Sun,
  AlertCircle,
  Settings,
  ArrowUpRight,
  CloudRain,
  Gauge,
  Zap,
  ShieldCheck,
  TrendingUp,
  Maximize2,
  Cpu,
  Settings2,
  Trash2,
  LayoutGrid,
  Target,
  LogIn,
  LogOut,
  User as UserIcon,
  Cloud,
  CloudOff,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { cn } from './lib/utils';
import { LanguageProvider, useLanguage } from './lib/LanguageContext';
import { db, auth } from './lib/firebase';
import { 
  onSnapshot, 
  collection, 
  query, 
  orderBy, 
  limit, 
  doc, 
  setDoc, 
  addDoc,
  getDocs,
  getDoc,
  where,
  startAt,
  endAt
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { LiveSimulation } from './components/LiveSimulation';

// --- Types ---
interface SensorData {
  time: string;
  temp: number;
  humidity: number;
  soil_moisture?: number;
  fullTimestamp?: string;
}

// --- Reusable Components ---

const CloudStatus = ({ user, dataLength }: { user: User | null, dataLength: number }) => {
  return (
    <div className={cn(
      "flex items-center gap-4 px-6 py-3 rounded-2xl transition-all duration-500 border",
      user 
        ? "bg-[#00E676]/5 border-[#00E676]/20 shadow-[0_0_20px_rgba(0,230,118,0.05)]" 
        : "bg-zinc-900/50 border-white/5 opacity-50"
    )}>
      <div className="relative">
        {user ? (
          <Cloud className="w-5 h-5 text-[#00E676]" />
        ) : (
          <CloudOff className="w-5 h-5 text-zinc-500" />
        )}
      </div>
      
      <div className="flex flex-col">
        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-300">
          {user ? 'Cloud Active' : 'Cloud Offline'}
        </span>
        <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-tighter">
          {user ? `${dataLength} points connected` : 'Connect to sync data'}
        </span>
      </div>
    </div>
  );
};

const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-[#1A2E1F]/40 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="glass-modal w-full max-w-lg rounded-[2.5rem] p-10 relative z-10"
        >
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-display font-bold text-[#1A2E1F]">{title}</h3>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-zinc-100 transition-colors">
              <X className="w-6 h-6 text-zinc-400" />
            </button>
          </div>
          {children}
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#0D150F]/90 backdrop-blur-md border border-[#00E676]/20 p-4 rounded-2xl shadow-2xl">
        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3 font-mono">{label}</p>
        <div className="space-y-2">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-xs font-bold text-zinc-300 capitalize">{entry.name.replace('_', ' ')}</span>
              </div>
              <span className="text-xs font-black text-[#00E676] font-mono">
                {entry.value.toFixed(1)}{entry.name === 'temp' ? '°C' : '%'}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

// --- Navigation ---

const Navigation = () => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const { language, setLanguage, t } = useLanguage();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  const handleAuth = async () => {
    if (user) {
      await signOut(auth);
    } else {
      const provider = new GoogleAuthProvider();
      try {
        await signInWithPopup(auth, provider);
      } catch (e) {
        console.error("Login failed:", e);
      }
    }
  };

  const navItems = [
    { path: '/', label: t('nav.home'), icon: HomeIcon },
    { path: '/live', label: t('nav.live'), icon: CloudRain },
    { path: '/dashboard', label: t('nav.dashboard'), icon: Activity },
    { path: '/analytics', label: t('nav.analytics'), icon: BarChart3 },
    { path: '/ai-insights', label: t('nav.ai'), icon: BrainCircuit },
  ];

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-6 transition-all duration-500">
        <div className="max-w-7xl mx-auto flex items-center justify-between nav-blur rounded-3xl px-8 py-3 border-[#00E676]/20 shadow-[0_0_40px_rgba(0,0,0,0.8)] overflow-hidden">
          <Link to="/" className="flex items-center gap-3 group relative z-10">
            <div className="w-10 h-10 rounded-xl bg-[#00E676] flex items-center justify-center shadow-[0_0_20px_rgba(0,230,118,0.4)] group-hover:rotate-12 transition-all duration-500 border border-[#00E676]/50">
              <Sprout className="text-[#050A06] w-6 h-6" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-display font-black text-white tracking-widest leading-none">HYDROFLOW</span>
              <span className="text-[9px] font-black text-[#00E676] uppercase tracking-[0.4em] mt-1">NEX-TECH AGRI</span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-1 relative z-10">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300",
                  location.pathname === item.path 
                    ? "bg-[#00E676] text-[#050A06] shadow-[0_0_15px_rgba(0,230,118,0.3)]" 
                    : "text-zinc-400 hover:text-[#00E676] hover:bg-[#00E676]/5"
                )}
              >
                <item.icon className="w-3.5 h-3.5" />
                {item.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-4 relative z-10">
            <div className="flex bg-black/40 border border-white/10 rounded-xl p-1 shadow-inner">
              <button 
                onClick={() => setLanguage('en')}
                className={cn(
                  "px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                  language === 'en' ? "bg-[#00E676] text-[#050A06] shadow-[0_0_10px_rgba(0,230,118,0.2)]" : "text-zinc-400 hover:text-white"
                )}
              >
                EN
              </button>
              <button 
                onClick={() => setLanguage('hi')}
                className={cn(
                  "px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                  language === 'hi' ? "bg-[#00E676] text-[#050A06] shadow-[0_0_10px_rgba(0,230,118,0.2)]" : "text-zinc-400 hover:text-white"
                )}
              >
                HI
              </button>
            </div>

            <button 
              onClick={handleAuth}
              className={cn(
                "flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
                user 
                  ? "bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500 hover:text-white shadow-[0_0_15px_rgba(239,68,68,0.1)]" 
                  : "bg-[#00E676]/10 text-[#00E676] border-[#00E676]/20 hover:bg-[#00E676] hover:text-[#050A06] shadow-[0_0_15px_rgba(0,230,118,0.1)]"
              )}
            >
              {user ? <LogOut className="w-3.5 h-3.5" /> : <LogIn className="w-3.5 h-3.5" />}
              {user ? user.displayName?.split(' ')[0] : 'Connect'}
            </button>

            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="p-3 rounded-xl bg-white/5 border border-white/10 text-zinc-400 hover:text-[#00E676] hover:bg-[#00E676]/10 transition-all shadow-inner"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>

          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden text-[#00E676] p-2"
          >
            {isOpen ? <X /> : <Menu />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            className="fixed inset-y-0 right-0 z-40 bg-[#050A06]/95 backdrop-blur-xl w-80 p-12 md:hidden border-l border-[#00E676]/20 shadow-2xl"
          >
            <div className="flex justify-end mb-12">
               <button onClick={() => setIsOpen(false)} className="text-[#00E676]"><X className="w-8 h-8" /></button>
            </div>
            <div className="flex flex-col gap-6">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-4 p-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all",
                    location.pathname === item.path 
                      ? "bg-[#00E676] text-[#050A06] shadow-[0_0_20px_rgba(0,230,118,0.3)]" 
                      : "text-zinc-400 border border-white/5"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  );
};

const SettingsModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const [notifications, setNotifications] = useState(true);
  const [autoIrrigation, setAutoIrrigation] = useState(true);
  const [highContrast, setHighContrast] = useState(false);
  const { t } = useLanguage();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('settings.title')}>
      <div className="space-y-6">
        <div 
          onClick={() => setNotifications(!notifications)}
          className="flex items-center justify-between p-4 rounded-2xl border border-[#E2E8E1] hover:bg-[#F8FAF7] transition-colors cursor-pointer group"
        >
          <div>
            <div className="font-bold text-[#1A2E1F] group-hover:text-[#4CAF50] transition-colors">{t('settings.notifications')}</div>
            <div className="text-sm text-zinc-400">{t('settings.notificationsDesc')}</div>
          </div>
          <div className={cn(
            "w-12 h-6 rounded-full relative transition-colors duration-300 shadow-inner",
            notifications ? "bg-[#4CAF50]" : "bg-zinc-200"
          )}>
            <motion.div 
              animate={{ x: notifications ? 26 : 4 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
            />
          </div>
        </div>

        <div 
          onClick={() => setAutoIrrigation(!autoIrrigation)}
          className="flex items-center justify-between p-4 rounded-2xl border border-[#E2E8E1] hover:bg-[#F8FAF7] transition-colors cursor-pointer group"
        >
          <div>
            <div className="font-bold text-[#1A2E1F] group-hover:text-[#4CAF50] transition-colors">{t('settings.thresholds')}</div>
            <div className="text-sm text-zinc-400">{t('settings.thresholdsDesc')}</div>
          </div>
          <div className={cn(
            "w-12 h-6 rounded-full relative transition-colors duration-300 shadow-inner",
            autoIrrigation ? "bg-[#4CAF50]" : "bg-zinc-200"
          )}>
            <motion.div 
              animate={{ x: autoIrrigation ? 26 : 4 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
            />
          </div>
        </div>

        <div 
          onClick={() => setHighContrast(!highContrast)}
          className="flex items-center justify-between p-4 rounded-2xl border border-[#E2E8E1] hover:bg-[#F8FAF7] transition-colors cursor-pointer group"
        >
          <div>
            <div className="font-bold text-[#1A2E1F] group-hover:text-[#4CAF50] transition-colors">{t('settings.contrast')}</div>
            <div className="text-sm text-zinc-400">{t('settings.contrastDesc')}</div>
          </div>
          <div className={cn(
            "w-12 h-6 rounded-full relative transition-colors duration-300 shadow-inner",
            highContrast ? "bg-[#4CAF50]" : "bg-zinc-200"
          )}>
            <motion.div 
              animate={{ x: highContrast ? 26 : 4 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
            />
          </div>
        </div>
        
        <div className="pt-4 flex gap-4">
          <button onClick={onClose} className="flex-1 btn-primary py-3">{t('btn.save')}</button>
        </div>
      </div>
    </Modal>
  );
};

const PageWrapper = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    className="pt-36 pb-20 px-6 max-w-7xl mx-auto"
  >
    {children}
  </motion.div>
);

// --- Pages ---

const Home = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { t } = useLanguage();

  return (
    <PageWrapper>
      <div className="grid lg:grid-cols-2 gap-20 items-center min-h-[70vh]">
        <div className="space-y-10">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#4CAF50]/10 text-[#4CAF50] text-xs font-extrabold uppercase tracking-[0.2em] mb-8 border border-[#4CAF50]/20">
              <Sun className="w-3.5 h-3.5" /> {t('home.badge')}
            </div>
            <h1 className="text-6xl md:text-8xl font-display font-extrabold text-white leading-[1.05] mb-8 tracking-tight">
              {t('home.title')} <br />
              <span className="text-gradient">{t('home.titleAccent')}</span>
            </h1>
            <p className="text-xl text-zinc-400 max-w-lg leading-relaxed mb-12 font-medium">
              {t('home.desc')}
            </p>
            <div className="flex flex-wrap gap-6">
              <Link to="/live" className="btn-primary group">
                {t('home.getStarted')} <ArrowUpRight className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </Link>
              <Link to="/dashboard" className="btn-secondary">
                {t('nav.dashboard')}
              </Link>
            </div>
          </motion.div>

          <div className="flex gap-12 pt-16">
            {[
              { label: t('home.efficiency'), value: '98%' },
              { label: t('home.waterSaved'), value: '45%' },
              { label: t('home.growth'), value: '+32%' },
            ].map((stat, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
              >
                <div className="text-3xl font-display font-extrabold text-white mb-1">{stat.value}</div>
                <div className="text-[10px] font-black text-[#00E676] uppercase tracking-[0.2em]">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="relative h-[600px] flex items-center justify-center">
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Field Pulse Animation */}
            <motion.div
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.6, 0.3]
              }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute w-[500px] h-[500px] bg-[#4CAF50]/10 rounded-full blur-[80px]"
            />
            
            <div className="relative z-10 w-96 h-96 flex items-center justify-center">
              <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-[0_0_30px_rgba(0,230,118,0.2)]">
                <motion.circle
                  cx="100"
                  cy="100"
                  r="80"
                  fill="none"
                  stroke="#00E676"
                  strokeWidth="0.5"
                  strokeDasharray="4 4"
                  animate={{ rotate: 360, scale: [1, 1.05, 1] }}
                  transition={{ 
                    rotate: { duration: 40, repeat: Infinity, ease: "linear" },
                    scale: { duration: 4, repeat: Infinity, ease: "easeInOut" }
                  }}
                />
                <motion.circle
                  cx="100"
                  cy="100"
                  r="60"
                  fill="none"
                  stroke="#00E676"
                  strokeWidth="0.5"
                  strokeDasharray="8 8"
                  animate={{ rotate: -360, opacity: [0.2, 0.5, 0.2] }}
                  transition={{ 
                    rotate: { duration: 30, repeat: Infinity, ease: "linear" },
                    opacity: { duration: 3, repeat: Infinity, ease: "easeInOut" }
                  }}
                />
                
                {/* Energy Pulse Ring */}
                <motion.circle
                  cx="100"
                  cy="100"
                  r="40"
                  fill="none"
                  stroke="#00E676"
                  strokeWidth="2"
                  animate={{ 
                    scale: [1, 2.5, 1],
                    opacity: [0.4, 0, 0.4]
                  }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeOut" }}
                />

                {/* Central Core Glow */}
                <defs>
                  <radialGradient id="coreGlow">
                    <stop offset="0%" stopColor="#00E676" stopOpacity="0.5" />
                    <stop offset="70%" stopColor="#00E676" stopOpacity="0.1" />
                    <stop offset="100%" stopColor="#00E676" stopOpacity="0" />
                  </radialGradient>
                </defs>
                <circle cx="100" cy="100" r="50" fill="url(#coreGlow)" />
              </svg>
              
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative">
                  <motion.div 
                    animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }} 
                    transition={{ duration: 4, repeat: Infinity }}
                    className="w-24 h-24 rounded-[2rem] bg-[#00E676] flex items-center justify-center shadow-[0_0_40px_rgba(0,230,118,0.5)] border-4 border-[#050A06]"
                  >
                    <Activity className="text-[#050A06] w-10 h-10" />
                  </motion.div>
                </div>
              </div>
            </div>

            {/* Floating Data Nodes */}
            {[
              { icon: Thermometer, color: 'text-orange-500', bg: 'bg-orange-500/10', label: '24.5°C', delay: 0, x: -140, y: -140 },
              { icon: Droplets, color: 'text-blue-500', bg: 'bg-blue-500/10', label: '62%', delay: 1, x: 160, y: -100 },
              { icon: Zap, color: 'text-yellow-500', bg: 'bg-yellow-500/10', label: t('status.live'), delay: 2, x: 120, y: 160 },
              { icon: ShieldCheck, color: 'text-[#00E676]', bg: 'bg-[#00E676]/10', label: t('dashboard.optimal'), delay: 3, x: -160, y: 120 },
            ].map((node, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ 
                  opacity: 1, 
                  scale: 1,
                  x: node.x,
                  y: node.y
                }}
                transition={{ 
                  delay: 0.8 + node.delay * 0.2,
                  duration: 0.8,
                  ease: [0.22, 1, 0.36, 1]
                }}
                className="absolute"
              >
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 4 + i, repeat: Infinity, ease: "easeInOut" }}
                  className="bg-[#0D150F]/80 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-[#00E676]/20 flex items-center gap-3"
                >
                  <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", node.bg, node.color)}>
                    <node.icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-black text-[#00E676] uppercase tracking-widest font-mono">{node.label}</span>
                </motion.div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Scroll Reveal Section */}
      <div className="mt-60">
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="text-center mb-24"
        >
          <h2 className="text-5xl md:text-6xl font-display font-extrabold text-white mb-8 tracking-tight">
            {t('home.ecosystem')}
          </h2>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto font-medium">
            {t('home.ecosystemDesc')}
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-10">
          {[
            { icon: Wind, title: t('home.feature1.title'), desc: t('home.feature1.desc'), color: 'orange', link: '/dashboard' },
            { icon: Droplets, title: t('home.feature2.title'), desc: t('home.feature2.desc'), color: 'blue', link: '/dashboard' },
            { icon: BrainCircuit, title: t('home.feature3.title'), desc: t('home.feature3.desc'), color: 'emerald', link: '/ai-insights' },
          ].map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: i * 0.2, duration: 0.8 }}
              className="farm-card group border-[#00E676]/5"
            >
              <div className={cn(
                "w-20 h-20 rounded-[2rem] flex items-center justify-center mb-10 group-hover:scale-110 transition-all duration-700 shadow-xl border-2",
                feature.color === 'orange' ? "bg-orange-500/10 text-orange-500 border-orange-500/20 shadow-orange-500/10" :
                feature.color === 'blue' ? "bg-blue-500/10 text-blue-500 border-blue-500/20 shadow-blue-500/10" :
                "bg-[#00E676]/10 text-[#00E676] border-[#00E676]/20 shadow-[#00E676]/10"
              )}>
                <feature.icon className="w-10 h-10" />
              </div>
              <h3 className="text-3xl font-display font-black text-white mb-6 uppercase tracking-widest">{feature.title}</h3>
              <p className="text-lg text-zinc-400 leading-relaxed font-bold">{feature.desc}</p>
              
              <Link to={feature.link} className="mt-10 pt-10 border-t border-[#00E676]/10 flex items-center justify-between group/link cursor-pointer">
                <span className="text-[10px] font-black text-[#00E676] uppercase tracking-[0.3em]">{t('home.phaseAccess')}</span>
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover/link:bg-[#00E676] group-hover/link:text-[#050A06] transition-colors">
                  <ChevronRight className="w-5 h-5" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Pop-up Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={t('home.modal.title')}
      >
        <div className="space-y-8">
          <div className="grid grid-cols-2 gap-6">
            <div className="p-6 rounded-3xl bg-orange-500/5 border border-orange-500/10">
              <div className="text-xs font-bold text-orange-500 uppercase tracking-widest mb-2">{t('dashboard.thermal')}</div>
              <div className="text-3xl font-display font-bold text-white">24.5°C</div>
            </div>
            <div className="p-6 rounded-3xl bg-blue-500/5 border border-blue-500/10">
              <div className="text-xs font-bold text-blue-500 uppercase tracking-widest mb-2">{t('dashboard.atmospheric')}</div>
              <div className="text-3xl font-display font-bold text-white">62%</div>
            </div>
          </div>
          
          <div className="p-8 rounded-[2rem] bg-zinc-900 border border-white/5 text-white">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#00E676]/10 flex items-center justify-center">
                <Zap className="w-5 h-5 text-[#00E676]" />
              </div>
              <h4 className="text-xl font-bold">System Health</h4>
            </div>
            <p className="text-zinc-400 font-bold leading-relaxed">
              {t('home.modal.desc')}
            </p>
          </div>

          <button 
            onClick={() => setIsModalOpen(false)}
            className="w-full btn-primary"
          >
            {t('common.close')}
          </button>
        </div>
      </Modal>
    </PageWrapper>
  );
};

const Dashboard = () => {
  const [data, setData] = useState<SensorData[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const { t } = useLanguage();

  const fetchData = async () => {
    // We'll use the onSnapshot instead for live updates
  };

  useEffect(() => {
    // Real-time Firestore sync
    const sensorQuery = query(collection(db, 'sensor_data'), orderBy('timestamp', 'desc'), limit(24));
    const unsubscribe = onSnapshot(sensorQuery, (snapshot) => {
      const sensorData: SensorData[] = snapshot.docs.map(doc => {
        const d = doc.data();
        return {
          time: new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          temp: d.temp,
          humidity: d.humidity,
          soil_moisture: d.soil_moisture,
          fullTimestamp: d.timestamp
        };
      }).reverse();
      setData(sensorData);
    });

    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => {
      unsubscribe();
      clearInterval(timer);
    };
  }, []);

  const current = data[data.length - 1] || { temp: 0, humidity: 0, soil_moisture: 0 };

  const simulateData = async () => {
    try {
      const timestamp = new Date().toISOString();
      await addDoc(collection(db, 'sensor_data'), { 
        temp: 20 + Math.random() * 15, 
        humidity: 30 + Math.random() * 50,
        soil_moisture: 20 + Math.random() * 60,
        timestamp
      });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <PageWrapper>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-16">
        <div>
          <h2 className="text-5xl font-display font-black text-white mb-3 tracking-widest uppercase">{t('dashboard.title')}</h2>
          <p className="text-lg text-zinc-400 font-bold uppercase tracking-widest text-xs">{t('dashboard.desc')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <CloudStatus user={auth.currentUser} dataLength={data.length} />
          <button onClick={simulateData} className="btn-secondary group">
            <Cpu className="w-4 h-4 group-hover:rotate-180 transition-transform duration-700" /> {t('nav.live')}
          </button>
          <div className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-[#00E676]/5 border border-[#00E676]/20 shadow-[0_0_15px_rgba(0,230,118,0.1)]">
            <div className="w-2.5 h-2.5 rounded-full bg-[#00E676] animate-pulse shadow-[0_0_10px_rgba(0,230,118,0.8)]" />
            <span className="text-[10px] font-black text-[#00E676] uppercase tracking-[0.3em]">{t('status.live')}</span>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8 mb-12">
        <motion.div whileHover={{ y: -8 }} className="farm-card border-orange-500/20">
          <div className="flex items-center justify-between mb-8">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center border border-orange-500/20">
              <Thermometer className="w-6 h-6" />
            </div>
            <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest font-mono">{t('dashboard.thermal')}</div>
          </div>
          <div className="text-6xl font-display font-black text-white mb-4 font-mono">
            {current.temp.toFixed(1)}<span className="text-orange-500 text-2xl">°C</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-black text-orange-500 bg-orange-500/5 px-4 py-2 rounded-xl w-fit border border-orange-500/10 uppercase tracking-widest">
            <TrendingUp className="w-3 h-3" /> {t('dashboard.optimal')}
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -8 }} className="farm-card border-[#00E676]/20">
          <div className="flex items-center justify-between mb-8">
            <div className="w-12 h-12 rounded-2xl bg-[#00E676]/10 text-[#00E676] flex items-center justify-center border border-[#00E676]/20">
              <Droplets className="w-6 h-6" />
            </div>
            <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest font-mono">{t('dashboard.atmospheric')}</div>
          </div>
          <div className="text-6xl font-display font-black text-white mb-4 font-mono">
            {current.humidity.toFixed(1)}<span className="text-[#00E676] text-2xl">%</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-black text-[#00E676] bg-[#00E676]/5 px-4 py-2 rounded-xl w-fit border border-[#00E676]/10 uppercase tracking-widest">
            <ShieldCheck className="w-3 h-3" /> {t('dashboard.optimal')}
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -8 }} className="farm-card border-blue-500/20">
          <div className="flex items-center justify-between mb-8">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center border border-blue-500/20">
              <Sprout className="w-6 h-6" />
            </div>
            <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest font-mono">{t('dashboard.soilHydro')}</div>
          </div>
          <div className="text-6xl font-display font-black text-white mb-4 font-mono">
            {(current.soil_moisture || 0).toFixed(1)}<span className="text-blue-500 text-2xl">%</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-black text-blue-500 bg-blue-500/5 px-4 py-2 rounded-xl w-fit border border-blue-500/10 uppercase tracking-widest">
            <Gauge className="w-3 h-3" /> {t('dashboard.optimal')}
          </div>
        </motion.div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="farm-card bg-[#0D150F] text-white border-[#00E676]/20 p-10 overflow-hidden group">
          <div className="relative z-10 h-full flex flex-col justify-between">
            <div className="space-y-6">
              <div className="w-16 h-16 rounded-[2rem] bg-white/5 border border-white/10 flex items-center justify-center">
                <CloudRain className="w-8 h-8 text-[#00E676]" />
              </div>
              <h3 className="text-4xl font-display font-black uppercase tracking-widest">{t('dashboard.nexus.title')}</h3>
              <p className="text-zinc-400 text-lg leading-relaxed max-w-sm font-bold">
                {t('dashboard.nexus.desc')}
              </p>
            </div>
            <Link to="/live" className="btn-primary mt-10 w-fit">
              {t('dashboard.nexus.btn')} <ArrowUpRight className="w-5 h-5" />
            </Link>
          </div>
          <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-[#00E676] opacity-5 rounded-full blur-[100px] group-hover:opacity-10 transition-opacity" />
        </div>

        <div className="farm-card p-10 flex flex-col justify-between group bg-white/5 backdrop-blur-sm border-white/10">
           <div className="space-y-6">
              <div className="w-16 h-16 rounded-[2rem] bg-[#00E676]/10 flex items-center justify-center border border-[#00E676]/20">
                <BarChart3 className="w-8 h-8 text-[#00E676]" />
              </div>
              <h3 className="text-4xl font-display font-black uppercase tracking-widest text-white">{t('dashboard.quantum.title')}</h3>
              <p className="text-zinc-400 text-lg leading-relaxed max-w-sm font-bold">
                {t('dashboard.quantum.desc')}
              </p>
            </div>
            <Link to="/analytics" className="btn-secondary mt-10 w-fit">
              {t('dashboard.quantum.btn')} <ArrowUpRight className="w-5 h-5" />
            </Link>
        </div>
      </div>
    </PageWrapper>
  );
};

const Analytics = () => {
  const [startDate, setStartDate] = useState(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [history, setHistory] = useState<SensorData[]>([]);
  const [chartType, setChartType] = useState<'area' | 'line' | 'bar'>('area');
  const [visibleKeys, setVisibleKeys] = useState({ temp: true, humidity: true, soil: true });
  const { t } = useLanguage();

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const sensorQuery = query(
          collection(db, 'sensor_data'),
          where('timestamp', '>=', new Date(startDate).toISOString()),
          where('timestamp', '<=', new Date(endDate + 'T23:59:59').toISOString()),
          orderBy('timestamp', 'desc'),
          limit(100)
        );
        const snapshot = await getDocs(sensorQuery);
        const data: SensorData[] = snapshot.docs.map(doc => {
          const d = doc.data();
          return {
            time: new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            temp: d.temp,
            humidity: d.humidity,
            soil_moisture: d.soil_moisture,
            fullTimestamp: d.timestamp
          };
        }).reverse();
        setHistory(data);
      } catch (e) {
        console.error("Firestore history fetch failed:", e);
        setHistory([]);
      }
    };
    fetchHistory();
  }, [startDate, endDate]);

  const downloadReport = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text(t('analytics.reportTitle'), 14, 22);
    doc.setFontSize(11);
    doc.text(`${t('analytics.reportPeriod')}: ${startDate} to ${endDate}`, 14, 30);
    
    const tableData = history.map(d => [d.time, `${d.temp.toFixed(1)}°C`, `${d.humidity.toFixed(1)}%`]);
    
    (doc as any).autoTable({
      head: [[t('analytics.time'), t('analytics.temp'), t('analytics.humidity')]],
      body: tableData,
      startY: 40,
      theme: 'grid',
      headStyles: { fillColor: [0, 230, 118] },
    });

    doc.save(`hydroflow-analytics-${endDate}.pdf`);
  };

  const ChartComponent = chartType === 'area' ? AreaChart : chartType === 'bar' ? BarChart : LineChart;

  return (
    <PageWrapper>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-16">
        <div>
          <h2 className="text-5xl font-display font-black text-white mb-3 tracking-widest uppercase">{t('analytics.title')}</h2>
          <p className="text-lg text-zinc-400 font-bold uppercase tracking-widest text-xs">{t('analytics.desc')}</p>
        </div>
        <button onClick={downloadReport} className="btn-primary">
          <Download className="w-4 h-4" /> {t('analytics.export')}
        </button>
      </div>

      <div className="grid lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="farm-card p-6 bg-white/5 border-white/10">
            <h4 className="text-[10px] font-black text-[#00E676] uppercase tracking-[0.3em] mb-8">{t('analytics.module')}</h4>
            <div className="grid gap-3">
              {(['area', 'line', 'bar'] as const).map(type => (
                <button 
                  key={type}
                  onClick={() => setChartType(type)}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-xl border transition-all font-black text-[10px] uppercase tracking-widest",
                    chartType === type 
                      ? "bg-[#00E676] border-[#00E676] text-[#050A06] shadow-[0_0_20px_rgba(0,230,118,0.3)]" 
                      : "bg-black/20 border-white/5 text-zinc-400 hover:text-white hover:border-white/20"
                  )}
                >
                  <span className="capitalize">{type} {t('analytics.layer')}</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              ))}
            </div>
          </div>

          <div className="farm-card p-6 bg-white/5 border-white/10">
            <h4 className="text-[10px] font-black text-[#00E676] uppercase tracking-[0.3em] mb-8">{t('analytics.matrix')}</h4>
            <div className="space-y-3">
              {[
                { key: 'temp', label: t('dashboard.thermal'), color: '#f97316' },
                { key: 'humidity', label: t('dashboard.atmospheric'), color: '#00E676' },
                { key: 'soil', label: t('dashboard.soilHydro'), color: '#3b82f6' }
              ].map(signal => (
                <button 
                  key={signal.key}
                  onClick={() => setVisibleKeys(prev => ({ ...prev, [signal.key]: !prev[signal.key as keyof typeof visibleKeys] }))}
                  className={cn(
                    "w-full flex items-center justify-between p-4 rounded-xl border transition-all font-black text-[10px] uppercase tracking-widest",
                    visibleKeys[signal.key as keyof typeof visibleKeys]
                      ? "bg-white/5 border-white/10 text-white"
                      : "bg-black/20 border-white/5 text-zinc-700 opacity-50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full shadow-[0_0_8px_currentColor]" style={{ backgroundColor: signal.color, color: signal.color }} />
                    <span className="text-[9px]">{signal.label}</span>
                  </div>
                  <div className={cn(
                    "w-3.5 h-3.5 rounded-full border transition-all",
                    visibleKeys[signal.key as keyof typeof visibleKeys] ? "bg-[#00E676] border-[#00E676] shadow-[0_0_8px_rgba(0,230,118,0.5)]" : "border-zinc-800"
                  )} />
                </button>
              ))}
            </div>
          </div>

          <div className="farm-card p-6 bg-white/5 border-white/10">
             <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{t('analytics.temporalStart')}</label>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[#00E676] outline-none focus:border-[#00E676]/30 transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{t('analytics.temporalEnd')}</label>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[#00E676] outline-none focus:border-[#00E676]/30 transition-all" />
                </div>
             </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="farm-card p-10 h-full flex flex-col bg-white/5 border-white/10 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-12">
               <div className="flex items-center gap-4">
                  <TrendingUp className="text-neon w-6 h-6" />
                  <h3 className="text-3xl font-display font-black text-white uppercase tracking-widest">{t('analytics.stage')}</h3>
               </div>
               <div className="text-[10px] font-black text-zinc-400 bg-white/5 border border-white/10 px-6 py-2 rounded-full uppercase tracking-[0.2em] font-mono">
                  {t('analytics.nodes')}: {history.length}
               </div>
            </div>

            <div className="flex-1 min-h-[500px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ChartComponent data={history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 230, 118, 0.05)" vertical={false} />
                  <XAxis dataKey="time" stroke="#555" fontSize={9} tickLine={false} axisLine={false} dy={15} />
                  <YAxis stroke="#555" fontSize={9} tickLine={false} axisLine={false} dx={-15} />
                  <Tooltip 
                    content={<CustomTooltip />}
                  />
                  {visibleKeys.temp && (
                    chartType === 'area' ? (
                      <Area type="monotone" dataKey="temp" stroke="#f97316" strokeWidth={3} fill="#f97316" fillOpacity={0.05} />
                    ) : chartType === 'bar' ? (
                      <Bar dataKey="temp" fill="#f97316" radius={[4, 4, 0, 0]} />
                    ) : (
                      <Line type="monotone" dataKey="temp" stroke="#f97316" strokeWidth={3} dot={{ r: 3, fill: '#f97316', strokeWidth: 1, stroke: '#000' }} />
                    )
                  )}
                  {visibleKeys.humidity && (
                    chartType === 'area' ? (
                      <Area type="monotone" dataKey="humidity" stroke="#00E676" strokeWidth={3} fill="#00E676" fillOpacity={0.05} />
                    ) : chartType === 'bar' ? (
                      <Bar dataKey="humidity" fill="#00E676" radius={[4, 4, 0, 0]} />
                    ) : (
                      <Line type="monotone" dataKey="humidity" stroke="#00E676" strokeWidth={3} dot={{ r: 3, fill: '#00E676', strokeWidth: 1, stroke: '#000' }} />
                    )
                  )}
                  {visibleKeys.soil && (
                    chartType === 'area' ? (
                      <Area type="monotone" dataKey="soil_moisture" stroke="#3b82f6" strokeWidth={3} fill="#3b82f6" fillOpacity={0.05} />
                    ) : chartType === 'bar' ? (
                      <Bar dataKey="soil_moisture" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    ) : (
                      <Line type="monotone" dataKey="soil_moisture" stroke="#3b82f6" strokeWidth={3} dot={{ r: 3, fill: '#3b82f6', strokeWidth: 1, stroke: '#000' }} />
                    )
                  )}
                </ChartComponent>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
};

const AIInsights = () => {
  const [insights, setInsights] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { t, language } = useLanguage();

  const getInsights = async () => {
    setLoading(true);
    try {
      const sensorQuery = query(collection(db, 'sensor_data'), orderBy('timestamp', 'desc'), limit(20));
      const snapshot = await getDocs(sensorQuery);
      const recentData = snapshot.docs.map(doc => doc.data());

      const ai = new GoogleGenAI({ apiKey: (import.meta as any).env.VITE_GEMINI_API_KEY || "" });
      
      const langName = language === 'hi' ? 'Hindi' : 'English';
      const prompt = `As an expert AI Agronomist, analyze this recent sensor data from a smart irrigation system: ${JSON.stringify(recentData)}. 
      Provide 3 concise, actionable insights for crop health and watering efficiency. Format as a JSON array of strings. IMPORTANT: Respond in ${langName}.`;
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });
      
      const text = response.text || "";
      const jsonMatch = text.match(/\[.*\]/s);
      const parsedInsights = jsonMatch ? JSON.parse(jsonMatch[0]) : [text];
      
      setInsights(Array.isArray(parsedInsights) ? parsedInsights : [text]);
    } catch (e) {
      console.error("AI Insight Error:", e);
      setInsights([t('ai.error')]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getInsights();
  }, []);

  return (
    <PageWrapper>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-16">
        <div>
          <h2 className="text-5xl font-display font-black text-white mb-3 tracking-widest uppercase">{t('ai.title')}</h2>
          <p className="text-lg text-zinc-400 font-bold uppercase tracking-widest text-xs">{t('ai.desc')}</p>
        </div>
        <div className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-white/5 border border-white/10">
           <BrainCircuit className="w-5 h-5 text-[#00E676]" />
           <span className="text-[10px] font-black text-white uppercase tracking-widest">{t('ai.active')}</span>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="farm-card h-64 bg-white/5 border-white/10 animate-pulse relative">
               <div className="absolute inset-0 bg-grid opacity-10" />
            </div>
          ))
        ) : (
          (insights || []).map((insight, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className="farm-card group border-[#00E676]/5 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-grid opacity-5 group-hover:opacity-10 transition-opacity" />
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-xl bg-[#00E676]/10 flex items-center justify-center mb-8 border border-[#00E676]/20">
                  <div className="text-[#00E676] font-mono text-lg font-black">0{i+1}</div>
                </div>
                <p className="text-white text-lg leading-relaxed font-bold tracking-tight">
                  {insight}
                </p>
                <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                   <span className="text-[9px] font-black text-[#00E676] uppercase tracking-widest">{t('ai.protocol')}</span>
                   <ShieldCheck className="w-4 h-4 text-[#00E676]/30" />
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {!loading && (
        <button 
          onClick={getInsights}
          className="btn-secondary mt-12 mx-auto uppercase tracking-widest"
        >
          <Zap className="w-4 h-4" /> {t('ai.recalibrate')}
        </button>
      )}

      <div className="mt-24 farm-card bg-[#0D150F] border-[#00E676]/20 text-white max-w-4xl mx-auto shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-10" />
        <div className="relative z-10">
          <div className="flex items-center gap-5 mb-6">
            <div className="w-12 h-12 rounded-xl bg-[#00E676]/10 flex items-center justify-center border border-[#00E676]/20">
              <AlertCircle className="text-[#00E676] w-7 h-7" />
            </div>
            <h3 className="text-2xl font-display font-black uppercase tracking-widest">{t('ai.alert.title')}</h3>
          </div>
          <p className="text-white/70 leading-relaxed text-lg font-bold">
            {t('ai.alert.desc')}
          </p>
        </div>
      </div>
    </PageWrapper>
  );
};

// --- Main App ---

function AppInner() {
  const { t } = useLanguage();

  // Client-Side Simulation Loop (for Vercel/Stateless)
  useEffect(() => {
    const simulationInterval = setInterval(async () => {
      // Only simulate if user is logged in (authenticated write)
      if (!auth.currentUser) return;

      try {
        // 1. Get current status from Firestore
        const statusSnap = await getDoc(doc(db, 'system_config', 'status'));
        const status = statusSnap.exists() ? statusSnap.data() : { is_watering: false, is_auto_mode: true };

        // 2. Get latest record to derive new values
        const sensorQuery = query(collection(db, 'sensor_data'), orderBy('timestamp', 'desc'), limit(1));
        const sensorSnap = await getDocs(sensorQuery);
        const lastData = !sensorSnap.empty ? sensorSnap.docs[0].data() : { temp: 24, humidity: 60, soil_moisture: 70 };

        const isWatering = !!status.is_watering;
        const isAuto = !!status.is_auto_mode;

        // 3. Calculate new values
        const newMoisture = Math.max(0, Math.min(100, (lastData.soil_moisture || 70) + (isWatering ? 3.0 : -0.8)));
        const newTemp = (lastData.temp || 24) + (Math.random() * 0.4 - 0.2);
        const newHumid = (lastData.humidity || 60) + (Math.random() * 0.4 - 0.2);

        // 4. Push new data
        const timestamp = new Date().toISOString();
        await addDoc(collection(db, 'sensor_data'), {
          temp: newTemp,
          humidity: newHumid,
          soil_moisture: newMoisture,
          timestamp,
          deviceId: 'nexus-01'
        });

        // 5. Automated Logic (Auto-mode)
        if (isAuto) {
          if (newMoisture < 40 && !isWatering) {
            await setDoc(doc(db, 'system_config', 'status'), { is_watering: true, lastUpdated: timestamp }, { merge: true });
          } else if (newMoisture > 80 && isWatering) {
            await setDoc(doc(db, 'system_config', 'status'), { is_watering: false, lastUpdated: timestamp }, { merge: true });
          }
        }
      } catch (err) {
        console.warn("Client simulation sync skipped:", err);
      }
    }, 15000); // Run every 15 seconds while app is open

    return () => clearInterval(simulationInterval);
  }, []);

  return (
    <Router>
      <div className="min-h-screen relative overflow-hidden bg-[#050A06]">
        {/* High-Tech Background Elements */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute inset-0 bg-grid opacity-20" />
          <div className="scanline" />
          <div className="absolute top-[10%] left-[5%] w-[600px] h-[600px] bg-[#00E676]/10 rounded-full blur-[150px]" />
          <div className="absolute bottom-[10%] right-[5%] w-[600px] h-[600px] bg-[#00E676]/5 rounded-full blur-[150px]" />
        </div>

        <div className="relative z-10">
          <Navigation />
          <AnimatePresence mode="wait">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/live" element={<PageWrapper><LiveSimulation /></PageWrapper>} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/ai-insights" element={<AIInsights />} />
            </Routes>
          </AnimatePresence>

          <footer className="py-20 px-6 border-t border-[#00E676]/10 bg-[#0D150F] mt-20">
            <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-12">
              <div className="col-span-2">
                <Link to="/" className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 rounded-xl bg-[#00E676] flex items-center justify-center">
                    <Sprout className="text-[#050A06] w-6 h-6" />
                  </div>
                  <span className="text-2xl font-display font-black text-white tracking-widest">HYDROFLOW</span>
                </Link>
                <p className="text-zinc-400 max-w-sm leading-relaxed font-bold">
                  {t('footer.tagline')}
                </p>
              </div>
              <div>
                <h4 className="text-[10px] font-black text-[#00E676] uppercase tracking-[0.3em] mb-8">{t('footer.platform')}</h4>
                <div className="flex flex-col gap-4">
                  <Link to="/dashboard" className="text-zinc-400 hover:text-[#00E676] font-bold text-xs uppercase tracking-widest transition-colors">{t('nav.dashboard')}</Link>
                  <Link to="/analytics" className="text-zinc-400 hover:text-[#00E676] font-bold text-xs uppercase tracking-widest transition-colors">{t('nav.analytics')}</Link>
                  <Link to="/ai-insights" className="text-zinc-400 hover:text-[#00E676] font-bold text-xs uppercase tracking-widest transition-colors">{t('nav.ai')}</Link>
                </div>
              </div>
              <div>
                <h4 className="text-[10px] font-black text-[#00E676] uppercase tracking-[0.3em] mb-8">{t('footer.company')}</h4>
                <div className="flex flex-col gap-4">
                  <Link to="/" onClick={() => window.scrollTo(0,0)} className="text-zinc-400 hover:text-[#00E676] font-bold text-xs uppercase tracking-widest transition-colors">{t('footer.about')}</Link>
                  <Link to="/" onClick={() => window.scrollTo(0,0)} className="text-zinc-400 hover:text-[#00E676] font-bold text-xs uppercase tracking-widest transition-colors">{t('footer.sustainability')}</Link>
                  <Link to="/" onClick={() => window.scrollTo(0,0)} className="text-zinc-400 hover:text-[#00E676] font-bold text-xs uppercase tracking-widest transition-colors">{t('footer.contact')}</Link>
                </div>
              </div>
            </div>
            <div className="max-w-7xl mx-auto pt-12 mt-12 border-t border-[#00E676]/10 flex flex-col md:flex-row justify-between items-center gap-6">
              <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">
                {t('footer.copyright')}
              </p>
              <div className="flex gap-8">
                <Link to="/" onClick={() => window.scrollTo(0,0)} className="text-zinc-500 hover:text-[#00E676] text-[10px] font-black uppercase tracking-widest transition-colors">{t('footer.privacy')}</Link>
                <Link to="/" onClick={() => window.scrollTo(0,0)} className="text-zinc-500 hover:text-[#00E676] text-[10px] font-black uppercase tracking-widest transition-colors">{t('footer.terms')}</Link>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </Router>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AppInner />
    </LanguageProvider>
  );
}

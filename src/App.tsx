/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MapPin, 
  Plane, 
  Compass, 
  Users, 
  Heart, 
  Baby, 
  Wind, 
  ArrowRight,
  Loader2,
  Info,
  ExternalLink,
  TrendingUp,
  Map as MapIcon,
  LogIn,
  LogOut,
  Languages,
  History,
  Plus,
  Navigation,
  Activity,
  AlertTriangle,
  Calendar,
  Layers,
  Camera,
  Image as ImageIcon,
  CheckCircle2
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';

// Firebase
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut } from 'firebase/auth';
import { initializeFirestore, collection, addDoc, query, getDocs, orderBy, serverTimestamp, Timestamp, setDoc, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firestore connection verified.");
  } catch (error: any) {
    if (error.message?.includes('the client is offline') || error.message?.includes('Could not reach')) {
      console.warn("Firestore might be struggling to connect. Long polling enabled.");
    } else {
      // Permission denied is actually a good sign (it means we reached the server!)
      console.log("Firestore reached (as expected):", error.message);
    }
  }
}

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Fix Leaflet Default Icon
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

// Localization
const translations = {
  en: {
    title: "Trip",
    quest: "Quest",
    tagline: "YOUR ADVENTURE, INTELLIGENTLY DATAFIED.",
    adventureMode: "Adventure Mode",
    skyWatch: "SkyWatch",
    history: "My Quests",
    departure: "Departure",
    destination: "Destination",
    via: "Via Cities (Optional)",
    companions: "Companions",
    generate: "Forge Your Adventure",
    calculating: "Calculating Hidden Nodes...",
    unlocked: "UNLOCKED",
    yourQuests: "Your Side Quests",
    inputRoute: "Input your route to unlock regional secrets.",
    trackOrbit: "Track Your Orbit",
    trackTagline: "Enter flight number for real-time status and flight intelligence.",
    flightPlaceholder: "FLIGHT NUMBER (e.g. AA100)",
    scanSky: "Scan Sky",
    syncing: "Syncing with Global Radar...",
    login: "Sign in with Google",
    logout: "Sign Out",
    welcome: "Welcome",
    saved: "Saved!",
    difficulty: "Difficulty",
    location: "Location",
    objective: "Objective",
    fits: "Why it fits",
    easy: "Easy",
    medium: "Medium",
    family: "Family",
    friends: "Friends",
    partner: "Partner",
    noSaved: "No saved quests yet. Start a new adventure!",
    newQuest: "New Quest",
    viewDetails: "View Details",
    dismiss: "Dismiss",
    liveTracking: "Live Tracking",
    flightHistory: "Flight History",
    upcomingSchedule: "Upcoming Schedule",
    aircraft: "Aircraft",
    registration: "Registration",
    airline: "Airline",
    altitude: "Altitude",
    heading: "Heading",
    status: "Status",
    sideQuest: "Side Quest of the Day",
    locationQuest: "Enable Location Quest",
    questSettingDesc: "Uses GPS to find quests in your current city.",
    refreshQuest: "Change Quest",
    xp: "XP",
    level: "Level",
    leaderboard: "Leaderboard",
    acceptQuest: "Accept Quest",
    completeQuest: "Complete Quest",
    questCompleted: "Quest Completed!",
    refreshesLeft: "Refreshes left",
    hard: "Hard",
    insane: "Insane",
    rank: "Rank",
    player: "Player",
    profile: "Profile",
    updateProfile: "Update Profile",
    displayName: "Display Name",
    avatarUrl: "Avatar URL",
    bio: "Traveler Bio",
    socialX: "X (Twitter) Username",
    socialInsta: "Instagram Username",
    hallOfFame: "Hall of Fame",
    achievements: "Achievements",
    saving: "Saving...",
    radarInterval: "Radar Refresh: 5m",
    manualPing: "Manual Radar Ping",
    quotaWarning: "API Budget: ~100 calls total for 20+ users. AUTO-REFRESH is limited. Use manual ping to save data.",
    signInToUnlock: "Sign in to Unlock Profile & Side Quests",
    takePhoto: "Capture Proof",
    photoRequired: "Proof Required: Take a photo to claim XP.",
    retake: "Retake",
    onlyCamera: "Camera Mode Active",
    loadingQuest: "Forging new challenge...",
  },
  ar: {
    title: "رحلة",
    quest: "المهمة",
    tagline: "مغامرتك، بذكاء اصطناعي مكثف.",
    adventureMode: "وضع المغامرة",
    skyWatch: "مراقب السماء",
    history: "مهامي",
    departure: "نقطة الانطلاق",
    destination: "الوجهة",
    via: "مدن المرور (اختياري)",
    companions: "المرافقون",
    generate: "اصنع مغامرتك",
    calculating: "جاري حساب المواقع المخفية...",
    unlocked: "تم الفتح",
    yourQuests: "مهامي الجانبية",
    inputRoute: "أدخل مسارك لتكتشف أسرار المنطقة.",
    trackOrbit: "تتبع مسارك الجوي",
    trackTagline: "أدخل رقم الرحلة للحصول على الحالة المباشرة ومعلومات ذكية.",
    flightPlaceholder: "رقم الرحلة (مثلاً AA100)",
    scanSky: "مسح السماء",
    syncing: "جاري المزامنة مع الرادار العالمي...",
    login: "تسجيل الدخول",
    logout: "خروج",
    welcome: "أهلاً بك",
    saved: "تم الحفظ!",
    difficulty: "الصعوبة",
    location: "الموقع",
    objective: "المهمة",
    fits: "لماذا هي مناسبة لرحلتك؟",
    easy: "سهل",
    medium: "متوسط",
    family: "عائلة",
    friends: "أصدقاء",
    partner: "شريك",
    noSaved: "لا توجد مهام محفوظة بعد. ابدأ مغامرة جديدة!",
    newQuest: "مهمة جديدة",
    viewDetails: "عرض التفاصيل",
    dismiss: "تجاهل",
    liveTracking: "التتبع المباشر",
    flightHistory: "تاريخ الرحلات",
    upcomingSchedule: "الجدول القادم",
    aircraft: "الطائرة",
    registration: "التسجيل",
    airline: "شركة الطيران",
    altitude: "الارتفاع",
    heading: "الاتجاه",
    status: "الحالة",
    sideQuest: "مهمة اليوم الجانبية",
    locationQuest: "تفعيل مهام الموقع",
    questSettingDesc: "يستخدم GPS للعثور على مهام في مدينتك الحالية.",
    refreshQuest: "تغيير المهمة",
    xp: "خبرة",
    level: "مستوى",
    leaderboard: "لوحة الصدارة",
    acceptQuest: "قبول المهمة",
    completeQuest: "إكمال المهمة",
    questCompleted: "تمت المهمة بنجاح!",
    refreshesLeft: "تبديلات متبقية",
    hard: "صعب",
    insane: "مستحيل",
    rank: "الترتيب",
    player: "اللاعب",
    profile: "الملف الشخصي",
    updateProfile: "تحديث البيانات",
    displayName: "الاسم المستعار",
    avatarUrl: "رابط الصورة",
    bio: "نبذة عن المسافر",
    socialX: "حساب X (تويتر)",
    socialInsta: "حساب إنستغرام",
    hallOfFame: "قاعة المشاهير",
    achievements: "الإنجازات",
    saving: "جاري الحفظ...",
    radarInterval: "تحديث الرادار: كل 5 دقائق",
    manualPing: "تحديث الرادار يدوياً",
    quotaWarning: "ميزانية الـ API: حوالي 100 اتصال لـ 20 شخصاً. التحديث التلقائي محدود، يرجى التحديث يدوياً لتوفير البيانات.",
    signInToUnlock: "سجل دخولك لفتح الملف الشخصي ومهام اليوم",
    takePhoto: "التقط صورة الإثبات",
    photoRequired: "مطلوب إثبات: التقط صورة للحصول على الخبرة.",
    retake: "إعادة التقاط",
    onlyCamera: "وضع الكاميرا نشط",
    loadingQuest: "جاري إنشاء تحدي جديد...",
  }
};

// Types
interface QuestData {
  title: string;
  location: string;
  objective: string;
  fits: string;
  difficulty: string;
  arabic: {
    title: string;
    location: string;
    objective: string;
    fits: string;
  };
}

interface SavedTrip {
  id: string;
  from: string;
  to: string;
  tripType: string;
  quests: QuestData[];
  createdAt: any;
}

interface FlightInfo {
  info: string;
  sources: string[];
  isRadar?: boolean;
  fetchedAt?: string;
  data?: {
    airline: {
      name: string;
      iata: string;
      icao: string;
    };
    airline_name: string;
    flight_status: string;
    flight_date: string;
    flight: {
      number: string;
      iata: string;
      icao: string;
    };
    aircraft?: {
      registration?: string;
      iata?: string;
      icao?: string;
      icao24?: string;
      model?: string;
    };
    live: {
      latitude: number;
      longitude: number;
      altitude?: number;
      direction: number;
      speed_horizontal?: number;
      speed_vertical?: number;
      is_ground?: boolean;
    } | null;
    departure: {
      airport?: string;
      iata?: string;
      icao?: string;
      terminal?: string;
      gate?: string;
      delay?: number;
      scheduled?: string;
      estimated?: string;
      actual?: string;
      timezone?: string;
    };
    arrival: {
      airport?: string;
      iata?: string;
      icao?: string;
      terminal?: string;
      gate?: string;
      baggage?: string;
      delay?: number;
      scheduled?: string;
      estimated?: string;
      actual?: string;
      timezone?: string;
    };
  };
  path?: [number, number][];
}

const PLANE_SVG = `
<svg viewBox="0 0 24 24" width="40" height="40" fill="#6366f1" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 0 8px rgba(99, 102, 241, 0.6));">
  <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
</svg>
`;

function createPlaneIcon(heading: number) {
  return L.divIcon({
    html: `<div style="transform: rotate(${heading}deg); width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">${PLANE_SVG}</div>`,
    className: 'custom-plane-icon',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
}

// Components
const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("bg-zinc-900/50 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm", className)}>
    {children}
  </div>
);

const Button = ({ 
  children, 
  onClick, 
  loading, 
  variant = 'primary',
  className,
  disabled
}: { 
  children: React.ReactNode; 
  onClick?: () => void; 
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  className?: string;
  disabled?: boolean;
}) => {
  const variants = {
    primary: "bg-white text-black hover:bg-zinc-200",
    secondary: "bg-indigo-600 text-white hover:bg-indigo-700",
    outline: "border border-white/20 text-white hover:bg-white/5",
    ghost: "text-zinc-500 hover:text-white"
  };

  return (
    <button 
      onClick={onClick}
      disabled={loading || disabled}
      className={cn(
        "px-6 py-3 rounded-full font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        className
      )}
    >
      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : children}
    </button>
  );
};

const Input = ({ 
  label, 
  value, 
  onChange, 
  placeholder, 
  icon: Icon,
  rtl
}: { 
  label: string; 
  value: string; 
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; 
  placeholder: string;
  icon?: any;
  rtl?: boolean;
}) => (
  <div className="space-y-2">
    <label className={cn("text-xs uppercase tracking-widest text-zinc-500 font-semibold", rtl && "font-sans")}>{label}</label>
    <div className="relative">
      {Icon && <Icon className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500", rtl ? "right-4" : "left-4")} />}
      <input 
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        dir={rtl ? "rtl" : "ltr"}
        className={cn(
          "w-full bg-zinc-800/50 border border-white/5 rounded-xl py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/20 transition-all font-sans",
          rtl ? "pr-11 pl-4" : "pl-11 pr-4"
        )}
      />
    </div>
  </div>
);

export default function App() {
  console.log("TripQuest App: Rendering...");
  const [activeTab, setActiveTab] = useState<'quest' | 'flight' | 'history' | 'sidequest' | 'profile' | 'leaderboard'>('quest');
  const [lang, setLang] = useState<'en' | 'ar'>(() => {
    const saved = localStorage.getItem('tripquest_lang');
    return (saved === 'ar' || saved === 'en') ? saved : 'en';
  });

  useEffect(() => {
    localStorage.setItem('tripquest_lang', lang);
  }, [lang]);
  const [user, setUser] = useState<User | null>(null);
  
  // Profile Customization
  const [profileData, setProfileData] = useState({
    displayName: '',
    photoURL: '',
    bio: '',
    socialX: '',
    socialInsta: ''
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // User Progress Stats
  const [userStats, setUserStats] = useState({
    xp: 0,
    level: 1,
    dailyQuest: null as any,
    status: 'available' as 'available' | 'accepted' | 'completed',
    refreshesRemaining: 3
  });
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [useLocation, setUseLocation] = useState(false);
  const [currentCity, setCurrentCity] = useState<string | null>(null);
  const [proofPhoto, setProofPhoto] = useState<string | null>(null);
  
  // Shadow Mode (Easter Egg)
  const [showShadowTerminal, setShowShadowTerminal] = useState(false);
  const [shadowQuery, setShadowQuery] = useState('');
  const [shadowResult, setShadowResult] = useState<string | null>(null);
  const [shadowLoading, setShadowLoading] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Trigger: Alt + Shift + K
      if (e.altKey && e.shiftKey && e.key === 'K') {
        setShowShadowTerminal(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Quest State
  const [tripDetails, setTripDetails] = useState({
    from: '',
    to: '',
    via: '',
    tripType: 'Friends'
  });
  const [quests, setQuests] = useState<QuestData[]>([]);
  const [isGeneratingQuests, setIsGeneratingQuests] = useState(false);
  const [savedTrips, setSavedTrips] = useState<SavedTrip[]>([]);

  // Flight State
  const [flightNumber, setFlightNumber] = useState('');
  const [flightInfo, setFlightInfo] = useState<FlightInfo | null>(null);
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);
  const [isSearchingFlight, setIsSearchingFlight] = useState(false);
  const [skyTab, setSkyTab] = useState<'live' | 'history' | 'schedule'>('live');
  const [error, setError] = useState<string | null>(null);

  // New Flight Tracking States
  const [currentPath, setCurrentPath] = useState<[number, number][]>([]);
  const [localFlightHistory, setLocalFlightHistory] = useState<any[]>([]);
  const [selectedHistoryPath, setSelectedHistoryPath] = useState<[number, number][] | null>(null);

  // Lerp Animation States
  const [prevLive, setPrevLive] = useState<any>(null);
  const [targetLive, setTargetLive] = useState<any>(null);
  const [lerpedLive, setLerpedLive] = useState<any>(null);
  const [lerpStartTime, setLerpStartTime] = useState<number>(0);

  const t = translations[lang];
  const isRtl = lang === 'ar';

  useEffect(() => {
    testFirestoreConnection();
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        syncUserProfile(u);
        loadSavedTrips(u.uid);
        loadFlightHistory(u.uid);
        loadUserStats(u.uid);
      }
    });
    return unsub;
  }, []);

  const loadFlightHistory = async (uid: string) => {
    const path = `users/${uid}/flightHistory`;
    try {
      const snap = await getDocs(query(collection(db, path), orderBy('createdAt', 'desc')));
      const history = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLocalFlightHistory(history);
    } catch (err) {
      console.warn("Could not load flight history", err);
    }
  };

  const syncUserProfile = async (u: User) => {
    const path = `users/${u.uid}`;
    try {
      const snap = await getDocFromServer(doc(db, path));
      if (!snap.exists()) {
        const initialData = {
          uid: u.uid,
          email: u.email || '',
          displayName: u.displayName || 'Explorer',
          photoURL: u.photoURL || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + u.uid,
          xp: 0,
          level: 1,
          createdAt: serverTimestamp()
        };
        await setDoc(doc(db, path), initialData);
        setProfileData({
          displayName: initialData.displayName,
          photoURL: initialData.photoURL,
          bio: '',
          socialX: '',
          socialInsta: ''
        });
      } else {
        const data = snap.data();
        setProfileData({
          displayName: data?.displayName || u.displayName || '',
          photoURL: data?.photoURL || u.photoURL || '',
          bio: data?.bio || '',
          socialX: data?.socialX || '',
          socialInsta: data?.socialInsta || ''
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  const updateProfile = async () => {
    if (!user) return;
    setIsSavingProfile(true);
    const path = `users/${user.uid}`;
    try {
      await setDoc(doc(db, path), {
        displayName: profileData.displayName,
        photoURL: profileData.photoURL,
        bio: profileData.bio,
        socialX: profileData.socialX,
        socialInsta: profileData.socialInsta
      }, { merge: true });
      // Update leaderboard too
      await setDoc(doc(db, `leaderboard/${user.uid}`), {
        displayName: profileData.displayName,
        photoURL: profileData.photoURL,
        level: userStats.level,
        xp: userStats.xp
      }, { merge: true });
      loadUserStats(user.uid);
    } catch (err) {
      setError("Failed to update profile.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const loadSavedTrips = async (uid: string) => {
    const path = `users/${uid}/savedQuests`;
    try {
      const snap = await getDocs(query(collection(db, path), orderBy('createdAt', 'desc')));
      const trips = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SavedTrip));
      setSavedTrips(trips);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  };

  const loadUserStats = async (uid: string) => {
    const path = `users/${uid}`;
    try {
      const snap = await getDocFromServer(doc(db, path));
      if (snap.exists()) {
        const data = snap.data();
        const lastRefresh = data.dailyQuest?.lastRefreshDate;
        const today = new Date().toDateString();
        
        let refreshes = data.dailyQuest?.refreshesRemaining ?? 3;
        if (lastRefresh !== today) {
          refreshes = 3;
        }

        setUserStats({
          xp: data.xp || 0,
          level: data.level || 1,
          dailyQuest: data.dailyQuest?.quest || null,
          status: (data.dailyQuest?.status || 'available') as any,
          refreshesRemaining: refreshes
        });
      }
    } catch (err) {
      console.warn("Could not load user stats", err);
    }
    
    // Load Leaderboard
    try {
      const lbSnap = await getDocs(query(collection(db, 'leaderboard'), orderBy('xp', 'desc')));
      setLeaderboard(lbSnap.docs.map(d => ({ uid: d.id, ...d.data() })));
    } catch (err) {
      console.warn("Could not load leaderboard", err);
    }
  };

  const getSideQuest = async (isRefresh = false) => {
    if (!user) return;
    if (userStats.refreshesRemaining <= 0 && isRefresh) return;
    
    setIsGeneratingQuests(true);
    let location = "a random exotic city";
    
    if (useLocation && navigator.geolocation) {
      const pos: any = await new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(resolve, () => resolve(null));
      });
      if (pos) {
        // We'll let Gemini determine the city from coords if possible, or just pass coords
        location = `${pos.coords.latitude}, ${pos.coords.longitude}`;
      }
    }

    try {
      const res = await fetch('/api/side-quest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location, lang })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const newRefreshes = isRefresh ? (userStats.refreshesRemaining || 3) - 1 : (userStats.refreshesRemaining || 3);
      
      const statsUpdate = {
        xp: userStats.xp || 0,
        level: userStats.level || 1,
        dailyQuest: {
          ...data.quest,
          status: 'available',
          refreshesRemaining: newRefreshes,
          lastRefreshDate: new Date().toDateString()
        },
        updatedAt: serverTimestamp()
      };

      await setDoc(doc(db, `users/${user.uid}`), statsUpdate, { merge: true });
      setUserStats({
        ...userStats,
        dailyQuest: data.quest,
        status: 'available',
        refreshesRemaining: newRefreshes
      });
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid} (Side Quest Generation)`);
    } finally {
      setIsGeneratingQuests(false);
    }
  };

  const acceptQuest = async () => {
    if (!user || !userStats.dailyQuest) return;
    const path = `users/${user.uid}`;
    await setDoc(doc(db, path), {
      dailyQuest: { status: 'accepted' }
    }, { merge: true });
    setUserStats({ ...userStats, status: 'accepted' });
  };

  const [questStatus, setQuestStatus] = useState<Record<string, boolean>>({});

  const completeQuest = async (adventureQuest?: any) => {
    if (!user) return;
    
    // If it's a daily quest and no proof photo is provided, stop
    if (!adventureQuest && !proofPhoto) {
      setError(t.photoRequired);
      return;
    }

    // If it's an adventure quest and already claimed, skip
    if (adventureQuest && questStatus[adventureQuest.title]) return;

    const path = `users/${user.uid}`;
    
    // XP math: Use quest's actual reward if available, else fallback
    const rewardXp = adventureQuest ? 3 : (userStats.dailyQuest?.xpReward || 5);
    const newXp = (userStats.xp || 0) + rewardXp;
    const newLevel = Math.floor(newXp / 20) + 1; // 20 XP per level
    
    const update: any = {
      xp: newXp,
      level: newLevel,
      updatedAt: serverTimestamp()
    };

    if (!adventureQuest) {
      update.dailyQuest = { 
        ...userStats.dailyQuest,
        status: 'completed',
        proofPhoto: proofPhoto // Save proof photo link if available
      };
    }

    try {
      await setDoc(doc(db, path), update, { merge: true });
      const leaderPath = `leaderboard/${user.uid}`;
      await setDoc(doc(db, leaderPath), {
        uid: user.uid,
        displayName: profileData.displayName || user.displayName || 'Explorer',
        photoURL: profileData.photoURL || user.photoURL,
        xp: newXp,
        level: newLevel,
        updatedAt: serverTimestamp()
      }, { merge: true });

      if (adventureQuest) {
        setQuestStatus(prev => ({ ...prev, [adventureQuest.title]: true }));
      }

      setUserStats(prev => ({ ...prev, xp: newXp, level: newLevel, status: adventureQuest ? prev.status : 'completed' }));
      
      if (!adventureQuest) {
        setError(`QUEST COMPLETED! +${rewardXp} XP`);
      } else {
        setError(`ADVENTURE SYNCED! +${rewardXp} XP`);
      }
      
      loadUserStats(user.uid);
      
      // Auto-dismiss success message
      setTimeout(() => setError(null), 3000);
      setProofPhoto(null); // Clear proof photo after completion
    } catch (err: any) {
      // If it's a permission error, we might be failing on the users doc or leaderboard doc
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid} or leaderboard/${user.uid}`);
    }
  };

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error(err);
      setError("Login failed. Check your connection.");
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setQuests([]);
    setFlightInfo(null);
    setSavedTrips([]);
    setProofPhoto(null);
    setActiveTab('quest');
  };

  const getQuests = async () => {
    if (!tripDetails.from || !tripDetails.to) return;
    setIsGeneratingQuests(true);
    setQuests([]);
    setError(null);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000); // 90s timeout

    try {
      const res = await fetch('/api/quests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tripDetails),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      setQuests(data.quests || []);

      if (user && data.quests?.length > 0) {
        const path = `users/${user.uid}/savedQuests`;
        try {
          await addDoc(collection(db, path), {
            from: tripDetails.from,
            to: tripDetails.to,
            tripType: tripDetails.tripType,
            quests: data.quests,
            userId: user.uid,
            createdAt: serverTimestamp()
          });
          loadSavedTrips(user.uid);
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, path);
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setError("Request timed out. The AI is taking too long.");
      } else {
        setError(err.message || t.generate);
      }
      console.error(err);
    } finally {
      setIsGeneratingQuests(false);
      clearTimeout(timeoutId);
    }
  };

  const getFlightInfo = async (silent = false) => {
    if (!flightNumber) return;
    const normalizedFlight = flightNumber.trim().replace(/\s+/g, '').toUpperCase();
    
    if (!silent) setIsSearchingFlight(true);
    // Reset path if searching a new flight (unless it's a manual refresh of same flight)
    const currentFlightId = flightInfo?.data?.flight?.iata || flightInfo?.data?.flight?.number;
    if (currentFlightId !== normalizedFlight) {
      setCurrentPath([]);
      setFlightInfo(null);
    }
    
    setError(null);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000); // 90s timeout

    try {
      const res = await fetch('/api/flight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flightNumber: normalizedFlight }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      const data = await res.json();
      if (data.error) {
        if (res.status === 429 || data.error.includes('Quota')) {
          setIsQuotaExceeded(true);
        }
        const errorMsg = data.details ? `${data.error} ${data.details}` : data.error;
        throw new Error(errorMsg);
      }
      
      setIsQuotaExceeded(false); // Reset if successful

      // Append live coordinate to path if available
      if (data.data?.live) {
        const newPoint: [number, number] = [data.data.live.latitude, data.data.live.longitude];
        setCurrentPath(prev => {
          const lastPoint = prev[prev.length - 1];
          if (!lastPoint || lastPoint[0] !== newPoint[0] || lastPoint[1] !== newPoint[1]) {
            const updatedPath = [...prev, newPoint];
            
            // Auto-save to history in Firestore if user is logged in
            if (user) {
              const histPath = `users/${user.uid}/flightHistory`;
              setDoc(doc(db, histPath, normalizedFlight), {
                flightNumber: normalizedFlight,
                airline: data.data.airline,
                status: data.data.flight_status,
                origin: data.data.departure?.iata || 'N/A',
                destination: data.data.arrival?.iata || 'N/A',
                path: updatedPath,
                createdAt: serverTimestamp()
              }, { merge: true }).then(() => loadFlightHistory(user.uid));
            }
            
            return updatedPath;
          }
          return prev;
        });
      }

      setFlightInfo(data);
      
      // Setup animation points
      if (data.data?.live) {
        setPrevLive((prev: any) => targetLive || data.data.live);
        setTargetLive(data.data.live);
        setLerpStartTime(Date.now());
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        if (!silent) setError("Search timed out. Flight data taking too long to retrieve.");
      } else {
        if (!silent) setError(err.message || t.scanSky);
      }
      console.error(err);
    } finally {
      setIsSearchingFlight(false);
      clearTimeout(timeoutId);
    }
  };

  // Auto-refresh interval (Optimized for Quota: 5 minutes)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeTab === 'flight' && flightInfo && !isQuotaExceeded && (flightInfo.data?.flight_status === 'ACTIVE' || flightInfo.data?.flight_status === 'IN-FLIGHT')) {
      interval = setInterval(() => {
        getFlightInfo(true);
      }, 300000); // 5 minutes to save quota
    }
    return () => clearInterval(interval);
  }, [activeTab, flightInfo, flightNumber, isQuotaExceeded]);

  // Sub-second Animation Loop (LERP)
  useEffect(() => {
    let frameId: number;
    const animate = () => {
      if (prevLive && targetLive && flightInfo) {
        const elapsed = Date.now() - lerpStartTime;
        const duration = 60000; // Match 60s fetch interval
        const t = Math.min(elapsed / duration, 1);

        // Linear Interpolation for Lat/Lng
        const lat = prevLive.latitude + (targetLive.latitude - prevLive.latitude) * t;
        const lng = prevLive.longitude + (targetLive.longitude - prevLive.longitude) * t;
        
        // Compass Heading LERP (Handles 360-degree wrap)
        let startDir = prevLive.direction || 0;
        let endDir = targetLive.direction || 0;
        if (Math.abs(endDir - startDir) > 180) {
          if (endDir > startDir) startDir += 360;
          else endDir += 360;
        }
        const dir = (startDir + (endDir - startDir) * t) % 360;

        const newPos: [number, number] = [lat, lng];

        // Smoothly update the marker state
        setLerpedLive({
          ...targetLive,
          latitude: lat,
          longitude: lng,
          direction: dir
        });

        // Throttle coordinate logging for path: Only add if distance > threshold
        if (t > 0 && t < 1) {
          setCurrentPath(prev => {
            const last = prev[prev.length - 1];
            if (!last) return [newPos];
            // Only add if moved significantly (approx 100m)
            const dist = Math.sqrt(Math.pow(last[0] - lat, 2) + Math.pow(last[1] - lng, 2));
            if (dist > 0.001) {
              return [...prev, newPos];
            }
            return prev;
          });
        }

        if (t < 1) {
          frameId = requestAnimationFrame(animate);
        }
      }
    };
    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [prevLive, targetLive, lerpStartTime]);

  const handleShadowResearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shadowQuery || shadowLoading) return;
    
    setShadowLoading(true);
    setShadowResult(null);
    try {
      const res = await fetch('/api/shadow-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: shadowQuery }),
      });
      const data = await res.json();
      setShadowResult(data.info);
    } catch (err) {
      setShadowResult("ERROR: CONNECTION INTERRUPTED. RELAY OFFLINE.");
    } finally {
      setShadowLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 600;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Quality 0.6 to keep size well under 1MB (usually 100-200kb)
          const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
          setProofPhoto(dataUrl);
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className={cn(
      "min-h-screen bg-black text-white font-sans selection:bg-white selection:text-black",
      isRtl && "text-right"
    )} dir={isRtl ? "rtl" : "ltr"}>
      {/* Shadow Terminal Overlay */}
      <AnimatePresence>
        {showShadowTerminal && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-6"
          >
            <div className="w-full max-w-4xl h-[80vh] flex flex-col font-mono text-emerald-500 border border-emerald-500/30 rounded-lg overflow-hidden shadow-[0_0_50px_rgba(16,185,129,0.1)]">
              <div className="bg-emerald-500/10 border-b border-emerald-500/30 p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-[10px] uppercase font-bold tracking-widest">Global Radar Shadow Console v4.0.1</span>
                </div>
                <button onClick={() => setShowShadowTerminal(false)} className="hover:bg-emerald-500/20 px-2 py-1 rounded transition-colors text-xs uppercase font-bold">[ CLOSE ]</button>
              </div>
              
              <div className="flex-grow overflow-y-auto p-8 space-y-6 scrollbar-hide">
                <div className="space-y-1 opacity-60 text-[10px]">
                  <p>SYSTEM STATUS: DECRYPTED</p>
                  <p>UPLINK: ENCRYPTED (G-LEVEL 7)</p>
                  <p>TARGET: DEEP WEB FLIGHT INTELLIGENCE</p>
                  <p>--------------------------------------------------</p>
                </div>

                {shadowResult ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="prose prose-invert prose-emerald max-w-none prose-sm">
                    <ReactMarkdown>{shadowResult}</ReactMarkdown>
                    <button 
                      onClick={() => setShadowResult(null)} 
                      className="mt-8 text-emerald-500/50 hover:text-emerald-500 hover:underline transition-all text-xs"
                    >
                      [ NEW INVESTIGATION ]
                    </button>
                  </motion.div>
                ) : shadowLoading ? (
                  <div className="space-y-4">
                    <p className="animate-pulse">SCANNING GLOBAL AIRWAYS...</p>
                    <div className="w-full h-1 bg-emerald-500/10 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ x: "-100%" }} 
                        animate={{ x: "100%" }} 
                        transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                        className="w-1/3 h-full bg-emerald-500"
                      />
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleShadowResearch} className="space-y-6">
                    <p className="text-xl">ENTER DEEP RESEARCH QUERY_</p>
                    <input 
                      autoFocus
                      type="text" 
                      value={shadowQuery}
                      onChange={(e) => setShadowQuery(e.target.value)}
                      placeholder="e.g. 'Investigate fuel issues with N1234 on BA123'"
                      className="w-full bg-transparent border-b border-emerald-500/50 py-4 text-2xl focus:outline-none placeholder:text-emerald-900"
                    />
                    <p className="text-[10px] opacity-40 italic">Note: Private intelligence research requires active Google Search Grounding.</p>
                  </form>
                )}
              </div>
              
              <div className="bg-emerald-500/5 p-4 text-[9px] uppercase tracking-tighter opacity-40 flex justify-between">
                <span>Location: UNDISCLOSED_NODE</span>
                <span>Lat: --.---- Lon: --.----</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-indigo-500/20 blur-[120px] rounded-full" />
        <div className="absolute top-[20%] -right-[10%] w-[30%] h-[30%] bg-zinc-500/20 blur-[100px] rounded-full" />
      </div>

      <main className="relative z-10 max-w-5xl mx-auto px-6 py-12 md:py-20">
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-6">
              <div className="bg-rose-500/10 border border-rose-500/20 backdrop-blur-xl p-4 rounded-2xl flex items-center gap-4 text-rose-500">
                <Info className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-semibold">{error}</span>
                <button onClick={() => setError(null)} className="ml-auto text-[10px] uppercase font-bold tracking-widest opacity-60 hover:opacity-100 italic">{t.dismiss}</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-col-reverse sm:flex-row gap-6 items-center justify-between mb-12">
          <div className="flex items-center gap-4">
            <button onClick={() => setLang(lang === 'en' ? 'ar' : 'en')} className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/5 transition-all">
              <Languages className="w-5 h-5" />
            </button>
            {user ? (
              <div className="flex items-center gap-3 bg-zinc-900/50 p-1.5 pr-2 sm:pr-4 rounded-full border border-white/5">
                <button 
                  onClick={() => setActiveTab('profile')}
                  className="relative shrink-0 cursor-pointer hover:scale-105 transition-transform"
                >
                  <div className="w-8 h-8 rounded-full border border-white/10 overflow-hidden bg-zinc-800">
                    <img 
                      src={profileData.photoURL || user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${user.displayName || 'UX'}`} 
                      className="w-full h-full object-cover" 
                      alt="" 
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${user.displayName || 'UX'}`;
                      }}
                    />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-indigo-500 rounded-full flex items-center justify-center text-[8px] font-black border-2 border-black">
                    {userStats.level}
                  </div>
                </button>
                <div onClick={() => setActiveTab('profile')} className="flex flex-col cursor-pointer hover:opacity-80 transition-opacity pr-1">
                  <span className="text-[11px] font-black uppercase tracking-tighter leading-none">{profileData.displayName || user.displayName?.split(' ')[0] || 'EXPLORER'}</span>
                  <div className="w-12 sm:w-16 h-1 bg-zinc-800 rounded-full mt-1 overflow-hidden">
                    <div className="h-full bg-indigo-500" style={{ width: `${Math.min(100, (userStats.xp % 20) * 5)}%` }} />
                  </div>
                </div>
                <button onClick={handleLogout} className="text-zinc-500 hover:text-rose-500 transition-all ml-1 p-1"><LogOut className="w-4 h-4" /></button>
              </div>
            ) : (
              <Button onClick={handleLogin} variant="outline" className="py-2 px-4 text-sm h-10">
                <LogIn className="w-4 h-4" /> <span className="hidden sm:inline">{t.login}</span>
              </Button>
            )}
          </div>

          <nav className="flex bg-zinc-900/80 p-1.5 rounded-full border border-white/5 backdrop-blur-md">
            {[
              { id: 'quest', icon: MapIcon, label: t.adventureMode },
              { id: 'sidequest', icon: Compass, label: t.sideQuest },
              { id: 'leaderboard', icon: TrendingUp, label: t.hallOfFame },
              { id: 'flight', icon: Plane, label: t.skyWatch },
              { id: 'history', icon: History, label: t.history, protected: true }
            ].map((tab) => (
              (!tab.protected || user) && (
                <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={cn("px-4 md:px-6 py-2 rounded-full text-xs md:text-sm font-semibold transition-all flex items-center gap-2", activeTab === tab.id ? "bg-white text-black shadow-lg" : "text-zinc-500 hover:text-white")}>
                  <tab.icon className="w-4 h-4" /> <span className="hidden md:inline">{tab.label}</span>
                </button>
              )
            ))}
          </nav>
        </div>

        <header className="flex flex-col md:flex-row items-center justify-between gap-8 mb-16">
          <div className="space-y-1">
            <h1 className="text-5xl md:text-7xl font-light tracking-tighter flex flex-wrap items-center justify-center md:justify-start gap-3">
              {t.title}<span className="font-semibold italic">{t.quest}</span>
            </h1>
            <p className="text-zinc-500 tracking-wider font-bold text-xs md:text-sm uppercase">{t.tagline}</p>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {activeTab === 'quest' ? (
            <motion.div key="quest" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-12">
              <section className="grid lg:grid-cols-5 gap-8 items-start">
                <Card className="lg:col-span-2 p-8 space-y-8">
                  <div className="space-y-6">
                    <Input label={t.departure} placeholder={lang === 'en' ? "e.g. San Francisco" : "مثلاً: جدة"} icon={MapPin} value={tripDetails.from} onChange={(e) => setTripDetails({...tripDetails, from: e.target.value})} rtl={isRtl} />
                    <Input label={t.destination} placeholder={lang === 'en' ? "e.g. Los Angeles" : "مثلاً: لندن"} icon={ArrowRight} value={tripDetails.to} onChange={(e) => setTripDetails({...tripDetails, to: e.target.value})} rtl={isRtl} />
                    <Input label={t.via} placeholder={lang === 'en' ? "Layovers/Route" : "نقاط توقف"} icon={Info} value={tripDetails.via} onChange={(e) => setTripDetails({...tripDetails, via: e.target.value})} rtl={isRtl} />
                    <div className="space-y-3">
                      <label className="text-xs uppercase tracking-widest text-zinc-500 font-semibold">{t.companions}</label>
                      <div className="grid grid-cols-3 gap-2">
                        {[{ id: 'Family', icon: Baby, label: t.family }, { id: 'Friends', icon: Users, label: t.friends }, { id: 'Partner', icon: Heart, label: t.partner }].map((type) => (
                          <button key={type.id} onClick={() => setTripDetails({...tripDetails, tripType: type.id})} className={cn("flex flex-col items-center gap-2 p-3 rounded-xl border transition-all", tripDetails.tripType === type.id ? "bg-white/10 border-white/20 text-white" : "bg-transparent border-white/5 text-zinc-500 hover:border-white/10")}>
                            <type.icon className="w-5 h-5" />
                            <span className="text-[10px] uppercase font-bold">{type.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <Button className="w-full text-lg py-5" onClick={getQuests} loading={isGeneratingQuests} disabled={!tripDetails.from || !tripDetails.to}>{t.generate}</Button>
                </Card>

                <div className="lg:col-span-3 space-y-6">
                  {isGeneratingQuests ? (
                    <div className="flex flex-col items-center justify-center py-20 text-zinc-500 space-y-4">
                      <Loader2 className="w-12 h-12 animate-spin text-white/20" />
                      <p className="font-mono text-sm tracking-widest uppercase animate-pulse">{t.calculating}</p>
                    </div>
                  ) : quests.length > 0 ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between mb-4 px-2 font-mono">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400">{t.yourQuests}</h3>
                        <span className="text-xs text-zinc-600">{quests.length} {t.unlocked}</span>
                      </div>
                      {quests.map((quest, i) => {
                        const localQuest = lang === 'ar' ? quest.arabic : quest;
                        return (
                          <motion.div key={i} initial={{ opacity: 0, x: isRtl ? -20 : 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}>
                            <Card className="group hover:border-white/20 transition-all cursor-default relative overflow-hidden">
                              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl -translate-y-1/2 translate-x-1/2" />
                              <div className="p-6 flex gap-6 relative z-10">
                                <div className="flex-shrink-0 w-12 h-12 bg-white/5 rounded-full flex items-center justify-center font-mono text-xs font-bold text-zinc-400 border border-white/10 group-hover:bg-white group-hover:text-black transition-all">0{i + 1}</div>
                                <div className="space-y-2 flex-grow">
                                  <div className="flex items-center justify-between">
                                    <h4 className="text-lg font-medium">{localQuest.title}</h4>
                                    <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border", quest.difficulty === 'Easy' ? "border-emerald-500/30 text-emerald-500 bg-emerald-500/5" : "border-amber-500/30 text-amber-500 bg-amber-500/5")}>
                                      {quest.difficulty === 'Easy' ? t.easy : t.medium}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium">
                                    <MapPin className="w-3 h-3" /> {localQuest.location}
                                  </div>
                                  <p className="text-sm text-zinc-400 leading-relaxed py-2">{localQuest.objective}</p>
                                  <div className="pt-2 flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-[11px] font-semibold text-indigo-400/80">
                                      <TrendingUp className="w-3 h-3" /> {localQuest.fits}
                                    </div>
                                    {user && (
                                      <button 
                                        onClick={() => completeQuest(quest)} 
                                        disabled={questStatus[quest.title]}
                                        className={cn(
                                          "text-[10px] font-black uppercase tracking-widest transition-colors px-3 py-1 rounded-md border",
                                          questStatus[quest.title] 
                                            ? "text-zinc-600 bg-zinc-900 border-zinc-800 cursor-not-allowed" 
                                            : "text-emerald-500 hover:text-emerald-400 bg-emerald-500/5 border-emerald-500/20"
                                        )}
                                      >
                                        {questStatus[quest.title] ? 'XP Synced' : 'Claim XP'}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </Card>
                          </motion.div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center py-20 border border-dashed border-white/5 rounded-3xl opacity-40">
                      <Compass className="w-16 h-16 mb-4 text-zinc-800" />
                      <p className="text-zinc-500 text-sm italic">{t.inputRoute}</p>
                    </div>
                  )}
                </div>
              </section>
            </motion.div>
          ) : activeTab === 'flight' ? (
            <motion.div key="flight" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
              <section className="space-y-8">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="space-y-1">
                    <h2 className="text-3xl font-light tracking-tight flex items-center gap-3">
                      <Plane className="w-8 h-8 text-indigo-500" /> {t.trackOrbit}
                    </h2>
                    <p className="text-zinc-500 text-xs uppercase tracking-widest font-bold">{t.trackTagline}</p>
                  </div>
                  
                  <div className="flex bg-zinc-950 p-1 rounded-xl border border-white/5">
                    {[
                      { id: 'live', icon: Activity, label: t.liveTracking },
                      { id: 'history', icon: History, label: t.flightHistory },
                      { id: 'schedule', icon: Calendar, label: t.upcomingSchedule }
                    ].map((tab) => (
                      <button 
                        key={tab.id} 
                        onClick={() => setSkyTab(tab.id as any)} 
                        className={cn(
                          "px-4 py-2 rounded-lg text-[10px] font-bold uppercase transition-all flex items-center gap-2",
                          skyTab === tab.id ? "bg-zinc-800 text-white shadow-xl" : "text-zinc-600 hover:text-zinc-400"
                        )}
                      >
                        <tab.icon className="w-3 h-3" /> {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4">
                  <input 
                    type="text" 
                    value={flightNumber} 
                    onChange={(e) => setFlightNumber(e.target.value.toUpperCase())} 
                    placeholder={t.flightPlaceholder} 
                    dir="ltr" 
                    className="flex-grow bg-zinc-900/80 border border-white/10 rounded-2xl py-4 px-6 text-2xl font-mono tracking-[0.2em] uppercase focus:outline-none focus:border-indigo-500/50 transition-all shadow-inner" 
                  />
                  <Button onClick={() => getFlightInfo(false)} loading={isSearchingFlight} className="py-4 px-12 text-sm uppercase tracking-widest font-bold">
                    {t.scanSky}
                  </Button>
                </div>

                {isQuotaExceeded && (
                  <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 flex items-start gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="w-10 h-10 bg-rose-500 rounded-xl flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(244,63,94,0.3)]">
                      <AlertTriangle className="w-6 h-6 text-white" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-rose-500 font-bold uppercase tracking-tighter text-sm">Critical Radar System Outage</h4>
                      <p className="text-zinc-400 text-xs leading-relaxed max-w-xl">
                        The remote telemetry link (Aviationstack) has reached its monthly quota limit. 
                        Auto-tracking and real-time positioning are currently restricted. 
                        Please try again later or verify your API configuration in the Secrets panel.
                      </p>
                    </div>
                  </div>
                )}

                {isSearchingFlight && (
                  <div className="flex flex-col items-center gap-4 py-20 border border-dashed border-white/5 rounded-3xl">
                    <Loader2 className="w-12 h-12 animate-spin text-indigo-500/20" />
                    <span className="text-[10px] uppercase font-bold tracking-[0.4em] text-zinc-600 animate-pulse">{t.syncing}</span>
                  </div>
                )}

                {flightInfo && !isSearchingFlight && (
                  <div className="space-y-6">
                    {skyTab === 'live' && (
                      <div className="grid lg:grid-cols-7 gap-6">
                        {/* Map View */}
                        <Card className="lg:col-span-4 h-[400px] md:h-[600px] border-white/10 relative">
                          <MapContainer 
                            center={[24.7136, 46.6753]} // Default to Riyadh area
                            zoom={4} 
                            scrollWheelZoom={false}
                            className="h-full w-full z-10"
                            zoomControl={false}
                            preferCanvas={true} // Hardware Acceleration for smooth paths
                          >
                            <TileLayer
                              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                            />
                            
                            {/* Path Trail */}
                            {(currentPath.length > 1 || selectedHistoryPath) && (
                              <Polyline 
                                positions={selectedHistoryPath || currentPath} 
                                color="#6366f1" 
                                weight={3} 
                                opacity={0.8}
                                smoothFactor={1.5}
                              />
                            )}

                            {(lerpedLive || flightInfo.data?.live) && (
                              <>
                                <Marker 
                                  position={[
                                    (lerpedLive || flightInfo.data!.live!).latitude, 
                                    (lerpedLive || flightInfo.data!.live!).longitude
                                  ]}
                                  icon={createPlaneIcon((lerpedLive || flightInfo.data!.live!).direction)}
                                >
                                  <Popup>
                                    <div className="text-black font-sans p-1">
                                      <p className="font-bold border-b border-zinc-100 pb-1 mb-1">{flightInfo.data!.flight.iata || flightInfo.data!.flight.number}</p>
                                      <p className="text-[10px] text-zinc-500 font-bold uppercase">{flightInfo.data!.airline?.name || flightInfo.data!.airline_name}</p>
                                      <div className="grid grid-cols-2 gap-2 mt-2">
                                        <div className="text-[9px] text-zinc-400">ALT: <span className="text-indigo-600 font-mono">{(lerpedLive || flightInfo.data!.live!).altitude ? Math.round((lerpedLive || flightInfo.data!.live!).altitude! * 3.28084).toLocaleString() : '--'} FT</span></div>
                                        <div className="text-[9px] text-zinc-400">SPD: <span className="text-indigo-600 font-mono">{Math.round((lerpedLive || flightInfo.data!.live!).speed_horizontal || 0)} KTS</span></div>
                                      </div>
                                    </div>
                                  </Popup>
                                </Marker>
                                <MapUpdater center={[(lerpedLive || flightInfo.data!.live!).latitude, (lerpedLive || flightInfo.data!.live!).longitude]} />
                              </>
                            )}
                            {/* If landed, show route line */}
                            {(!flightInfo.data?.live || flightInfo.data?.flight_status === 'LANDED') && (
                               <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] z-20">
                                 <p className="text-[10px] font-bold tracking-widest uppercase text-white/60 bg-black/60 px-4 py-2 rounded-full border border-white/10">No Live Signal • Showing Static Route</p>
                               </div>
                            )}
                          </MapContainer>
                          
                          <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
                             <div className="bg-black/80 backdrop-blur-md border border-white/10 p-3 rounded-xl flex items-center gap-3">
                               <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                               <span className="text-[10px] font-mono font-bold uppercase tracking-tighter text-white">{t.radarInterval}</span>
                             </div>
                             <button 
                               onClick={() => getFlightInfo(false)}
                               className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold uppercase px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 transition-all pointer-events-auto"
                             >
                               <Activity className="w-3 h-3" /> {t.manualPing}
                             </button>
                             <div className="bg-zinc-900/50 p-2 rounded-lg text-[9px] text-zinc-500 max-w-[120px] leading-tight">
                               ⚠️ {t.quotaWarning}
                             </div>
                          </div>
                        </Card>

                        {/* Detailed Stats */}
                        <div className="lg:col-span-3 space-y-6">
                          <Card className="p-8 space-y-8 relative overflow-hidden group">
                             <div className="flex items-center justify-between relative z-10">
                               <div className="space-y-1">
                                 <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-bold uppercase tracking-widest">
                                   <Layers className="w-3 h-3" /> {t.airline}
                                 </div>
                                 <h3 className="text-2xl font-bold tracking-tight">{flightInfo.data?.airline?.name || flightInfo.data?.airline_name}</h3>
                               </div>
                               <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 group-hover:bg-indigo-500 group-hover:text-white transition-all">
                                 <Plane className="w-8 h-8" />
                               </div>
                             </div>

                             <div className="grid grid-cols-2 gap-8 relative z-10">
                               <div className="space-y-1">
                                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{t.aircraft}</span>
                                  <p className="text-sm font-semibold text-white/90">
                                    {flightInfo.data?.aircraft?.model || flightInfo.data?.aircraft?.iata || flightInfo.data?.aircraft?.icao || 'N/A'}
                                  </p>
                               </div>
                               <div className="space-y-1">
                                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{t.registration}</span>
                                  <p className="text-sm font-mono font-bold text-indigo-400">{flightInfo.data?.aircraft?.registration || 'N/A'}</p>
                               </div>
                             </div>

                             <div className="space-y-4 pt-4 border-t border-white/5 relative z-10">
                               <div className="flex items-center justify-between text-xs">
                                 <span className="text-zinc-500 uppercase font-bold tracking-tighter">{t.status}</span>
                                 <div className="flex flex-col items-end gap-1">
                                   <span className={cn(
                                     "px-3 py-1 rounded-full font-black tracking-widest text-[10px] border",
                                     flightInfo.data?.flight_status === 'ACTIVE' || flightInfo.data?.flight_status === 'IN-FLIGHT' 
                                       ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                                       : "bg-rose-500/10 border-rose-500/20 text-rose-500"
                                   )}>
                                     {flightInfo.data?.flight_status}
                                   </span>
                                   {(flightInfo.data?.departure?.delay ?? 0) > 0 && (
                                     <span className="text-[9px] text-rose-400 font-bold">DELAY: {flightInfo.data?.departure?.delay}M</span>
                                   )}
                                 </div>
                               </div>
                               
                               {flightInfo.data?.live && (
                                 <>
                                   <div className="grid grid-cols-2 gap-4">
                                     <div className="flex flex-col gap-1">
                                       <span className="text-zinc-500 uppercase font-bold tracking-tighter text-[9px]">{t.altitude}</span>
                                       <span className="font-mono text-white/80 text-xs">
                                         {flightInfo.data.live.altitude 
                                           ? Math.round(flightInfo.data.live.altitude * 3.28084).toLocaleString() 
                                           : '--'} FT
                                       </span>
                                     </div>
                                     <div className="flex flex-col gap-1">
                                       <span className="text-zinc-500 uppercase font-bold tracking-tighter text-[9px]">{t.heading}</span>
                                       <div className="flex items-center gap-2 font-mono text-white/80 text-xs">
                                         <Navigation className="w-3 h-3 text-indigo-500" style={{ transform: `rotate(${flightInfo.data.live.direction}deg)` }} />
                                         {flightInfo.data.live.direction}°
                                       </div>
                                     </div>
                                   </div>
                                   <div className="grid grid-cols-2 gap-4">
                                     <div className="flex flex-col gap-1">
                                       <span className="text-zinc-500 uppercase font-bold tracking-tighter text-[9px]">Speed</span>
                                       <span className="font-mono text-white/80 text-xs">
                                         {flightInfo.data.live.speed_horizontal ? Math.round(flightInfo.data.live.speed_horizontal) : '--'} KTS
                                       </span>
                                     </div>
                                     <div className="flex flex-col gap-1">
                                       <span className="text-zinc-500 uppercase font-bold tracking-tighter text-[9px]">Vert Speed</span>
                                       <span className="font-mono text-white/80 text-xs">
                                         {flightInfo.data.live.speed_vertical || 0} FPM
                                       </span>
                                     </div>
                                   </div>
                                 </>
                               )}
                             </div>

                             <div className="flex items-center justify-between gap-4 pt-4 border-t border-white/5 relative z-10">
                               <div className="text-center flex-grow">
                                 <p className="text-[10px] font-bold text-zinc-600 uppercase mb-1 flex items-center justify-center gap-1">
                                   {flightInfo.data?.departure?.iata} 
                                   {flightInfo.data?.departure?.terminal && <span className="text-[8px] bg-zinc-800 px-1 rounded">T{flightInfo.data.departure.terminal}</span>}
                                   {flightInfo.data?.departure?.gate && <span className="text-[8px] bg-indigo-900/50 px-1 rounded">G{flightInfo.data.departure.gate}</span>}
                                 </p>
                                 <p className="text-sm font-bold truncate max-w-[100px]">{flightInfo.data?.departure?.airport}</p>
                                 <p className="text-[8px] text-zinc-500 font-mono mt-1 truncate">
                                   {flightInfo.data?.departure?.icao} • {flightInfo.data?.departure?.timezone?.split('/')[1]?.replace('_', ' ')}
                                 </p>
                               </div>
                               <ArrowRight className="w-5 h-5 text-indigo-500" />
                               <div className="text-center flex-grow">
                                 <p className="text-[10px] font-bold text-zinc-600 uppercase mb-1 flex items-center justify-center gap-1">
                                   {flightInfo.data?.arrival?.iata}
                                   {flightInfo.data?.arrival?.terminal && <span className="text-[8px] bg-zinc-800 px-1 rounded">T{flightInfo.data.arrival.terminal}</span>}
                                   {flightInfo.data?.arrival?.gate && <span className="text-[8px] bg-indigo-900/50 px-1 rounded">G{flightInfo.data.arrival.gate}</span>}
                                 </p>
                                 <p className="text-sm font-bold truncate max-w-[100px]">{flightInfo.data?.arrival?.airport}</p>
                                 <p className="text-[8px] text-zinc-500 font-mono mt-1 truncate">
                                   {flightInfo.data?.arrival?.icao} • {flightInfo.data?.arrival?.timezone?.split('/')[1]?.replace('_', ' ')}
                                 </p>
                               </div>
                             </div>
                          </Card>
                          
                          <Card className="p-6 border border-white/5 bg-transparent">
                             <div className="flex items-center gap-3 mb-4">
                               <Info className="w-4 h-4 text-indigo-500" />
                               <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">Intelligence Briefing</span>
                             </div>
                             <div className="text-[13px] leading-relaxed text-zinc-500 font-medium">
                               <ReactMarkdown>{flightInfo.info}</ReactMarkdown>
                             </div>
                          </Card>
                        </div>
                      </div>
                    )}

                    {skyTab === 'history' && (
                      <Card className="p-8">
                        <div className="flex items-center justify-between mb-8">
                          <div className="space-y-1">
                            <h3 className="text-xl font-medium">Recorded Session Intel</h3>
                            <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Local Flight Log for {flightNumber || 'Active Targets'}</p>
                          </div>
                          {selectedHistoryPath && (
                            <Button onClick={() => setSelectedHistoryPath(null)} variant="outline" className="py-2 px-4 text-[10px] uppercase font-bold">Clear Path View</Button>
                          )}
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left font-sans text-sm">
                            <thead>
                              <tr className="border-b border-white/5 text-[10px] uppercase tracking-widest text-zinc-600 font-bold">
                                <th className="pb-4">Target</th>
                                <th className="pb-4">Route</th>
                                <th className="pb-4">Status</th>
                                <th className="pb-4">Data Points</th>
                                <th className="pb-4">Timestamp</th>
                                <th className="pb-4 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="text-zinc-400">
                              {localFlightHistory.length > 0 ? localFlightHistory.map((item, idx) => (
                                <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-all">
                                  <td className="py-4 font-mono font-bold text-white text-xs">{item.flightNumber}</td>
                                  <td className="py-4 text-xs">{item.origin} ➔ {item.destination}</td>
                                  <td className="py-4">
                                    <span className={cn(
                                      "text-[10px] font-black tracking-widest",
                                      item.status === 'LANDED' || item.status === 'ARRIVED' ? "text-emerald-500" : "text-indigo-500"
                                    )}>
                                      {item.status}
                                    </span>
                                  </td>
                                  <td className="py-4 font-mono text-[10px]">{item.path?.length || 0} PTS</td>
                                  <td className="py-4 text-[10px] opacity-60">
                                    {item.createdAt instanceof Timestamp ? item.createdAt.toDate().toLocaleString() : 'Recent'}
                                  </td>
                                  <td className="py-4 text-right">
                                    <button 
                                      onClick={() => {
                                        setSelectedHistoryPath(item.path);
                                        setSkyTab('live');
                                      }}
                                      className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 hover:text-indigo-300 flex items-center gap-2 justify-end ml-auto"
                                    >
                                      View Path <MapIcon className="w-3 h-3" />
                                    </button>
                                  </td>
                                </tr>
                              )) : (
                                <tr>
                                  <td colSpan={6} className="py-12 text-center text-zinc-600 italic uppercase text-[10px] tracking-widest">
                                    No local telemetry recorded yet. Enter a flight to begin tracking.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </Card>
                    )}

                    {skyTab === 'schedule' && (
                      <Card className="p-8">
                        <div className="space-y-1 mb-8">
                          <h3 className="text-xl font-medium">Projected Schedule</h3>
                          <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Next 48 hours for {flightNumber}</p>
                        </div>
                        <div className="space-y-4">
                           {[{ d: '18 May', t: '11:45' }, { d: '19 May', t: '11:45' }].map((item, idx) => (
                             <div key={idx} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-indigo-500/30 transition-all group">
                                <div className="flex items-center gap-4">
                                   <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                                     <Calendar className="w-5 h-5" />
                                   </div>
                                   <div>
                                      <p className="text-sm font-bold">{item.d} 2026</p>
                                      <p className="text-[10px] text-zinc-500 font-bold uppercase">{t.departure}: {item.t}</p>
                                   </div>
                                </div>
                                <div className="text-right">
                                   <p className="text-xs font-bold uppercase tracking-widest text-emerald-500">Scheduled</p>
                                   <p className="text-[10px] text-zinc-500 font-mono">ON_TIME</p>
                                </div>
                             </div>
                           ))}
                        </div>
                      </Card>
                    )}
                  </div>
                )}
              </section>
            </motion.div>
          ) : activeTab === 'sidequest' ? (
            <motion.div key="sidequest" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
              {!user ? (
                 <Card className="p-20 flex flex-col items-center justify-center text-center space-y-6 border-dashed">
                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center opacity-40">
                      <Compass className="w-10 h-10" />
                    </div>
                    <div>
                      <h4 className="text-2xl font-bold">{t.signInToUnlock}</h4>
                      <p className="text-zinc-500 mt-2">Authentication required to sync level and daily quests.</p>
                    </div>
                    <Button onClick={handleLogin}>{t.login}</Button>
                 </Card>
              ) : (
                <>
                  {/* Leaderboard & Stats Summary */}
              <div className="grid md:grid-cols-4 gap-6">
                  {/* XP Stats */}
                  <Card className="p-6 md:col-span-1 border border-indigo-500/30 bg-indigo-500/5">
                    <div className="space-y-4">
                      <div className="flex justify-between items-end">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase">{t.level} {userStats.level}</span>
                        <span className="text-[10px] font-mono text-indigo-400">{userStats.xp % 20} / 20 {t.xp}</span>
                      </div>
                      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${(userStats.xp % 20) * 5}%` }}
                          className="h-full bg-indigo-500" 
                        />
                      </div>
                      <p className="text-[9px] text-zinc-600 italic">Complete quests to level up your status.</p>
                    </div>
                  </Card>

                 {/* GPS Setting */}
                 <Card className="p-6 md:col-span-1 border border-white/5">
                    <div className="flex items-center justify-between gap-4 h-full">
                       <div className="space-y-1">
                         <span className="text-[10px] font-bold text-zinc-500 uppercase">{t.locationQuest}</span>
                         <p className="text-[9px] text-zinc-600">{t.questSettingDesc}</p>
                       </div>
                       <button 
                         onClick={() => setUseLocation(!useLocation)}
                         className={cn(
                           "flex-shrink-0 w-10 h-5 rounded-full transition-all relative",
                           useLocation ? "bg-indigo-500" : "bg-zinc-800"
                         )}
                       >
                         <motion.div 
                           animate={{ x: useLocation ? 20 : 0 }}
                           className="absolute top-1 left-1 w-3 h-3 bg-white rounded-full shadow-md" 
                         />
                       </button>
                    </div>
                 </Card>

                 {/* Leaderboard Table */}
                 <Card className="p-6 md:col-span-2 overflow-hidden h-full">
                    <div className="flex items-center gap-3 mb-4">
                      <TrendingUp className="w-4 h-4 text-indigo-500" />
                      <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">{t.leaderboard}</span>
                    </div>
                    <div className="space-y-2 max-h-[80px] overflow-y-auto scrollbar-hide">
                      {leaderboard.length > 0 ? leaderboard.map((player, i) => (
                        <div key={i} className="flex items-center justify-between text-[11px] py-1 border-b border-white/5 last:border-0">
                           <div className="flex items-center gap-3">
                             <span className="font-mono text-zinc-600">{i+1}.</span>
                             <img src={player.photoURL} className="w-4 h-4 rounded-full" alt="" />
                             <span className={cn("font-medium", player.uid === user?.uid ? "text-indigo-400" : "text-white/80")}>{player.displayName}</span>
                           </div>
                           <div className="font-mono text-zinc-500">Lv.{player.level} • {player.xp} XP</div>
                        </div>
                      )) : (
                        <p className="text-[10px] text-zinc-600 italic">No rankings recorded yet.</p>
                      )}
                    </div>
                 </Card>
              </div>

              {/* Day Quest Section */}
              <div className="space-y-6">
                <div className="flex items-center justify-between px-2">
                  <h3 className="text-xl font-light tracking-tight flex items-center gap-2">
                    <Compass className="w-6 h-6 text-indigo-500" /> {t.sideQuest}
                  </h3>
                  {userStats.dailyQuest && userStats.status !== 'completed' && (
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest bg-zinc-900 px-3 py-1 rounded-full border border-white/5">
                      {userStats.refreshesRemaining} {t.refreshesLeft}
                    </span>
                  )}
                </div>

                {isGeneratingQuests ? (
                  <Card className="p-12 border border-indigo-500/30 bg-indigo-500/5 flex flex-col items-center justify-center text-center space-y-6">
                    <div className="relative">
                      <div className="w-20 h-20 bg-indigo-500/20 rounded-full flex items-center justify-center animate-spin">
                        <Compass className="w-10 h-10 text-indigo-500" />
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center">
                         <div className="w-12 h-12 bg-white/10 rounded-full animate-ping" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-xl font-bold italic tracking-tighter">REFRESHING MATRIX...</h4>
                      <p className="text-zinc-500 max-w-sm uppercase text-[10px] font-bold tracking-widest">{t.loadingQuest}</p>
                    </div>
                  </Card>
                ) : !user || (userStats.status === 'completed' && userStats?.dailyQuest?.lastRefreshDate !== new Date().toDateString()) ? (
                   <Card className="p-12 border-dashed border-white/10 flex flex-col items-center justify-center text-center space-y-6">
                     <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center">
                       <Compass className="w-10 h-10 text-indigo-500" />
                     </div>
                     <div className="space-y-2">
                       <h4 className="text-xl font-bold">Quest Resetting.</h4>
                       <p className="text-zinc-500 max-w-sm">You have completed today's challenge or need to sign in to start exploring.</p>
                     </div>
                   </Card>
                ) : !userStats.dailyQuest ? (
                  <Card className="p-12 border-dashed border-white/10 flex flex-col items-center justify-center text-center space-y-6">
                    <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center">
                      <Compass className="w-10 h-10 text-indigo-500 animate-pulse" />
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-xl font-bold">Your Journey awaits.</h4>
                      <p className="text-zinc-500 max-w-sm">Every day, a unique side quest is generated based on your current exploration zone.</p>
                    </div>
                    <Button onClick={() => getSideQuest()} loading={isGeneratingQuests} variant="secondary">Reveal My Quest</Button>
                  </Card>
                ) : (
                  <Card className={cn(
                    "relative overflow-hidden group transition-all p-8 md:p-12",
                    userStats.status === 'completed' ? "border-emerald-500/30" : "border-indigo-500/30"
                  )}>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] -translate-y-1/2 translate-x-1/2" />
                    
                    <div className="relative z-10 grid md:grid-cols-2 gap-12 items-center">
                      <div className="space-y-8">
                        <div className="space-y-4">
                          <div className={cn(
                            "inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                            userStats.status === 'completed' ? "bg-emerald-500/10 text-emerald-500" : "bg-indigo-500/10 text-indigo-500"
                          )}>
                            {userStats.status === 'completed' ? <Activity className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                            {userStats.status === 'completed' ? t.questCompleted : t.sideQuest}
                          </div>
                          <h2 className="text-4xl md:text-5xl font-bold tracking-tighter leading-none">
                            {lang === 'ar' && userStats.dailyQuest.arabic ? userStats.dailyQuest.arabic.title : userStats.dailyQuest.title}
                          </h2>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-6">
                           <div className="space-y-1">
                             <span className="text-[10px] font-bold text-zinc-500 uppercase">{t.location}</span>
                             <p className="text-sm font-semibold">
                               {lang === 'ar' && userStats.dailyQuest.arabic ? userStats.dailyQuest.arabic.location : userStats.dailyQuest.location}
                             </p>
                           </div>
                           <div className="space-y-1">
                             <span className="text-[10px] font-bold text-zinc-500 uppercase">{t.difficulty}</span>
                             <p className={cn(
                               "text-sm font-bold uppercase tracking-widest",
                               userStats.dailyQuest.difficulty?.toLowerCase() === 'easy' ? "text-emerald-500" : 
                               userStats.dailyQuest.difficulty?.toLowerCase() === 'medium' ? "text-amber-500" : "text-rose-500"
                             )}>{userStats.dailyQuest.difficulty}</p>
                           </div>
                        </div>

                        <div className="space-y-2">
                           <span className="text-[10px] font-bold text-zinc-500 uppercase">{t.objective}</span>
                           <p className="text-lg text-white/80 leading-relaxed font-bold">
                             {lang === 'ar' && userStats.dailyQuest.arabic ? userStats.dailyQuest.arabic.objective : userStats.dailyQuest.objective}
                           </p>
                        </div>

                        <div className="pt-8 border-t border-white/5 flex flex-wrap gap-6 items-center">
                          {userStats.status === 'available' && (
                            <>
                              <Button onClick={acceptQuest} className="px-10">Accept Quest</Button>
                              {userStats.refreshesRemaining > 0 && (
                                <button onClick={() => getSideQuest(true)} className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-white transition-all flex items-center gap-2 border-b border-zinc-900 hover:border-zinc-500 pb-1">
                                  <Plus className="w-3 h-3 rotate-45" /> {t.refreshQuest}
                                </button>
                              )}
                            </>
                          )}
                          {userStats.status === 'accepted' && (
                            <div className="w-full space-y-6">
                              <div className="flex flex-col items-center gap-4 p-6 border border-dashed border-white/10 rounded-3xl bg-white/5 group-hover:bg-white/10 transition-all">
                                {proofPhoto ? (
                                  <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-white/10">
                                    <img src={proofPhoto} className="w-full h-full object-cover" alt="Proof" />
                                    <button 
                                      onClick={() => setProofPhoto(null)}
                                      className="absolute top-2 right-2 bg-black/60 backdrop-blur-md p-2 rounded-full text-white hover:bg-rose-500 transition-colors"
                                    >
                                      <Plus className="w-4 h-4 rotate-45" />
                                    </button>
                                    <div className="absolute bottom-2 left-2 px-3 py-1 bg-emerald-500/80 backdrop-blur-md rounded-full text-[10px] font-black text-white flex items-center gap-2">
                                      <CheckCircle2 className="w-3 h-3" /> PROOF ACQUIRED
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center gap-4 py-4">
                                    <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-zinc-500 group-hover:text-indigo-500 transition-colors">
                                      <Camera className="w-8 h-8" />
                                    </div>
                                    <div className="text-center space-y-1">
                                      <p className="text-sm font-bold">{t.takePhoto}</p>
                                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{t.onlyCamera}</p>
                                    </div>
                                    <label className="cursor-pointer">
                                      <input 
                                        type="file" 
                                        accept="image/*" 
                                        capture="camera" 
                                        onChange={handleFileChange} 
                                        className="hidden" 
                                      />
                                      <div className="bg-white text-black px-8 py-3 rounded-full text-xs font-black uppercase tracking-widest hover:bg-zinc-200 transition-all shadow-xl">
                                        Open Camera
                                      </div>
                                    </label>
                                  </div>
                                )}
                              </div>
                              <Button 
                                onClick={() => completeQuest()} 
                                variant="secondary" 
                                disabled={!proofPhoto}
                                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white border-0 shadow-[0_0_20px_rgba(16,185,129,0.3)] py-5"
                              >
                                Complete Quest (+{userStats.dailyQuest.xpReward} XP)
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-center">
                        <div className="relative">
                          <div className={cn(
                            "w-48 h-48 md:w-64 md:h-64 rounded-3xl border-2 flex flex-col items-center justify-center space-y-2 shadow-2xl transition-all backdrop-blur-md",
                            userStats.status === 'completed' ? "bg-emerald-500/10 border-emerald-500/50 scale-105" : "bg-indigo-500/10 border-indigo-500/50"
                          )}>
                             <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Reward Pool</span>
                             <span className="text-5xl md:text-7xl font-black tracking-tighter text-white">+{userStats.dailyQuest.xpReward}</span>
                             <span className="text-xs font-mono font-bold text-indigo-400">XP DATA BYTES</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            </>
          )}
        </motion.div>
      ) : activeTab === 'profile' ? (
        <motion.div key="profile" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="max-w-2xl mx-auto space-y-8 md:space-y-12">
           <div className="text-center space-y-4">
             <div className="relative inline-block">
                <img src={profileData.photoURL} className="w-24 h-24 md:w-32 md:h-32 rounded-3xl border-4 border-indigo-500 shadow-2xl object-cover" alt="" />
                <div className="absolute -top-3 -right-3 bg-indigo-600 px-3 py-1 rounded-full text-xs font-black border-4 border-black">
                  LV. {userStats.level}
                </div>
             </div>
             <h2 className="text-3xl md:text-4xl font-bold tracking-tighter">{profileData.displayName}</h2>
             <p className="font-mono text-[10px] md:text-xs text-zinc-500 uppercase tracking-widest leading-relaxed">
               {userStats.xp} TOTAL XP_COLLECTED
             </p>
           </div>

           <Card className="p-6 md:p-8 space-y-6">
             <h3 className="text-lg md:text-xl font-bold border-b border-white/5 pb-4">{t.updateProfile}</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <Input 
                  label={t.displayName} 
                  placeholder="Stealth Explorer" 
                  icon={Users} 
                  value={profileData.displayName} 
                  onChange={(e) => setProfileData({...profileData, displayName: e.target.value})} 
                />
                <Input 
                  label={t.avatarUrl} 
                  placeholder="https://image-url..." 
                  icon={Plus} 
                  value={profileData.photoURL} 
                  onChange={(e) => setProfileData({...profileData, photoURL: e.target.value})} 
                />
                <div className="md:col-span-2 space-y-2">
                   <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-2">{t.bio}</label>
                   <textarea 
                     value={profileData.bio}
                     onChange={(e) => setProfileData({...profileData, bio: e.target.value})}
                     className="w-full bg-zinc-900/50 border border-white/10 rounded-xl p-4 text-sm focus:outline-none focus:border-indigo-500 transition-all min-h-[100px]"
                     placeholder="Tell your travel story..."
                   />
                </div>
                <Input 
                  label={t.socialX} 
                  placeholder="@username" 
                  icon={TrendingUp} 
                  value={profileData.socialX} 
                  onChange={(e) => setProfileData({...profileData, socialX: e.target.value})} 
                />
                <Input 
                  label={t.socialInsta} 
                  placeholder="@username" 
                  icon={Activity} 
                  value={profileData.socialInsta} 
                  onChange={(e) => setProfileData({...profileData, socialInsta: e.target.value})} 
                />
             </div>
             <Button className="w-full mt-2" onClick={updateProfile} loading={isSavingProfile}>
               {isSavingProfile ? t.saving : t.updateProfile}
             </Button>
           </Card>

           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card className="p-6">
                <span className="text-[10px] font-bold text-zinc-500 uppercase block mb-2">Total Quests</span>
                <p className="text-4xl font-black">{savedTrips.length}</p>
              </Card>
              <Card className="p-6">
                <span className="text-[10px] font-bold text-zinc-500 uppercase block mb-2">Daily Streak</span>
                <p className="text-4xl font-black">1</p>
              </Card>
           </div>
        </motion.div>
      ) : activeTab === 'leaderboard' ? (
        <motion.div key="leaderboard" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
           <div className="text-center space-y-2 mb-12">
             <h2 className="text-5xl font-black tracking-tighter uppercase">{t.hallOfFame}</h2>
             <p className="text-zinc-500 font-mono text-xs tracking-widest italic font-bold">TOP GLOBAL EXPLORERS SYNCED FROM CORE DATA</p>
           </div>
           
           <div className="max-w-4xl mx-auto space-y-4">
              {leaderboard.length > 0 ? leaderboard.map((player, i) => (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  key={i} 
                  className={cn(
                    "flex items-center justify-between p-6 rounded-3xl border transition-all hover:bg-white/5",
                    player.uid === user?.uid ? "bg-indigo-500/10 border-indigo-500/30" : "bg-zinc-900/40 border-white/5"
                  )}
                >
                   <div className="flex items-center gap-6">
                     <div className={cn(
                       "w-10 h-10 rounded-full flex items-center justify-center font-black text-lg border-2",
                       i === 0 ? "bg-amber-500 border-amber-400 text-black shadow-[0_0_20px_rgba(245,158,11,0.4)]" : 
                       i === 1 ? "bg-zinc-300 border-zinc-200 text-black" : 
                       i === 2 ? "bg-amber-700 border-amber-600 text-white" : "bg-zinc-800 border-zinc-700 text-zinc-500"
                     )}>
                       {i + 1}
                     </div>
                     <img src={player.photoURL} className="w-12 h-12 rounded-2xl border border-white/10 object-cover" alt="" />
                     <div className="flex flex-col">
                       <span className="text-xl font-bold tracking-tight">{player.displayName}</span>
                       <div className="flex items-center gap-3">
                         <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{player.uid === user?.uid ? 'YOU • THE COMMANDER' : 'ELITE EXPLORER'}</span>
                         {player.level > 10 && <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded text-[8px] font-black uppercase">Legend</span>}
                       </div>
                     </div>
                   </div>
                   <div className="flex items-center gap-8 md:gap-16">
                     <div className="text-center hidden sm:block">
                        <p className="text-[10px] font-bold text-zinc-600 uppercase mb-1">Rank</p>
                        <p className="font-mono text-sm font-bold text-zinc-400">#{i+1}</p>
                     </div>
                     <div className="text-center">
                        <p className="text-[10px] font-bold text-zinc-600 uppercase mb-1">Power Level</p>
                        <p className="text-xl font-black text-white">LV. {player.level}</p>
                     </div>
                     <div className="text-right min-w-[80px]">
                        <p className="text-[10px] font-bold text-zinc-600 uppercase mb-1">XP Points</p>
                        <p className="font-mono text-sm font-bold text-indigo-400">{player.xp.toLocaleString()}</p>
                     </div>
                   </div>
                </motion.div>
              )) : (
                <div className="py-20 text-center animate-pulse">
                   <p className="text-zinc-500 uppercase tracking-widest font-black">Syncing Interstellar Rankings...</p>
                </div>
              )}
           </div>
        </motion.div>
      ) : activeTab === 'history' ? (
            <motion.div key="history" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-light tracking-tight flex items-center gap-3">
                  <History className="w-8 h-8 text-indigo-500" /> {t.history}
                </h2>
                <Button onClick={() => setActiveTab('quest')} variant="secondary" className="px-4 py-2 text-xs">
                  <Plus className="w-3 h-3" /> {t.newQuest}
                </Button>
              </div>
              {savedTrips.length > 0 ? (
                <div className="grid md:grid-cols-2 gap-6">
                  {savedTrips.map((trip) => (
                    <Card key={trip.id} className="p-6 hover:border-white/20 transition-all flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-2 text-lg font-semibold mb-1">
                          <span>{trip.from}</span>
                          <ArrowRight className={cn("w-4 h-4 text-zinc-600", isRtl && "rotate-180")} />
                          <span>{trip.to}</span>
                        </div>
                        <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2 mb-4">
                           <Users className="w-3 h-3" /> {translations[lang][trip.tripType.toLowerCase() as keyof typeof translations['en']] || trip.tripType} • {trip.createdAt instanceof Timestamp ? trip.createdAt.toDate().toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US') : 'Recent'}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {trip.quests.slice(0, 3).map((q, idx) => (
                            <span key={idx} className="text-[10px] bg-white/5 border border-white/5 px-2 py-1 rounded-md text-zinc-400">
                              {lang === 'en' ? q.title : q.arabic.title}
                            </span>
                          ))}
                          {trip.quests.length > 3 && <span className="text-[10px] text-zinc-600 self-center">+{trip.quests.length - 3}</span>}
                        </div>
                      </div>
                      <button onClick={() => { setQuests(trip.quests); setActiveTab('quest'); }} className="mt-8 w-full text-xs font-bold uppercase tracking-[0.2em] py-3 border border-indigo-500/20 text-indigo-400 rounded-xl hover:bg-indigo-500/10 transition-all">
                         {t.viewDetails}
                      </button>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="py-20 text-center space-y-4 opacity-40 font-mono tracking-widest uppercase">
                  <History className="w-16 h-16 mx-auto text-zinc-800" />
                  <p className="text-sm">{t.noSaved}</p>
                </div>
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </main>

      <footer className="relative z-10 border-t border-white/5 py-12 mt-20">
        <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8 text-zinc-600 font-bold uppercase tracking-widest text-[10px]">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4" /> <span>{t.title}{t.quest} AI 2026</span>
          </div>
          <div className="flex gap-8">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Safety</a>
            <a href="#" className="hover:text-white transition-colors">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}


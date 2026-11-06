import { useState, useEffect, useRef } from 'react';
import { api, removeStoredToken, isStaticHost } from './lib/api.ts';
import { clientStore } from './lib/clientStore.ts';
import { User } from './types.ts';
import { Navbar } from './components/Navbar.tsx';
import { LoginScreen } from './components/LoginScreen.tsx';
import { TeacherView } from './components/TeacherView.tsx';
import { GuardView } from './components/GuardView.tsx';
import { AdminView } from './components/AdminView.tsx';
import { VicePrincipalView } from './components/VicePrincipalView.tsx';
import { DualDeviceSimulator } from './components/DualDeviceSimulator.tsx';
import { HelpCircle, X, Shield, Smartphone } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loadingInitial, setLoadingInitial] = useState<boolean>(true);
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');
  const [syncTick, setSyncTick] = useState<number>(0);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState<boolean>(false);
  const [showInstructionsModal, setShowInstructionsModal] = useState<boolean>(false);

  const eventSourceRef = useRef<EventSource | null>(null);

  // Authenticate current session on load
  useEffect(() => {
    api.getMe()
      .then((res) => {
        setUser(res.user);
      })
      .catch(() => {
        removeStoredToken();
        setUser(null);
      })
      .finally(() => {
        setLoadingInitial(false);
      });
  }, []);

  // Real-time synchronization: Firestore onSnapshot + BroadcastChannel + SSE + 3s Heartbeat
  useEffect(() => {
    setIsConnected(true);
    const now = new Date().toLocaleTimeString('he-IL');
    setLastSyncTime(now);

    // 1. ALWAYS subscribe to clientStore (receives instant Firestore onSnapshot and BroadcastChannel pushes)
    const unsubscribeClient = clientStore.subscribe(() => {
      setIsConnected(true);
      const curTime = new Date().toLocaleTimeString('he-IL');
      setLastSyncTime(curTime);
      setSyncTick((t) => t + 1);
    });

    // 2. Fast 3-second heartbeat polling so mobile browsers (WhatsApp / Safari) never get stuck out of sync
    const heartbeatPoll = setInterval(() => {
      setSyncTick((t) => t + 1);
    }, 3000);

    // 3. If running with Node.js backend, also connect SSE for instant server-push
    let reconnectTimeout: any = null;
    if (!isStaticHost) {
      function connectSSE() {
        try {
          const es = new EventSource('/api/events');
          eventSourceRef.current = es;

          es.addEventListener('connected', () => {
            setIsConnected(true);
            const curTime = new Date().toLocaleTimeString('he-IL');
            setLastSyncTime(curTime);
          });

          es.addEventListener('update', () => {
            setIsConnected(true);
            const curTime = new Date().toLocaleTimeString('he-IL');
            setLastSyncTime(curTime);
            setSyncTick((t) => t + 1);
          });

          es.onerror = () => {
            es.close();
            reconnectTimeout = setTimeout(connectSSE, 3000);
          };
        } catch {
          reconnectTimeout = setTimeout(connectSSE, 3000);
        }
      }

      connectSSE();
    }

    return () => {
      unsubscribeClient();
      clearInterval(heartbeatPoll);
      if (eventSourceRef.current) eventSourceRef.current.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, []);

  // Real-time instant lockout: If school is suspended or staff deactivated, kick out non-admin immediately
  useEffect(() => {
    if (!loadingInitial && user && user.role !== 'admin') {
      api.getMe().catch(() => {
        removeStoredToken();
        setUser(null);
      });
    }
  }, [syncTick, loadingInitial, user]);

  const handleLogout = async () => {
    await api.logout();
    setUser(null);
  };

  const handleManualRefresh = () => {
    const now = new Date().toLocaleTimeString('he-IL');
    setLastSyncTime(now);
    setSyncTick((t) => t + 1);
  };

  if (loadingInitial) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <div className="text-sm font-bold text-slate-700">טוען את ״אישור לשער״...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-['Assistant',sans-serif] selection:bg-teal-500 selection:text-white">
      {/* Top Bar Contract compliant Navbar */}
      <Navbar
        user={user}
        onLogout={handleLogout}
        isConnected={isConnected}
        onRefresh={handleManualRefresh}
        isSimulatorOpen={isSimulatorOpen}
        onToggleSimulator={() => setIsSimulatorOpen(!isSimulatorOpen)}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {!user ? (
          <LoginScreen
            onLoginSuccess={(loggedUser) => setUser(loggedUser)}
            onOpenSimulator={() => setIsSimulatorOpen(true)}
          />
        ) : user.role === 'teacher' ? (
          <TeacherView user={user} syncTick={syncTick} onRefreshNeeded={handleManualRefresh} />
        ) : user.role === 'guard' ? (
          <GuardView
            user={user}
            isConnected={isConnected}
            lastSyncTime={lastSyncTime}
            syncTick={syncTick}
          />
        ) : user.role === 'vice_principal' ? (
          <VicePrincipalView user={user} syncTick={syncTick} />
        ) : (
          <AdminView user={user} syncTick={syncTick} />
        )}
      </main>

      {/* Footer Stamp - Hebrew & English */}
      <footer className="mt-auto py-4 px-4 border-t border-slate-200/80 bg-white/70 backdrop-blur-xs text-center text-xs text-slate-500">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-1.5">
          <div className="font-semibold text-slate-700">
            פותח ומנוהל ע״י <span className="text-teal-700 font-bold">עמאר פאעור</span> · מערכת ״אישור לשער״
          </div>
          <div className="text-[11px] text-slate-400 font-mono tracking-tight" dir="ltr">
            Developed & Managed by <span className="font-semibold text-slate-600">Amar Faour</span> · GatePass System
          </div>
        </div>
      </footer>

      {/* Floating Help / Instructions button */}
      <div className="fixed bottom-3 right-3 z-30">
        <button
          type="button"
          onClick={() => setShowInstructionsModal(true)}
          className="bg-slate-900 text-teal-400 hover:text-teal-300 p-2.5 rounded-2xl shadow-lg border border-slate-700 hover:bg-slate-800 transition-colors flex items-center gap-1.5 text-xs font-semibold"
          title="הנחיות שימוש ובדיקה"
        >
          <HelpCircle className="w-4 h-4 text-teal-400" />
          <span className="hidden sm:inline">הנחיות לבדיקה</span>
        </button>
      </div>

      {/* Dual Device Simulator Overlay */}
      {isSimulatorOpen && (
        <DualDeviceSimulator
          onClose={() => setIsSimulatorOpen(false)}
          syncTick={syncTick}
          isConnected={isConnected}
          lastSyncTime={lastSyncTime}
        />
      )}

      {/* Instructions & Testing Guide Modal */}
      {showInstructionsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-teal-600" />
                <h3 className="font-bold text-base text-slate-900 font-['Rubik']">
                  הנחיות לבדיקה ולשימוש במערכת
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowInstructionsModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
              <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl">
                <strong className="text-teal-900 font-bold block mb-1">
                  1. בדיקת סנכרון בזמן אמת בין שני טלפונים:
                </strong>
                <p>
                  לחץ על כפתור <strong>״סימולטור 2 טלפונים״</strong> בסרגל העליון כדי לפתוח שני מסכים
                  (מחנכת ושומר) זה לצד זה על המחשב. שלח אישור מתלמיד, וראה כיצד הוא מופיע
                  מיידית בטלפון של השומר ללא שום רענון ידני!
                </p>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                <strong className="text-blue-900 font-bold block mb-1">
                  2. סודיות קודי הגישה של הצוות:
                </strong>
                <p className="text-slate-700">
                  כל איש צוות (מחנכת, מורה מקצועי, שומר ומנהל) מקבל את קוד הגישה האישי והסודי שלו באופן דיסקרטי ממנהל המערכת עמאר פאעור. מטעמי אבטחה ופרטיות בית ספרית, שום קוד אינו מפורסם ברבים.
                </p>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <strong className="text-amber-900 font-bold block mb-1">
                  3. בדיקת תרחישי קצה:
                </strong>
                <p>
                  • <strong>תלמיד ללא אישור:</strong> הקלד שם תלמיד בשער שלא קיבל אישור — יופיע אדום ברור ״אין אישור יציאה פעיל״.<br/>
                  • <strong>שעה עתידית:</strong> הנפק אישור לשעה מאוחרת — השומר יראה כתום ״האישור ייכנס לתוקף בשעה...״.<br/>
                  • <strong>ביטול אישור:</strong> המחנכת מבטלת אישור שטרם נוצל — המסך של השומר לא יאפשר יציאה.
                </p>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShowInstructionsModal(false)}
                className="py-2.5 px-5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow transition-colors"
              >
                הבנתי, תודה
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

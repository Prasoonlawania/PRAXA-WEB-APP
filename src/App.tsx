import { useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, loginWithGoogle } from './lib/firebase';
import { OperationType, handleFirestoreError } from './lib/utils';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { Loader2, MessageSquare, Settings, Lock, Mail, Shield } from 'lucide-react';
import type { Chat } from './types';
import { SettingsModal } from './components/SettingsModal';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [themeId, setThemeId] = useState<string>(() => localStorage.getItem('praxa-theme-id') || 'default-dark');
  const [customBg, setCustomBg] = useState<string>(() => localStorage.getItem('praxa-custom-bg') || '');
  
  const [aiProfilePic] = useState<string>('./praxa.ai.png');
  const [aiBg, setAiBg] = useState<string>(() => localStorage.getItem('praxa-ai-bg') || '');
  const [userProfilePic, setUserProfilePic] = useState<string>(() => localStorage.getItem('praxa-user-pic') || '');

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('praxa-theme-id', themeId);
  }, [themeId]);

  useEffect(() => {
    localStorage.setItem('praxa-custom-bg', customBg);
  }, [customBg]);

  useEffect(() => { localStorage.setItem('praxa-ai-bg', aiBg); }, [aiBg]);
  useEffect(() => { localStorage.setItem('praxa-user-pic', userProfilePic); }, [userProfilePic]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Ensure user profile exists in Firestore
        const userRef = doc(db, 'users', currentUser.uid);
        try {
          const snap = await getDoc(userRef);
          if (!snap.exists()) {
            await setDoc(userRef, {
              uid: currentUser.uid,
              displayName: currentUser.displayName || 'User',
              photoURL: currentUser.photoURL || '',
              createdAt: Date.now(),
              isOnline: true,
              lastSeen: Date.now()
            });
          } else {
             // update last seen
             await setDoc(userRef, {
               isOnline: true,
               lastSeen: Date.now()
             }, { merge: true });
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `users/${currentUser.uid}`);
        }
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#0A0A0C] text-slate-200">
        <Loader2 className="animate-spin text-slate-500 h-8 w-8" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="relative flex h-screen w-full items-center justify-center bg-[#07070a] overflow-hidden text-slate-200">
        {/* Floating Animated Gradient Background Blobs */}
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-600/15 blur-[120px] animate-blob-1 pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-purple-600/15 blur-[120px] animate-blob-2 pointer-events-none" />
        <div className="absolute top-[30%] left-[40%] w-[350px] h-[350px] rounded-full bg-cyan-600/10 blur-[100px] animate-blob-3 pointer-events-none" />

        {/* Background Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

        {/* Glassmorphic Login Card */}
        <div className="max-w-md w-full mx-4 p-8 backdrop-blur-xl bg-white/[0.03] border border-white/10 rounded-3xl shadow-2xl flex flex-col z-10 relative overflow-hidden animate-in fade-in zoom-in-95 duration-500">
          
          {/* Glow highlight */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />

          {/* Welcome / Logo header */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center p-[1px] shadow-lg mb-4 animate-pulse">
              <div className="w-full h-full bg-[#0a0a0c] rounded-[15px] flex items-center justify-center">
                <MessageSquare className="h-6 w-6 text-indigo-400" />
              </div>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent mb-1">Welcome to Praxa</h1>
            <p className="text-slate-400 text-xs tracking-wider uppercase font-semibold">THE COMPLETE REAL-TIME MESSAGING PLATFORM</p>
          </div>

          {/* Form */}
          <form onSubmit={(e) => { e.preventDefault(); loginWithGoogle(); }} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">Email Address</label>
              <div className="relative group">
                <input 
                  type="email" 
                  placeholder="name@example.com"
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/40 transition-all text-slate-200 placeholder:text-slate-600"
                  required
                />
                <Mail className="w-4 h-4 absolute left-4 top-3.5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">Password</label>
              <div className="relative group">
                <input 
                  type="password" 
                  placeholder="••••••••"
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/40 transition-all text-slate-200 placeholder:text-slate-600"
                  required
                />
                <Lock className="w-4 h-4 absolute left-4 top-3.5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition-all hover:shadow-lg hover:shadow-indigo-500/20 active:scale-[0.98] mt-2 text-sm cursor-pointer"
            >
              Sign In
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/5"></div>
            </div>
            <span className="relative px-3 bg-[#0c0c12] text-[10px] font-bold text-slate-500 uppercase tracking-widest z-1">OR CONTINUE WITH</span>
          </div>

          {/* Google Login button */}
          <button 
            onClick={loginWithGoogle}
            className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-3 shadow-lg hover:shadow-white/5 active:scale-[0.98] cursor-pointer"
          >
            <div className="bg-white p-1 rounded-md">
              <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                <path d="M12.0003 4.75C13.7703 4.75 15.3553 5.36002 16.6053 6.54998L20.0303 3.125C17.9502 1.19 15.2353 0 12.0003 0C7.31028 0 3.25527 2.69 1.28027 6.60998L5.27028 9.70498C6.21525 6.84002 8.87028 4.75 12.0003 4.75Z" fill="#EA4335" />
                <path d="M23.49 12.275C23.49 11.49 23.415 10.73 23.3 10H12V14.51H18.47C18.18 15.99 17.34 17.25 16.08 18.1L19.945 21.1C22.2 19.01 23.49 15.92 23.49 12.275Z" fill="#4285F4" />
                <path d="M5.26498 14.2949C5.02498 13.5699 4.88501 12.7999 4.88501 11.9999C4.88501 11.1999 5.01998 10.4299 5.26498 9.7049L1.275 6.60986C0.46 8.22986 0 10.0599 0 11.9999C0 13.9399 0.46 15.7699 1.28 17.3899L5.26498 14.2949Z" fill="#FBBC05" />
                <path d="M12.0004 24.0001C15.2404 24.0001 17.9654 22.935 19.9454 21.095L16.0804 18.095C15.0054 18.82 13.6204 19.245 12.0004 19.245C8.8704 19.245 6.21537 17.155 5.26537 14.29L1.27539 17.385C3.25539 21.31 7.3104 24.0001 12.0004 24.0001Z" fill="#34A853" />
              </svg>
            </div>
            Continue with Google
          </button>

          {/* Security note */}
          <div className="mt-8 flex items-center justify-center gap-1.5 text-[10px] text-slate-500 font-semibold tracking-wider uppercase">
            <Shield className="w-3.5 h-3.5 text-indigo-400" />
            Signal Protocol Secure
          </div>

        </div>
      </div>
    );
  }

  const emberCount = 12;
  const embersArray = Array.from({ length: emberCount });

  return (
    <div 
      className={`flex h-screen w-full overflow-hidden font-sans bg-cover bg-center theme-${themeId} theme-bg theme-text-primary relative`}
      style={{ 
        backgroundImage: customBg ? `url(${customBg})` : undefined,
        fontFamily: themeId === 'jarvis-hud' ? "'Courier New', monospace" : undefined
      }}
    >
      {/* Background Dark Overlay */}
      <div className="absolute inset-0 bg-black/45 pointer-events-none z-0" />
      
      {/* Visual Identity Overlay Effects */}
      {themeId === 'jarvis-hud' && (
        <>
          <div className="hud-scanline" />
          <div className="hud-scanner" />
        </>
      )}
      {themeId === 'avengers' && (
        <>
          <div className="hud-scanline" />
          <div className="hud-scanner" style={{ animationDuration: '12s' }} />
        </>
      )}
      {themeId === 'spider-man' && (
        <div className="web-overlay" />
      )}
      {themeId === 'money-heist' && (
        <>
          <div className="laser-line" />
          <div className="laser-line-2" />
        </>
      )}
      {themeId === 'house-of-the-dragon' && (
        <div className="dragonscale-overlay" />
      )}
      {(themeId === 'asur' || themeId === 'house-of-the-dragon') && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-1">
          {embersArray.map((_, i) => (
            <div 
              key={i} 
              className="ember-particle" 
              style={{
                '--dur': `${8 + (i % 5) * 2}s`,
                '--delay': `${(i % 4) * -2.5}s`,
                '--x': `${(i * 8.5) % 100}%`,
              } as React.CSSProperties} 
            />
          ))}
        </div>
      )}

      <div className="flex h-full w-full z-10 relative">
        <div className={`w-full h-full lg:w-96 shrink-0 ${activeChat ? 'hidden lg:flex' : 'flex'}`}>
          <Sidebar 
            user={user} 
            activeChat={activeChat} 
            setActiveChat={setActiveChat} 
            onOpenSettings={() => setIsSettingsOpen(true)} 
            aiProfilePic={aiProfilePic} 
            userProfilePic={userProfilePic} 
            themeId={themeId} 
          />
        </div>
        <div className={`flex-1 h-full min-w-0 ${activeChat ? 'flex' : 'hidden lg:flex'}`}>
          <ChatArea 
            user={user} 
            activeChat={activeChat} 
            setActiveChat={setActiveChat} 
            aiProfilePic={aiProfilePic} 
            aiBg={aiBg} 
            userProfilePic={userProfilePic} 
            customBg={customBg} 
            themeId={themeId} 
          />
        </div>
      </div>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        themeId={themeId}
        setThemeId={setThemeId}
        customBg={customBg}
        setCustomBg={setCustomBg}
        aiBg={aiBg}
        setAiBg={setAiBg}
        userProfilePic={userProfilePic}
        setUserProfilePic={setUserProfilePic}
      />
    </div>
  );
}

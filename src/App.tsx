import { useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, loginWithGoogle } from './lib/firebase';
import { OperationType, handleFirestoreError } from './lib/utils';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { Loader2, MessageSquare, Settings } from 'lucide-react';
import type { Chat } from './types';
import { SettingsModal } from './components/SettingsModal';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [themeColor, setThemeColor] = useState<string>(() => localStorage.getItem('praxa-theme-color') || '#0A0A0C');
  const [customBg, setCustomBg] = useState<string>(() => localStorage.getItem('praxa-custom-bg') || '');
  
  const [aiProfilePic] = useState<string>('./praxa.ai.png');
  const [aiBg, setAiBg] = useState<string>(() => localStorage.getItem('praxa-ai-bg') || '');
  const [userProfilePic, setUserProfilePic] = useState<string>(() => localStorage.getItem('praxa-user-pic') || '');

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('praxa-theme-color', themeColor);
  }, [themeColor]);

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
      <div className="flex h-screen w-full items-center justify-center bg-[#0A0A0C] text-slate-200">
        <div className="max-w-sm w-full p-8 bg-[#16161D] border border-white/5 rounded-3xl shadow-2xl flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-[32px] flex items-center justify-center p-0.5 shadow-xl mb-6">
            <div className="w-full h-full bg-[#16161D] rounded-[30px] flex items-center justify-center">
              <MessageSquare className="h-8 w-8 text-indigo-400" />
            </div>
          </div>
          <h1 className="text-2xl font-bold mb-2">Welcome to Praxa</h1>
          <p className="text-slate-400 mb-8 text-sm leading-relaxed">The complete real-time messaging platform.</p>
          <button 
            onClick={loginWithGoogle}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-3 shadow-lg shadow-indigo-500/20"
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
          <p className="mt-8 text-xs text-slate-500 font-medium">
            Signal Protocol encryption ready
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`flex h-screen w-full text-slate-200 overflow-hidden font-sans bg-cover bg-center ${themeColor === '#F8FAFC' && !customBg ? 'light-mode' : ''}`}
      style={{ 
        backgroundColor: customBg ? undefined : (themeColor === '#F8FAFC' ? '#0A0A0C' : themeColor),
        backgroundImage: customBg ? `url(${customBg})` : undefined
      }}
    >
      <div className="absolute inset-0 bg-black/40 pointer-events-none z-0" />
      
      <div className="flex h-full w-full z-10 relative">
        <div className={`w-full h-full lg:w-96 shrink-0 ${activeChat ? 'hidden lg:flex' : 'flex'}`}>
          <Sidebar user={user} activeChat={activeChat} setActiveChat={setActiveChat} onOpenSettings={() => setIsSettingsOpen(true)} aiProfilePic={aiProfilePic} userProfilePic={userProfilePic} />
        </div>
        <div className={`flex-1 h-full min-w-0 ${activeChat ? 'flex' : 'hidden lg:flex'}`}>
          <ChatArea user={user} activeChat={activeChat} setActiveChat={setActiveChat} aiProfilePic={aiProfilePic} aiBg={aiBg} userProfilePic={userProfilePic} customBg={customBg} />
        </div>
      </div>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        themeColor={themeColor}
        setThemeColor={setThemeColor}
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

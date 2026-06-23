import { useState, useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot, getDocs, setDoc, doc, deleteDoc } from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';
import { db, logout } from '../lib/firebase';
import { OperationType, handleFirestoreError, cn } from '../lib/utils';
import { Settings, Search, Plus, MessageSquare, LogOut, Trash2, CheckCircle, Bot } from 'lucide-react';
import type { Chat, User } from '../types';
import { formatDistanceToNow } from 'date-fns';

interface SidebarProps {
  user: FirebaseUser;
  activeChat: Chat | null;
  setActiveChat: (chat: Chat | null) => void;
  onOpenSettings?: () => void;
  aiProfilePic?: string;
  userProfilePic?: string;
  themeId?: string;
}

export function Sidebar({ user, activeChat, setActiveChat, onOpenSettings, aiProfilePic, userProfilePic, themeId }: SidebarProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedChats, setSelectedChats] = useState<Set<string>>(new Set());
  const knownTimestamps = useRef<Record<string, number>>({});

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Load user's chats
  useEffect(() => {
    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', user.uid)
    );

    const unsub = onSnapshot(q, async (snapshot) => {
      // Handle notifications for new messages
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'modified') {
          const chat = change.doc.data() as Chat;
          const knownStart = knownTimestamps.current[chat.id] || 0;
          if (chat.lastSenderId && chat.lastSenderId !== user.uid && chat.updatedAt > knownStart && knownStart !== 0) {
            // New message!
            if ('Notification' in window && Notification.permission === 'granted' && activeChat?.id !== chat.id) {
               new Notification(chat.type === 'direct' ? 'New Message' : (chat.name || 'Group Message'), {
                 body: chat.lastMessageContent,
               });
            }
          }
          knownTimestamps.current[chat.id] = Math.max(chat.updatedAt || 0, knownTimestamps.current[chat.id] || 0);
        } else if (change.type === 'added') {
           knownTimestamps.current[change.doc.id] = change.doc.data().updatedAt || 0;
        }
      });

      const chatsData: Chat[] = [];
      for (const docSnapshot of snapshot.docs) {
        const data = docSnapshot.data() as Chat;
        const chatInfo = { ...data, id: docSnapshot.id };
        
        // If it's a direct message, fetch the other user's info to display
        if (data.type === 'direct') {
          const otherUserId = data.participants.find(p => p !== user.uid);
          if (otherUserId) {
            try {
              const userSnap = await getDocs(query(collection(db, 'users'), where('uid', '==', otherUserId)));
              if (!userSnap.empty) {
                chatInfo.otherUser = userSnap.docs[0].data() as User;
              }
            } catch (e) {
              console.error("Error fetching other user info", e);
            }
          }
        }
        chatsData.push(chatInfo);
      }
      
      // Sort by latest updated
      chatsData.sort((a, b) => b.updatedAt - a.updatedAt);
      
      // Inject Praxa AI chat
      chatsData.unshift({
        id: 'praxa_ai',
        type: 'ai',
        name: 'Praxa AI',
        participants: [user.uid],
        createdAt: 0,
        updatedAt: Date.now(),
        lastMessageContent: 'Ask me anything!'
      });

      setChats(chatsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'chats');
    });

    return () => unsub();
  }, [user.uid]);

  // Search users globally
  useEffect(() => {
    if (searchQuery.trim().length === 0) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const searchUsers = async () => {
      try {
        const q = collection(db, 'users');
        const snap = await getDocs(q);
        const results = snap.docs
          .map(d => d.data() as User)
          .filter(u => 
            u.uid !== user.uid && 
            (u.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
             u.phoneNumber?.includes(searchQuery))
          );
        setSearchResults(results);
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'users');
      }
    };
    
    // Quick debounce
    const timeoutId = setTimeout(searchUsers, 500);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, user.uid]);

  const startDirectChat = async (otherUser: User) => {
    // Check if chat already exists
    const existingChat = chats.find(c => 
      c.type === 'direct' && c.participants.includes(otherUser.uid)
    );

    if (existingChat) {
      setActiveChat(existingChat);
      setSearchQuery('');
      return;
    }

    const chatId = [user.uid, otherUser.uid].sort().join('_');
    const chatRef = doc(db, 'chats', chatId);
    const newChat: Chat = {
      id: chatId,
      type: 'direct',
      participants: [user.uid, otherUser.uid],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    try {
      await setDoc(chatRef, newChat);
      setActiveChat({ ...newChat, otherUser });
      setSearchQuery('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `chats/${chatId}`);
    }
  };

  const toggleChatSelection = (chatId: string) => {
    const newSelection = new Set(selectedChats);
    if (newSelection.has(chatId)) {
      newSelection.delete(chatId);
    } else {
      newSelection.add(chatId);
    }
    setSelectedChats(newSelection);
  };

  const handleBulkDelete = async () => {
    if (selectedChats.size === 0) return;
    const confirm = window.confirm(`Are you sure you want to delete ${selectedChats.size} chat(s)?`);
    if (!confirm) return;

    const promises = Array.from(selectedChats).map((chatId: string) => 
      deleteDoc(doc(db, "chats", chatId))
    );
    try {
      await Promise.all(promises);
      setSelectedChats(new Set());
      setIsSelectMode(false);
      
      // If active chat was deleted, clear it
      if (activeChat && selectedChats.has(activeChat.id)) {
        setActiveChat(null);
      }
    } catch (e) {
      console.error("Error bulk deleting chats:", e);
    }
  };

  return (
    <div className="w-full h-full border-r theme-border flex flex-col theme-panel-bg backdrop-blur-md shrink-0">
      {/* Header */}
      <div className="p-6 border-b theme-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          {userProfilePic ? (
            <img src={userProfilePic} alt="Profile" className="w-10 h-10 rounded-full border theme-border object-cover" />
          ) : user.photoURL ? (
            <img src={user.photoURL} alt="Profile" className="w-10 h-10 rounded-full border theme-border object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full theme-accent-bg flex items-center justify-center text-white font-bold shadow-lg shadow-[var(--theme-accent-glow)]">
              {user.displayName?.[0] || 'U'}
            </div>
          )}
          <div>
            <h2 className="font-bold text-lg theme-text-primary">{user.displayName}</h2>
            <p className="text-xs theme-text-secondary opacity-70">Online</p>
          </div>
        </div>
        <div className="flex gap-2">
          {isSelectMode && selectedChats.size > 0 && (
            <button 
              onClick={handleBulkDelete}
              className="p-2 bg-red-600/20 text-red-500 hover:bg-red-600/30 rounded-lg transition-colors border border-red-500/10"
              title="Delete Selected Chats"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
          <button 
            onClick={() => {
              setIsSelectMode(!isSelectMode);
              setSelectedChats(new Set());
            }}
            className={cn("p-2 rounded-lg transition-colors border border-transparent",
               isSelectMode ? "bg-[var(--theme-accent)]/20 text-[var(--theme-accent)] border-[var(--theme-accent)]/20" : "bg-white/5 theme-text-secondary hover:bg-white/10 hover:theme-text-primary"
            )}
            title="Select Chats"
          >
            <CheckCircle className="w-5 h-5" />
          </button>
          <button className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors theme-text-secondary hover:theme-text-primary">
            <Plus className="w-5 h-5" />
          </button>
          <button 
            onClick={onOpenSettings}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors theme-text-secondary hover:theme-text-primary"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
          <button onClick={logout} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors theme-text-secondary hover:theme-text-primary">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="p-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Search or start new chat"
            className="w-full bg-white/5 border theme-border rounded-xl py-2.5 px-10 text-sm focus:outline-none focus:border-[var(--theme-accent)]/40 transition-colors theme-text-primary"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search className="w-4 h-4 absolute left-3.5 top-3 theme-text-secondary opacity-60" />
        </div>
      </div>

      {/* Chat List / Search Results */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-3">
        {isSearching ? (
          <div className="space-y-1">
            <h3 className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Search Results</h3>
            {searchResults.length === 0 ? (
              <p className="text-center text-slate-500 py-4 text-sm">No users found</p>
            ) : (
              searchResults.map(u => (
                <button
                  key={u.uid}
                  onClick={() => startDirectChat(u)}
                  className="w-full text-left p-3 hover:bg-white/5 rounded-xl transition-colors flex items-center gap-3"
                >
                  {u.photoURL ? (
                    <img src={u.photoURL} alt="" className="w-12 h-12 rounded-full border border-white/10 flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-slate-800/50 border border-white/10 flex items-center justify-center text-slate-300 font-bold select-none flex-shrink-0">
                      {u.displayName?.[0] || 'U'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm truncate text-white">{u.displayName || 'Unknown User'}</h4>
                    <p className="text-xs text-slate-400 truncate">Tap to chat</p>
                  </div>
                </button>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-1">
            {chats.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-slate-500 gap-4">
                <MessageSquare className="w-8 h-8 opacity-50" />
                <p className="text-sm">No chats yet</p>
              </div>
            ) : (
              chats.map(chat => {
                const displayName = chat.type === 'direct' ? chat.otherUser?.displayName : chat.name;
                const avatar = chat.type === 'direct' ? chat.otherUser?.photoURL : chat.groupAvatar;
                const initials = displayName?.[0] || 'C';

                return (
                  <div key={chat.id} className="relative flex items-center gap-2 group">
                    {isSelectMode && (
                      <input 
                        type="checkbox"
                        className="w-5 h-5 ml-2 rounded border-white/20 bg-[#16161D] checked:bg-indigo-500 cursor-pointer"
                        checked={selectedChats.has(chat.id)}
                        onChange={() => toggleChatSelection(chat.id)}
                      />
                    )}
                    <button
                      onClick={() => !isSelectMode && setActiveChat(chat)}
                      className={cn(
                        "w-full text-left p-3 rounded-xl transition-colors flex items-center gap-3 border border-transparent",
                        activeChat?.id === chat.id && !isSelectMode
                          ? "bg-[var(--theme-accent)]/15 border-[var(--theme-accent)]/25 text-[var(--theme-accent)]" 
                          : "hover:bg-white/5 text-slate-300"
                      )}
                    >
                      {chat.type === 'ai' ? (
                        aiProfilePic ? (
                          <img src={aiProfilePic} alt="Praxa AI" className="w-12 h-12 rounded-full object-cover border border-white/10 flex-shrink-0" />
                        ) : (
                          <div className="w-12 h-12 flex-shrink-0 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-500 flex items-center justify-center text-white shadow-lg">
                            <Bot className="w-6 h-6" />
                          </div>
                        )
                      ) : avatar ? (
                        <img src={avatar} alt="" className="w-12 h-12 rounded-full object-cover border border-white/10 flex-shrink-0" />
                      ) : (
                        <div className="w-12 h-12 flex-shrink-0 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold select-none">
                          {initials}
                        </div>
                      )}
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <div className="flex justify-between items-baseline mb-1">
                          <h4 className="font-semibold text-sm truncate pr-2 theme-text-primary">{displayName || 'Unknown Chat'}</h4>
                          <span className="text-[10px] theme-text-secondary opacity-60 flex-shrink-0 uppercase">
                            {chat.updatedAt ? formatDistanceToNow(chat.updatedAt, { addSuffix: true }) : ''}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <p className="text-xs theme-text-secondary opacity-80 truncate pr-2">{chat.lastMessageContent || 'No messages yet'}</p>
                          {chat.unreadCounts?.[user.uid] > 0 && chat.id !== activeChat?.id && (
                            <span className="bg-[var(--theme-accent)] text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 shadow-[0_0_8px_var(--theme-accent-glow)]">
                              {chat.unreadCounts[user.uid]}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>

      {/* Theme Status Ticker & Settings Footer */}
      <div className="p-4 border-t theme-border flex items-center justify-between theme-panel-bg bg-opacity-80 backdrop-blur-md">
        <div className="flex items-center gap-2 overflow-hidden flex-1 mr-2">
          <div className="w-2 h-2 rounded-full theme-accent-bg theme-accent-glow animate-pulse flex-shrink-0" />
          <span className="text-[10px] font-bold tracking-wider uppercase truncate theme-accent-text select-none animate-pulse">
            {({
              'default-dark': '🔒 WORKSTATION SECURE',
              'default-light': '🔓 WORKSTATION ACTIVE',
              'money-heist': '💰 BELLA CIAO // VAULT: SECURE',
              'spider-man': '🕸️ SPIDEY-SENSE: ACTIVE',
              'marvel': '🪐 COSMIC DEFENSE: ONLINE',
              'avengers': '🛡️ S.H.I.E.L.D. // AVENGERS INIT: ON',
              'iron-man': '⚡ ARC REACTOR: 100% // MK-85',
              'jarvis-hud': '🤖 JARVIS: ONLINE // SYSTEM: 100%',
              'asur': '👁️ MYSTIC RUNES // ASUR EYE ACTIVE',
              'house-of-the-dragon': '🐉 FIRE & BLOOD // DRAGONSTONE'
            } as Record<string, string>)[themeId || 'default-dark'] || '🔒 WORKSTATION SECURE'}
          </span>
        </div>
        <button 
          onClick={onOpenSettings}
          className="p-1.5 hover:bg-white/10 rounded-lg transition-colors theme-accent-text"
          title="Theme Selection"
        >
          <Settings className="w-4 h-4 animate-spin-slow" />
        </button>
      </div>
    </div>
  );
}

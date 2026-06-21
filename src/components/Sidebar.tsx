import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, getDocs, setDoc, doc, deleteDoc } from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';
import { db, logout } from '../lib/firebase';
import { OperationType, handleFirestoreError, cn } from '../lib/utils';
import { Settings, Search, Plus, MessageSquare, LogOut, Trash2, CheckCircle } from 'lucide-react';
import type { Chat, User } from '../types';
import { formatDistanceToNow } from 'date-fns';

interface SidebarProps {
  user: FirebaseUser;
  activeChat: Chat | null;
  setActiveChat: (chat: Chat | null) => void;
  onOpenSettings?: () => void;
}

export function Sidebar({ user, activeChat, setActiveChat, onOpenSettings }: SidebarProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedChats, setSelectedChats] = useState<Set<string>>(new Set());

  // Load user's chats
  useEffect(() => {
    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', user.uid)
    );

    const unsub = onSnapshot(q, async (snapshot) => {
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
    <div className="w-full h-full border-r border-white/5 flex flex-col bg-black/20 backdrop-blur-md shrink-0">
      {/* Header */}
      <div className="p-6 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {user.photoURL ? (
            <img src={user.photoURL} alt="Profile" className="w-10 h-10 rounded-full border border-white/10" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20">
              {user.displayName?.[0] || 'U'}
            </div>
          )}
          <div>
            <h2 className="font-bold text-lg">{user.displayName}</h2>
            <p className="text-xs text-slate-500">Online</p>
          </div>
        </div>
        <div className="flex gap-2">
          {isSelectMode && selectedChats.size > 0 && (
            <button 
              onClick={handleBulkDelete}
              className="p-2 bg-red-600/20 text-red-500 hover:bg-red-600/30 rounded-lg transition-colors"
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
            className={cn("p-2 rounded-lg transition-colors",
               isSelectMode ? "bg-indigo-500/20 text-indigo-400" : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
            )}
            title="Select Chats"
          >
            <CheckCircle className="w-5 h-5" />
          </button>
          <button className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white">
            <Plus className="w-5 h-5" />
          </button>
          <button 
            onClick={onOpenSettings}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
          <button onClick={logout} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white">
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
            className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-10 text-sm focus:outline-none focus:border-indigo-500/50 transition-colors"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
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
                          ? "bg-indigo-500/10 border-indigo-500/20" 
                          : "hover:bg-white/5"
                      )}
                    >
                      {avatar ? (
                        <img src={avatar} alt="" className="w-12 h-12 rounded-full object-cover border border-white/10 flex-shrink-0" />
                      ) : (
                        <div className="w-12 h-12 flex-shrink-0 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold select-none">
                          {initials}
                        </div>
                      )}
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <div className="flex justify-between items-baseline mb-1">
                          <h4 className="font-semibold text-sm truncate pr-2">{displayName || 'Unknown Chat'}</h4>
                          <span className="text-[10px] text-slate-500 flex-shrink-0 uppercase">
                            {chat.updatedAt ? formatDistanceToNow(chat.updatedAt, { addSuffix: true }) : ''}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 truncate">{chat.lastMessageContent || 'No messages yet'}</p>
                      </div>
                    </button>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}

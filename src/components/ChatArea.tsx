import React, { useState, useEffect, useRef } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  doc,
  setDoc,
  limit,
  updateDoc,
  deleteDoc,
  increment,
} from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { User as FirebaseUser } from "firebase/auth";
import Markdown from "react-markdown";
import { db, storage } from "../lib/firebase";
import { OperationType, handleFirestoreError, cn } from "../lib/utils";
import {
  Send,
  Hash,
  MoreVertical,
  Image as ImageIcon,
  Paperclip,
  Phone,
  Video,
  File as FileIcon,
  X,
  Loader2,
  Play,
  FileText,
  Music,
  PhoneIncoming,
  Copy,
  Star,
  Forward,
  Trash2,
  CheckCircle,
  Check,
  CheckCheck,
  Bot
} from "lucide-react";
import type { Chat, Message } from "../types";
import { format } from "date-fns";
import { VideoCall } from "./VideoCall";

const getApiUrl = (path: string) => {
  if (
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1' || 
    window.location.hostname.startsWith('192.168.') || 
    window.location.hostname.startsWith('10.')
  ) {
    if (window.location.port !== '3000') {
      return `${window.location.protocol}//${window.location.hostname}:3000${path}`;
    }
  }
  return path;
};

function ThemeVisuals({ themeId }: { themeId?: string }) {
  if (!themeId) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 flex items-center justify-center select-none">
      {/* Spider-Man Overlays */}
      {themeId === 'spider-man' && (
        <>
          <svg viewBox="0 0 100 100" className="w-56 h-56 opacity-[0.06] text-[var(--theme-accent)] fill-current">
            <path d="M50 20c-1.5 0-3 1.5-3 3 0 .8.4 1.5 1 2-2 1.3-3.5 3.5-3.5 6 0 1.2.3 2.3.8 3.3-1.6 1.7-2.8 4-2.8 6.7 0 4 3 7.5 7 8v4c-6 1-10 6-10 12h2c0-5 3.5-9 8.5-10v5c-4 .7-7 4-7 8h2c0-3.5 2.5-6.5 6-7v9H49.5c-4 .5-7 3.5-7 7.5h2c0-3 2-5 5-5.5v5.5h1v-5.5c3 .5 5 2.5 5 5.5h2c0-4-3-7-7-7.5H51v-9c3.5.5 6 3.5 6 7h2c0-4-3-7.3-7-8v-5c5 1 8.5 5 8.5 10h2c0-6-4-11-10-12v-4c4-.5 7-4 7-8 0-2.7-1.2-5-2.8-6.7.5-1 .8-2.1.8-3.3 0-2.5-1.5-4.7-3.5-6 .6-.5 1-1.2 1-2 0-1.5-1.5-3-3-3z"/>
          </svg>
          <div className="absolute top-0 right-12 w-8 h-48 pointer-events-none z-1 flex flex-col items-center spidey-spider-anim">
            <div className="w-[1px] h-32 bg-red-500/20" />
            <svg viewBox="0 0 100 100" className="w-8 h-8 text-[var(--theme-accent)] fill-current">
              <path d="M50 20c-1.5 0-3 1.5-3 3 0 .8.4 1.5 1 2-2 1.3-3.5 3.5-3.5 6 0 1.2.3 2.3.8 3.3-1.6 1.7-2.8 4-2.8 6.7 0 4 3 7.5 7 8v4c-6 1-10 6-10 12h2c0-5 3.5-9 8.5-10v5c-4 .7-7 4-7 8h2c0-3.5 2.5-6.5 6-7v9H49.5c-4 .5-7 3.5-7 7.5h2c0-3 2-5 5-5.5v5.5h1v-5.5c3 .5 5 2.5 5 5.5h2c0-4-3-7-7-7.5H51v-9c3.5.5 6 3.5 6 7h2c0-4-3-7.3-7-8v-5c5 1 8.5 5 8.5 10h2c0-6-4-11-10-12v-4c4-.5 7-4 7-8 0-2.7-1.2-5-2.8-6.7.5-1 .8-2.1.8-3.3 0-2.5-1.5-4.7-3.5-6 .6-.5 1-1.2 1-2 0-1.5-1.5-3-3-3z"/>
            </svg>
          </div>
        </>
      )}

      {/* Money Heist Overlays */}
      {themeId === 'money-heist' && (
        <>
          <svg viewBox="0 0 100 120" className="w-52 h-64 opacity-[0.05] text-[var(--theme-accent)] fill-current">
            <path d="M50 10C25 10 15 35 15 60c0 20 15 45 35 50 20-5 35-30 35-50C85 35 75 10 50 10zm0 12c12 0 20 18 22 38H28c2-20 10-38 22-38zM24 72c3-4 10-5 14-2-2 3-5 5-8 5s-5-1-6-3zm52 0c-1-2-3-3-6-3s-6-2-8-5c4-3 11-2 14 2c0 2-1 3-1 6zm-26 8c-5 0-9-3-10-7h20c-1 4-5 7-10 7z"/>
          </svg>
          {Array.from({ length: 12 }).map((_, i) => (
            <div 
              key={i} 
              className="cash-bill" 
              style={{
                '--dur': `${5 + (i % 4) * 1.5}s`,
                '--delay': `${i * -0.8}s`,
                '--x': `${(i * 9) % 95}%`,
              } as React.CSSProperties} 
            />
          ))}
        </>
      )}

      {/* Iron Man Overlays */}
      {themeId === 'iron-man' && (
        <div className="arc-reactor-glow flex items-center justify-center">
          <svg viewBox="0 0 120 120" className="w-56 h-56 text-[var(--theme-accent)] fill-none stroke-current" strokeWidth="2.2">
            <circle cx="60" cy="60" r="54" strokeDasharray="6 4" />
            <circle cx="60" cy="60" r="44" />
            <circle cx="60" cy="60" r="20" className="fill-current opacity-15" />
            <circle cx="60" cy="60" r="10" className="fill-current opacity-30" />
            <path d="M 60 6 L 60 114 M 6 60 L 114 60 M 21.8 21.8 L 98.2 98.2 M 21.8 98.2 L 98.2 21.8" opacity="0.3" />
          </svg>
        </div>
      )}

      {/* JARVIS HUD Overlays */}
      {themeId === 'jarvis-hud' && (
        <div className="relative w-64 h-64 flex items-center justify-center opacity-15">
          <svg viewBox="0 0 100 100" className="w-full h-full text-cyan-400 fill-none stroke-current hud-spin-cw" style={{ '--dur': '30s' } as React.CSSProperties}>
            <circle cx="50" cy="50" r="45" strokeWidth="1" strokeDasharray="5 3 2 4" />
            <circle cx="50" cy="50" r="40" strokeWidth="0.5" strokeDasharray="20 5" />
            <path d="M 50 2 L 50 15 M 50 85 L 50 98" strokeWidth="2" />
          </svg>
          <svg viewBox="0 0 100 100" className="absolute w-[80%] h-[80%] text-cyan-400 fill-none stroke-current hud-spin-ccw" style={{ '--dur': '20s' } as React.CSSProperties}>
            <circle cx="50" cy="50" r="45" strokeWidth="1" strokeDasharray="15 8" />
            <circle cx="50" cy="50" r="30" strokeWidth="1.5" strokeDasharray="2 2" />
          </svg>
        </div>
      )}

      {/* Avengers Overlays */}
      {themeId === 'avengers' && (
        <svg viewBox="0 0 120 120" className="w-64 h-64 opacity-[0.06] text-[var(--theme-accent)] fill-current">
          <path d="M60 5C29.6 5 5 29.6 5 60s24.6 55 55 55c25.4 0 46.8-17.2 52.9-40.8H99.1C94.2 97.4 78.8 107 60 107 34 107 13 86 13 60S34 13 60 13c17.5 0 32.2 8.3 37.9 21.2h15.2C106.6 19.3 84.8 5 60 5z"/>
          <path d="M72 30H56L22 90h15.5l8.5-17h25l5 17H92L72 30zM50 60l11-21 9 21H50z"/>
        </svg>
      )}

      {/* House of the Dragon Overlays */}
      {themeId === 'house-of-the-dragon' && (
        <svg viewBox="0 0 100 100" className="w-60 h-60 opacity-[0.05] text-[var(--theme-accent)] fill-current">
          <path d="M50 5c-3 0-6 2-7 5-1 3 .5 6 3.5 7.5C40 19 32 25 28 35c-2-1-4-1-5 1-1.5 2-1 5 1 7s5.5.5 6.5-2c2 5 6 9 11 12-2 4-5 7-9 8-3 .5-5 3-4.5 6s3.5 4 6.5 2.5c5-2.5 9-6.5 11-12 1 2 2 4.5 3 7.5-1 2-1.5 4.5-.5 6.5 1 2 4 2 5.5 0s1-4-.5-6c1-3 2.5-5.5 3.5-7.5 2 5.5 6 9.5 11 12 3 1.5 6 .5 6.5-2.5s-1.5-5.5-4.5-6c-4-1-7-4-9-8 5-3 9-7 11-12 1 2.5 4.5 4 6.5 2s2.5-5 1-7c-1-2-3-2-5-1-4-10-12-16-18.5-17.5 3-1.5 4.5-4.5 3.5-7.5-1-3-4-5-7-5z M50 25c5 0 9 4 9 9s-4 9-9 9-9-4-9-9 4-9 9-9z"/>
        </svg>
      )}

      {/* Asur Overlays */}
      {themeId === 'asur' && (
        <div className="asur-eye-breathe">
          <svg viewBox="0 0 100 100" className="w-52 h-52 text-[var(--theme-accent)] fill-none stroke-current" strokeWidth="2.5">
            <path d="M 10 50 Q 50 15 90 50 Q 50 85 10 50 Z" />
            <circle cx="50" cy="50" r="18" className="fill-current opacity-10" />
            <circle cx="50" cy="50" r="8" className="fill-current" />
            <path d="M 50 10 L 50 25 M 50 75 L 50 90 M 10 50 L 25 50 M 75 50 L 90 50" strokeWidth="1.5" strokeDasharray="3 3" />
          </svg>
        </div>
      )}

      {/* Cosmic Marvel Overlays */}
      {themeId === 'marvel' && (
        <>
          <div className="flex flex-col items-center justify-center opacity-[0.06]">
            <div className="border-4 border-current p-4 font-black tracking-tighter text-5xl uppercase text-[var(--theme-accent)] select-none">
              MARVEL
            </div>
          </div>
          {Array.from({ length: 12 }).map((_, i) => (
            <div 
              key={i} 
              className="cosmic-star" 
              style={{
                '--dur': `${3 + (i % 3) * 1.5}s`,
                '--delay': `${i * -1.2}s`,
                '--x': `${(i * 13) % 95}%`,
                '--y': `${(i * 7) % 90}%`,
              } as React.CSSProperties} 
            />
          ))}
        </>
      )}
    </div>
  );
}

interface ChatAreaProps {
  user: FirebaseUser;
  activeChat: Chat | null;
  setActiveChat?: (chat: Chat | null) => void;
  aiProfilePic?: string;
  aiBg?: string;
  userProfilePic?: string;
  customBg?: string;
  themeId?: string;
}

export function ChatArea({ user, activeChat, setActiveChat, aiProfilePic, aiBg, userProfilePic, customBg, themeId }: ChatAreaProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [uploadingFile, setUploadingFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isInCall, setIsInCall] = useState(false);
  const [isInitiator, setIsInitiator] = useState(false);
  const [incomingCall, setIncomingCall] = useState(false);
  const [isVideoCallType, setIsVideoCallType] = useState(true);

  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [aiMessages, setAiMessages] = useState<Message[]>([
    {
       id: 'welcome',
       chatId: 'praxa_ai',
       senderId: 'praxa_ai',
       content: 'Hi! I am Praxa AI. How can I help you today?',
       type: 'text',
       createdAt: Date.now()
    }
  ]);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const handleDeleteChat = async () => {
    if (!activeChat || !setActiveChat) return;
    if (activeChat.type === 'ai') return;
    const confirm = window.confirm("Are you sure you want to delete this chat?");
    if (!confirm) return;
    try {
      await deleteDoc(doc(db, "chats", activeChat.id));
      setActiveChat(null);
    } catch (e) {
      console.error("Error deleting chat:", e);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (!activeChat) return;
    if (activeChat.type === 'ai') return;

    const q = query(
      collection(db, "chats", activeChat.id, "messages"),
      orderBy("createdAt", "asc"),
      limit(200),
    );

    const unsubMsgs = onSnapshot(
      q,
      (snapshot) => {
        const msgs: Message[] = [];
        const unreadIds: string[] = [];
        snapshot.forEach((docSnapshot) => {
          const m = { ...docSnapshot.data(), id: docSnapshot.id } as Message;
          msgs.push(m);
          if (m.senderId !== user.uid && m.status !== 'read') {
            unreadIds.push(m.id);
          }
        });
        setMessages(msgs);
        setTimeout(scrollToBottom, 100);

        // Mark as read in background
        if (unreadIds.length > 0) {
          unreadIds.forEach(id => {
            updateDoc(doc(db, "chats", activeChat.id, "messages", id), {
              status: 'read'
            }).catch(console.error);
          });
        }
        
        // Reset unread count for this user
        if (activeChat.id !== 'praxa_ai') {
          import("firebase/firestore").then(({ getDoc, doc, updateDoc }) => {
            getDoc(doc(db, "chats", activeChat.id)).then(snap => {
              if (snap.exists() && snap.data().unreadCounts?.[user.uid]) {
                updateDoc(doc(db, "chats", activeChat.id), {
                  [`unreadCounts.${user.uid}`]: 0
                }).catch(console.error);
              }
            }).catch(console.error);
          });
        }
      },
      (error) => {
        handleFirestoreError(
          error,
          OperationType.LIST,
          `chats/${activeChat.id}/messages`,
        );
      },
    );

    // Listen for incoming calls
    const callDoc = doc(db, "chats", activeChat.id, "calls", "active");
    const unsubCall = onSnapshot(callDoc, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.isActive && !isInCall) {
          if (data.initiator !== user.uid) {
            setIsVideoCallType(!!data.isVideo);
            setIncomingCall(true);
          }
        } else if (!data.isActive) {
          setIncomingCall(false);
          setIsInCall(false);
        }
      } else {
        setIncomingCall(false);
        setIsInCall(false);
      }
    });

    return () => {
      unsubMsgs();
      unsubCall();
    };
  }, [activeChat, isInCall]);

  const toggleMessageSelection = (msgId: string) => {
    const newSelection = new Set(selectedMessages);
    if (newSelection.has(msgId)) {
      newSelection.delete(msgId);
    } else {
      newSelection.add(msgId);
    }
    setSelectedMessages(newSelection);
  };

  const handleBulkDelete = async () => {
    if (!activeChat || selectedMessages.size === 0) return;
    const promises = Array.from(selectedMessages).map((msgId: string) => 
      deleteDoc(doc(db, "chats", activeChat.id, "messages", msgId))
    );
    try {
      await Promise.all(promises);
      setSelectedMessages(new Set());
      setIsSelectMode(false);
    } catch (e) {
      console.error("Error bulk deleting:", e);
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (!activeChat) return;
    try {
      await deleteDoc(doc(db, "chats", activeChat.id, "messages", msgId));
    } catch (e) {
      console.error(e);
    }
  };

  const handleStarMessage = async (msg: Message) => {
    if (!activeChat) return;
    const starredBy = msg.starredBy || [];
    const isStarred = starredBy.includes(user.uid);
    const newStarredBy = isStarred 
      ? starredBy.filter(id => id !== user.uid) 
      : [...starredBy, user.uid];
    
    try {
      await updateDoc(doc(db, "chats", activeChat.id, "messages", msg.id), {
        starredBy: newStarredBy
      });
    } catch (e) {
       console.error("Error starring:", e);
    }
  };

  const handleCopyMessage = (msg: Message) => {
    const textToCopy = msg.content || msg.fileName || "";
    navigator.clipboard.writeText(textToCopy);
  };

  const handleForwardMessage = (msg: Message) => {
    const forwardText = msg.content ? `[Forwarded]: ${msg.content}` : `[Forwarded: ${msg.fileName}]`;
    setInputText(forwardText);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let file = e.target.files?.[0];
    if (!file || !activeChat) return;

    if (activeChat.type === 'ai') {
      alert("Attachments are not supported in the AI Chat.");
      return;
    }

    // Warn user about very large files over 5GB (browser limit may hit first, but we handle it)
    if (file.size > 5 * 1024 * 1024 * 1024) {
      alert("File is too large! Maximum size is 5GB.");
      return;
    }

    const originalName = file.name;

    if (file.type.startsWith("image/")) {
      try {
        file = await new Promise<File>((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            URL.revokeObjectURL(img.src);
            const canvas = document.createElement("canvas");
            let width = img.width;
            let height = img.height;
            const maxDimension = 800;

            if (width > maxDimension || height > maxDimension) {
              if (width > height) {
                height = Math.round(height * (maxDimension / width));
                width = maxDimension;
              } else {
                width = Math.round(width * (maxDimension / height));
                height = maxDimension;
              }
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext("2d");
            if (!ctx) return reject("Canvas context not obtained");

            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob(
              (blob) => {
                if (blob) {
                  resolve(new File([blob], originalName, { type: "image/jpeg" }));
                } else {
                  reject(new Error("Canvas to Blob failed"));
                }
              },
              "image/jpeg",
              0.70
            );
          };
          img.onerror = () => {
            URL.revokeObjectURL(img.src);
            reject(new Error("Image load error"));
          };
          img.src = URL.createObjectURL(file!);
        });
      } catch (error) {
        console.error("Error compressing image:", error);
      }
    }

    setUploadingFile(file);
    
    // Attempt Firebase Storage First
    try {
      const storageRef = ref(
        storage,
        `chats/${activeChat.id}/${Date.now()}_${file.name}`,
      );
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        async (error) => {
          console.warn("Storage upload failed, falling back to Base64...", error);
          // Fallback to Base64
          fallbackToBase64(file);
        },
        async () => {
          try {
             const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
             await finalizeUpload(file, downloadURL);
          } catch(e) {
             fallbackToBase64(file);
          }
        }
      );
    } catch(e) {
      fallbackToBase64(file);
    }

    async function fallbackToBase64(f: File) {
       if (f.size > 900 * 1024) {
         alert("File is too large! Maximum size without Firebase Storage is 900KB.");
         setUploadingFile(null);
         if (fileInputRef.current) fileInputRef.current.value = "";
         return;
       }
       const reader = new FileReader();
       reader.onload = async () => {
           const downloadURL = reader.result as string;
           await finalizeUpload(f, downloadURL);
       };
       reader.onerror = () => {
         alert("Failed to read file.");
         setUploadingFile(null);
         if (fileInputRef.current) fileInputRef.current.value = "";
       };
       reader.readAsDataURL(f);
    }

    async function finalizeUpload(f: File, fileUrl: string) {
        let type: Message["type"] = "file";
        if (f.type.startsWith("image/")) type = "image";
        else if (f.type.startsWith("video/")) type = "video";
        else if (f.type.startsWith("audio/")) type = "audio";

        const messageId = crypto.randomUUID();
        const newMessage: Message = {
          id: messageId,
          chatId: activeChat!.id,
          senderId: user.uid,
          content: "",
          type,
          createdAt: Date.now(),
          fileUrl,
          fileName: f.name || "upload",
          fileSize: f.size,
          status: "sent",
        };

        try {
          await setDoc(
            doc(db, "chats", activeChat!.id, "messages", messageId),
            newMessage,
          );
          const updates: Record<string, any> = {
            lastMessageId: messageId,
            lastMessageContent: `📷 ${type === "image" ? "Image" : type === "video" ? "Video" : type === "audio" ? "Audio" : "File"}`,
            lastSenderId: user.uid,
            updatedAt: Date.now(),
          };
          activeChat!.participants?.forEach(p => {
            if (p !== user.uid) updates[`unreadCounts.${p}`] = increment(1);
          });
          await updateDoc(doc(db, "chats", activeChat!.id), updates);
        } catch (error) {
           console.error(error);
           alert("Failed to send file message.");
        } finally {
           setUploadingFile(null);
           setTimeout(scrollToBottom, 100);
           if (fileInputRef.current) fileInputRef.current.value = "";
        }
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeChat) return;

    const messageContent = inputText.trim();
    setInputText("");

    if (activeChat.type === 'ai') {
      const messageId = crypto.randomUUID();
      const newMsg: Message = { id: messageId, chatId: activeChat.id, senderId: user.uid, content: messageContent, type: 'text', createdAt: Date.now() };
      setAiMessages(prev => [...prev, newMsg]);
      setIsAiLoading(true);
      
      try {
        const historyPayload = aiMessages
          .filter(msg => msg.content && !msg.content.startsWith('Sorry,') && !msg.content.startsWith('Network or server error'))
          .map(msg => ({
            role: msg.senderId === user.uid ? 'user' : 'model',
            parts: [{ text: msg.content }]
          }));

        const res = await fetch(getApiUrl('/api/gemini/chat'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: messageContent, history: historyPayload })
        });
        
        const contentType = res.headers.get("content-type");
        let data: any;
        if (contentType && contentType.includes("application/json")) {
          data = await res.json();
        } else {
          const text = await res.text();
          throw new Error(`Server returned non-JSON response: ${text.substring(0, 150)}`);
        }
        
        if (!res.ok) {
          throw new Error(data.error || `Server returned status ${res.status}`);
        }
        
        const aiMsg: Message = {
          id: crypto.randomUUID(),
          chatId: activeChat.id,
          senderId: 'praxa_ai',
          content: data.text || 'Sorry, I encountered an empty response.',
          type: 'text',
          createdAt: Date.now()
        };
        setAiMessages(prev => [...prev, aiMsg]);
      } catch (err: any) {
         console.error("AI chat error:", err);
         setAiMessages(prev => [...prev, {
            id: crypto.randomUUID(), 
            chatId: activeChat.id, 
            senderId: 'praxa_ai', 
            content: `Sorry, I encountered an error: ${err.message || err}`, 
            type: 'text', 
            createdAt: Date.now()
         }]);
      } finally {
         setIsAiLoading(false);
         setTimeout(scrollToBottom, 100);
      }
      return;
    }

    const messageId = crypto.randomUUID();
    const messageRef = doc(db, "chats", activeChat.id, "messages", messageId);

    const newMessage: Message = {
      id: messageId,
      chatId: activeChat.id,
      senderId: user.uid,
      content: messageContent,
      type: "text",
      createdAt: Date.now(),
      status: "sent",
    };

    try {
      // Create message
      await setDoc(messageRef, newMessage);

      // Update chat last message
      const chatRef = doc(db, "chats", activeChat.id);
      
      const updates: Record<string, any> = {
        lastMessageId: messageId,
        lastMessageContent: messageContent,
        lastSenderId: user.uid,
        updatedAt: Date.now(),
      };
      
      activeChat.participants?.forEach(p => {
        if (p !== user.uid) {
          updates[`unreadCounts.${p}`] = increment(1);
        }
      });
      
      await updateDoc(chatRef, updates);
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.CREATE,
        `chats/${activeChat.id}/messages`,
      );
    }
  };

  if (!activeChat) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-transparent relative overflow-hidden">
        {/* Abstract background blobs */}
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-[var(--theme-accent,#6366f1)]/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-[var(--theme-accent,#6366f1)]/5 rounded-full blur-3xl" />

        <div className="z-10 bg-[var(--theme-panel-bg,#16161d)]/40 backdrop-blur-md p-6 rounded-2xl border theme-border flex flex-col items-center max-w-sm text-center shadow-xl">
          <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-4 theme-accent-text border theme-border shadow-inner">
            <Hash className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold mb-2 theme-text-primary">
            Praxa for Web
          </h2>
          <p className="text-sm theme-text-secondary opacity-85">
            Select a chat to start messaging.
          </p>
          <div className="mt-6 flex items-center gap-2 text-xs text-emerald-500 bg-emerald-500/5 px-3 py-1.5 rounded-full border border-emerald-500/10">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
            End-to-End Encryption Available
          </div>
        </div>
      </div>
    );
  }

  const displayName =
    activeChat.type === "direct"
      ? activeChat.otherUser?.displayName
      : activeChat.name;
  const avatar =
    activeChat.type === "direct"
      ? activeChat.otherUser?.photoURL
      : activeChat.groupAvatar;
  const isOnline =
    activeChat.type === "direct" ? activeChat.otherUser?.isOnline : false;

  const startCall = (video: boolean) => {
    alert("Feature will roll out soon");
  };

  const joinCall = () => {
    setIsInitiator(false);
    setIsInCall(true);
    setIncomingCall(false);
  };

  const handleSummarize = async () => {
    const chatHistory = messages.map(msg => `${msg.senderId === user.uid ? 'Me' : 'Them'}: ${msg.content || '[File/Image]'}`).join('\n');
    setIsAiLoading(true);
    try {
      const res = await fetch(getApiUrl('/api/gemini/summarize'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatHistory })
      });
      
      const contentType = res.headers.get("content-type");
      let data: any;
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(`Server returned non-JSON response: ${text.substring(0, 150)}`);
      }
      
      if (!res.ok) {
        throw new Error(data.error || `Server returned status ${res.status}`);
      }
      
      const aiMsg: Message = {
        id: crypto.randomUUID(),
        chatId: activeChat.id,
        senderId: 'praxa_ai', // Pseudo-sender so it appears distinct
        content: `**Praxa AI Summary:**\n${data.summary}`,
        type: 'text',
        createdAt: Date.now()
      };
      // For summarize, we just add it to the local state so the user can see it! Or we could save it to firestore. Let's save it to firestore so everyone sees the summary!
      await setDoc(doc(db, "chats", activeChat.id, "messages", aiMsg.id), aiMsg);
    } catch (err: any) {
      console.error(err);
      alert(`Failed to summarize chat: ${err.message || err}`);
    } finally {
      setIsAiLoading(false);
      setTimeout(scrollToBottom, 100);
    }
  };

  return (
    <div className="flex-1 flex flex-col relative min-w-0 bg-transparent" style={activeChat.type === 'ai' && aiBg ? { backgroundImage: `url(${aiBg})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}>
      {activeChat.type === 'ai' && aiBg && <div className="absolute inset-0 bg-black/60 pointer-events-none z-0" />}
      <ThemeVisuals themeId={themeId} />
      {isInCall && (
        <VideoCall
          chatId={activeChat.id}
          isInitiator={isInitiator}
          isVideoCall={isVideoCallType}
          userId={user.uid}
          onEndCall={() => {
            setIsInCall(false);
            setIncomingCall(false);
          }}
        />
      )}

      {incomingCall && !isInCall && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 bg-zinc-900 border border-indigo-500/30 p-4 rounded-2xl shadow-2xl flex items-center gap-6 animate-in slide-in-from-top-4 fade-in">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-500/20 rounded-full flex items-center justify-center animate-pulse">
              {isVideoCallType ? <Video className="w-6 h-6 text-indigo-400" /> : <Phone className="w-6 h-6 text-indigo-400" />}
            </div>
            <div>
              <p className="font-bold text-white">Incoming {isVideoCallType ? "Video" : "Voice"} Call</p>
              <p className="text-sm text-zinc-400">{displayName}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIncomingCall(false)}
              className="w-10 h-10 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center hover:bg-red-500/30 transition-colors"
            >
              <Phone className="w-5 h-5 transform rotate-135" />
            </button>
            <button
              onClick={joinCall}
              className="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center hover:bg-green-400 transition-colors shadow-lg shadow-green-500/20"
            >
              <PhoneIncoming className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="h-18 border-b theme-border flex items-center justify-between px-4 lg:px-8 theme-panel-bg bg-opacity-70 backdrop-blur-sm shrink-0 z-10">
        <div className="flex items-center gap-3 lg:gap-4">
          <button 
            className="lg:hidden p-2 -ml-2 theme-text-secondary hover:theme-text-primary"
            onClick={() => setActiveChat?.(null)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <div className="relative">
            {activeChat.type === 'ai' ? (
              aiProfilePic ? (
                 <img src={aiProfilePic} alt="Praxa AI" className="w-10 h-10 rounded-full border theme-border object-cover" />
              ) : (
                 <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-500 flex items-center justify-center text-white"><Bot className="w-5 h-5"/></div>
              )
            ) : avatar ? (
              <img
                src={avatar}
                alt=""
                className="w-10 h-10 rounded-full border theme-border object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold">
                {displayName?.[0] || "C"}
              </div>
            )}
            {isOnline && activeChat.type !== 'ai' && (
              <div className="absolute bottom-0 right-0 w-3 h-3 theme-accent-bg border-2 border-[var(--theme-bg,#0a0a0c)] rounded-full animate-pulse shadow-[0_0_6px_var(--theme-accent-glow)]" />
            )}
          </div>
          <div>
            <h2 className="font-bold text-lg theme-text-primary">
              {displayName || "Unknown"}
            </h2>
            <div className="flex items-center gap-2">
              <p className="text-xs theme-text-secondary opacity-75">
                {activeChat.type === "direct"
                  ? isOnline
                    ? "Online"
                    : "Offline"
                  : `${activeChat.participants.length} members`}
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          {activeChat.type !== 'ai' && (
             <button
               onClick={handleSummarize}
               disabled={isAiLoading || messages.length === 0}
               className="p-2 text-cyan-400 hover:text-cyan-300 transition-colors bg-cyan-500/10 rounded-lg hover:bg-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed hidden sm:block"
               title="Summarize Chat with Praxa AI"
             >
               <Bot className="w-5 h-5" />
             </button>
          )}
          <button
            onClick={() => startCall(false)}
            className="p-2 text-slate-400 hover:text-white transition-colors bg-white/5 rounded-lg hover:bg-white/10"
            title="Voice Call"
          >
            <Phone className="w-5 h-5" />
          </button>
          <button
            onClick={() => startCall(true)}
            className="p-2 text-slate-400 hover:text-white transition-colors bg-white/5 rounded-lg hover:bg-white/10"
            title="Video Call"
          >
            <Video className="w-5 h-5" />
          </button>
          {isSelectMode && selectedMessages.size > 0 && (
            <button 
              onClick={handleBulkDelete}
              className="px-4 py-2 bg-red-600 rounded-lg text-sm font-semibold hover:bg-red-500 transition-colors flex items-center gap-2 shadow-lg shadow-red-500/20 text-white"
            >
              <Trash2 className="w-4 h-4" />
              Delete Selected
            </button>
          )}
          <button 
            onClick={() => {
               setIsSelectMode(!isSelectMode);
               setSelectedMessages(new Set());
            }} 
            className={cn("p-2 text-slate-400 hover:text-white transition-colors rounded-lg", 
              isSelectMode ? "bg-indigo-500/20 text-indigo-400" : "bg-white/5 hover:bg-white/10"
            )}
            title="Select Messages"
          >
            <CheckCircle className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 lg:px-8 py-8 custom-scrollbar flex flex-col gap-6 relative">
        {(activeChat.type === 'ai' ? aiMessages : messages).map((msg, index) => {
          const isMine = msg.senderId === user.uid;
          const msgList = activeChat.type === 'ai' ? aiMessages : messages;
          const showTime =
            index === 0 ||
            msg.createdAt - msgList[index - 1].createdAt > 5 * 60 * 1000;

          return (
            <div
              key={msg.id}
              className={cn(
                "flex gap-4 relative group",
                isMine ? "flex-row-reverse" : "flex-row",
              )}
            >
              {isSelectMode && (
                <div className="flex items-center justify-center pt-8">
                  <input 
                    type="checkbox" 
                    className="w-5 h-5 rounded border-white/20 bg-[#16161D] checked:bg-indigo-500 cursor-pointer"
                    checked={selectedMessages.has(msg.id)}
                    onChange={() => toggleMessageSelection(msg.id)}
                  />
                </div>
              )}
              
              {/* Optional avatar gap */}
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center font-bold relative overflow-hidden",
                  isMine
                    ? "bg-slate-700 text-white"
                    : msg.senderId === 'praxa_ai'
                    ? "bg-gradient-to-tr from-cyan-500 to-blue-500 text-white"
                    : "bg-gradient-to-tr from-indigo-500 to-purple-500 text-white",
                )}
              >
                  {isMine ? (
                    userProfilePic ? <img src={userProfilePic} className="w-full h-full object-cover" /> : user.photoURL ? <img src={user.photoURL} className="w-full h-full object-cover" /> : null
                  ) : msg.senderId === 'praxa_ai' ? (
                    aiProfilePic ? <img src={aiProfilePic} className="w-full h-full object-cover" /> : <Bot className="w-5 h-5"/>
                  ) : (
                    avatar ? <img src={avatar} className="w-full h-full object-cover" /> : <span className="text-xs">{activeChat.name?.[0] || 'U'}</span>
                  )}
              </div>

              <div className="flex flex-col max-w-[70%]">
                {showTime && (
                  <div
                    className={cn(
                      "flex items-center gap-1 mb-2",
                      isMine ? "self-end" : "self-start",
                    )}
                  >
                    <span className="text-[10px] text-slate-500 font-bold uppercase">
                      {format(msg.createdAt, "MMM d, h:mm a")}
                    </span>
                    {isMine && (
                      <span className="ml-1 flex items-center" title={`Status: ${msg.status || 'sent'}`}>
                        {msg.status === 'read' ? (
                          <CheckCheck className="w-3.5 h-3.5 text-blue-400" />
                        ) : msg.status === 'delivered' || (msg.status === 'sent' && activeChat.otherUser?.isOnline) ? (
                          <CheckCheck className="w-3.5 h-3.5 text-slate-400" />
                        ) : (
                          <Check className="w-3.5 h-3.5 text-slate-400" />
                        )}
                      </span>
                    )}
                  </div>
                )}
                <div
                  className={cn(
                    "p-4 rounded-2xl shadow-sm text-sm leading-relaxed break-words relative group overflow-hidden",
                    isMine
                      ? "theme-message-sent-bg text-white rounded-tr-none"
                      : "theme-message-received-bg border theme-border rounded-tl-none",
                    msg.type !== "text" && "p-2", // Less padding for media
                    msg.starredBy?.includes(user.uid) && "ring-2 ring-yellow-500/50"
                  )}
                >
                  {/* Action overlay right inside bubble */}
                  {!isSelectMode && (
                    <div className={cn("absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur rounded-lg p-1", 
                       isMine ? "right-auto left-2" : "left-auto right-2"
                    )}>
                      <button onClick={() => handleCopyMessage(msg)} className="p-1 hover:bg-white/20 rounded text-slate-200" title="Copy"><Copy className="w-3 h-3" /></button>
                      <button onClick={() => handleForwardMessage(msg)} className="p-1 hover:bg-white/20 rounded text-slate-200" title="Forward"><Forward className="w-3 h-3" /></button>
                      <button onClick={() => handleStarMessage(msg)} className={cn("p-1 hover:bg-white/20 rounded", msg.starredBy?.includes(user.uid) ? "text-yellow-400" : "text-slate-200")} title="Star"><Star className="w-3 h-3 block" /></button>
                      {msg.senderId === user.uid && (
                        <button onClick={() => handleDeleteMessage(msg.id)} className="p-1 hover:bg-red-500/50 rounded text-red-200" title="Delete"><Trash2 className="w-3 h-3 block" /></button>
                      )}
                    </div>
                  )}
                  
                  {msg.starredBy?.includes(user.uid) && (
                     <div className={cn("absolute -top-1 -right-1 z-10")}><Star className="w-4 h-4 fill-yellow-500 text-yellow-500 drop-shadow-md" /></div>
                  )}

                  {msg.type === "text" && (
                    msg.senderId === 'praxa_ai' ? (
                      <div className="markdown-body prose prose-invert max-w-none text-sm">
                        <Markdown>{msg.content}</Markdown>
                      </div>
                    ) : (
                      <span className="whitespace-pre-wrap">{msg.content}</span>
                    )
                  )}
                  {msg.type === "image" && msg.fileUrl && (
                    <img
                      src={msg.fileUrl}
                      alt="Image"
                      className="rounded-xl max-h-64 object-cover"
                    />
                  )}
                  {msg.type === "video" && msg.fileUrl && (
                    <video
                      src={msg.fileUrl}
                      controls
                      className="rounded-xl max-h-64 bg-black/20"
                    />
                  )}
                  {msg.type === "audio" && msg.fileUrl && (
                    <audio src={msg.fileUrl} controls className="my-2" />
                  )}
                  {msg.type === "file" && msg.fileUrl && (
                    <a
                      href={msg.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-black/20 rounded-xl hover:bg-black/30 transition-colors"
                    >
                      <div className="w-10 h-10 bg-[var(--theme-accent)]/20 rounded-lg flex items-center justify-center theme-accent-text">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate text-sm">
                          {msg.fileName}
                        </p>
                        <p className="text-xs opacity-70">
                          {msg.fileSize
                            ? (msg.fileSize / 1024 / 1024).toFixed(2) + " MB"
                            : "File"}
                        </p>
                      </div>
                    </a>
                  )}

                  {msg.content && msg.type !== "text" && (
                    <p className="mt-2 px-2 pb-1">{msg.content}</p>
                  )}
                </div>
                <span
                  className={cn(
                    "text-[10px] text-slate-500 mt-1.5 px-1 flex items-center gap-1",
                    isMine ? "self-end" : "self-start",
                  )}
                >
                  {format(msg.createdAt, "h:mm a")}
                  {isMine && (
                    <span className="text-indigo-400 font-bold">✓✓</span>
                  )}
                </span>
              </div>
            </div>
          );
        })}
        {isAiLoading && (
          <div className="flex gap-4 relative group animate-pulse">
            <div className="w-8 h-8 rounded-full flex-shrink-0 bg-gradient-to-tr from-cyan-500 to-blue-500 flex items-center justify-center text-white"><Bot className="w-4 h-4" /></div>
            <div className="p-4 rounded-2xl shadow-sm text-sm bg-white/5 border border-white/10 text-slate-400 rounded-tl-none">
              Praxa AI is typing...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-6 border-t theme-border theme-panel-bg bg-opacity-70 backdrop-blur-sm shrink-0">
        {uploadingFile && (
          <div className="mb-4 theme-panel-bg border theme-border rounded-xl p-3 flex items-center gap-3">
            <div className="w-10 h-10 bg-[var(--theme-accent)]/10 rounded-lg flex items-center justify-center theme-accent-text shrink-0">
              {uploadingFile.type.startsWith("image/") ? (
                <ImageIcon className="w-5 h-5" />
              ) : uploadingFile.type.startsWith("video/") ? (
                <Video className="w-5 h-5" />
              ) : uploadingFile.type.startsWith("audio/") ? (
                <Music className="w-5 h-5" />
              ) : (
                <FileIcon className="w-5 h-5" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center mb-1">
                <p className="text-sm font-medium theme-text-primary truncate pr-4">
                  {uploadingFile.name}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setUploadingFile(null);
                    setUploadProgress(0);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="theme-text-secondary hover:theme-text-primary"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full theme-accent-bg rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          </div>
        )}
        <form
          onSubmit={handleSend}
          className="flex items-end gap-2 theme-panel-bg border theme-border rounded-2xl p-2 transition-colors focus-within:border-[var(--theme-accent)]/55"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            type="button"
            disabled={activeChat?.type === 'ai'}
            onClick={() => fileInputRef.current?.click()}
            className="p-2 theme-text-secondary hover:theme-text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title={activeChat?.type === 'ai' ? "Attachments not supported in AI Chat" : "Attach File"}
          >
            <Paperclip className="w-6 h-6" />
          </button>
 
          <div className="flex-1 py-1">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Message Praxa..."
              className="w-full bg-transparent border-none focus:outline-none theme-text-primary px-2 py-1.5 placeholder:theme-text-secondary placeholder:opacity-50 text-sm"
            />
          </div>
 
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="p-2 theme-accent-bg text-white rounded-xl theme-accent-bg-hover transition-colors disabled:opacity-50 flex items-center justify-center shadow-lg shadow-[var(--theme-accent-glow)]"
          >
            <Send className="w-5 h-5 ml-1" />
          </button>
        </form>
      </div>
    </div>
  );
}

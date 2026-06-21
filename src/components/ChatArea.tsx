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
} from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { User as FirebaseUser } from "firebase/auth";
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
  File,
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
} from "lucide-react";
import type { Chat, Message } from "../types";
import { format } from "date-fns";
import { VideoCall } from "./VideoCall";

interface ChatAreaProps {
  user: FirebaseUser;
  activeChat: Chat | null;
  setActiveChat?: (chat: Chat | null) => void;
}

export function ChatArea({ user, activeChat, setActiveChat }: ChatAreaProps) {
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

  const handleDeleteChat = async () => {
    if (!activeChat || !setActiveChat) return;
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
            const canvas = document.createElement("canvas");
            let width = img.width;
            let height = img.height;
            const maxDimension = 1280;

            if (width > maxDimension || height > maxDimension) {
              if (width > height) {
                height = Math.round((height *= maxDimension / width));
                width = maxDimension;
              } else {
                width = Math.round((width *= maxDimension / height));
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
              0.85
            );
          };
          img.onerror = () => reject(new Error("Image load error"));
          img.src = URL.createObjectURL(file!);
        });
      } catch (error) {
        console.error("Error compressing image:", error);
      }
    }

    setUploadingFile(file);
    const storageRef = ref(
      storage,
      `chats/${activeChat.id}/${Date.now()}_${file.name}`,
    );
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const progress =
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      },
      (error) => {
        console.error("Upload fail:", error);
        alert(
          "Upload failed. Ensure Firebase Storage is enabled in the Firebase Console.",
        );
        setUploadingFile(null);
        setUploadProgress(0);
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

        let type: Message["type"] = "file";
        if (file.type.startsWith("image/")) type = "image";
        else if (file.type.startsWith("video/")) type = "video";
        else if (file.type.startsWith("audio/")) type = "audio";

        const messageId = crypto.randomUUID();
        const newMessage: Message = {
          id: messageId,
          chatId: activeChat.id,
          senderId: user.uid,
          content: "",
          type,
          createdAt: Date.now(),
          fileUrl: downloadURL,
          fileName: file.name || originalName || "upload",
          fileSize: file.size,
          status: "sent",
        };

        try {
          await setDoc(
            doc(db, "chats", activeChat.id, "messages", messageId),
            newMessage,
          );
          await updateDoc(doc(db, "chats", activeChat.id), {
            lastMessageId: messageId,
            lastMessageContent: `📷 ${type === "image" ? "Image" : type === "video" ? "Video" : type === "audio" ? "Audio" : "File"}`,
            updatedAt: Date.now(),
          });
        } catch (error) {
          handleFirestoreError(
            error,
            OperationType.CREATE,
            `chats/${activeChat.id}/messages`,
          );
        }

        setUploadingFile(null);
        setUploadProgress(0);
        if (fileInputRef.current) fileInputRef.current.value = "";
      },
    );
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeChat) return;

    const messageContent = inputText.trim();
    setInputText("");

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
      await updateDoc(chatRef, {
        lastMessageId: messageId,
        lastMessageContent: messageContent,
        updatedAt: Date.now(),
      });
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
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />

        <div className="z-10 bg-black/40 backdrop-blur-md p-6 rounded-2xl border border-white/5 flex flex-col items-center max-w-sm text-center shadow-xl">
          <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-4 text-indigo-400 border border-white/10 shadow-inner">
            <Hash className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-200 mb-2">
            Praxa for Web
          </h2>
          <p className="text-sm text-slate-500">
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

  return (
    <div className="flex-1 flex flex-col relative min-w-0 bg-transparent">
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
      <div className="h-18 border-b border-white/5 flex items-center justify-between px-8 bg-black/20 backdrop-blur-sm shrink-0 z-10">
        <div className="flex items-center gap-4">
          <div className="relative">
            {avatar ? (
              <img
                src={avatar}
                alt=""
                className="w-10 h-10 rounded-full border border-white/10 object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold">
                {displayName?.[0] || "C"}
              </div>
            )}
            {isOnline && (
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-indigo-500 border-2 border-[#0A0A0C] rounded-full animate-pulse" />
            )}
          </div>
          <div>
            <h2 className="font-bold text-lg text-slate-200">
              {displayName || "Unknown"}
            </h2>
            <div className="flex items-center gap-2">
              <p className="text-xs text-slate-500">
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
      <div className="flex-1 overflow-y-auto px-8 py-8 custom-scrollbar flex flex-col gap-6">
        {messages.map((msg, index) => {
          const isMine = msg.senderId === user.uid;
          const showTime =
            index === 0 ||
            msg.createdAt - messages[index - 1].createdAt > 5 * 60 * 1000;

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
                  "w-8 h-8 rounded-full flex-shrink-0",
                  isMine
                    ? "bg-slate-700"
                    : "bg-gradient-to-tr from-indigo-500 to-purple-500",
                )}
              ></div>

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
                      ? "bg-indigo-600 text-white rounded-tr-none"
                      : "bg-white/5 border border-white/10 text-slate-300 rounded-tl-none",
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

                  {msg.type === "text" && msg.content}
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
                      <div className="w-10 h-10 bg-indigo-500/20 rounded-lg flex items-center justify-center text-indigo-400">
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
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-6 border-t border-white/5 bg-black/20 backdrop-blur-sm shrink-0">
        {uploadingFile && (
          <div className="mb-4 bg-[#16161D] border border-white/10 rounded-xl p-3 flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-500/10 rounded-lg flex items-center justify-center text-indigo-400 shrink-0">
              {uploadingFile.type.startsWith("image/") ? (
                <ImageIcon className="w-5 h-5" />
              ) : uploadingFile.type.startsWith("video/") ? (
                <Video className="w-5 h-5" />
              ) : uploadingFile.type.startsWith("audio/") ? (
                <Music className="w-5 h-5" />
              ) : (
                <File className="w-5 h-5" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center mb-1">
                <p className="text-sm font-medium text-slate-200 truncate pr-4">
                  {uploadingFile.name}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setUploadingFile(null);
                    setUploadProgress(0);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="text-slate-500 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          </div>
        )}
        <form
          onSubmit={handleSend}
          className="flex items-end gap-2 bg-[#16161D] border border-white/10 rounded-2xl p-2 transition-colors focus-within:border-indigo-500/50"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-slate-400 hover:text-white transition-colors"
          >
            <Paperclip className="w-6 h-6" />
          </button>

          <div className="flex-1 py-1">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Message Praxa..."
              className="w-full bg-transparent border-none focus:outline-none text-slate-200 px-2 py-1.5 placeholder:text-slate-600 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={!inputText.trim()}
            className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-colors disabled:opacity-50 disabled:hover:bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20"
          >
            <Send className="w-5 h-5 ml-1" />
          </button>
        </form>
      </div>
    </div>
  );
}

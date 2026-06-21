export interface User {
  uid: string;
  phoneNumber?: string;
  displayName?: string;
  photoURL?: string;
  bio?: string;
  lastSeen?: number;
  isOnline?: boolean;
  createdAt: number;
}

export interface Chat {
  id: string; // Document ID
  type: 'direct' | 'group' | 'ai';
  participants: string[];
  createdAt: number;
  updatedAt: number;
  lastMessageId?: string;
  name?: string;
  lastMessageContent?: string;
  lastSenderId?: string;
  groupAvatar?: string;
  adminIds?: string[];
  
  // Local state properties for the UI
  otherUser?: User;
  lastMessageContent?: string;
}

export interface Message {
  id: string; // Document ID
  chatId: string;
  senderId: string;
  content?: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'file';
  createdAt: number;
  editedAt?: number;
  deletedAt?: number;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  attachments?: string[];
  starredBy?: string[];
  status?: 'sent' | 'delivered' | 'read';
  deliveredTo?: string[];
  readBy?: string[];
}

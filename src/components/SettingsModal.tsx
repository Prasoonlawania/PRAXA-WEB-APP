import React, { useRef } from 'react';
import { X, Image as ImageIcon, Upload } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  themeId: string;
  setThemeId: (id: string) => void;
  customBg: string;
  setCustomBg: (url: string) => void;
  aiBg: string;
  setAiBg: (url: string) => void;
  userProfilePic: string;
  setUserProfilePic: (url: string) => void;
}

const THEMES = [
  { id: 'default-dark', name: 'Default Dark', desc: 'Workstation slate dark', color: '#0A0A0C', previewClass: 'from-slate-900 to-slate-800 border-indigo-500/20' },
  { id: 'default-light', name: 'Default Light', desc: 'Workstation clean light', color: '#F8FAFC', previewClass: 'from-slate-100 to-white border-indigo-500/10 text-slate-900' },
  { id: 'money-heist', name: 'Money Heist', desc: 'Crimson red & vault shadows', color: '#dc2626', previewClass: 'from-[#1a0808] to-[#0d0303] border-red-500/20' },
  { id: 'spider-man', name: 'Spider-Man', desc: 'Rose red & spider webs', color: '#e11d48', previewClass: 'from-[#10050c] to-[#080205] border-rose-500/20' },
  { id: 'marvel', name: 'Cosmic Marvel', desc: 'Crimson / purple galaxy', color: '#d946ef', previewClass: 'from-[#120220] to-[#080010] border-fuchsia-500/20' },
  { id: 'avengers', name: 'Avengers HUD', desc: 'Cybermatic technical Navy', color: '#0ea5e9', previewClass: 'from-[#081628] to-[#030d1a] border-sky-500/20' },
  { id: 'iron-man', name: 'Iron Man', desc: 'Stark hot-rod red & gold', color: '#eab308', previewClass: 'from-[#200407] to-[#140203] border-yellow-500/20' },
  { id: 'jarvis-hud', name: 'JARVIS HUD', desc: 'Stark holographic cyan', color: '#06b6d4', previewClass: 'from-[#031520] to-[#010a10] border-cyan-500/20' },
  { id: 'asur', name: 'Asur Mystic', desc: 'Smoking charcoal & ash', color: '#ea580c', previewClass: 'from-[#121212] to-[#090909] border-orange-500/20' },
  { id: 'house-of-the-dragon', name: 'Dragonstone', desc: 'Ember & dragon scale', color: '#d97706', previewClass: 'from-[#120a07] to-[#070403] border-amber-600/20' },
];

export function SettingsModal({ isOpen, onClose, themeId, setThemeId, customBg, setCustomBg, aiBg, setAiBg, userProfilePic, setUserProfilePic }: SettingsModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const aiBgInputRef = useRef<HTMLInputElement>(null);
  const userPicInputRef = useRef<HTMLInputElement>(null);

  const processImageUpload = (file: File, setter: (url: string) => void) => {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDimension = 1920;

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

          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            setter(dataUrl);
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (url: string) => void) => {
    const file = e.target.files?.[0];
    if (file) processImageUpload(file, setter);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#16161D] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 theme-panel-bg theme-border">
        <div className="flex items-center justify-between p-4 border-b border-white/5 bg-[#0A0A0C] theme-bg theme-border">
          <h2 className="text-lg font-bold text-slate-200 theme-text-primary">Appearance Settings</h2>
          <button 
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white hover:bg-white/10 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Color Theme</h3>
            <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
              {THEMES.map(theme => {
                const isActive = !customBg && themeId === theme.id;
                return (
                  <button
                    key={theme.id}
                    onClick={() => {
                      setThemeId(theme.id);
                      setCustomBg('');
                    }}
                    className={`flex flex-col items-start gap-1 p-3 rounded-xl border bg-gradient-to-br text-left transition-all ${theme.previewClass} ${
                      isActive 
                        ? 'border-[var(--theme-accent,#6366f1)] bg-[rgba(99,102,241,0.15)] ring-1 ring-[var(--theme-accent)] shadow-lg shadow-[var(--theme-accent-glow)]' 
                        : 'border-white/5 bg-white/5 hover:border-white/20 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <div 
                        data-invert-ignore="true" 
                        className="w-4.5 h-4.5 rounded-full border border-white/20 flex-shrink-0" 
                        style={{ backgroundColor: theme.color }} 
                      />
                      <span className="text-sm font-bold text-slate-200 truncate">{theme.name}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 line-clamp-1">{theme.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Custom Background</h3>
            <div className="flex flex-col gap-3">
              <div className="flex gap-2 relative">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="https://example.com/image.jpg"
                    value={customBg.length > 500 ? "Local uploaded image" : customBg}
                    onChange={(e) => {
                      if (e.target.value !== "Local uploaded image") {
                        setCustomBg(e.target.value);
                      }
                    }}
                    className="w-full bg-[#0A0A0C] border border-white/10 flex items-center p-3 pl-10 rounded-xl text-sm focus:outline-none focus:border-indigo-500 transition-colors text-slate-200"
                  />
                  <ImageIcon className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  accept="image/jpeg,image/png,image/webp" 
                  className="hidden" 
                  onChange={(e) => handleFileUpload(e, setCustomBg)}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors text-slate-300"
                  title="Upload from device"
                >
                  <Upload className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Your Profile Picture</h3>
            <div className="flex gap-2 relative">
              <input type="file" ref={userPicInputRef} accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, setUserProfilePic)} />
              <button onClick={() => userPicInputRef.current?.click()} className="flex-1 flex justify-center items-center py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors text-sm text-slate-300">
                <Upload className="w-4 h-4 mr-2" /> Upload Avatar
              </button>
              {userProfilePic && (
                <button onClick={() => setUserProfilePic('')} className="px-3 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-xl text-sm transition-colors border border-red-500/20">Clear</button>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Praxa AI Branding</h3>
            <div className="flex flex-col gap-3">
              <div className="flex gap-2 relative items-center">
                <span className="text-sm text-slate-400 w-24">Background:</span>
                <input type="file" ref={aiBgInputRef} accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, setAiBg)} />
                <button onClick={() => aiBgInputRef.current?.click()} className="flex-1 flex justify-center items-center py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors text-sm text-slate-300">
                  <Upload className="w-4 h-4 mr-2" /> Upload BG
                </button>
                {aiBg && (
                  <button onClick={() => setAiBg('')} className="px-3 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-xl text-sm transition-colors border border-red-500/20">Clear</button>
                )}
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">System</h3>
            <div className="flex gap-2 relative items-center justify-between bg-white/5 border border-white/10 rounded-xl p-3">
              <span className="text-sm text-slate-300">Push Notifications</span>
              <button 
                onClick={() => {
                  if ('Notification' in window) {
                    Notification.requestPermission().then(perm => {
                      if (perm === 'granted') {
                        new Notification('Notifications Enabled', { body: 'You will now receive message alerts' });
                      } else {
                        alert('Notification permission denied. Please enable them in your browser settings.');
                      }
                    });
                  } else {
                    alert('Notifications are not supported by your browser.');
                  }
                }}
                className="px-4 py-1.5 bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 font-medium rounded-lg text-sm transition-colors"
               >
                Enable
              </button>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
             <button 
                onClick={onClose}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-colors"
             >
                Done
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}

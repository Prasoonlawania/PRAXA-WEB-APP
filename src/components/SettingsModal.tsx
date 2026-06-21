import React, { useRef } from 'react';
import { X, Image as ImageIcon, Upload } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  themeColor: string;
  setThemeColor: (color: string) => void;
  customBg: string;
  setCustomBg: (url: string) => void;
  aiProfilePic: string;
  setAiProfilePic: (url: string) => void;
  aiBg: string;
  setAiBg: (url: string) => void;
  userProfilePic: string;
  setUserProfilePic: (url: string) => void;
}

const THEMES = [
  { name: 'Dark', color: '#0A0A0C' },
  { name: 'Light', color: '#F8FAFC' },
];

export function SettingsModal({ isOpen, onClose, themeColor, setThemeColor, customBg, setCustomBg, aiProfilePic, setAiProfilePic, aiBg, setAiBg, userProfilePic, setUserProfilePic }: SettingsModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const aiPicInputRef = useRef<HTMLInputElement>(null);
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
      <div className="bg-[#16161D] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95">
        <div className="flex items-center justify-between p-4 border-b border-white/5 bg-[#0A0A0C]">
          <h2 className="text-lg font-bold text-slate-200">Appearance Settings</h2>
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
            <div className="grid grid-cols-2 gap-3">
              {THEMES.map(theme => (
                <button
                  key={theme.name}
                  onClick={() => {
                    setThemeColor(theme.color);
                    setCustomBg('');
                  }}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${!customBg && themeColor === theme.color ? 'border-indigo-500 bg-indigo-500/10' : 'border-white/5 bg-white/5 hover:border-white/20 hover:bg-white/10'}`}
                >
                  <div data-invert-ignore="true" className="w-6 h-6 rounded-full border border-white/20" style={{ backgroundColor: theme.color }} />
                  <span className="text-sm font-medium text-slate-200">{theme.name}</span>
                </button>
              ))}
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
                <span className="text-sm text-slate-400 w-24">Profile Pic:</span>
                <input type="file" ref={aiPicInputRef} accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, setAiProfilePic)} />
                <button onClick={() => aiPicInputRef.current?.click()} className="flex-1 flex justify-center items-center py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors text-sm text-slate-300">
                  <Upload className="w-4 h-4 mr-2" /> Upload Logo
                </button>
                {aiProfilePic && (
                  <button onClick={() => setAiProfilePic('')} className="px-3 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-xl text-sm transition-colors border border-red-500/20">Clear</button>
                )}
              </div>
              
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

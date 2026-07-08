import React, { useState, useEffect } from 'react';
import { Shield, Lock, ScrollText, CheckCircle2, XCircle } from 'lucide-react';

interface AgreementOverlayProps {
  onAccept: () => void;
  onDecline: () => void;
}

export const AgreementOverlay: React.FC<AgreementOverlayProps> = ({ onAccept, onDecline }) => {
  const [hasReachedBottom, setHasReachedBottom] = useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      if (scrollTop + clientHeight >= scrollHeight - 20) {
        setHasReachedBottom(true);
      }
    }
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', handleScroll);
      // Check if it's already at the bottom (e.g., short text)
      if (el.scrollHeight <= el.clientHeight) {
        setHasReachedBottom(true);
      }
    }
    return () => el?.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-500">
      <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border border-white/20 animate-in zoom-in-95 duration-500">
        
        {/* Header */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-bhutan-gold/10 blur-3xl rounded-full" />
          <div className="relative z-10 flex items-center gap-4">
            <div className="bg-bhutan-gold/20 p-3 rounded-2xl">
              <Shield className="w-8 h-8 text-bhutan-gold" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">Legal Agreement</h1>
              <p className="text-slate-400 text-sm font-medium">Please review the terms of use for Jinda</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-8 bg-slate-50/50 space-y-6 max-h-[60vh] scrollbar-thin scrollbar-thumb-slate-200"
        >
          <div className="space-y-4 text-slate-700">
            <section className="space-y-2">
              <h2 className="flex items-center gap-2 text-slate-900 font-black tracking-tight">
                <ScrollText className="w-4 h-4 text-bhutan-maroon" />
                1. Acceptance of Terms
              </h2>
              <p className="text-sm leading-relaxed font-medium">
                By installing and using Jinda ("Software"), you agree to be bound by these terms and conditions. Jinda is a desktop accounting and POS solution. All data processed by the Software is stored locally on your device unless you explicitly opt-in to cloud backups.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="flex items-center gap-2 text-slate-900 font-black tracking-tight">
                <Lock className="w-4 h-4 text-bhutan-maroon" />
                2. Privacy & Data Ownership
              </h2>
              <p className="text-sm leading-relaxed font-medium">
                Your business data (sales, inventory, contacts) belongs to you. We do not store your transaction data on our servers. We only collect basic hardware information and email addresses required to activate and protect your software license.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="flex items-center gap-2 text-slate-900 font-black tracking-tight">
                <CheckCircle2 className="w-4 h-4 text-bhutan-maroon" />
                3. License Restrictions
              </h2>
              <ul className="text-sm leading-relaxed font-medium list-disc pl-5 space-y-1">
                <li>One license per computer hardware ID.</li>
                <li>No reverse engineering, cracking, or unauthorized redistribution.</li>
                <li>Users are responsible for their own data backups.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-slate-900 font-black tracking-tight">4. Limitation of Liability</h2>
              <p className="text-sm leading-relaxed font-medium italic">
                The software is provided "AS IS". Jinda and its developers shall not be liable for any financial losses or data corruption resulting from hardware failure, user error, or software interruptions.
              </p>
            </section>

            <div className="pt-4 border-t border-slate-200 space-y-3">
              <div className="bg-bhutan-maroon/5 p-4 rounded-2xl border border-bhutan-maroon/10">
                <h3 className="text-slate-900 font-black text-xs uppercase tracking-wider mb-2">Developer Recognition</h3>
                <p className="text-xs leading-relaxed font-medium text-slate-600">
                  This Software is the result of extensive research, expert engineering, and the dedicated craftsmanship of <span className="text-bhutan-maroon font-bold">Keshab Baral</span>. 
                  Built with a commitment to empowering Bhutanese businesses through high-performance technology and intuitive design.
                </p>
                <div className="mt-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Developer: Keshab Baral | Tsirang, Bhutan
                </div>
              </div>
              <p className="text-[10px] uppercase tracking-widest font-black text-slate-400">
                Governing Law: Kingdom of Bhutan
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-8 bg-white border-t border-slate-100 flex flex-col md:flex-row items-center gap-4">
          {!hasReachedBottom && (
            <p className="text-bhutan-maroon-dark text-[10px] font-black uppercase tracking-widest animate-pulse mb-4 md:mb-0">
              Please scroll to the bottom to continue ↓
            </p>
          )}
          
          <div className="flex items-center gap-4 w-full justify-end">
            <button
              onClick={onDecline}
              className="px-6 py-3 rounded-2xl text-slate-500 font-bold text-sm hover:bg-slate-50 transition-all flex items-center gap-2"
            >
              <XCircle className="w-4 h-4" />
              Decline & Exit
            </button>
            
            <button
              disabled={!hasReachedBottom}
              onClick={onAccept}
              className={`px-10 py-3 rounded-2xl font-black text-sm shadow-xl transition-all flex items-center gap-2 ${
                hasReachedBottom 
                ? 'bg-slate-950 text-white hover:scale-105 active:scale-95' 
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              Accept & Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

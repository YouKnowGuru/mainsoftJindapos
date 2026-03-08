import { useEffect } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

interface NotificationProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}

const icons = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
};

const styles = {
  success: 'bg-emerald-50/90 border-emerald-100 text-emerald-800 shadow-emerald-500/10',
  error: 'bg-red-50/90 border-red-100 text-red-800 shadow-red-500/10',
  info: 'bg-bhutan-gold/10 border-bhutan-gold/20 text-bhutan-maroon shadow-bhutan-maroon/5',
};

/**
 * Notification Component - Toast notifications
 */
export function Notification({ message, type, onClose }: NotificationProps) {
  const Icon = icons[type];

  // Auto-close after 5 seconds
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed bottom-8 right-8 z-50 animate-in slide-in-from-right-10 duration-500">
      <div className={`flex items-center gap-4 px-6 py-4 rounded-[24px] border backdrop-blur-xl shadow-2xl ${styles[type]}`}>
        <div className={`p-2 rounded-xl bg-white/50`}>
          <Icon className="w-5 h-5" />
        </div>
        <p className="text-xs font-black uppercase tracking-widest">{message}</p>
        <button
          onClick={onClose}
          className="ml-2 w-8 h-8 flex items-center justify-center rounded-xl hover:bg-black/5 transition-all active:scale-95"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

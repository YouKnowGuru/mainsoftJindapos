interface LoaderProps {
  message?: string;
}

/**
 * Loader Component - Loading spinner overlay
 */
export function Loader({ message = 'Loading...' }: LoaderProps) {
  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-[100] animate-in fade-in duration-300">
      <div className="bg-white/90 backdrop-blur-xl rounded-[40px] p-10 flex flex-col items-center gap-6 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] border border-white">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-slate-100 rounded-full"></div>
          <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-bhutan-maroon rounded-full animate-spin"></div>
        </div>
        <div className="text-center">
          <p className="text-xs font-black text-bhutan-maroon uppercase tracking-[0.3em]">{message}</p>
          <p className="text-[11px] font-black text-slate-300 uppercase tracking-widest mt-1">Jinda Core</p>
        </div>
      </div>
    </div>
  );
}

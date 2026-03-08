import { useState } from 'react';
import { Lock, User, Eye, EyeOff } from 'lucide-react';
import { Logo } from '../components/Logo';

interface LoginPageProps {
  onLogin: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
}

/**
 * LoginPage Component - User authentication screen
 */
export function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await onLogin(username, password);
      if (!result.success) {
        setError(result.message || 'Login failed');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-bhutan-maroon opacity-20 blur-[120px] rounded-full -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-bhutan-orange opacity-10 blur-[120px] rounded-full translate-x-1/2 translate-y-1/2"></div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo Section */}
        <div className="text-center mb-10 flex flex-col items-center">
          <Logo size="xl" className="mb-6" />
          <div className="inline-block p-4 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 mb-4 shadow-2xl">
            <h1 className="text-4xl font-black tracking-tighter text-white">
              <span className="text-bhutan-gold">Dhisum</span> Tseyig
            </h1>
          </div>
          <p className="text-slate-400 font-medium tracking-wide uppercase text-[10px]">Premium Accounting & POS Solution</p>
        </div>

        {/* Login Form */}
        <div className="glass-dark rounded-[32px] p-10 border border-white/10 shadow-3xl">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">
              Welcome
            </h2>
            <p className="text-slate-400 text-sm">Sign in to manage your business</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs font-bold flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
              <span className="w-1.5 h-1.5 bg-red-400 rounded-full"></span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username Field */}
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                Username
              </label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-bhutan-gold transition-colors" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-bhutan-gold/50 focus:border-bhutan-gold/50 text-white placeholder:text-slate-600 transition-all outline-none"
                  placeholder="admin"
                  required
                  autoFocus
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                Password
              </label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-bhutan-gold transition-colors" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-bhutan-gold/50 focus:border-bhutan-gold/50 text-white placeholder:text-slate-600 transition-all outline-none"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-bhutan-gold text-bhutan-maroon py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-white hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-bhutan-gold/10 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-3">
                  <span className="w-5 h-5 border-2 border-bhutan-maroon/30 border-t-bhutan-maroon rounded-full animate-spin"></span>
                  Verifying...
                </span>
              ) : (
                'Access System'
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-10 text-center space-y-2">
          <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">
            Precision Accounting • Security First • Local compliance
          </p>
        </div>
      </div>
    </div>
  );
}

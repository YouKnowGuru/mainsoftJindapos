import { useState, useEffect, useRef, useCallback } from 'react';
import { Shield, ArrowLeft, Mail, Loader2, AlertTriangle, CheckCircle, Lock } from 'lucide-react';
import { AuthService } from '../services/AuthService';

interface DeviceVerificationPageProps {
  email: string;
  deviceId?: string;
  deviceInfo?: {
    platform?: string;
    hostname?: string;
    username?: string;
  };
  onVerified: (tokens: any, user: any) => void;
  onBack: () => void;
}

/**
 * DeviceVerificationPage - OTP verification for new device login
 */
export function DeviceVerificationPage({
  email,
  deviceId,
  deviceInfo,
  onVerified,
  onBack,
}: DeviceVerificationPageProps) {
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [attemptsRemaining, setAttemptsRemaining] = useState(3);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutMinutes, setLockoutMinutes] = useState(0);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const maskedEmail = email ? `${email.substring(0, 3)}***@${email.split('@')[1]}` : '';

  // Cooldown timer for resend
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [resendCooldown]);

  const focusInput = useCallback((index: number) => {
    if (inputRefs.current[index]) {
      inputRefs.current[index]?.focus();
    }
  }, []);

  const handleOtpChange = (index: number, value: string) => {
    // Only allow digits
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];

    // Handle paste of full 6-digit code
    if (value.length > 1) {
      const digits = value.slice(0, 6).split('');
      for (let i = 0; i < 6; i++) {
        newOtp[i] = digits[i] || '';
      }
      setOtp(newOtp);
      // Focus last filled input or the 6th one
      focusInput(Math.min(digits.length, 6) - 1);
      return;
    }

    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      focusInput(index + 1);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      // Focus previous input on backspace
      focusInput(index - 1);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pastedData)) {
      handleOtpChange(0, pastedData);
    }
  };

  const handleVerify = async () => {
    const otpCode = otp.join('');

    if (otpCode.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await AuthService.verifyDevice({
        email,
        otp: otpCode,
        deviceId,
        deviceInfo,
      });

      if (!result.success) {
        // Handle lockout
        if (result.locked) {
          setIsLocked(true);
          setLockoutMinutes(result.retryAfter || 15);
          setError(result.error || 'Account locked due to too many failed attempts');
          return;
        }

        // Handle invalid OTP
        if (result.attemptsRemaining !== undefined) {
          setAttemptsRemaining(result.attemptsRemaining);
        }
        setError(result.error || 'Invalid verification code');

        // Clear OTP inputs
        setOtp(['', '', '', '', '', '']);
        focusInput(0);
        return;
      }

      // Success!
      setSuccess(true);

      // Call parent callback with tokens
      if (result.tokens && result.user) {
        onVerified(result.tokens, result.user);
      }
    } catch (err) {
      console.error('Device verification error:', err);
      setError('Failed to verify device. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!canResend) return;

    setIsLoading(true);
    setError('');
    setCanResend(false);
    setResendCooldown(30);

    try {
      const result = await AuthService.resendDeviceCode({
        email,
        deviceId,
        deviceInfo,
      });

      if (!result.success) {
        setError(result.error || 'Failed to resend code');
        setCanResend(true);
        return;
      }

      // Success
      setResendCooldown(result.retryAfter || 30);
    } catch (err) {
      console.error('Resend code error:', err);
      setError('Failed to resend code. Please try again.');
      setCanResend(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Lockout screen
  if (isLocked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-8 shadow-2xl">
            <div className="text-center">
              <div className="mx-auto w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
                <Lock className="w-10 h-10 text-red-500" />
              </div>

              <h2 className="text-2xl font-bold text-white mb-2">Too Many Failed Attempts</h2>
              <p className="text-slate-400 mb-6">
                For security, device verification is temporarily locked.
              </p>

              <div className="bg-slate-900/50 rounded-2xl p-6 mb-6">
                <div className="text-4xl font-bold text-red-500 mb-2">
                  {lockoutMinutes}:00
                </div>
                <p className="text-sm text-slate-400">
                  Please wait before trying again
                </p>
              </div>

              <div className="bg-slate-800/50 rounded-xl p-4 mb-6">
                <p className="text-xs text-slate-400 mb-2">
                  If you didn't attempt this login, please contact support:
                </p>
                <p className="text-sm text-white font-semibold">📧 support@jinda.com</p>
                <p className="text-sm text-white font-semibold">📞 +975 17XX XXXX</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Success screen
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-8 shadow-2xl">
            <div className="text-center">
              <div className="mx-auto w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6 animate-pulse">
                <CheckCircle className="w-10 h-10 text-emerald-500" />
              </div>

              <h2 className="text-2xl font-bold text-white mb-2">Device Approved!</h2>
              <p className="text-slate-400 mb-6">
                Your device has been verified and approved.
              </p>

              <div className="bg-slate-900/50 rounded-2xl p-6 mb-6">
                <p className="text-sm text-slate-300 mb-2">
                  You can now use this POS without re-verifying on this device.
                </p>
                <p className="text-xs text-slate-500">
                  Redirecting to dashboard...
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main verification screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back to Login</span>
        </button>

        <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-4">
              <Shield className="w-8 h-8 text-blue-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">New Device Detected</h2>
            <p className="text-slate-400 text-sm">
              For your security, please verify this device
            </p>
          </div>

          {/* Email info */}
          <div className="bg-slate-900/50 rounded-2xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-blue-500 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-400 mb-1">We sent a 6-digit code to:</p>
                <p className="text-sm text-white font-semibold">{maskedEmail}</p>
              </div>
            </div>
          </div>

          {/* OTP Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-300 mb-3">
              Enter verification code
            </label>
            <div className="flex gap-2 justify-center" onPaste={handlePaste}>
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => { inputRefs.current[index] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-12 h-14 text-center text-2xl font-bold bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  disabled={isLoading}
                />
              ))}
            </div>
          </div>

          {/* Attempts remaining */}
          {attemptsRemaining < 3 && attemptsRemaining > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <p className="text-xs text-amber-300">
                  {attemptsRemaining} attempt{attemptsRemaining !== 1 ? 's' : ''} remaining
                </p>
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4">
              <p className="text-xs text-red-300">{error}</p>
            </div>
          )}

          {/* Verify button */}
          <button
            onClick={handleVerify}
            disabled={isLoading || otp.join('').length !== 6}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 mb-4"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Verifying...
              </>
            ) : (
              'Verify Device'
            )}
          </button>

          {/* Resend code */}
          <div className="text-center">
            <p className="text-sm text-slate-400 mb-2">Didn't receive the code?</p>
            {canResend ? (
              <button
                onClick={handleResendCode}
                disabled={isLoading}
                className="text-blue-500 hover:text-blue-400 font-semibold text-sm transition-colors"
              >
                Resend Code
              </button>
            ) : (
              <p className="text-sm text-slate-500">
                Resend available in <span className="text-blue-500 font-semibold">{resendCooldown}s</span>
              </p>
            )}
          </div>
        </div>

        {/* Security notice */}
        <div className="mt-6 text-center">
          <p className="text-xs text-slate-500">
            This code expires in 5 minutes. If you didn't attempt this login, please contact support.
          </p>
        </div>
      </div>
    </div>
  );
}

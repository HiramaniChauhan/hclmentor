/**
 * Auth Page — Sign In / Sign Up / Forgot Password
 *
 * Flows:
 *   Sign Up:   name + email + password → Send OTP to email → Enter OTP → Account created
 *   Sign In:   email + password → logged in
 *   Forgot:    email → Send OTP to email → Enter OTP + new password → Password reset
 */

import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api, { sendOTP, resetPassword } from '../services/api';
import { Eye, EyeOff, Key, FileText, Lock, Mail, Check } from 'lucide-react';

// ── Password rules ────────────────────────────────────────────────────────────
const RULES = [
    { key: 'minLength', label: 'At least 8 characters', test: (p) => p.length >= 8 },
    { key: 'hasUpper', label: 'Uppercase letter (A–Z)', test: (p) => /[A-Z]/.test(p) },
    { key: 'hasLower', label: 'Lowercase letter (a–z)', test: (p) => /[a-z]/.test(p) },
    { key: 'hasDigit', label: 'Number (0–9)', test: (p) => /[0-9]/.test(p) },
    { key: 'hasSpecial', label: 'Special character (!@#$…)', test: (p) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(p) },
];

// ── Password Strength Meter ───────────────────────────────────────────────────
function PasswordStrengthMeter({ password }) {
    const passed = RULES.filter((r) => r.test(password)).length;
    const pct = (passed / RULES.length) * 100;
    const color = pct <= 40 ? '#ef4444' : pct <= 80 ? '#f59e0b' : '#22c55e';
    return (
        <div className="mt-2 space-y-2">
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: color }} />
            </div>
            <div className="grid grid-cols-2 gap-1">
                {RULES.map((r) => (
                    <span key={r.key} className={`text-[10px] flex items-center gap-1 ${r.test(password) ? 'text-emerald-400' : 'text-gray-600'}`}>
                        {r.test(password) ? '✓' : '○'} {r.label}
                    </span>
                ))}
            </div>
        </div>
    );
}

// ── OTP Input ─────────────────────────────────────────────────────────────────
function OTPInput({ value, onChange }) {
    return (
        <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-400">Enter 6-digit OTP</label>
            <input
                type="text"
                maxLength={6}
                value={value}
                onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-center
                           text-2xl tracking-[0.5em] font-mono text-white placeholder-gray-700
                           outline-none focus:border-brand-500 transition-colors"
            />
            <p className="text-[10px] text-gray-600 text-center">Check your email inbox (and spam folder)</p>
        </div>
    );
}

// ── Input Field (outside Auth to prevent focus loss on re-render) ─────────────
function Field({ label, type = 'text', value, onChange, placeholder }) {
    const [showPw, setShowPw] = useState(false);
    const isPassword = type === 'password';
    return (
        <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">{label}</label>
            <div className="relative">
                <input
                    type={isPassword && showPw ? 'text' : type}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm
                               text-white placeholder-gray-600 outline-none focus:border-brand-500
                               transition-colors pr-12"
                />
                {isPassword && value && (
                    <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowPw((s) => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500
                                   hover:text-gray-300 text-xs transition-colors"
                    >
                        {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                )}
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════════════════
export default function Auth() {
    // view: 'signin' | 'signup' | 'signup-otp' | 'forgot' | 'forgot-otp'
    const [view, setView] = useState('signin');

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');

    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const { user, login } = useAuth();
    const navigate = useNavigate();

    // Prevent authenticated users from staying on the auth page
    if (user) {
        return <Navigate to="/dashboard" replace />;
    }

    const allPassed = RULES.every((r) => r.test(password));
    const newAllPassed = RULES.every((r) => r.test(newPassword));

    const resetForm = () => {
        setName(''); setEmail(''); setPassword(''); setOtp(''); setNewPassword('');
        setError(''); setSuccess('');
    };
    const switchView = (v) => { resetForm(); setView(v); };

    // ── Sign In ───────────────────────────────────────────────────────────────
    const handleSignIn = async (e) => {
        e.preventDefault();
        setError(''); setLoading(true);
        try {
            const { data } = await api.post('/users/login', { email, password });
            login(data.user, data.token);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.error || 'Sign in failed');
        } finally { setLoading(false); }
    };

    // ── Sign Up step 1: send OTP ──────────────────────────────────────────────
    const handleSignUpSendOTP = async (e) => {
        e.preventDefault();
        if (!allPassed) { setError('Please meet all password requirements'); return; }
        setError(''); setLoading(true);
        try {
            await sendOTP(email, 'signup');
            setView('signup-otp');
            setSuccess(`OTP sent to ${email}`);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to send OTP');
        } finally { setLoading(false); }
    };

    // ── Sign Up step 2: verify + register ────────────────────────────────────
    const handleSignUpVerify = async (e) => {
        e.preventDefault();
        if (otp.length !== 6) { setError('Enter 6-digit OTP'); return; }
        setError(''); setLoading(true);
        try {
            const { data } = await api.post('/users/register', { name, email, password, otp });
            login(data.user, data.token);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.error || 'Verification failed');
        } finally { setLoading(false); }
    };

    // ── Forgot step 1: send OTP ───────────────────────────────────────────────
    const handleForgotSendOTP = async (e) => {
        e.preventDefault();
        setError(''); setLoading(true);
        try {
            await sendOTP(email, 'reset');
            setView('forgot-otp');
            setSuccess(`OTP sent to ${email}`);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to send OTP');
        } finally { setLoading(false); }
    };

    // ── Forgot step 2: verify + reset ─────────────────────────────────────────
    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (otp.length !== 6) { setError('Enter 6-digit OTP'); return; }
        if (!newAllPassed) { setError('Please meet all password requirements'); return; }
        setError(''); setLoading(true);
        try {
            const result = await resetPassword(email, otp, newPassword);
            setSuccess(result.message || 'Password reset! You can now sign in.');
            setTimeout(() => switchView('signin'), 2000);
        } catch (err) {
            setError(err.response?.data?.error || 'Reset failed');
        } finally { setLoading(false); }
    };

    // ── Resend OTP ────────────────────────────────────────────────────────────
    const handleResend = async () => {
        const purpose = view === 'signup-otp' ? 'signup' : 'reset';
        setError(''); setLoading(true);
        try {
            await sendOTP(email, purpose);
            setSuccess('New OTP sent to your email!');
        } catch (err) {
            setError(err.response?.data?.error || 'Resend failed');
        } finally { setLoading(false); }
    };

    // ══════════════════════════════════════════════════════════════════════════
    return (
        <div className="flex items-center justify-center min-h-[calc(100vh-72px)] px-4">
            <div className="glass-card w-full max-w-md p-8 animate-fade-in-up">

                {/* ── Title ── */}
                <div className="text-center mb-6">
                    <div className="flex justify-center text-brand-400 mb-4">
                        {view.startsWith('forgot') ? <Key size={36} /> : view.startsWith('signup') ? <FileText size={36} /> : <Lock size={36} />}
                    </div>
                    <h1 className="text-2xl font-bold gradient-text">
                        {view === 'signin' && 'Welcome Back'}
                        {view === 'signup' && 'Create Account'}
                        {view === 'signup-otp' && 'Verify Email'}
                        {view === 'forgot' && 'Forgot Password'}
                        {view === 'forgot-otp' && 'Reset Password'}
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {view === 'signin' && 'Sign in to continue studying'}
                        {view === 'signup' && 'Enter your details below'}
                        {view === 'signup-otp' && `We sent a code to ${email}`}
                        {view === 'forgot' && 'Enter your email to receive a reset code'}
                        {view === 'forgot-otp' && `Enter the code sent to ${email}`}
                    </p>
                </div>

                {/* ── Alerts ── */}
                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl px-4 py-2.5 text-sm mb-4">
                        {error}
                    </div>
                )}
                {success && (
                    <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl px-4 py-2.5 text-sm mb-4">
                        {success}
                    </div>
                )}

                {/* ════════  SIGN IN  ════════ */}
                {view === 'signin' && (
                    <form onSubmit={handleSignIn} className="space-y-4">
                        <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
                        <Field label="Password" type="password" value={password} onChange={setPassword} placeholder="••••••••" />

                        <button type="submit" disabled={loading || !email || !password}
                            className="btn-primary w-full py-3 mt-2">
                            {loading ? <><div className="spinner" /> Signing in…</> : 'Sign In'}
                        </button>

                        <div className="flex justify-between text-xs mt-3">
                            <button type="button" onClick={() => switchView('forgot')}
                                className="text-brand-400 hover:text-brand-300 transition-colors">
                                Forgot password?
                            </button>
                            <button type="button" onClick={() => switchView('signup')}
                                className="text-gray-400 hover:text-white transition-colors">
                                Create account →
                            </button>
                        </div>
                    </form>
                )}

                {/* ════════  SIGN UP — details  ════════ */}
                {view === 'signup' && (
                    <form onSubmit={handleSignUpSendOTP} className="space-y-4">
                        <Field label="Full Name" value={name} onChange={setName} placeholder="John Doe" />
                        <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
                        <div>
                            <Field label="Password" type="password" value={password} onChange={setPassword} placeholder="••••••••" />
                            {password && <PasswordStrengthMeter password={password} />}
                        </div>

                        <button type="submit" disabled={loading || !name || !email || !allPassed}
                            className="btn-primary flex justify-center items-center gap-2 w-full py-3 mt-2">
                            {loading ? <><div className="spinner" /> Sending OTP…</> : <><Mail size={16} /> Send Verification Code</>}
                        </button>

                        <p className="text-xs text-center text-gray-500">
                            Already have an account?{' '}
                            <button type="button" onClick={() => switchView('signin')}
                                className="text-brand-400 hover:text-brand-300">
                                Sign in
                            </button>
                        </p>
                    </form>
                )}

                {/* ════════  SIGN UP — OTP  ════════ */}
                {view === 'signup-otp' && (
                    <form onSubmit={handleSignUpVerify} className="space-y-5">
                        <OTPInput value={otp} onChange={setOtp} />

                        <button type="submit" disabled={loading || otp.length < 6}
                            className="btn-primary flex justify-center items-center gap-2 w-full py-3">
                            {loading ? <><div className="spinner" /> Verifying…</> : <><Check size={16} /> Verify & Create Account</>}
                        </button>

                        <div className="flex justify-between text-xs">
                            <button type="button" onClick={() => switchView('signup')}
                                className="text-gray-500 hover:text-white transition-colors">
                                ← Back
                            </button>
                            <button type="button" onClick={handleResend} disabled={loading}
                                className="text-brand-400 hover:text-brand-300 transition-colors">
                                Resend OTP
                            </button>
                        </div>
                    </form>
                )}

                {/* ════════  FORGOT — email  ════════ */}
                {view === 'forgot' && (
                    <form onSubmit={handleForgotSendOTP} className="space-y-4">
                        <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />

                        <button type="submit" disabled={loading || !email} className="btn-primary flex justify-center items-center gap-2 w-full py-3">
                            {loading ? <><div className="spinner" /> Sending…</> : <><Mail size={16} /> Send Reset Code</>}
                        </button>

                        <p className="text-xs text-center">
                            <button type="button" onClick={() => switchView('signin')}
                                className="text-gray-500 hover:text-white transition-colors">
                                ← Back to Sign In
                            </button>
                        </p>
                    </form>
                )}

                {/* ════════  FORGOT — OTP + new password  ════════ */}
                {view === 'forgot-otp' && (
                    <form onSubmit={handleResetPassword} className="space-y-5">
                        <OTPInput value={otp} onChange={setOtp} />
                        <div>
                            <Field label="New Password" type="password" value={newPassword} onChange={setNewPassword} placeholder="••••••••" />
                            {newPassword && <PasswordStrengthMeter password={newPassword} />}
                        </div>

                        <button type="submit" disabled={loading || otp.length < 6 || !newAllPassed}
                            className="btn-primary flex justify-center items-center gap-2 w-full py-3">
                            {loading ? <><div className="spinner" /> Resetting…</> : <><Key size={16} /> Reset Password</>}
                        </button>

                        <div className="flex justify-between text-xs">
                            <button type="button" onClick={() => switchView('forgot')}
                                className="text-gray-500 hover:text-white transition-colors">
                                ← Back
                            </button>
                            <button type="button" onClick={handleResend} disabled={loading}
                                className="text-brand-400 hover:text-brand-300 transition-colors">
                                Resend OTP
                            </button>
                        </div>
                    </form>
                )}

            </div>
        </div>
    );
}

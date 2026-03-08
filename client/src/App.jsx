/**
 * App Component — HCL Institute Study Platform
 */

import { BrowserRouter, Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ExamProvider, useExam } from './context/ExamContext';
import Home from './pages/Home';
import Solve from './pages/Solve';
import Chat from './pages/Chat';
import Practice from './pages/Practice';
import Dashboard from './pages/Dashboard';
import Auth from './pages/Auth';

const NAV_ITEMS = [
    { to: '/', label: 'Home', icon: '🏠' },
    { to: '/solve', label: 'Solve', icon: '📸' },
    { to: '/chat', label: 'Chat', icon: '💬' },
    { to: '/practice', label: 'Practice', icon: '📝' },
    { to: '/dashboard', label: 'Dashboard', icon: '📊' },
];

function RequireAuth({ children }) {
    const { user, loading } = useAuth();
    if (loading) return null;
    return user ? children : <Navigate to="/auth" replace />;
}

// ── Footer ────────────────────────────────────────────────────────────────────
function Footer() {
    return (
        <footer className="border-t border-white/5 bg-[#0a090f] mt-auto">
            <div className="max-w-7xl mx-auto px-6 py-12">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">

                    {/* Brand */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <img src="/hcl-logo.png" alt="HCL Institute" className="w-12 h-12 rounded-full object-cover" />
                            <div>
                                <p className="font-bold text-white text-lg leading-tight">HCL Institute</p>
                            </div>
                        </div>
                        <div className="bg-white/5 rounded-xl p-4 space-y-1 border border-white/5">
                            <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Mentor</p>
                            <p className="text-white font-semibold">HIRAMANI CHAUHAN</p>
                            <div className="flex items-center gap-2">
                                <span className="text-xs bg-brand-500/20 text-brand-300 border border-brand-500/30 px-2 py-0.5 rounded-full font-medium">
                                    🏆 AIR 06 — NIMCET
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <p className="text-xs text-gray-500 uppercase tracking-widest mb-4">Quick Links</p>
                        <div className="space-y-2">
                            {NAV_ITEMS.map((item) => (
                                <NavLink key={item.to} to={item.to}
                                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
                                    <span>{item.icon}</span> {item.label}
                                </NavLink>
                            ))}
                        </div>
                    </div>

                    {/* Contact & Social */}
                    <div>
                        <p className="text-xs text-gray-500 uppercase tracking-widest mb-4">Connect</p>
                        <div className="space-y-3">
                            {/* YouTube */}
                            <a href="https://www.youtube.com/@HCLInstitute" target="_blank" rel="noreferrer"
                                className="flex items-center gap-3 text-sm text-gray-400 hover:text-red-400 transition-colors group">
                                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                                </svg>
                                <span>YouTube — @HCLInstitute</span>
                            </a>
                            {/* Instagram */}
                            <a href="https://www.instagram.com/gangaa_maa_ka_ladlaa_2399/" target="_blank" rel="noreferrer"
                                className="flex items-center gap-3 text-sm text-gray-400 hover:text-pink-400 transition-colors">
                                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
                                </svg>
                                <span>Instagram</span>
                            </a>
                            {/* LinkedIn */}
                            <a href="https://www.linkedin.com/in/hiramani-chauhan-768639313/" target="_blank" rel="noreferrer"
                                className="flex items-center gap-3 text-sm text-gray-400 hover:text-blue-400 transition-colors">
                                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                                </svg>
                                <span>LinkedIn — Hiramani Chauhan</span>
                            </a>
                            {/* Phone */}
                            {/* <a href="tel:+916392387678"
                                className="flex items-center gap-3 text-sm text-gray-400 hover:text-emerald-400 transition-colors">
                                <span className="text-xl">📞</span>
                                <span>+91-6392387678</span>
                            </a> */}
                            {/* Email */}
                            <a href="mailto:hclinstitute.official@gmail.com"
                                className="flex items-center gap-3 text-sm text-gray-400 hover:text-brand-400 transition-colors">
                                <span className="text-xl">✉️</span>
                                <span>hclinstitute.official@gmail.com</span>
                            </a>
                        </div>
                    </div>
                </div>

                {/* Bottom bar */}
                <div className="mt-10 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-600">
                    <p>© {new Date().getFullYear()} HCL Institute · All rights reserved</p>
                    {/* <p>Built by <span className="text-brand-400">Hiramani Chauhan</span> · AIR 06 NIMCET</p> */}
                </div>
            </div>
        </footer>
    );
}

// ── AppLayout ─────────────────────────────────────────────────────────────────
function AppLayout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        // Force a hard refresh and redirect to /auth to clear all React state
        window.location.assign('/auth');
    };

    const { examActive } = useExam();

    return (
        <div className="flex flex-col min-h-screen">
            {/* Navbar — hidden during exam */}
            {!examActive && (
                <nav className="sticky top-0 z-50 backdrop-blur-xl bg-[#0f0e17]/80 border-b border-white/5">
                    <div className="max-w-7xl mx-auto px-4 h-[72px] flex items-center justify-between">
                        {/* Logo */}
                        <NavLink to="/" className="flex items-center gap-2.5">
                            <img
                                src="/hcl-logo.png"
                                alt="HCL Institute"
                                className="w-14 h-14 rounded-full object-cover shadow-lg shadow-brand-500/20"
                            />
                            <span className="text-lg font-bold text-white hidden sm:inline">HCL Institute</span>
                        </NavLink>

                        {/* Center Nav Links */}
                        <div className="flex items-center gap-1">
                            {NAV_ITEMS.map((item) => (
                                <NavLink
                                    key={item.to}
                                    to={item.to}
                                    end={item.to === '/'}
                                    className={({ isActive }) =>
                                        `flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${isActive
                                            ? 'bg-brand-500/15 text-brand-300'
                                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                                        }`
                                    }
                                >
                                    <span className="text-base">{item.icon}</span>
                                    <span className="hidden md:inline">{item.label}</span>
                                </NavLink>
                            ))}
                        </div>

                        {/* Auth Button */}
                        <div className="flex items-center gap-3">
                            {user ? (
                                <>
                                    <span className="text-sm text-gray-400 hidden sm:inline">
                                        👋 <span className="text-brand-300 font-medium">{user.name}</span>
                                    </span>
                                    <button onClick={handleLogout} className="btn-secondary text-xs px-3 py-2">
                                        Sign Out
                                    </button>
                                </>
                            ) : (
                                <NavLink to="/auth" className="btn-primary text-xs px-4 py-2">
                                    Sign In
                                </NavLink>
                            )}
                        </div>
                    </div>
                </nav>
            )}

            {/* Pages */}
            <main className="flex-1">
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/solve" element={<RequireAuth><Solve /></RequireAuth>} />
                    <Route path="/chat" element={<RequireAuth><Chat /></RequireAuth>} />
                    <Route path="/practice" element={<RequireAuth><Practice /></RequireAuth>} />
                    <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
                </Routes>
            </main>

            {/* Footer — hidden during exam */}
            {!examActive && <Footer />}
        </div>
    );
}

export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <ExamProvider>
                    <AppLayout />
                </ExamProvider>
            </AuthProvider>
        </BrowserRouter>
    );
}

/**
 * Home Page — HCL Institute
 * Animated math/study symbols background + Hero + Feature Cards
 */

import { Link } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { Camera, MessageCircle, FileText, BarChart2 } from 'lucide-react';

// ── Math symbols that fall in the background ──────────────────────────────────
const SYMBOLS = [
    // Greek
    'α', 'β', 'γ', 'δ', 'ε', 'ζ', 'η', 'θ', 'ι', 'κ', 'λ', 'μ', 'ν', 'ξ', 'π', 'ρ', 'σ', 'τ', 'υ', 'φ', 'χ', 'ψ', 'ω',
    'Γ', 'Δ', 'Θ', 'Λ', 'Ξ', 'Π', 'Σ', 'Υ', 'Φ', 'Ψ', 'Ω',
    // Calculus
    '∫', '∬', '∭', '∮', '∂', '∇', '∞', '∑', '∏', '√', '∛',
    'dx', 'dy', 'dz', 'dt', 'd/dx', '∂f', '∂x', 'lim', '→0', '→∞', 'sup', 'inf',
    // Algebra
    '+', '−', '×', '÷', '=', '≠', '≈', '≡', '≤', '≥', '<', '>', '±',
    'x²', 'x³', 'xⁿ', 'e²', '2ⁿ', 'n!', 'ⁿCᵣ', 'ⁿPᵣ', '∝', '∼', '≅',
    // Famous equations
    'E=mc²', 'F=ma', 'a²+b²=c²', 'eⁱᵖ+1=0',
    'PV=nRT', 'v=u+at', 's=½at²', 'F=kq²/r²',
    'P=IV', 'V=IR', 'W=Fd', 'KE=½mv²',
    'A=πr²', 'C=2πr', 'V=4/3πr³',
    // Trig
    'sinθ', 'cosθ', 'tanθ', 'sin²+cos²=1',
    'sec', 'csc', 'cot', 'arcsin', 'arccos', 'arctan',
    // Log & Exp
    'log', 'ln', 'logₐb', 'eˣ', '2ˣ', '10ˣ',
    // Sets & Logic
    '∈', '∉', '⊂', '⊄', '⊆', '∪', '∩', '∅', '⊕',
    '∀', '∃', '¬', '∧', '∨', '⇒', '⇔', '≡',
    // Number theory / constants
    '0', '1', '1', '2', '3', '5', '8', '13', '21', '34',
    'ϕ=1.618', 'e=2.718', 'π=3.14', '√2=1.41',
    // Linear algebra
    '[A]', 'det', 'rank', 'trace', 'eigenλ', 'span', 'Ax=b', '||v||', 'ker', 'im',
    // CS / Discrete
    'O(n)', 'O(logn)', 'O(n²)', 'O(2ⁿ)',
    'P∧Q', 'P∨Q', '¬P', 'XOR', 'NOR', 'NAND',
    '∑aᵢ', '∏bᵢ', '⌊x⌋', '⌈x⌉',
    // Stats
    'P(A|B)', 'μ', 'σ²', 'E[X]', 'Var', 'Cov', 'N(0,1)', 'χ²', 'β₀', 'β₁',
    // Stats
    'P(A|B)', 'μ', 'σ²', 'E[X]', 'Var', 'Cov', 'N(0,1)', 'χ²', 'β₀', 'β₁',
];

// ── Canvas animation ──────────────────────────────────────────────────────────
function MathRain() {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        let width = canvas.offsetWidth;
        let height = canvas.offsetHeight;
        canvas.width = width;
        canvas.height = height;

        // Create particles
        const particles = Array.from({ length: 220 }, () => ({
            x: Math.random() * width,
            y: Math.random() * height - height,
            symbol: SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
            speed: 0.4 + Math.random() * 1.2,
            size: 10 + Math.random() * 18,
            opacity: 0.06 + Math.random() * 0.18,
            drift: (Math.random() - 0.5) * 0.3,
            rotation: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 0.02,
        }));

        let animId;

        function draw() {
            ctx.clearRect(0, 0, width, height);

            for (const p of particles) {
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rotation);
                ctx.globalAlpha = p.opacity;
                ctx.fillStyle = p.opacity > 0.15 ? '#8b5cf6' : '#60a5fa';
                ctx.font = `${p.size}px 'Courier New', monospace`;
                ctx.textAlign = 'center';
                ctx.fillText(p.symbol, 0, 0);
                ctx.restore();

                p.y += p.speed;
                p.x += p.drift;
                p.rotation += p.rotSpeed;

                // Reset when off-screen
                if (p.y > height + 40) {
                    p.y = -40;
                    p.x = Math.random() * width;
                    p.symbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
                }
                if (p.x < -40) p.x = width + 40;
                if (p.x > width + 40) p.x = -40;
            }

            animId = requestAnimationFrame(draw);
        }

        draw();

        // Handle resize
        const onResize = () => {
            width = canvas.offsetWidth;
            height = canvas.offsetHeight;
            canvas.width = width;
            canvas.height = height;
        };
        window.addEventListener('resize', onResize);

        return () => {
            cancelAnimationFrame(animId);
            window.removeEventListener('resize', onResize);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 w-full h-full pointer-events-none"
            style={{ zIndex: 0 }}
        />
    );
}

// ── Feature cards ─────────────────────────────────────────────────────────────
const FEATURES = [
    {
        icon: <Camera size={28} className="text-white" />,
        title: 'Image Solver',
        desc: 'Upload a photo of any math problem and get a step-by-step solution powered by Amazon Nova.',
        to: '/solve',
        color: 'from-violet-600 to-indigo-600',
    },
    {
        icon: <MessageCircle size={28} className="text-white" />,
        title: 'AI Chat Tutor',
        desc: 'Ask questions, clarify doubts, and learn concepts with your personal AI mentor.',
        to: '/chat',
        color: 'from-cyan-600 to-blue-600',
    },
    {
        icon: <FileText size={28} className="text-white" />,
        title: 'Practice Tests',
        desc: 'Generate topic-wise MCQ tests instantly. Track your score and review explanations.',
        to: '/practice',
        color: 'from-emerald-600 to-teal-600',
    },
    {
        icon: <BarChart2 size={28} className="text-white" />,
        title: 'Performance Dashboard',
        desc: 'View accuracy by topic, spot weak areas, and get AI-powered study recommendations.',
        to: '/dashboard',
        color: 'from-amber-600 to-orange-600',
    },
];

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Home() {
    return (
        <div className="relative min-h-[calc(100vh-72px)] overflow-hidden">
            {/* Animated Background */}
            <MathRain />

            {/* Gradient overlay so content stays readable */}
            <div className="fixed inset-0 pointer-events-none" style={{
                zIndex: 1,
                background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(139,92,246,0.08) 0%, transparent 70%)'
            }} />

            {/* Content */}
            <div className="relative" style={{ zIndex: 2 }}>
                {/* Hero */}
                <section className="text-center py-24 px-4">
                    <div className="animate-fade-in-up">
                        {/* Logo */}
                        <div className="flex justify-center mb-6">
                            <img
                                src="/hcl-logo.png"
                                alt="HCL Institute"
                                className="w-28 h-28 rounded-full object-cover shadow-2xl shadow-brand-500/30
                                           ring-2 ring-brand-500/30 animate-pulse"
                                style={{ animationDuration: '3s' }}
                            />
                        </div>

                        <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase
                               bg-brand-500/15 text-brand-300 border border-brand-500/25 mb-6">
                            Founded By Hiramani Chauhan
                        </span>

                        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-tight mb-6">
                            <span className="text-white">HCL Institute</span>
                            <br />
                            <span className="text-white/75 text-3xl sm:text-4xl lg:text-5xl font-semibold">
                                AI Study Mentor
                            </span>
                        </h1>

                        <p className="max-w-2xl mx-auto text-lg text-gray-400 leading-relaxed mb-10">
                            Your intelligent companion for{' '}
                            <strong className="text-gray-200">School</strong>,{' '}
                            <strong className="text-gray-200">College</strong>{' '}
                            <strong className="text-gray-200">Exams</strong> preparation.
                            Solve questions from images, chat with an AI tutor,
                            generate practice tests, and track your progress — all in one place.
                        </p>

                        <div className="flex flex-wrap justify-center gap-4">
                            <Link to="/solve" className="btn-primary text-lg px-8 py-4">
                                Start Solving
                            </Link>
                            <Link to="/practice" className="btn-secondary text-lg px-8 py-4">
                                Take a Test
                            </Link>
                        </div>
                    </div>
                </section>

                {/* Feature Cards */}
                <section className="max-w-6xl mx-auto px-4 pb-28">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        {FEATURES.map((f, i) => (
                            <Link
                                key={f.to}
                                to={f.to}
                                className="glass-card p-6 group hover:scale-[1.03] transition-all duration-300 animate-fade-in-up"
                                style={{ animationDelay: `${0.1 + i * 0.1}s` }}
                            >
                                <div
                                    className={`w-14 h-14 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center
                                    text-2xl mb-4 group-hover:scale-110 transition-transform`}
                                >
                                    {f.icon}
                                </div>
                                <h3 className="text-lg font-bold text-white mb-2">{f.title}</h3>
                                <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
                            </Link>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
}

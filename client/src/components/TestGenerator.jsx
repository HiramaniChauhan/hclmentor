/**
 * TestGenerator Component — Standard Competitive Exam Interface
 *
 * Phases:
 *  1. Setup  — free-text topic, question count, mins per question
 *  2. Exam   — GATE/JEE style: question left, navigator panel right
 *  3. Result — score + per-question breakdown
 *
 * Question statuses:
 *   'not-visited'   — grey  — never opened
 *   'not-answered'  — red   — opened but no selection
 *   'answered'      — green — answer saved
 *   'marked'        — purple — marked for review (no answer)
 *   'answered-marked' — purple-green — answered + marked for review
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import MathText from './MathText';
import { generateTest, submitAttempt } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useExam } from '../context/ExamContext';
import { AlertTriangle, FileText, Clock, HelpCircle, Activity, Zap, Monitor, Maximize, ChevronRight, ChevronLeft, Bookmark, Save, X, Award, ThumbsUp, Flame, RefreshCw, CheckCircle2, XCircle, SkipForward } from 'lucide-react';

// ── Color map for question navigator bubbles ─────────────────────────────────
const STATUS_STYLE = {
    'not-visited': 'bg-gray-700 text-gray-300',
    'not-answered': 'bg-red-600 text-white',
    'answered': 'bg-emerald-600 text-white',
    'marked': 'bg-purple-600 text-white',
    'answered-marked': 'bg-purple-500 border-2 border-emerald-400 text-white',
};

// ── CountdownRing ─────────────────────────────────────────────────────────────
function CountdownRing({ seconds, totalSeconds }) {
    const r = 22;
    const circ = 2 * Math.PI * r;
    const pct = Math.max(0, seconds / totalSeconds);
    const color =
        seconds <= 10 ? '#ef4444'
            : pct <= 0.3 ? '#f59e0b'
                : '#8b5cf6';

    return (
        <div className="relative flex items-center justify-center w-14 h-14 shrink-0">
            <svg className="-rotate-90" width="56" height="56">
                <circle cx="28" cy="28" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
                <circle
                    cx="28" cy="28" r={r}
                    fill="none"
                    stroke={color}
                    strokeWidth="5"
                    strokeDasharray={`${pct * circ} ${circ}`}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dasharray 0.9s linear, stroke 0.3s' }}
                />
            </svg>
            <span className="absolute text-xs font-bold" style={{ color }}>
                {seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m`}
            </span>
        </div>
    );
}

// ── Legend item ───────────────────────────────────────────────────────────────
function LegendDot({ cls, label }) {
    return (
        <span className="flex items-center gap-1.5 text-[10px] text-gray-400">
            <span className={`w-4 h-4 rounded-full ${cls} shrink-0`} />
            {label}
        </span>
    );
}

// ════════════════════════════════════════════════════════════════════════════
export default function TestGenerator() {
    const { user } = useAuth();
    const { setExamActive } = useExam();

    /* ── Setup state ── */
    const [topic, setTopic] = useState('');
    const [count, setCount] = useState(5);
    const [totalMins, setTotalMins] = useState(30); // total exam duration in minutes

    /* ── Exam state ── */
    const [phase, setPhase] = useState('setup'); // setup | exam | result
    const [questions, setQuestions] = useState([]);
    const [testId, setTestId] = useState(null);
    const [current, setCurrent] = useState(0);

    // per-question state maps: { [index]: value }
    const [answers, setAnswers] = useState({});     // selected letter
    const [statuses, setStatuses] = useState({});     // STATUS enum
    const [totalTimeLeft, setTotalTimeLeft] = useState(0);
    const totalTimerRef = useRef();

    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Draft answer: selected visually but NOT saved until Save & Next is clicked
    const [draftAnswer, setDraftAnswer] = useState('');

    // Signal to AppLayout to hide navbar/footer during exam
    useEffect(() => {
        setExamActive(phase === 'exam');
        return () => setExamActive(false);
    }, [phase, setExamActive]);

    /* ── Proctoring ── */
    const [violations, setViolations] = useState(0);
    const [violationMsg, setViolationMsg] = useState('');
    const MAX_VIOLATIONS = 3;
    const violationsRef = useRef(0);   // sync ref for event callbacks

    /* ── Navigator panel ── */
    const [navOpen, setNavOpen] = useState(true);

    const finishTestRef = useRef(null);

    /* ── Total test timer ───────────────────────────────────────────────────── */
    useEffect(() => {
        if (phase === 'exam' && totalTimeLeft > 0) {
            clearInterval(totalTimerRef.current);
            totalTimerRef.current = setInterval(() => {
                setTotalTimeLeft((t) => {
                    if (t <= 1) {
                        clearInterval(totalTimerRef.current);
                        // small delay to avoid calling finish mid-render
                        setTimeout(() => finishTestRef.current?.(), 100);
                        return 0;
                    }
                    return t - 1;
                });
            }, 1000);
            return () => clearInterval(totalTimerRef.current);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [phase, totalTimeLeft > 0]);

    // Reset draft to the already-saved answer whenever the current question changes
    useEffect(() => {
        setDraftAnswer(answers[current] ?? '');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [current]);

    /* ── Finish ──────────────────────────────────────────────────────────────── */
    const finishTest = useCallback((answerOverrides = {}) => {
        clearInterval(totalTimerRef.current);
        if (document.fullscreenElement) document.exitFullscreen?.();
        let score = 0;
        const merged = { ...answers, ...answerOverrides };
        const answerDetails = questions.map((q, i) => {
            const selected = merged[i] ?? '';
            const correct = selected === q.correctAnswer;
            if (correct) score++;
            return { questionIndex: i, selectedAnswer: selected, isCorrect: correct };
        });
        const attemptResult = { score, total: questions.length, answers: answerDetails };
        setResult(attemptResult);
        setPhase('result');
        submitAttempt({ testId, topic, userId: user?.id ?? null, ...attemptResult }).catch((e) => {
            console.error('submitAttempt failed:', e?.response?.data || e);
        });
    }, [questions, answers, testId, topic, user?.id]);

    /* ── Always keep ref current ── */
    finishTestRef.current = finishTest;

    /* ── Fullscreen ───────────────────────────────────────────────────── */
    const [needsFullscreen, setNeedsFullscreen] = useState(false);
    const needsFullscreenRef = useRef(false);
    needsFullscreenRef.current = needsFullscreen;
    const lastViolationTime = useRef(0);
    const examRef = useRef(null);

    const enterFullscreen = () => {
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen()
                .then(() => setNeedsFullscreen(false))
                .catch(err => console.warn('FS blocked:', err));
        } else if (document.documentElement.webkitRequestFullscreen) {
            document.documentElement.webkitRequestFullscreen();
            setNeedsFullscreen(false);
        }
    };

    /* ── Proctoring — violation detection ─────────────────────────────────────── */
    useEffect(() => {
        if (phase !== 'exam') return;

        const recordViolation = (reason) => {
            const now = Date.now();
            if (now - lastViolationTime.current < 1500) return; // debounce
            lastViolationTime.current = now;

            violationsRef.current += 1;
            const count = violationsRef.current;
            setViolations(count);

            if (count >= MAX_VIOLATIONS) {
                setViolationMsg(<><AlertTriangle size={16} className="inline mr-1" /> Test auto-submitted: too many violations!</>);
                finishTest();
            } else {
                setViolationMsg(`⚠️ Warning ${count}/${MAX_VIOLATIONS}: ${reason}. Auto-submit on 3rd.`);
            }
        };

        const onFsChange = () => {
            if (!document.fullscreenElement) {
                recordViolation('Fullscreen exited');
                setNeedsFullscreen(true);
            }
        };

        const onVisibility = () => {
            if (document.hidden) recordViolation('Tab switched away');
        };

        document.addEventListener('fullscreenchange', onFsChange);
        document.addEventListener('visibilitychange', onVisibility);
        return () => {
            document.removeEventListener('fullscreenchange', onFsChange);
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, [phase, finishTest]);

    /* ── Generate ────────────────────────────────────────────────────────────── */
    const handleGenerate = async () => {
        if (!topic.trim()) { setError('Please enter a topic.'); return; }
        setLoading(true);
        setError('');
        try {
            const data = await generateTest(topic.trim(), count, user?.id);
            if (data.test?.questions?.length) {
                const qs = data.test.questions;
                setQuestions(qs);
                setTestId(data.test.testId);
                setAnswers({});
                setDraftAnswer('');
                setStatuses(Object.fromEntries(qs.map((_, i) => [i, 'not-visited'])));
                setCurrent(0);
                setViolations(0);
                violationsRef.current = 0;
                lastViolationTime.current = 0;
                setViolationMsg('');
                setTotalTimeLeft(Math.round(totalMins * 60));
                setNeedsFullscreen(true); // prompt user to click fullscreen
                setPhase('exam');
            } else {
                setError('AI could not generate questions. Try a different topic.');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to generate test. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    /* ── Jump to question ──────────────────────────────────────────── */
    const jumpTo = (idx) => {
        // Mark current as 'not-answered' if visited but no answer
        setStatuses((prev) => {
            const cur = prev[current];
            if (cur === 'not-visited') {
                return { ...prev, [current]: answers[current] ? 'answered' : 'not-answered' };
            }
            return prev;
        });
        setCurrent(idx);
    };

    /* ── Picking an answer — only updates the visual draft, NOT saved yet ── */
    const pickAnswer = (letter) => {
        setDraftAnswer(letter);
    };

    /* ── Save & Next — commits draft then moves to next question (never submits) ── */
    const handleSaveNext = (autoAdvance = false) => {
        const sel = draftAnswer;

        setAnswers((prev) => {
            if (sel) return { ...prev, [current]: sel };
            const n = { ...prev }; delete n[current]; return n;
        });

        setStatuses((prev) => {
            const cur = prev[current];
            let next = cur;
            if (sel) {
                next = cur === 'marked' || cur === 'answered-marked' ? 'answered-marked' : 'answered';
            } else {
                next = cur === 'marked' ? 'marked' : 'not-answered';
            }
            return { ...prev, [current]: next };
        });

        const nextIdx = current + 1;
        if (nextIdx < questions.length) {
            setCurrent(nextIdx);
        }
        // On last question: do NOT auto-submit — user must click Submit Test explicitly
    };

    /* ── Save Only — commits draft for current question, stays on it ─────────── */
    const handleSaveOnly = () => {
        const sel = draftAnswer;
        setAnswers((prev) => {
            if (sel) return { ...prev, [current]: sel };
            const n = { ...prev }; delete n[current]; return n;
        });
        setStatuses((prev) => {
            const cur = prev[current];
            const next = sel
                ? (cur === 'marked' || cur === 'answered-marked' ? 'answered-marked' : 'answered')
                : (cur === 'marked' ? 'marked' : 'not-answered');
            return { ...prev, [current]: next };
        });
    };

    /* ── Mark for Review ─────────────────────────────────────────────────────── */
    const handleMarkReview = () => {
        setStatuses((prev) => {
            const sel = answers[current];
            return { ...prev, [current]: sel ? 'answered-marked' : 'marked' };
        });
    };

    /* ── Save & Mark ─────────────────────────────────────────────────────────── */
    const handleSaveMarkNext = () => {
        const sel = draftAnswer;
        setAnswers((prev) => {
            if (sel) return { ...prev, [current]: sel };
            const n = { ...prev }; delete n[current]; return n;
        });
        setStatuses((prev) => ({ ...prev, [current]: sel ? 'answered-marked' : 'marked' }));
        const nextIdx = current + 1;
        if (nextIdx < questions.length) {
            setCurrent(nextIdx);
        }
    };

    /* ── Clear response — removes draft AND any previously saved answer ──────── */
    const handleClear = () => {
        setDraftAnswer('');
        setAnswers((prev) => { const n = { ...prev }; delete n[current]; return n; });
        setStatuses((prev) => ({ ...prev, [current]: 'not-answered' }));
    };

    const reset = () => {
        clearInterval(totalTimerRef.current);
        setPhase('setup');
        setQuestions([]);
        setAnswers({});
        setDraftAnswer('');
        setStatuses({});
        setResult(null);
        setError('');
        setCurrent(0);
        setViolations(0);
        violationsRef.current = 0;
        setViolationMsg('');
        setTotalTimeLeft(0);
    };

    const letterOf = (opt) => opt?.charAt(0);

    // Status counts for legend
    const statusCounts = questions.length
        ? {
            answered: Object.values(statuses).filter((s) => s === 'answered' || s === 'answered-marked').length,
            marked: Object.values(statuses).filter((s) => s === 'marked' || s === 'answered-marked').length,
            notAnswered: Object.values(statuses).filter((s) => s === 'not-answered').length,
            notVisited: Object.values(statuses).filter((s) => s === 'not-visited').length,
        }
        : {};

    // ════════════════════════════════════════════════════════════════════════════
    // PHASE: SETUP
    // ════════════════════════════════════════════════════════════════════════════
    if (phase === 'setup') {
        return (
            <div className="max-w-xl mx-auto px-4 py-16 animate-fade-in-up">
                <div className="glass-card p-8 space-y-6">
                    <div className="text-center">
                        <FileText size={48} className="mx-auto mb-3 text-brand-400" />
                        <h2 className="text-2xl font-bold gradient-text">Start a Practice Test</h2>
                        <p className="text-sm text-gray-400 mt-1">Enter topic, questions, and total test time.</p>
                    </div>
                    {error && <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl px-4 py-2.5 text-sm">{error}</div>}

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1.5">Topic</label>
                        <input
                            type="text" value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                            placeholder="e.g. Calculus, Organic Chemistry, Indian History…"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm
                         text-white placeholder-gray-500 outline-none focus:border-brand-500 transition-colors"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1.5">No. of Questions</label>
                            <input type="number" min={1} max={50} value={count}
                                onChange={(e) => setCount(Math.min(50, Math.max(1, Number(e.target.value))))}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-brand-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1.5">Total Time (minutes)</label>
                            <input type="number" min={1} max={180} step={5} value={totalMins}
                                onChange={(e) => setTotalMins(Math.min(180, Math.max(1, Number(e.target.value))))}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-brand-500" />
                        </div>
                    </div>

                    <div className="flex justify-between text-xs text-gray-500 bg-white/3 rounded-xl px-4 py-3">
                        <span><Clock size={16} className="inline mr-1 text-gray-400" /> Total Time: <b className="text-gray-300">{totalMins} min</b></span>
                        <span><HelpCircle size={16} className="inline mr-1 text-gray-400" /> Questions: <b className="text-gray-300">{count}</b></span>
                        <span><Activity size={16} className="inline mr-1 text-gray-400" /> Avg per Q: <b className="text-gray-300">{(totalMins / count).toFixed(1)} min</b></span>
                    </div>

                    <button onClick={handleGenerate} disabled={loading || !topic.trim()} className="btn-primary w-full py-4 text-base">
                        {loading ? <><div className="spinner" /> Generating…</> : <><Zap size={16} className="inline mr-2" /> Generate & Start Test</>}
                    </button>
                </div>
            </div>
        );
    }

    // ════════════════════════════════════════════════════════════════════════════
    // PHASE: EXAM  (full-window, two-panel)
    // ════════════════════════════════════════════════════════════════════════════
    if (phase === 'exam') {
        const q = questions[current];
        const selected = draftAnswer; // visual selection = draft only (not yet saved)

        return (
            <div ref={examRef} className="fixed inset-0 bg-[#09080f] flex flex-col z-40">

                {/* ── Fullscreen prompt overlay ── */}
                {needsFullscreen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
                        <div className="glass-card p-10 text-center space-y-5 max-w-sm mx-4">
                            <Monitor size={48} className="mx-auto mb-2 text-gray-400" />
                            <h2 className="text-xl font-bold text-white">Fullscreen Required</h2>
                            <p className="text-sm text-gray-400">
                                This test runs in fullscreen mode.<br />
                                Exiting fullscreen or switching tabs will count as a violation.<br />
                                <span className="text-red-400 font-semibold">3 violations = auto-submit.</span>
                            </p>
                            <button
                                onClick={enterFullscreen}
                                className="btn-primary w-full py-4 text-base"
                            >
                                <Maximize size={16} className="inline mr-2" /> Enter Fullscreen &amp; Start
                            </button>
                        </div>
                    </div>
                )}

                {/* ── Violation warning banner ── */}
                {violationMsg && (
                    <div className={`shrink-0 px-5 py-2 text-sm font-semibold text-center
                        ${violations >= MAX_VIOLATIONS
                            ? 'bg-red-600 text-white'
                            : 'bg-amber-500/20 border-b border-amber-500/40 text-amber-300'}`}>
                        {violationMsg}
                    </div>
                )}

                {/* ── Exam Header ── */}
                <div className={`flex items-center justify-between px-5 h-14 border-b border-white/8 shrink-0 ${totalTimeLeft <= 60
                    ? 'bg-red-950/70'
                    : totalTimeLeft <= 300
                        ? 'bg-amber-950/50'
                        : 'bg-black/60'
                    } backdrop-blur`}>

                    {/* Left: topic */}
                    <div className="flex items-center gap-2 min-w-0">
                        <FileText size={18} />
                        <span className="text-sm font-bold text-brand-300 truncate max-w-[160px]">{topic}</span>
                        <span className="text-xs text-gray-500 shrink-0">| Q {current + 1}/{questions.length}</span>
                    </div>

                    {/* Center: big countdown clock */}
                    <div className="flex flex-col items-center">
                        <span className={`text-2xl font-black tabular-nums tracking-widest ${totalTimeLeft <= 60 ? 'text-red-400'
                            : totalTimeLeft <= 300 ? 'text-amber-400'
                                : 'text-emerald-400'
                            }`}>
                            {String(Math.floor(totalTimeLeft / 60)).padStart(2, '0')}:{String(totalTimeLeft % 60).padStart(2, '0')}
                        </span>
                        <span className="text-[20px] text-gray-500 uppercase tracking-widest">Time Remaining</span>
                    </div>

                    {/* Right: controls */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setNavOpen((o) => !o)}
                            className="text-xs text-gray-400 hover:text-white border border-white/10 rounded-lg px-3 py-1.5 transition-colors"
                        >
                            {navOpen ? <><ChevronRight size={14} className="inline" /> Panel</> : <><ChevronLeft size={14} className="inline" /> Panel</>}
                        </button>
                        <button
                            onClick={() => {
                                if (window.confirm(`Submit now?\n${statusCounts.answered} answered, ${statusCounts.notAnswered} unanswered, ${statusCounts.notVisited} not visited.`))
                                    finishTest();
                            }}
                            className="bg-emerald-600 hover:bg-emerald-500 active:scale-[0.97] text-white font-semibold text-xs px-4 py-2 rounded-xl transition-all"
                        >
                            Submit Test
                        </button>
                    </div>
                </div>

                {/* ── Main area ── */}
                <div className="flex flex-1 overflow-hidden">

                    {/* ── LEFT: Question ── */}
                    <div className="flex-1 overflow-y-auto px-6 py-6">
                        {/* Question header */}
                        <div className="flex items-start justify-between mb-5">
                            <p className="text-xs font-semibold text-brand-400 uppercase tracking-widest">
                                Question {current + 1} of {questions.length}
                            </p>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[statuses[current]] || 'bg-gray-700 text-gray-300'}`}>
                                {statuses[current]?.replace(/-/g, ' ')}
                            </span>
                        </div>

                        {/* Question text */}
                        <div className="glass-card p-6 mb-6">
                            <div className="text-base text-gray-100 leading-relaxed"><MathText text={q.question} /></div>
                        </div>

                        {/* Options */}
                        <div className="space-y-3 mb-8">
                            {q.options.map((opt, j) => {
                                const letter = letterOf(opt);
                                const isSelected = selected === letter;
                                return (
                                    <button
                                        key={j}
                                        onClick={() => pickAnswer(letter)}
                                        className={`w-full text-left px-5 py-4 rounded-xl border text-sm transition-all duration-150 ${isSelected
                                            ? 'border-brand-500 bg-brand-500/15 text-white font-medium scale-[1.01] shadow-md shadow-brand-500/20'
                                            : 'border-white/10 bg-white/4 text-gray-300 hover:border-brand-500/30 hover:bg-white/7'
                                            }`}
                                    >
                                        <span className={`font-bold mr-3 shrink-0 ${isSelected ? 'text-brand-400' : 'text-gray-500'}`}>{letter}.</span>
                                        <MathText text={opt.slice(2).trim()} inline={true} />
                                    </button>
                                );
                            })}
                        </div>

                        {/* Action buttons  */}
                        <div className="flex flex-wrap gap-3">
                            <button
                                onClick={handleMarkReview}
                                className="px-4 py-2.5 rounded-xl border border-purple-500/40 bg-purple-500/10 text-purple-300 text-sm font-medium hover:bg-purple-500/20 transition-colors"
                            >
                                <Bookmark size={16} className="inline mr-1" /> Mark for Review
                            </button>
                            <button
                                onClick={handleSaveMarkNext}
                                className="px-4 py-2.5 rounded-xl border border-purple-400/40 bg-purple-400/10 text-purple-200 text-sm font-medium hover:bg-purple-400/20 transition-colors"
                            >
                                <Save size={16} className="inline mr-1" /> Save & Mark for Review
                            </button>
                            <button
                                onClick={handleClear}
                                className="px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-gray-400 text-sm hover:bg-white/10 transition-colors"
                            >
                                <X size={16} className="inline mr-1" /> Clear Response
                            </button>
                            {current < questions.length - 1 ? (
                                <button
                                    onClick={() => handleSaveNext()}
                                    className="ml-auto btn-primary px-6 py-2.5 text-sm"
                                >
                                    Save &amp; Next <ChevronRight size={16} className="inline" />
                                </button>
                            ) : (
                                <button
                                    onClick={handleSaveOnly}
                                    className="ml-auto btn-primary px-6 py-2.5 text-sm"
                                >
                                    <Save size={16} className="inline mr-1" /> Save Answer
                                </button>
                            )}
                        </div>
                        {/* Unsaved hint */}
                        {draftAnswer && draftAnswer !== answers[current] && (
                            <p className="text-[10px] text-amber-400/80 text-right mt-2">
                                <AlertTriangle size={12} className="inline mr-1" /> Not saved yet — click <b>Save Answer</b> to confirm
                            </p>
                        )}
                    </div>

                    {/* ── RIGHT: Navigator Panel ── */}
                    {navOpen && (
                        <div className="w-64 border-l border-white/5 bg-black/30 flex flex-col overflow-y-auto shrink-0">
                            {/* Profile stub */}
                            <div className="px-4 py-4 border-b border-white/5">
                                <p className="text-xs font-semibold text-gray-300 mb-1">Question Navigator</p>
                                <p className="text-[10px] text-gray-500">{topic}</p>
                            </div>

                            {/* Legend */}
                            <div className="px-4 py-3 border-b border-white/5 grid grid-cols-2 gap-y-1.5">
                                <LegendDot cls="bg-emerald-600" label={`Answered (${statusCounts.answered})`} />
                                <LegendDot cls="bg-red-600" label={`Not Answered (${statusCounts.notAnswered})`} />
                                <LegendDot cls="bg-purple-600" label={`Marked (${statusCounts.marked})`} />
                                <LegendDot cls="bg-gray-700" label={`Not Visited (${statusCounts.notVisited})`} />
                            </div>

                            {/* Question grid */}
                            <div className="flex-1 px-4 py-4">
                                <div className="grid grid-cols-5 gap-2">
                                    {questions.map((_, i) => (
                                        <button
                                            key={i}
                                            onClick={() => jumpTo(i)}
                                            className={`w-10 h-10 rounded-lg text-xs font-bold transition-all border-2 ${i === current
                                                ? 'border-brand-400 ring-2 ring-brand-400/40 scale-110 ' + STATUS_STYLE[statuses[i]]
                                                : 'border-transparent ' + STATUS_STYLE[statuses[i]]
                                                }`}
                                        >
                                            {i + 1}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Submit button at bottom of panel */}
                            <div className="px-4 pb-4 pt-2 border-t border-white/5 shrink-0">
                                <div className="text-[15px] text-gray-500 mb-2 text-center">
                                    Answered: <span className="text-emerald-400 font-semibold">{statusCounts.answered}</span> / {questions.length}
                                </div>

                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ════════════════════════════════════════════════════════════════════════════
    // PHASE: RESULT
    // ════════════════════════════════════════════════════════════════════════════
    const pct = result ? Math.round((result.score / result.total) * 100) : 0;
    const emoji = pct >= 80 ? <Award size={64} className="mx-auto text-emerald-400" /> : pct >= 50 ? <ThumbsUp size={64} className="mx-auto text-amber-400" /> : <Flame size={64} className="mx-auto text-red-500" />;
    const msg = pct >= 80 ? 'Excellent work!' : pct >= 50 ? 'Good effort — review the explanations below.' : "Don't give up, keep practicing!";

    return (
        <div className="max-w-2xl mx-auto px-4 py-10 animate-fade-in-up">
            <div className="glass-card p-8 text-center mb-8">
                <div className="mb-4">{emoji}</div>
                <h2 className="text-3xl font-bold gradient-text mb-1">{result.score} / {result.total}</h2>
                <p className="text-gray-400 mb-4">{msg}</p>
                <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-700 ${pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${pct}%` }} />
                </div>
                <p className="text-xs text-gray-500 mt-1">{pct}%</p>
                <button onClick={reset} className="btn-primary mt-6 px-8 py-3 flex items-center justify-center gap-2 mx-auto"><RefreshCw size={16} /> New Test</button>
            </div>

            <div className="space-y-4">
                {questions.map((q, i) => {
                    const detail = result.answers[i];
                    const skipped = !detail.selectedAnswer;
                    return (
                        <div key={i} className={`glass-card p-5 border-l-4 ${skipped ? 'border-gray-600' : detail.isCorrect ? 'border-emerald-500' : 'border-red-500'}`}>
                            <div className="text-sm font-semibold text-gray-300 mb-3 flex items-start gap-1">
                                <span className="text-brand-400 shrink-0">Q{i + 1}.</span><MathText text={q.question} /></div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                                {q.options.map((opt, j) => {
                                    const letter = letterOf(opt);
                                    const isCorrect = letter === q.correctAnswer;
                                    const isPicked = letter === detail.selectedAnswer;
                                    return (
                                        <div key={j} className={`px-3 py-2 rounded-lg text-xs border flex items-start gap-1 ${isCorrect ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
                                            : isPicked ? 'border-red-500/50 bg-red-500/10 text-red-300'
                                                : 'border-white/5 text-gray-500'}`}>
                                            <span className="shrink-0">{isCorrect ? <CheckCircle2 size={16} className="text-emerald-500" /> : isPicked ? <XCircle size={16} className="text-red-500" /> : ''}</span>
                                            <MathText text={opt} inline={true} />
                                        </div>
                                    );
                                })}
                            </div>
                            {skipped && <p className="text-xs text-gray-500 italic mb-2 flex items-center gap-1"><SkipForward size={14} /> Not answered</p>}
                            {q.explanation && (
                                <div className="text-xs text-gray-400 leading-relaxed">
                                    <span className="text-brand-300 font-semibold">Explanation: </span><MathText text={q.explanation} />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

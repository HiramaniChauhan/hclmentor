/**
 * Dashboard Page
 * Summary cards — clicking "Tests Taken" expands in-place list of all tests,
 * clicking "Questions Asked" shows question history inline.
 * Requires authentication — user guaranteed by RequireAuth wrapper.
 */

import { useState, useEffect } from 'react';
import { analyzePerformance, getQuestions, getLeaderboard } from '../services/api';
import { useAuth } from '../context/AuthContext';
import MathText from '../components/MathText';

// Small markdown renderer for AI analysis text
function SimpleMarkdown({ text }) {
    if (!text) return null;
    return (
        <div className="space-y-1 text-sm text-gray-300 leading-relaxed">
            {text.split('\n').map((line, i) => {
                if (!line.trim()) return <div key={i} className="h-2" />;
                const h = line.match(/^(#{1,3})\s+(.+)/);
                if (h) return <p key={i} className="font-semibold text-brand-300 mt-2">{h[2]}</p>;
                const li = line.match(/^[-*]\s+(.+)/);
                if (li) return <p key={i} className="ml-3">• {li[1]}</p>;
                return (
                    <p key={i}>
                        {line.split(/(\*\*[^*]+\*\*)/).map((chunk, j) =>
                            chunk.startsWith('**') ? (
                                <strong key={j} className="text-white font-semibold">{chunk.slice(2, -2)}</strong>
                            ) : chunk
                        )}
                    </p>
                );
            })}
        </div>
    );
}

// Accuracy badge
function AccBadge({ pct }) {
    const cls = pct >= 80 ? 'bg-emerald-500/20 text-emerald-300'
        : pct >= 50 ? 'bg-amber-500/20 text-amber-300'
            : 'bg-red-500/20 text-red-300';
    return <span className={`px-2 py-0.5 rounded text-xs font-semibold ${cls}`}>{pct}%</span>;
}

// Expandable test attempt list with per-question breakdown
function AttemptList({ attempts }) {
    const [expanded, setExpanded] = useState(null);

    return (
        <div className="space-y-2">
            {/* Table header */}
            <div className="grid grid-cols-[2rem_1fr_5rem_5rem_8rem] text-xs text-gray-500 uppercase tracking-wider pb-2 border-b border-white/10">
                <span>#</span><span>Topic</span><span>Score</span><span>Accuracy</span><span>Date</span>
            </div>

            {attempts.map((a, i) => {
                const pct = Math.round((a.score / a.total) * 100);
                const questions = a.testId?.questions || [];
                const isOpen = expanded === i;

                return (
                    <div key={a.attemptId || i} className="border border-white/5 rounded-xl overflow-hidden">
                        {/* Summary row — clickable */}
                        <button
                            onClick={() => setExpanded(isOpen ? null : i)}
                            className="w-full grid grid-cols-[2rem_1fr_5rem_5rem_8rem] items-center px-3 py-3 text-sm text-left hover:bg-white/4 transition-colors"
                        >
                            <span className="text-gray-600 text-xs">{i + 1}</span>
                            <span className="font-medium text-gray-200 flex items-center gap-2">
                                {a.topic}
                                {questions.length > 0 && (
                                    <span className="text-[10px] text-brand-400">{isOpen ? '▲' : '▼'} {questions.length}Q</span>
                                )}
                            </span>
                            <span className="text-gray-300">{a.score} / {a.total}</span>
                            <span><AccBadge pct={pct} /></span>
                            <span className="text-gray-500 text-xs">{new Date(a.createdAt).toLocaleDateString()}</span>
                        </button>

                        {/* Expanded question breakdown */}
                        {isOpen && (
                            <div className="border-t border-white/5 bg-black/20 px-4 py-4 space-y-5">
                                {questions.length === 0 ? (
                                    <p className="text-xs text-gray-500 italic">Question details not available for this attempt.</p>
                                ) : (
                                    questions.map((q, qi) => {
                                        const ans = a.answers?.find(x => x.questionIndex === qi);
                                        const chosen = ans?.selectedAnswer || '';
                                        const correct = q.correctAnswer;
                                        const skipped = !chosen;

                                        return (
                                            <div key={qi} className="space-y-2">
                                                {/* Question text */}
                                                <p className="text-sm text-gray-200 leading-relaxed">
                                                    <span className="text-brand-400 font-bold mr-2">Q{qi + 1}.</span>
                                                    {q.question}
                                                    {skipped && <span className="ml-2 text-xs text-gray-500 italic">(skipped)</span>}
                                                </p>

                                                {/* Options */}
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-5">
                                                    {q.options.map((opt, oi) => {
                                                        const letter = opt?.charAt(0);
                                                        const isCorrect = letter === correct;
                                                        const isChosen = letter === chosen;
                                                        const wrongChoice = isChosen && !isCorrect;

                                                        let cls = 'border-white/5 text-gray-500 bg-white/2';
                                                        if (isCorrect) cls = 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300';
                                                        else if (wrongChoice) cls = 'border-red-500/50 bg-red-500/10 text-red-300';

                                                        return (
                                                            <div key={oi} className={`flex items-start gap-2 px-3 py-2 rounded-lg border text-xs ${cls}`}>
                                                                <span className="font-bold shrink-0">
                                                                    {isCorrect ? '✅' : wrongChoice ? '❌' : ''}
                                                                    {!isCorrect && !wrongChoice && <span className="opacity-40">{letter}.</span>}
                                                                    {(isCorrect || wrongChoice) && ` ${letter}.`}
                                                                </span>
                                                                <span>{opt.slice(2).trim()}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                {/* Explanation */}
                                                {q.explanation && (
                                                    <p className="pl-5 text-xs text-gray-400 leading-relaxed border-l-2 border-brand-500/30 ml-5">
                                                        <span className="text-brand-300 font-semibold">Explanation: </span>
                                                        {q.explanation}
                                                    </p>
                                                )}

                                                {qi < questions.length - 1 && <div className="border-b border-white/5 mt-2" />}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

export default function Dashboard() {
    const { user } = useAuth();
    const [data, setData] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [leaderboard, setLeaderboard] = useState([]);
    const [myRank, setMyRank] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Which panel is open: null | 'tests' | 'questions'
    const [openPanel, setOpenPanel] = useState(null);

    const fetchData = async () => {
        setLoading(true);
        setError('');
        try {
            const [perfResult, qResult, lbResult] = await Promise.all([
                analyzePerformance(user?.id),
                user?.id ? getQuestions(user.id) : Promise.resolve({ questions: [] }),
                getLeaderboard(user?.id).catch(() => ({ leaderboard: [], myRank: null })),
            ]);
            setData(perfResult);
            setQuestions(qResult.questions || []);
            setLeaderboard(lbResult.leaderboard || []);
            setMyRank(lbResult.myRank ?? null);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load dashboard data.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    // Topic stats
    const topicStats = {};
    if (data?.attempts) {
        data.attempts.forEach((a) => {
            if (!topicStats[a.topic]) topicStats[a.topic] = { correct: 0, total: 0, count: 0 };
            topicStats[a.topic].correct += a.score;
            topicStats[a.topic].total += a.total;
            topicStats[a.topic].count += 1;
        });
    }
    const topics = Object.entries(topicStats).sort(
        ([, a], [, b]) => a.correct / a.total - b.correct / b.total
    );
    const totalCorrect = topics.reduce((s, [, v]) => s + v.correct, 0);
    const totalQs = Math.max(topics.reduce((s, [, v]) => s + v.total, 0), 1);
    const overallPct = topics.length > 0 ? Math.round((totalCorrect / totalQs) * 100) : null;

    const toggle = (panel) => setOpenPanel((p) => (p === panel ? null : panel));

    return (
        <div className="max-w-5xl mx-auto px-4 py-10">
            {/* Header */}
            <div className="text-center mb-8 animate-fade-in-up">
                <h1 className="text-3xl font-bold gradient-text mb-2">Performance Dashboard</h1>
                <p className="text-gray-400">
                    Welcome back, <span className="text-brand-300 font-medium">{user?.name}</span>!
                </p>
            </div>

            {loading && (
                <div className="flex justify-center py-20">
                    <div className="spinner !w-10 !h-10" />
                </div>
            )}
            {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl px-5 py-3 text-sm mb-6">
                    {error}
                </div>
            )}

            {!loading && data && (
                <div className="space-y-6 animate-fade-in-up">

                    {/* ── Summary Cards ── */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {/* Tests Taken — clickable */}
                        <button
                            onClick={() => toggle('tests')}
                            className={`glass-card p-5 text-center transition-all hover:border-brand-500/40 hover:scale-[1.02] ${openPanel === 'tests' ? 'border-brand-500/50 bg-brand-500/5' : ''
                                }`}
                        >
                            <p className="text-3xl font-bold text-brand-400">{data.attempts?.length || 0}</p>
                            <p className="text-xs text-gray-400 mt-1">Tests Taken</p>
                            <p className="text-[10px] text-brand-500 mt-1">
                                {openPanel === 'tests' ? '▲ Close' : '▼ View list'}
                            </p>
                        </button>

                        {/* Overall Accuracy */}
                        <div className="glass-card p-5 text-center">
                            <p className="text-3xl font-bold text-emerald-400">
                                {overallPct !== null ? `${overallPct}%` : '—'}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">Overall Accuracy</p>
                        </div>

                        {/* Questions Asked — clickable */}
                        <button
                            onClick={() => toggle('questions')}
                            className={`glass-card p-5 text-center transition-all hover:border-cyan-500/40 hover:scale-[1.02] ${openPanel === 'questions' ? 'border-cyan-500/50 bg-cyan-500/5' : ''
                                }`}
                        >
                            <p className="text-3xl font-bold text-cyan-400">{questions.length}</p>
                            <p className="text-xs text-gray-400 mt-1">Questions Asked</p>
                            <p className="text-[10px] text-cyan-600 mt-1">
                                {openPanel === 'questions' ? '▲ Close' : '▼ View list'}
                            </p>
                        </button>

                        {/* Leaderboard — clickable, shows Your Rank */}
                        <button
                            onClick={() => toggle('leaderboard')}
                            className={`glass-card p-5 text-center transition-all hover:border-yellow-500/40 hover:scale-[1.02] ${openPanel === 'leaderboard' ? 'border-yellow-500/50 bg-yellow-500/5' : ''
                                }`}
                        >
                            <p className="text-3xl font-bold text-yellow-400">
                                {myRank !== null ? `#${myRank}` : '—'}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">Your Rank</p>
                            <p className="text-[10px] text-yellow-600 mt-1">
                                {openPanel === 'leaderboard' ? '▲ Close' : '🏆 Leaderboard'}
                            </p>
                        </button>
                    </div>

                    {/* ── PANEL: Tests List ── */}
                    {openPanel === 'tests' && (
                        <div className="glass-card p-6 animate-fade-in-up">
                            <h2 className="text-sm font-semibold text-brand-300 uppercase tracking-wide mb-4">
                                All Test Attempts ({data.attempts?.length || 0})
                            </h2>
                            {data.attempts?.length === 0 ? (
                                <p className="text-gray-500 text-sm text-center py-6">No tests taken yet.</p>
                            ) : (
                                <AttemptList attempts={data.attempts} />
                            )}
                        </div>
                    )}

                    {/* ── PANEL: Questions List ── */}
                    {openPanel === 'questions' && (
                        <div className="glass-card p-6 animate-fade-in-up">
                            <h2 className="text-sm font-semibold text-cyan-300 uppercase tracking-wide mb-4">
                                💬 Questions History ({questions.length})
                            </h2>
                            {questions.length === 0 ? (
                                <div className="text-center py-10">
                                    <div className="text-4xl mb-3">📝</div>
                                    <p className="text-gray-500 text-sm">No questions asked yet. Start solving or chatting!</p>
                                </div>
                            ) : (
                                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                                    {questions.map((q, i) => (
                                        <div key={q.questionId || i} className="border border-white/5 rounded-xl p-4 hover:bg-white/3 transition-colors">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-lg">{q.type === 'image' ? '📸' : '💬'}</span>
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${q.type === 'image'
                                                    ? 'bg-violet-500/20 text-violet-300'
                                                    : 'bg-cyan-500/20 text-cyan-300'
                                                    }`}>{q.type}</span>
                                                {q.topic && (
                                                    <span className="px-2 py-0.5 rounded bg-white/5 text-[10px] text-gray-400">{q.topic}</span>
                                                )}
                                                <span className="ml-auto text-[10px] text-gray-600">
                                                    {new Date(q.createdAt).toLocaleString()}
                                                </span>
                                            </div>

                                            <p className="text-sm text-gray-200 leading-relaxed mb-2">
                                                <span className="text-gray-500 font-medium mr-1">Q:</span>
                                                <MathText text={q.question} inline={true} />
                                            </p>

                                            {q.answer && (
                                                <details className="group">
                                                    <summary className="text-xs text-brand-400 cursor-pointer hover:text-brand-300 list-none flex items-center gap-1">
                                                        <span className="group-open:hidden">▶ Show answer</span>
                                                        <span className="hidden group-open:inline">▼ Hide answer</span>
                                                    </summary>
                                                    <div className="mt-2 pl-3 border-l border-brand-500/20 text-xs text-gray-400 leading-relaxed max-h-52 overflow-y-auto">
                                                        <MathText text={q.answer} />
                                                    </div>
                                                </details>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── PANEL: Leaderboard ── */}
                    {openPanel === 'leaderboard' && (
                        <div className="glass-card p-6 animate-fade-in-up">
                            <div className="flex items-center justify-between mb-5">
                                <h2 className="text-sm font-semibold text-yellow-300 uppercase tracking-wide">
                                    🏆 Class Leaderboard — Top 10
                                </h2>
                                <span className="text-xs text-gray-500">
                                    Ranked by accuracy over last 10 tests
                                </span>
                            </div>

                            {/* Your rank callout */}
                            {myRank !== null && (
                                <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-yellow-500/10 border border-yellow-500/25">
                                    <span className="text-2xl font-bold text-yellow-300">#{myRank}</span>
                                    <div>
                                        <p className="text-xs text-yellow-200 font-semibold">Your Current Rank</p>
                                        <p className="text-[10px] text-yellow-500/70">Based on your last 10 tests</p>
                                    </div>
                                </div>
                            )}

                            {leaderboard.length === 0 ? (
                                <div className="text-center py-10">
                                    <div className="text-4xl mb-3">🏆</div>
                                    <p className="text-gray-500 text-sm">No test data yet. Take a practice test to appear on the leaderboard!</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {/* Table header */}
                                    <div className="grid grid-cols-[2.5rem_1fr_5rem_5rem] text-xs text-gray-500 uppercase tracking-wider pb-2 border-b border-white/10">
                                        <span>#</span>
                                        <span>Student</span>
                                        <span>Accuracy</span>
                                        <span>Tests</span>
                                    </div>
                                    {leaderboard.map((entry) => {
                                        const isMe = entry.userId?.toString() === user?.id?.toString();
                                        const medal = entry.rank === 1 ? '🥇'
                                            : entry.rank === 2 ? '🥈'
                                                : entry.rank === 3 ? '🥉' : null;
                                        const accCls = entry.accuracy >= 80
                                            ? 'text-emerald-300'
                                            : entry.accuracy >= 50 ? 'text-amber-300' : 'text-red-300';
                                        return (
                                            <div
                                                key={entry.userId}
                                                className={`grid grid-cols-[2.5rem_1fr_5rem_5rem] items-center px-3 py-2.5 rounded-xl text-sm transition-all ${isMe
                                                    ? 'bg-yellow-500/10 border border-yellow-500/30 font-semibold'
                                                    : 'border border-transparent hover:bg-white/4'
                                                    }`}
                                            >
                                                <span className="text-base leading-none">
                                                    {medal ?? <span className="text-xs text-gray-500 font-mono">{entry.rank}</span>}
                                                </span>
                                                <span className={`truncate ${isMe ? 'text-yellow-200' : 'text-gray-200'}`}>
                                                    {entry.name}
                                                    {isMe && <span className="ml-1.5 text-[10px] text-yellow-400/70 font-normal">(you)</span>}
                                                </span>
                                                <span className={`font-semibold tabular-nums ${accCls}`}>{entry.accuracy}%</span>
                                                <span className="text-gray-500 text-xs tabular-nums">{entry.testsCount}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Topic Accuracy Bars ── */}
                    {topics.length > 0 && (
                        <div className="glass-card p-6">
                            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-5">
                                Accuracy by Topic
                            </h2>
                            <div className="space-y-4">
                                {topics.map(([topic, stats], i) => {
                                    const pct = Math.round((stats.correct / stats.total) * 100);
                                    const bar = pct >= 75 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500';
                                    return (
                                        <div key={topic} className="animate-fade-in-up" style={{ animationDelay: `${i * 0.05}s` }}>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="text-gray-300">{topic}</span>
                                                <span className="text-gray-400 text-xs">
                                                    {stats.correct}/{stats.total} · {stats.count} test{stats.count > 1 ? 's' : ''} · <AccBadge pct={pct} />
                                                </span>
                                            </div>
                                            <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
                                                <div className={`h-full rounded-full ${bar} transition-all duration-700`} style={{ width: `${pct}%` }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* ── AI Analysis ── */}
                    {data.analysis && (
                        <div className="glass-card p-6">
                            <h2 className="text-sm font-semibold text-brand-400 uppercase tracking-wide mb-3">
                                🤖 AI Study Recommendations
                            </h2>
                            <SimpleMarkdown text={data.analysis} />
                        </div>
                    )}
                </div>
            )}


            {/* Refresh */}
            {!loading && (
                <div className="text-center mt-8">
                    <button onClick={fetchData} className="btn-secondary">🔄 Refresh Data</button>
                </div>
            )}
        </div>
    );
}

/**
 * ChatBox Component
 * - Renders AI responses using MathText (react-markdown + KaTeX)
 * - Each AI message has a manual 🔊 button to read it aloud
 * - Auto-scroll to latest message
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import MathText from './MathText';

// ── Per-message audio button ──────────────────────────────────────────────────
function SpeakButton({ text }) {
    const [speaking, setSpeaking] = useState(false);

    const speak = useCallback(() => {
        if (!('speechSynthesis' in window)) return;
        if (speaking) {
            window.speechSynthesis.cancel();
            setSpeaking(false);
            return;
        }
        // Strip markdown and math symbols for cleaner audio
        const clean = text.replace(/[#*`_~>\-\[\]()$\\]/g, '').replace(/\n+/g, ' ').trim();
        const utt = new SpeechSynthesisUtterance(clean);
        utt.rate = 0.95;
        utt.onend = () => setSpeaking(false);
        utt.onerror = () => setSpeaking(false);
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utt);
        setSpeaking(true);
    }, [text, speaking]);

    if (!('speechSynthesis' in window)) return null;

    return (
        <button
            onClick={speak}
            title={speaking ? 'Stop reading' : 'Read aloud'}
            className={`mt-2 flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg border transition-all ${speaking
                ? 'border-brand-500/60 bg-brand-500/15 text-brand-300 animate-pulse'
                : 'border-white/10 text-gray-500 hover:text-gray-300 hover:border-white/20'
                }`}
        >
            {speaking ? '⏹ Stop' : '🔊 Read aloud'}
        </button>
    );
}

// ── Main ChatBox ──────────────────────────────────────────────────────────────
export default function ChatBox({ messages, onSend, loading }) {
    const [input, setInput] = useState('');
    const bottomRef = useRef(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!input.trim() || loading) return;
        onSend(input.trim());
        setInput('');
    };

    return (
        <div className="flex flex-col h-full">
            {/* Message list */}
            <div className="flex-1 overflow-y-auto space-y-5 p-4">
                {messages.length === 0 && (
                    <div className="text-center text-gray-500 mt-20">
                        <div className="text-5xl mb-4">💬</div>
                        <p className="text-lg">Ask me anything about JEE, NIMCET, or GATE!</p>
                        <p className="text-sm mt-1 opacity-60">I'm your AI Study Mentor</p>
                    </div>
                )}

                {messages.map((msg, idx) => (
                    <div
                        key={idx}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}
                        style={{ animationDelay: `${idx * 0.04}s` }}
                    >
                        {msg.role === 'user' ? (
                            /* ── User bubble ── */
                            <div className="max-w-[78%] bg-brand-600 text-white rounded-2xl rounded-br-md px-5 py-3 text-sm leading-relaxed">
                                {msg.content}
                            </div>
                        ) : (
                            /* ── AI bubble ── */
                            <div className="max-w-[82%] glass-card rounded-2xl rounded-bl-md px-5 py-4 text-sm text-gray-200">
                                <span className="block text-xs font-semibold text-brand-400 mb-2">🤖 AI Mentor</span>
                                <MathText text={msg.content} />
                                <SpeakButton text={msg.content} />
                            </div>
                        )}
                    </div>
                ))}

                {loading && (
                    <div className="flex justify-start">
                        <div className="glass-card rounded-2xl rounded-bl-md px-5 py-3 flex items-center gap-2">
                            <div className="spinner" />
                            <span className="text-sm text-gray-400">Thinking…</span>
                        </div>
                    </div>
                )}

                <div ref={bottomRef} />
            </div>

            {/* Input bar */}
            <form onSubmit={handleSubmit} className="flex gap-3 p-4 border-t border-white/5">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type your question…"
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm
                     text-white placeholder-gray-500 outline-none focus:border-brand-500 transition-colors"
                />
                <button type="submit" disabled={loading || !input.trim()} className="btn-primary px-5">
                    Send
                </button>
            </form>
        </div>
    );
}

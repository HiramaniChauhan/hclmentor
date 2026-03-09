/**
 * Chat Page
 * AI Tutor chat interface with optional voice input.
 * Saves every Q&A pair to the user's history when logged in.
 */

import { useState, useCallback } from 'react';
import ChatBox from '../components/ChatBox';
import VoiceButton from '../components/VoiceButton';
import { chat as chatApi, saveQuestion } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { MessageCircle } from 'lucide-react';

export default function Chat() {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [lastAiReply, setLastAiReply] = useState('');
    const { user } = useAuth();

    const sendMessage = useCallback(
        async (text) => {
            const userMsg = { role: 'user', content: text };
            const updatedMessages = [...messages, userMsg];
            setMessages(updatedMessages);
            setLoading(true);

            try {
                const { reply } = await chatApi(updatedMessages);
                const aiMsg = { role: 'assistant', content: reply };
                setMessages((prev) => [...prev, aiMsg]);
                setLastAiReply(reply);

                // Save chat Q&A to user's history if logged in
                if (user?.id) {
                    saveQuestion({
                        userId: user.id,
                        type: 'chat',
                        question: text,
                        answer: reply,
                        topic: 'General',
                    }).catch(() => { });
                }
            } catch (err) {
                const errMsg = {
                    role: 'assistant',
                    content: `Error: ${err.response?.data?.error || 'Something went wrong. Please try again.'}`,
                };
                setMessages((prev) => [...prev, errMsg]);
            } finally {
                setLoading(false);
            }
        },
        [messages, user]
    );

    const handleVoiceTranscript = useCallback(
        (transcript) => {
            if (transcript.trim()) sendMessage(transcript);
        },
        [sendMessage]
    );

    return (
        <div className="max-w-4xl mx-auto px-4 py-6 flex flex-col h-[calc(100vh-72px)]">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 animate-fade-in-up">
                <div>
                    <h1 className="text-2xl font-bold gradient-text flex items-center gap-2">
                        <MessageCircle size={24} className="text-brand-400" /> AI Chat Tutor
                    </h1>
                    <p className="text-sm text-gray-500">Ask anything — I'll explain like a friendly teacher.</p>
                </div>
                <VoiceButton onTranscript={handleVoiceTranscript} textToSpeak={lastAiReply} />
            </div>

            {/* Chat area */}
            <div className="flex-1 glass-card overflow-hidden flex flex-col">
                <ChatBox messages={messages} onSend={sendMessage} loading={loading} />
            </div>
        </div>
    );
}

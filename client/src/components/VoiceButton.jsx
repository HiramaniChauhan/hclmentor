/**
 * VoiceButton Component
 * Uses the Web Speech API (SpeechRecognition) to capture voice input.
 * Emits the transcript to the parent via onTranscript callback.
 * Also provides text-to-speech playback for AI responses.
 */

import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Square } from 'lucide-react';

// Grab the browser SpeechRecognition constructor (works in Chrome, Edge, Safari)
const SpeechRecognition =
    typeof window !== 'undefined'
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : null;

export default function VoiceButton({ onTranscript, textToSpeak }) {
    const [listening, setListening] = useState(false);
    const [supported, setSupported] = useState(true);
    const recognitionRef = useRef(null);

    useEffect(() => {
        if (!SpeechRecognition) {
            setSupported(false);
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            onTranscript?.(transcript);
            setListening(false);
        };

        recognition.onerror = () => setListening(false);
        recognition.onend = () => setListening(false);

        recognitionRef.current = recognition;

        return () => {
            recognition.abort();
        };
    }, [onTranscript]);

    // (Audio reading is now triggered manually per-message in ChatBox)

    const toggle = () => {
        if (!recognitionRef.current) return;
        if (listening) {
            recognitionRef.current.stop();
            setListening(false);
        } else {
            recognitionRef.current.start();
            setListening(true);
        }
    };

    if (!supported) {
        return (
            <button disabled className="btn-secondary opacity-50 cursor-not-allowed flex items-center gap-2 text-sm">
                <MicOff size={16} /> Not supported
            </button>
        );
    }

    return (
        <button
            onClick={toggle}
            className={`relative flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-all duration-300 ${listening
                ? 'bg-red-500/20 border border-red-500/50 text-red-300 animate-pulse-glow'
                : 'btn-secondary'
                }`}
        >
            {listening ? (
                <>
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                    <Square size={16} /> Stop Listening
                </>
            ) : (
                <>
                    <Mic size={16} /> Voice Input
                </>
            )}
        </button>
    );
}

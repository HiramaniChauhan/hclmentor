/**
 * Solve Page
 * Upload an image of a math/science problem and get AI-powered step-by-step solution.
 * If the user is logged in, the question + solution are saved to their history.
 */

import { useState } from 'react';
import ImageUpload from '../components/ImageUpload';
import MathText from '../components/MathText';
import { solveQuestion, saveQuestion } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Camera } from 'lucide-react';

export default function Solve() {
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { user } = useAuth();

    const handleUpload = async (file) => {
        setLoading(true);
        setError('');
        setResult(null);
        try {
            const data = await solveQuestion(file);
            setResult(data);

            // Save question to user's history if logged in
            if (user?.id) {
                saveQuestion({
                    userId: user.id,
                    type: 'image',
                    question: data.extractedQuestion,
                    answer: data.solution,
                    topic: 'General',
                }).catch(() => { }); // fire-and-forget
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to process image. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto px-4 py-10">
            {/* Header */}
            <div className="text-center mb-10 animate-fade-in-up flex flex-col items-center">
                <h1 className="text-3xl font-bold gradient-text mb-2 flex items-center justify-center gap-3">
                    <Camera size={32} className="text-brand-400" /> Image Question Solver
                </h1>
                <p className="text-gray-400">
                    Upload a photo of your question — Nova AI will extract, understand, and solve it step-by-step.
                </p>
            </div>

            {/* Upload */}
            <ImageUpload onUpload={handleUpload} loading={loading} />

            {/* Error */}
            {error && (
                <div className="mt-6 bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl px-5 py-3 text-sm">
                    {error}
                </div>
            )}

            {/* Solution */}
            {result && (
                <div className="mt-8 space-y-6 animate-fade-in-up">
                    {/* Extracted Question */}
                    <div className="glass-card p-6">
                        <h2 className="text-sm font-semibold text-brand-400 uppercase tracking-wide mb-3">
                            Extracted Question
                        </h2>
                        <div className="text-gray-200 leading-relaxed">
                            <MathText text={result.extractedQuestion} />
                        </div>
                    </div>

                    {/* Step-by-step Solution */}
                    <div className="glass-card p-6">
                        <h2 className="text-sm font-semibold text-emerald-400 uppercase tracking-wide mb-3">
                            Step-by-Step Solution
                        </h2>
                        <div className="text-gray-200 leading-relaxed text-sm">
                            <MathText text={result.solution} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

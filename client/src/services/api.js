/**
 * API Service
 * Centralised Axios instance + wrapper functions for every backend endpoint.
 * All functions return the response data directly (unwrapped from axios).
 */

import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api',
    timeout: 120_000, // AI calls can be slow — 2 min timeout
});

// ---- Image question solver ----
export async function solveQuestion(imageFile) {
    const formData = new FormData();
    formData.append('image', imageFile);
    const { data } = await api.post('/solve-question', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
}

// ---- Chat with AI tutor ----
export async function chat(messages) {
    const { data } = await api.post('/chat', { messages });
    return data;
}

// ---- Generate practice test ----
export async function generateTest(topic, count = 5, userId = null) {
    const { data } = await api.post('/generate-test', { topic, count, userId });
    return data;
}

// ---- Submit a test attempt ----
export async function submitAttempt(payload) {
    const { data } = await api.post('/submit-attempt', payload);
    return data;
}

// ---- Analyze performance / weak topics ----
export async function analyzePerformance(userId = null) {
    const { data } = await api.post('/analyze-performance', { userId });
    return data;
}

// ---- Fetch past attempts ----
export async function getAttempts(userId) {
    const { data } = await api.get(`/users/${userId}/attempts`);
    return data;
}

// ---- Save a question asked by the student ----
export async function saveQuestion(payload) {
    const { data } = await api.post('/users/questions', payload);
    return data;
}

// ---- Fetch question history ----
export async function getQuestions(userId) {
    const { data } = await api.get(`/users/${userId}/questions`);
    return data;
}

// ---- Send OTP ----
export async function sendOTP(email, purpose = 'signup') {
    const { data } = await api.post('/users/send-otp', { email, purpose });
    return data;
}

// ---- Reset password with OTP ----
export async function resetPassword(email, otp, newPassword) {
    const { data } = await api.post('/users/reset-password', { email, otp, newPassword });
    return data;
}

// ---- Leaderboard ----
export async function getLeaderboard(userId = null) {
    const params = userId ? { userId } : {};
    const { data } = await api.get('/users/leaderboard', { params });
    return data;
}

export default api;


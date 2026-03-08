/**
 * AuthContext
 * Manages user authentication state across the app.
 * Stores user + JWT token in localStorage for persistence across refreshes.
 */

import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);

    // Restore session from sessionStorage on mount
    useEffect(() => {
        try {
            const savedUser = sessionStorage.getItem('sm_user');
            const savedToken = sessionStorage.getItem('sm_token');
            if (savedUser && savedToken) {
                setUser(JSON.parse(savedUser));
                setToken(savedToken);
            }
        } catch {
            // ignore bad data
        }
        setLoading(false);
    }, []);

    const login = (userData, jwtToken) => {
        setUser(userData);
        setToken(jwtToken);
        sessionStorage.setItem('sm_user', JSON.stringify(userData));
        sessionStorage.setItem('sm_token', jwtToken);
    };

    const logout = () => {
        setUser(null);
        setToken(null);
        sessionStorage.removeItem('sm_user');
        sessionStorage.removeItem('sm_token');
        sessionStorage.clear();
    };

    return (
        <AuthContext.Provider value={{ user, token, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
    return ctx;
}

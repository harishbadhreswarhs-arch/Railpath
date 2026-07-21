import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: () => Promise<void>;
    loginWithEmail: (email: string, pass: string) => Promise<void>;
    registerWithEmail: (email: string, pass: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const login = async () => {
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
        } catch (error: any) {
            if (error.code === 'auth/popup-closed-by-user') {
                console.log("Login popup closed by user.");
                return;
            }
            console.error("Google Login failed", error);
        }
    };

    const loginWithEmail = async (email: string, pass: string) => {
        try {
            await signInWithEmailAndPassword(auth, email, pass);
        } catch (error: any) {
            // Handle common auth errors gracefully
            if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                console.warn("Login failed: Invalid credentials");
                throw new Error("Invalid email or password.");
            }
            console.error("Email Login failed", error);
            throw error;
        }
    };

    const registerWithEmail = async (email: string, pass: string) => {
        try {
            await createUserWithEmailAndPassword(auth, email, pass);
        } catch (error: any) {
            // Handle registration errors gracefully
            if (error.code === 'auth/email-already-in-use') {
                throw new Error("Email is already in use.");
            }
            if (error.code === 'auth/invalid-email') {
                throw new Error("Invalid email address.");
            }
            if (error.code === 'auth/weak-password') {
                throw new Error("Password is too weak (min 6 chars).");
            }
            console.error("Registration failed", error);
            throw error;
        }
    };

    const logout = async () => {
        await signOut(auth);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, loginWithEmail, registerWithEmail, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    isAdmin: boolean;
    login: () => Promise<void>;
    loginWithEmail: (email: string, pass: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setUser(user);
            if (user) {
                try {
                    // Check if user email is in authorized_admins collection
                    // Check if user email is in authorized_admins collection using direct doc fetch
                    if (user.email) {
                        const adminDocRef = doc(db, 'authorized_admins', user.email);
                        const adminDoc = await getDoc(adminDocRef);
                        setIsAdmin(adminDoc.exists());
                    } else {
                        setIsAdmin(false);
                    }
                } catch (error) {
                    console.error("Admin check failed (likely permission error):", error);
                    setIsAdmin(false); // Safety fallback
                }
            } else {
                setIsAdmin(false);
            }
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
            console.error("Login failed", error);
        }
    };

    const loginWithEmail = async (email: string, pass: string) => {
        try {
            await signInWithEmailAndPassword(auth, email, pass);
        } catch (error: any) {
            // Handle common auth errors gracefully to avoid aggressive error overlays
            if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                console.warn("Login failed: Invalid credentials");
                throw new Error("Invalid email or password.");
            }
            if (error.code === 'auth/too-many-requests') {
                throw new Error("Too many failed attempts. Please try again later.");
            }

            console.error("Email Login failed", error);
            throw error;
        }
    }

    const logout = async () => {
        await signOut(auth);
        setIsAdmin(false);
    };

    return (
        <AuthContext.Provider value={{ user, loading, isAdmin, login, loginWithEmail, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

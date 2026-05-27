"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";
import { useRouter, usePathname } from "next/navigation";
import { auth, db } from "@/lib/firebase";

export type UserRole = "admin" | "qa" | "developer" | "viewer";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  createdAt: any;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  role: UserRole | null;
  logout: () => Promise<void>;
  isAdmin: boolean;
  isQA: boolean;
  isDeveloper: boolean;
  isViewer: boolean;
  firebaseConfigured: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  role: null,
  logout: async () => {},
  isAdmin: false,
  isQA: false,
  isDeveloper: false,
  isViewer: false,
  firebaseConfigured: false,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Check if Firebase is configured properly
  const isConfigured = 
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== undefined &&
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== "" &&
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== "YOUR_API_KEY";

  useEffect(() => {
    if (!isConfigured) {
      setLoading(false);
      return;
    }

    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      // Unsubscribe from previous profile listener if any
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (firebaseUser) {
        const userDocRef = doc(db, "users", firebaseUser.uid);
        
        // Listen to real-time updates for the user profile document
        unsubscribeProfile = onSnapshot(userDocRef, async (userDoc) => {
          if (userDoc.exists()) {
            setProfile(userDoc.data() as UserProfile);
            setLoading(false);
          } else {
            // Create user document with default Viewer role if it doesn't exist
            const newProfile: UserProfile = {
              id: firebaseUser.uid,
              name: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "User",
              email: firebaseUser.email || "",
              role: "viewer", // Default role
              createdAt: new Date(),
            };
            await setDoc(userDocRef, {
              ...newProfile,
              createdAt: serverTimestamp(),
            });
            setProfile(newProfile);
            setLoading(false);
          }
        }, (err) => {
          setLoading(false);
        });
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
  }, [isConfigured]);

  // Route protection
  useEffect(() => {
    if (loading) return;

    const publicPages = ["/login", "/register"];
    const isPublicPage = publicPages.includes(pathname);

    if (!user && !isPublicPage) {
      router.push("/login");
    } else if (user && isPublicPage) {
      router.push("/dashboard");
    }
  }, [user, loading, pathname, router]);

  const logout = async () => {
    if (isConfigured) {
      await signOut(auth);
      router.push("/login");
    }
  };

  const role = profile?.role || null;

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        role,
        logout,
        isAdmin: role === "admin",
        isQA: role === "qa",
        isDeveloper: role === "developer",
        isViewer: role === "viewer",
        firebaseConfigured: isConfigured,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

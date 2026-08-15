import { create } from "zustand";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db, emailFor, friendlyAuthError } from "../lib/firebase.js";

let listenerAttached = false;
let initialResolved = false;

/**
 * Auth store backed by Firebase Authentication + Firestore.
 *
 * Only admins sign in — the app itself is publicly viewable and requires no
 * account. Firestore collections:
 *   - `users`     — one doc per admin account (uid, username, role)
 *   - `game_logs` — append-only history of finished games
 */
export const useAuthStore = create((set, get) => ({
  user: null, // Firebase auth user
  profile: null, // { uid, username, role } from Firestore
  isAuthenticated: false,
  loading: true,

  init: () => {
    if (listenerAttached) return;
    listenerAttached = true;

    onAuthStateChanged(auth, async (firebaseUser) => {
      if (!initialResolved) {
        // First fire = initial session restore on page load.
        initialResolved = true;
        if (firebaseUser) {
          const profile = await get().fetchProfile(firebaseUser.uid);
          set({
            user: firebaseUser,
            profile,
            isAuthenticated: true,
            loading: false,
          });
        } else {
          set({ user: null, profile: null, isAuthenticated: false, loading: false });
        }
        return;
      }

      // Later changes are driven by login/logout, which set the profile
      // explicitly. Only clear state here when the user signs out.
      if (!firebaseUser) {
        set({ user: null, profile: null, isAuthenticated: false });
      }
    });
  },

  fetchProfile: async (uid) => {
    try {
      const snap = await getDoc(doc(db, "users", uid));
      if (snap.exists()) return snap.data();
    } catch (err) {
      console.error("Failed to load profile:", err);
    }
    return { uid, username: "player", role: "viewer" };
  },

  login: async (username, password) => {
    try {
      const email = emailFor(username);
      console.log("[auth] attempting login", { username, email });
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const profile = await get().fetchProfile(cred.user.uid);

      if (profile.role !== "admin") {
        await signOut(auth);
        set({ user: null, profile: null, isAuthenticated: false });
        return { ok: false, error: "This account is not an admin." };
      }

      set({ user: cred.user, profile, isAuthenticated: true });
      return { ok: true };
    } catch (err) {
      console.error("[auth] login failed", { code: err?.code, message: err?.message });
      return { ok: false, error: friendlyAuthError(err) };
    }
  },

  logout: async () => {
    try {
      await signOut(auth);
    } catch {
      // ignore — clear local state regardless
    }
    set({ user: null, profile: null, isAuthenticated: false });
  },
}));

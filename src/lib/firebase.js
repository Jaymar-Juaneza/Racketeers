import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

/**
 * Firebase web configuration.
 *
 * The web config (apiKey etc.) is public by design — it is safe to ship in
 * the client bundle. The Firebase *Admin SDK* service-account JSON is a
 * server-only secret and must NEVER be imported here or committed.
 *
 * Values default to the "rocketeers-5ad3d" project but can be overridden with
 * VITE_FIREBASE_* environment variables in a local `.env` file.
 */
const firebaseConfig = {
  apiKey:
    import.meta.env.VITE_FIREBASE_API_KEY ??
    "AIzaSyBH_e_9nSBFrVw8wmzLqamb2yZJl3WJLok",
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ??
    "rocketeers-5ad3d.firebaseapp.com",
  projectId:
    import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "rocketeers-5ad3d",
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ??
    "rocketeers-5ad3d.firebasestorage.app",
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "793275333857",
  appId:
    import.meta.env.VITE_FIREBASE_APP_ID ??
    "1:793275333857:web:6cce4641b4f813271ccba0",
  measurementId:
    import.meta.env.VITE_FIREBASE_MEASUREMENT_ID ?? "G-2KWJBW6XF6",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

/** Synthetic email used for Firebase Auth so users register with a username. */
export function emailFor(username) {
  return `${String(username ?? "").trim().toLowerCase()}@rocketeers.app`;
}

/** Friendly messages for the Firebase Auth error codes we care about. */
export function friendlyAuthError(error) {
  const code = error?.code ?? "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Incorrect username or password.";
    case "auth/email-already-in-use":
      return "That username is already taken.";
    case "auth/weak-password":
      return "Password must be at least 6 characters.";
    case "auth/invalid-email":
      return "Invalid username.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    default:
      return error?.message ?? "Something went wrong.";
  }
}

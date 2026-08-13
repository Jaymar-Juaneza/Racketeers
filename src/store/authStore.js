import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ORGANIZER_PASSWORD } from "../lib/auth/staticAuth.js";

export const useAuthStore = create(
  persist(
    (set) => ({
      isAuthenticated: false,
      login: (password) => {
        if (password === ORGANIZER_PASSWORD) {
          set({ isAuthenticated: true });
          return true;
        }
        return false;
      },
      logout: () => set({ isAuthenticated: false }),
    }),
    {
      name: "atsi-racketeers-auth",
      // sessionStorage-like lifetime: do not write to disk.
      storage: {
        getItem: (name) => {
          const value = sessionStorage.getItem(name);
          return value ?? null;
        },
        setItem: (name, value) => sessionStorage.setItem(name, value),
        removeItem: (name) => sessionStorage.removeItem(name),
      },
    },
  ),
);

import { create } from "zustand";
import type { Session, User } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";

/** Profile shape consumed by the UI (kept for backward compatibility). */
export interface RegisteredUser {
  fullName: string;
  academicProgram: string;
  email: string;
  password: string; // unused with Supabase; kept for the shared type
}

/** Input accepted by the register action. */
export type RegisterInput = Omit<RegisteredUser, "password"> & {
  password: string;
};

/** Result returned by the async auth actions. */
export type AuthResult = {
  ok: boolean;
  error?: string;
  needsConfirmation?: boolean;
};

interface AuthState {
  /** Raw Supabase user (null when signed out). */
  user: User | null;
  /** Profile-shaped view of the current user for the UI. */
  currentUser: RegisteredUser | null;
  isAuthenticated: boolean;
  /** True while the initial session is being resolved. */
  loading: boolean;
  register: (input: RegisterInput) => Promise<AuthResult>;
  login: (email: string, password: string) => Promise<AuthResult>;
  logout: () => Promise<void>;
}

/** Maps a Supabase user to the UI-friendly RegisteredUser shape. */
function toProfile(user: User | null): RegisteredUser | null {
  if (!user) return null;
  const m = (user.user_metadata ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  return {
    fullName: str(m.full_name) || str(m.fullName),
    academicProgram: str(m.academic_program) || str(m.academicProgram),
    email: user.email ?? "",
    password: "",
  };
}

export const useAuthStore = create<AuthState>()((set) => {
  // Hydrate from the existing Supabase session on startup.
  supabase.auth.getSession().then(({ data }) => {
    const u = data.session?.user ?? null;
    set({
      user: u,
      currentUser: toProfile(u),
      isAuthenticated: Boolean(u),
      loading: false,
    });
  });

  // Keep React state in sync with Supabase auth changes (login, logout, etc.).
  supabase.auth.onAuthStateChange((_event, session: Session | null) => {
    const u = session?.user ?? null;
    set({
      user: u,
      currentUser: toProfile(u),
      isAuthenticated: Boolean(u),
    });
  });

  return {
    user: null,
    currentUser: null,
    isAuthenticated: false,
    loading: true,

    register: async (input) => {
      const { data, error } = await supabase.auth.signUp({
        email: input.email,
        password: input.password,
        options: {
          data: {
            full_name: input.fullName,
            academic_program: input.academicProgram,
          },
        },
      });
      if (error) return { ok: false, error: error.message };

      // If email confirmation is disabled, a session is created right away.
      if (data.session) {
        set({
          user: data.user ?? null,
          currentUser: toProfile(data.user ?? null),
          isAuthenticated: true,
        });
        return { ok: true };
      }
      // Otherwise the user must confirm their email before signing in.
      return {
        ok: false,
        needsConfirmation: true,
        error: "Revisa tu correo para confirmar tu cuenta.",
      };
    },

    login: async (email, password) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) return { ok: false, error: error.message };
      set({
        user: data.user,
        currentUser: toProfile(data.user),
        isAuthenticated: true,
      });
      return { ok: true };
    },

    logout: async () => {
      await supabase.auth.signOut();
      set({ user: null, currentUser: null, isAuthenticated: false });
    },
  };
});

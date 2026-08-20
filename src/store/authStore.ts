import { create } from "zustand";
import type { Session, User } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";
import { fetchProfile } from "@/lib/supabaseQueries";

export interface RegisteredUser {
  fullName: string;
  academicProgram: string;
  email: string;
  password: string;
  avatarUrl?: string;
}

export type RegisterInput = Omit<RegisteredUser, "password"> & {
  password: string;
};

export type AuthResult = {
  ok: boolean;
  error?: string;
  needsConfirmation?: boolean;
};

interface AuthState {
  user: User | null;
  currentUser: RegisteredUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  register: (input: RegisterInput) => Promise<AuthResult>;
  login: (email: string, password: string) => Promise<AuthResult>;
  logout: () => Promise<void>;
  setCurrentUser: (user: RegisteredUser | null) => void;
}

function toProfile(user: User | null): RegisteredUser | null {
  if (!user) return null;
  const m = (user.user_metadata ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  return {
    fullName: str(m.full_name) || str(m.fullName),
    academicProgram: str(m.academic_program) || str(m.academicProgram),
    email: user.email ?? "",
    password: "",
    avatarUrl: str(m.avatar_url) || undefined,
  };
}

async function enrichWithProfile(user: User | null): Promise<RegisteredUser | null> {
  const base = toProfile(user);
  if (!base || !user?.id) return base;
  try {
    const p = await fetchProfile(user.id);
    if (p) {
      return {
        ...base,
        fullName: p.fullName || base.fullName,
        academicProgram: p.academicProgram || base.academicProgram,
        email: p.email || base.email,
        avatarUrl: p.avatarUrl || base.avatarUrl,
      };
    }
  } catch (err) {
    console.warn("[authStore] fetchProfile failed, falling back to user_metadata", err);
  }
  return base;
}

export const useAuthStore = create<AuthState>()((set) => {
  supabase.auth.getSession().then(async ({ data }) => {
    const u = data.session?.user ?? null;
    const enriched = await enrichWithProfile(u);
    set({
      user: u,
      currentUser: enriched,
      isAuthenticated: Boolean(u),
      loading: false,
    });
  });

  supabase.auth.onAuthStateChange(async (_event, session: Session | null) => {
    const u = session?.user ?? null;
    const enriched = await enrichWithProfile(u);
    set({
      user: u,
      currentUser: enriched,
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

      if (data.session) {
        const enriched = await enrichWithProfile(data.user ?? null);
        set({
          user: data.user ?? null,
          currentUser: enriched,
          isAuthenticated: true,
        });
        return { ok: true };
      }
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
      const enriched = await enrichWithProfile(data.user);
      set({
        user: data.user,
        currentUser: enriched,
        isAuthenticated: true,
      });
      return { ok: true };
    },

    logout: async () => {
      await supabase.auth.signOut();
      set({ user: null, currentUser: null, isAuthenticated: false });
    },
    setCurrentUser: (user) => set({ currentUser: user }),
  };
});

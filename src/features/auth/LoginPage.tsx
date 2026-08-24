import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { LogIn } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { z } from "zod";

import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { useAuthStore } from "@/store/authStore";
import { AuthLayout } from "./AuthLayout";
import { useOnlineAction } from "@/hooks/useOnlineAction";

/** Validation schema for the login form. */
const loginSchema = z.object({
  email: z.string().email("Correo no válido").min(1, "Ingresa tu correo"),
  password: z.string().min(1, "Ingresa tu contraseña").min(6, "Mínimo 6 caracteres"),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [authError, setAuthError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginValues) => {
    const { ensureOnline } = useOnlineAction();
    if (!ensureOnline()) return;
    // Authenticate against Supabase Auth.
    const result = await login(values.email, values.password);
    if (!result.ok) {
      setAuthError(result.error ?? "Correo o contraseña incorrectos.");
      return;
    }
    navigate("/");
  };

  return (
    <AuthLayout>
      <div className="rounded-2xl border border-white/10 bg-forest-900/70 p-5 backdrop-blur">
        <h1 className="mb-1 text-2xl font-bold text-slate-50">Inicia sesión</h1>
        <p className="mb-5 text-sm text-slate-300">
          Explora y comparte avistamientos de biodiversidad.
        </p>

        {authError && (
          <p
            role="alert"
            className="mb-4 rounded-xl border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-300"
          >
            {authError}
          </p>
        )}

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
          noValidate
          onChange={() => setAuthError(null)}
        >
          <TextField
            label="Correo"
            type="email"
            autoComplete="email"
            placeholder="tu@correo.com"
            error={errors.email?.message}
            {...register("email")}
          />
          <TextField
            label="Contraseña"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            error={errors.password?.message}
            {...register("password")}
          />
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            <LogIn size={18} /> Entrar
          </Button>
        </form>
      </div>

      <p className="mt-5 text-center text-sm text-slate-300">
        ¿No tienes cuenta?{" "}
        <Link to="/register" className="font-semibold text-bio-400">
          Crear cuenta
        </Link>
      </p>
    </AuthLayout>
  );
}

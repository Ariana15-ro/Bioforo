import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { UserPlus } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { z } from "zod";

import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { useAuthStore } from "@/store/authStore";
import { AuthLayout } from "./AuthLayout";
import { useOnlineAction } from "@/hooks/useOnlineAction";

/** Validation schema for the register form. */
const registerSchema = z
  .object({
    fullName: z.string().min(2, "Ingresa tu nombre completo"),
    academicProgram: z.string().min(2, "Indica tu programa académico"),
    email: z.string().email("Correo no válido").min(1, "Ingresa tu correo"),
    password: z.string().min(6, "Mínimo 6 caracteres"),
    confirmPassword: z.string().min(1, "Confirma tu contraseña"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

type RegisterValues = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const navigate = useNavigate();
  const register = useAuthStore((s) => s.register);
  const [authError, setAuthError] = useState<string | null>(null);

  const {
    register: registerField,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (values: RegisterValues) => {
    const { ensureOnline } = useOnlineAction();
    if (!ensureOnline()) return;
    // Create the account in Supabase Auth; auto-logs in on success.
    const result = await register({
      fullName: values.fullName,
      academicProgram: values.academicProgram,
      email: values.email,
      password: values.password,
    });
    if (!result.ok) {
      setAuthError(result.error ?? "No se pudo completar el registro.");
      return;
    }
    navigate("/");
  };

  return (
    <AuthLayout>
      <div className="rounded-2xl border border-white/10 bg-forest-900/70 p-5 backdrop-blur">
        <h1 className="mb-1 text-2xl font-bold text-slate-50">Crea tu cuenta</h1>
        <p className="mb-5 text-sm text-slate-300">
          Únete a la comunidad de BioForo.
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
            label="Nombre completo"
            autoComplete="name"
            placeholder="Ana Exploradora"
            error={errors.fullName?.message}
            {...registerField("fullName")}
          />
          <TextField
            label="Programa académico"
            placeholder="Biología / Ingeniería Forestal…"
            error={errors.academicProgram?.message}
            {...registerField("academicProgram")}
          />
          <TextField
            label="Correo"
            type="email"
            autoComplete="email"
            placeholder="tu@correo.com"
            error={errors.email?.message}
            {...registerField("email")}
          />
          <TextField
            label="Contraseña"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            error={errors.password?.message}
            {...registerField("password")}
          />
          <TextField
            label="Confirmar contraseña"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            error={errors.confirmPassword?.message}
            {...registerField("confirmPassword")}
          />
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            <UserPlus size={18} /> Registrarme
          </Button>
        </form>
      </div>

      <p className="mt-5 text-center text-sm text-slate-300">
        ¿Ya tienes cuenta?{" "}
        <Link to="/login" className="font-semibold text-bio-400">
          Iniciar sesión
        </Link>
      </p>
    </AuthLayout>
  );
}

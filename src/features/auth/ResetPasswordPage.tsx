import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { AuthLayout } from "./AuthLayout";
import { useOnlineAction } from "@/hooks/useOnlineAction";
import { supabase } from "@/lib/supabase";

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { ensureOnline } = useOnlineAction();
    if (!ensureOnline()) return;

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(updateError.message ?? "No se pudo actualizar la contraseña.");
        return;
      }

      toast.success("Contraseña actualizada. Ahora puedes iniciar sesión.");
      navigate("/login");
    } catch {
      setError("No se pudo actualizar la contraseña.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <div className="rounded-2xl border border-white/10 bg-forest-900/70 p-5 backdrop-blur">
        <h1 className="mb-1 text-2xl font-bold text-slate-50">Nueva contraseña</h1>
        <p className="mb-5 text-sm text-slate-300">
          Ingresa tu nueva contraseña para continuar.
        </p>

        {error && (
          <p
            role="alert"
            className="mb-4 rounded-xl border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-300"
          >
            {error}
          </p>
        )}

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <TextField
            label="Nueva contraseña"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <TextField
            label="Confirmar contraseña"
            type="password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Guardando..." : "Actualizar contraseña"}
          </Button>
        </form>
      </div>
    </AuthLayout>
  );
}

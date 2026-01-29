
"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { api } from "~/trpc/react";

function VerifyContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const router = useRouter();
  const [status, setStatus] = useState("Verificando...");

  const verifyMutation = api.auth.verifyEmail.useMutation({
    onSuccess: () => {
      setStatus("✅ E-mail verificado com sucesso! Redirecionando...");
      setTimeout(() => router.push(""), 3000); // Vai para o login
    },
    onError: (err) => {
      setStatus("❌ Erro ao verificar: " + err.message);
    }
  });

  useEffect(() => {
    if (token) {
      verifyMutation.mutate({ token });
    } else {
      setStatus("Token não encontrado.");
    }
  }, [token]);

  return (
    <div className="h-screen flex items-center justify-center">
      <h1 className="text-xl font-bold">{status}</h1>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <VerifyContent />
    </Suspense>
  );
}
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { api } from "~/trpc/react";
import { useRouter } from "next/navigation";

export function AuthForm() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  // Mutação para criar conta
  const registerMutation = api.auth.register.useMutation({
    onSuccess: () => {
      alert("Conta criada com sucesso! Agora faça login.");
      setIsLogin(true); // Muda para a aba de login
      setLoading(false);
    },
    onError: (error) => {
      alert(error.message);
      setLoading(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isLogin) {
      // --- LOGIN ---
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });


      if (result?.error) {
          let msg = "";
          
          // Agora o result.error vai conter o "code" que definimos no config.ts
          // ou "CredentialsSignin" dependendo da versão exata do beta
          
          // Vamos verificar o erro retornado
          switch (result.code) {
            case "EMAIL_NOT_VERIFIED":
              msg = "Por favor, acesse seu e-mail e confirme sua conta antes de entrar.";
              break;
            case "INVALID_CREDENTIALS":
              msg = "E-mail ou senha incorretos.";
              break;
            case "Configuration":
              // Se ainda der Configuration, é algo inesperado
              msg = "Erro interno no servidor.";
              break;
            default:
              // Às vezes o NextAuth v5 manda o erro como "CredentialsSignin"
              // Se você inspecionar o objeto result, o 'code' pode estar lá dentro
              msg = "Erro ao fazer login. Verifique seus dados.";
          }

     // if (result?.error) {
        console.log(result);
        alert("Erro: " + msg);
        setLoading(false);
      } else {
        router.refresh(); // Recarrega a página para o servidor liberar o acesso
      }
    } else {
      // --- CADASTRO ---
      registerMutation.mutate({ name, email, password });
    }
  };

  return (
    <div className="bg-white p-8 rounded-lg shadow-xl w-96 border border-gray-200">
      <h2 className="text-3xl font-bold mb-6 text-center text-blue-900">
        {isLogin ? "Acessar Sistema" : "Criar Conta"}
      </h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {!isLogin && (
          <input
            type="text"
            placeholder="Seu Nome Completo"
            className="border p-3 rounded bg-gray-50 text-black"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        )}
        
        <input
          type="email"
          placeholder="seu@email.com"
          className="border p-3 rounded bg-gray-50 text-black"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        
        <input
          type="password"
          placeholder="Sua senha"
          className="border p-3 rounded bg-gray-50 text-black"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white py-3 rounded hover:bg-blue-700 transition font-bold text-lg disabled:opacity-50"
        >
          {loading ? "Processando..." : (isLogin ? "Entrar" : "Cadastrar-se")}
        </button>
      </form>

      <div className="mt-6 text-center border-t pt-4">
        <button
          onClick={() => setIsLogin(!isLogin)}
          className="text-sm text-blue-600 hover:underline"
        >
          {isLogin ? "Não tem cadastro? Crie agora" : "Já tem conta? Fazer Login"}
        </button>
      </div>
    </div>
  );
}
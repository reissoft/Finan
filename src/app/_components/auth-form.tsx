"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { api } from "~/trpc/react";
import { useRouter } from "next/navigation";

export function AuthForm() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  
  // Estados do formulário
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  // NOVO: Estado para mensagem de sucesso
  const [successMsg, setSuccessMsg] = useState("");

  // Mutação para criar conta
  const registerMutation = api.auth.register.useMutation({
    onSuccess: () => {
      // 1. Removemos o alert
      // 2. Definimos a mensagem bonita
      setSuccessMsg("Conta criada com sucesso, verifique seu email para validar sua conta.");
      
      setIsLogin(true); // Muda para a aba de login
      setLoading(false);
      
      // Limpa os campos para o usuário digitar o login (opcional)
      setPassword("");
    },
    onError: (error) => {
      alert(error.message); // Você pode fazer o mesmo sistema para erros depois
      setLoading(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg(""); // Limpa mensagem de sucesso ao tentar logar

    if (isLogin) {
      // --- LOGIN ---
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
          let msg = "";
          
          switch (result.code) {
            case "EMAIL_NOT_VERIFIED":
              msg = "Por favor, acesse seu e-mail e confirme sua conta antes de entrar.";
              break;
            case "INVALID_CREDENTIALS":
              msg = "E-mail ou senha incorretos.";
              break;
            case "Configuration":
              msg = "Erro interno no servidor.";
              break;
            default:
              msg = "Erro ao fazer login. Verifique seus dados.";
          }

        console.log(result);
        alert("Erro: " + msg); // Depois podemos melhorar esse alert também
        setLoading(false);
      } else {
        router.refresh(); 
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

      {/* --- AQUI ESTÁ O NOVO AVISO BONITO --- */}
      {successMsg && (
        <div className="mb-4 p-4 text-sm text-green-700 bg-green-100 rounded-lg border border-green-200 flex items-start gap-2 animate-pulse">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mt-0.5 shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {!isLogin && (
          <input
            type="text"
            placeholder="Seu Nome Completo"
            className="border p-3 rounded bg-gray-50 text-black focus:ring-2 focus:ring-blue-500 outline-none"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        )}
        
        <input
          type="email"
          placeholder="seu@email.com"
          className="border p-3 rounded bg-gray-50 text-black focus:ring-2 focus:ring-blue-500 outline-none"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        
        <input
          type="password"
          placeholder="Sua senha"
          className="border p-3 rounded bg-gray-50 text-black focus:ring-2 focus:ring-blue-500 outline-none"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white py-3 rounded hover:bg-blue-700 transition font-bold text-lg disabled:opacity-50 mt-2"
        >
          {loading ? "Processando..." : (isLogin ? "Entrar" : "Cadastrar-se")}
        </button>
      </form>

      <div className="mt-6 text-center border-t pt-4">
        <button
          onClick={() => {
            setIsLogin(!isLogin);
            setSuccessMsg(""); // Limpa mensagem se trocar de aba
          }}
          className="text-sm text-blue-600 hover:underline"
        >
          {isLogin ? "Não tem cadastro? Crie agora" : "Já tem conta? Fazer Login"}
        </button>
      </div>
    </div>
  );
}
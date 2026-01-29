"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { api } from "~/trpc/react";
import { useRouter } from "next/navigation";

// --- COMPONENTE DO MODAL DE LOGIN/CADASTRO ---
function LoginFormContent({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const registerMutation = api.auth.register.useMutation({
    onSuccess: () => {
      setSuccessMsg("Conta criada! Verifique seu email.");
      setIsLogin(true);
      setLoading(false);
      setPassword("");
    },
    onError: (error) => {
      alert(error.message);
      setLoading(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg("");

    if (isLogin) {
      const result = await signIn("credentials", { redirect: false, email, password });
      if (result?.error) {
          let msg = "";
          switch (result.code) {
            case "EMAIL_NOT_VERIFIED": msg = "Confirme seu e-mail antes de entrar."; break;
            case "INVALID_CREDENTIALS": msg = "E-mail ou senha incorretos."; break;
            default: msg = "Erro ao fazer login.";
          }
        alert("Erro: " + msg);
        setLoading(false);
      } else {
        router.refresh(); 
      }
    } else {
      registerMutation.mutate({ name, email, password });
    }
  };

  return (
    <div className="bg-white p-6 md:p-8 rounded-2xl shadow-2xl w-full max-w-sm border border-gray-100 relative animate-in fade-in zoom-in duration-300 mx-4">
      <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600">✕</button>

      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-blue-900">{isLogin ? "Bem-vindo" : "Criar Conta"}</h2>
        <p className="text-gray-500 text-xs mt-1">{isLogin ? "Acesse o painel da igreja" : "Comece grátis agora"}</p>
      </div>

      {successMsg && (
        <div className="mb-4 p-2 text-xs text-green-700 bg-green-50 rounded border border-green-200">
          ✅ {successMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {!isLogin && (
          <input type="text" placeholder="Nome Completo" className="input-style" value={name} onChange={(e) => setName(e.target.value)} required />
        )}
        <input type="email" placeholder="seu@email.com" className="input-style" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="Senha" className="input-style" value={password} onChange={(e) => setPassword(e.target.value)} required />

        <button type="submit" disabled={loading} className="bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 transition font-bold text-sm disabled:opacity-50 mt-2">
          {loading ? "Carregando..." : (isLogin ? "Entrar" : "Cadastrar")}
        </button>
      </form>

      <div className="mt-4 text-center border-t pt-3">
        <button onClick={() => { setIsLogin(!isLogin); setSuccessMsg(""); }} className="text-xs text-blue-600 hover:underline">
          {isLogin ? "Não tem conta? Cadastre-se" : "Já tem conta? Fazer Login"}
        </button>
      </div>
    </div>
  );
}

// --- LANDING PAGE (Ocupa a tela toda) ---
export function AuthForm() {
  const [showLogin, setShowLogin] = useState(false);

  return (
    <div className="fixed inset-0 bg-white z-[9999] overflow-y-auto font-sans text-gray-800">
      
      {/* HEADER FIXO */}
      <header className="sticky top-0 bg-white/90 backdrop-blur-md border-b border-gray-100 z-10 shadow-sm">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⛪</span>
            <span className="font-bold text-lg text-blue-900">Finan Igreja</span>
          </div>
          <button onClick={() => setShowLogin(true)} className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-5 py-2 rounded-full font-medium transition">
            Área do Cliente
          </button>
        </div>
      </header>

      {/* HERO SECTION */}
      <main className="container mx-auto px-6 py-16 md:py-24 text-center">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-extrabold text-blue-900 mb-4 leading-tight">
            Gestão Financeira <br className="hidden md:block" />
            <span className="text-blue-600">Simples e Automática</span>
          </h1>
          <p className="text-base md:text-lg text-gray-600 mb-8 max-w-xl mx-auto leading-relaxed">
            Abandone as planilhas. Lance dízimos e ofertas pelo WhatsApp com Inteligência Artificial e tenha relatórios em tempo real.
          </p>
          <button onClick={() => setShowLogin(true)} className="bg-green-600 hover:bg-green-700 text-white text-base px-8 py-3 rounded-full font-bold transition shadow-lg hover:shadow-green-500/30 transform hover:-translate-y-1">
            Começar Gratuitamente 🚀
          </button>
        </div>

        {/* COMPARAÇÃO DE PREÇOS (GRID AJUSTADO) */}
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-6 mt-16 items-stretch">
          
          {/* FREE PLAN */}
          <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 relative hover:border-blue-200 transition flex flex-col h-full">
            <h3 className="text-xl font-bold text-gray-800">Plano Grátis</h3>
            <p className="text-gray-500 text-sm mb-4">Ideal para começar.</p>
            <div className="text-3xl font-extrabold text-gray-900 mb-6">R$ 0<span className="text-sm font-normal text-gray-500">/mês</span></div>
            
            <ul className="space-y-3 mb-8 text-sm text-left mx-auto w-full max-w-[200px]">
              <li className="flex items-center gap-2"><span className="text-green-500 font-bold">✓</span> Max 50 membros</li>
              <li className="flex items-center gap-2"><span className="text-green-500 font-bold">✓</span> Max 30 contas/mês</li>
              <li className="flex items-center gap-2"><span className="text-green-500 font-bold">✓</span> Acesso limitado aos relatórios</li>
              <li className="flex items-center gap-2 text-gray-400"><span className="text-red-300 font-bold">✕</span> Sem IA no Zap</li>
            </ul>
            
            {/* mt-auto empurra o botão para o final do card */}
            <button onClick={() => setShowLogin(true)} className="mt-auto w-full py-2 border border-blue-600 text-blue-600 font-bold rounded-lg hover:bg-blue-50 text-sm">
              Criar Conta Grátis
            </button>
          </div>

          {/* PRO PLAN */}
          <div className="bg-gradient-to-b from-blue-50 to-white p-6 rounded-2xl shadow-xl border border-blue-200 relative flex flex-col h-full transform hover:scale-[1.02] transition-transform duration-300">
            <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2 py-1 rounded-bl-lg rounded-tr-lg">MAIS POPULAR</div>
            <h3 className="text-xl font-bold text-gray-800">Plano Pro</h3>
            <p className="text-gray-500 text-sm mb-4">Para igrejas em crescimento.</p>
            <div className="text-3xl font-extrabold text-blue-600 mb-6">R$ 49,90<span className="text-sm font-normal text-gray-500">/mês</span></div>
            
            <ul className="space-y-3 mb-8 text-sm text-left mx-auto w-full max-w-[200px]">
              <li className="flex items-center gap-2 font-medium"><span className="text-blue-600 font-bold">∞</span> Membros Ilimitados</li>
              <li className="flex items-center gap-2 font-medium"><span className="text-blue-600 font-bold">∞</span> Contas Ilimitadas</li>
              <li className="flex items-center gap-2 font-medium"><span className="text-blue-600 font-bold">∞</span> Acessos Ilimitados aos relatórios</li>
              <li className="flex items-center gap-2 font-medium"><span className="text-green-600 font-bold">🤖</span> IA no WhatsApp</li>
            </ul>
            
            {/* mt-auto empurra o botão para o final do card */}
            <button onClick={() => setShowLogin(true)} className="mt-auto w-full py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-md text-sm">
              Testar Agora
            </button>
          </div>

        </div>
      </main>

      {/* FOOTER */}
      <footer className="bg-gray-50 py-8 text-center text-sm text-gray-400 border-t border-gray-100 mt-12">
        <p>© 2026 Finan Igreja. Feito com ❤️ para o Reino.</p>
      </footer>

      {/* MODAL OVERLAY */}
      {showLogin && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="absolute inset-0" onClick={() => setShowLogin(false)}></div>
          <div className="relative z-10 w-full max-w-sm">
            <LoginFormContent onClose={() => setShowLogin(false)} />
          </div>
        </div>
      )}

      <style jsx>{`
        .input-style {
          @apply border p-3 rounded-lg bg-gray-50 text-black text-sm focus:ring-2 focus:ring-blue-500 outline-none transition w-full;
        }
      `}</style>
    </div>
  );
}
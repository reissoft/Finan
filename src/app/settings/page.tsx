"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "~/trpc/react";

export default function SettingsPage() {
  // --- STATES DA ORGANIZAÇÃO ---
  const [orgName, setOrgName] = useState("");
  const [orgDesc, setOrgDesc] = useState("");
  const [orgLogo, setOrgLogo] = useState("");
  const [orgCity, setOrgCity] = useState("");
  const [orgState, setOrgState] = useState("");

  // --- STATES DE CATEGORIAS/CONTAS ---
  const [catName, setCatName] = useState("");
  const [catType, setCatType] = useState<"INCOME" | "EXPENSE">("INCOME");
  const [accName, setAccName] = useState("");

  // BUSCA DADOS
  const { data, refetch } = api.settings.getAll.useQuery();

  // EFEITO: Carrega os dados
  useEffect(() => {
    if (data?.tenant) {
      setOrgName(data.tenant.name);
      setOrgDesc(data.tenant.description ?? "");
      setOrgLogo(data.tenant.logoUrl ?? "");
      setOrgCity(data.tenant.city ?? "");
      setOrgState(data.tenant.state ?? "");
    }
  }, [data]);

  // --- MUTATIONS ---
  
  // 1. Atualizar Igreja
  const updateTenant = api.settings.updateTenant.useMutation({
    onSuccess: () => {
      void refetch();
      alert("Dados da organização atualizados!");
    }
  });

  // 2. Categorias e Contas
  const createCat = api.settings.createCategory.useMutation({ onSuccess: () => { void refetch(); setCatName(""); } });
  const deleteCat = api.settings.deleteCategory.useMutation({ onSuccess: () => void refetch(), onError: () => alert("Em uso.") });
  const createAcc = api.settings.createAccount.useMutation({ onSuccess: () => { void refetch(); setAccName(""); } });
  const deleteAcc = api.settings.deleteAccount.useMutation({ onSuccess: () => void refetch(), onError: () => alert("Em uso.") });

  // 3. PAGAMENTO (STRIPE) - NOVO!
  const checkoutMutation = api.stripe.createCheckoutSession.useMutation();
  const portalMutation = api.stripe.createPortalSession.useMutation();

  const handleManageSubscription = async () => {
    try {
        const { url } = await portalMutation.mutateAsync();
        if (url) window.location.href = url;
    } catch (error) {
        alert("Erro ao abrir portal. Contate o suporte.");
    }
}
  // --- HANDLERS ---
  const handleUpdateOrg = (e: React.FormEvent) => {
    e.preventDefault();
    updateTenant.mutate({
      name: orgName, description: orgDesc, logoUrl: orgLogo, city: orgCity, state: orgState
    });
  }

  // Função que chama o Stripe e redireciona
  const handleUpgrade = async () => {
    try {
        const { url } = await checkoutMutation.mutateAsync();
        if (url) {
            window.location.href = url; // Leva o usuário para o pagamento
        }
    } catch (error) {
        alert("Erro ao iniciar pagamento. Tente novamente.");
    }
  }

  return (
    <main className="min-h-screen bg-gray-100 p-8 flex flex-col items-center">
      <div className="w-full max-w-5xl space-y-8">
        
        {/* Cabeçalho */}
        <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-blue-900">Configurações ⚙️</h1>
            <Link href="/" className="text-gray-600 hover:text-blue-600 font-bold">← Voltar</Link>
        </div>

        {/* --- SEÇÃO 1: DADOS DA ORGANIZAÇÃO --- */}
        <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-blue-600">
            <h2 className="text-xl font-bold mb-6 text-gray-800 border-b pb-2">Minha Igreja</h2>
            
            <form onSubmit={handleUpdateOrg} className="flex flex-col md:flex-row gap-8">
                {/* Lado Esquerdo: Campos */}
                <div className="flex-1 space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Nome da Organização</label>
                        <input type="text" className="border p-2 rounded w-full text-black" value={orgName} onChange={e => setOrgName(e.target.value)} required />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Descrição / Lema</label>
                        <textarea className="border p-2 rounded w-full text-black h-20 resize-none" placeholder="Ex: Uma igreja família..." value={orgDesc} onChange={e => setOrgDesc(e.target.value)} />
                    </div>
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="block text-sm font-bold text-gray-700 mb-1">Cidade</label>
                            <input type="text" placeholder="Ex: Jacobina" className="border p-2 rounded w-full text-black" value={orgCity} onChange={e => setOrgCity(e.target.value)} />
                        </div>
                        <div className="w-24">
                            <label className="block text-sm font-bold text-gray-700 mb-1">UF</label>
                            <input type="text" maxLength={2} placeholder="BA" className="border p-2 rounded w-full text-black uppercase" value={orgState} onChange={e => setOrgState(e.target.value.toUpperCase())} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Link do Logotipo (URL)</label>
                        <input type="url" placeholder="https://..." className="border p-2 rounded w-full text-black" value={orgLogo} onChange={e => setOrgLogo(e.target.value)} />
                    </div>
                    <button type="submit" disabled={updateTenant.isPending} className="bg-blue-600 text-white px-6 py-2 rounded font-bold hover:bg-blue-700">
                        {updateTenant.isPending ? "Salvando..." : "Salvar Alterações"}
                    </button>
                </div>

                {/* Lado Direito: Preview do Logo */}
                <div className="w-full md:w-64 flex flex-col items-center justify-center p-4 bg-gray-50 rounded border border-dashed border-gray-300">
                    <span className="text-xs text-gray-400 mb-2">Pré-visualização</span>
                    {orgLogo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={orgLogo} alt="Logo Preview" className="w-32 h-32 object-contain rounded-full bg-white shadow-sm border" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    ) : (
                        <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-4xl">⛪</div>
                    )}
                </div>
            </form>
        </div>

        {/* --- SEÇÃO NOVA: ASSINATURA E PLANO --- */}
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 p-6 rounded-lg shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-xl font-bold text-yellow-900">Plano Atual</h2>
                    {data?.tenant?.plan === "PRO" ? (
                        <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-full font-bold shadow-sm">⭐ PRO ATIVO</span>
                    ) : (
                        <span className="bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded-full font-bold">GRÁTIS</span>
                    )}
                </div>
                
                {data?.tenant?.plan === "FREE" ? (
                    <p className="text-yellow-800 text-sm">
                        Você está no plano Grátis. Faça o upgrade para remover limites de membros, desbloquear o balancete completo e usar o contas a pagar.
                    </p>
                ) : (
                    <p className="text-yellow-800 text-sm">
                        Obrigado por ser PRO! Você tem acesso ilimitado a todos os recursos do sistema.
                    </p>
                )}
            </div>

            {data?.tenant?.plan === "FREE" && (
                <button 
                    onClick={handleUpgrade}
                    disabled={checkoutMutation.isPending}
                    className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white px-8 py-3 rounded-full font-bold shadow-lg transform transition hover:scale-105 flex items-center gap-2 whitespace-nowrap"
                >
                    {checkoutMutation.isPending ? "Carregando..." : "🚀 VIRAR PRO AGORA"}
                </button>
            )}
            
            {/* Se já for PRO, mostra botão de gerenciar (Opcional, levaria para o Portal do Cliente Stripe) */}
            {data?.tenant?.plan === "PRO" && (
                <button 
        onClick={handleManageSubscription} // <--- ADICIONE ISSO AQUI
        disabled={portalMutation.isPending}
        className="bg-white border border-yellow-500 text-yellow-700 px-6 py-2 rounded-full font-bold hover:bg-yellow-50"
    >
        {portalMutation.isPending ? "Carregando..." : "Gerenciar Assinatura"}
    </button>
            )}
        </div>

        {/* --- SEÇÃO 2: CATEGORIAS E CONTAS --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* COLUNA: CATEGORIAS */}
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold mb-4 text-gray-800 border-b pb-2">Categorias Financeiras</h2>
                <form onSubmit={(e) => { e.preventDefault(); createCat.mutate({ name: catName, type: catType }); }} className="flex gap-2 mb-6">
                    <input className="border p-2 rounded flex-1 text-black" placeholder="Nova Categoria..." value={catName} onChange={e => setCatName(e.target.value)} required />
                    <select className="border p-2 rounded text-black" value={catType} onChange={(e) => setCatType(e.target.value as "INCOME" | "EXPENSE")}>
                        <option value="INCOME">Entrada</option>
                        <option value="EXPENSE">Saída</option>
                    </select>
                    <button type="submit" disabled={createCat.isPending} className="bg-green-600 text-white px-4 rounded font-bold">+</button>
                </form>

                <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
                    {data?.categories.map(c => (
                        <li key={c.id} className="flex justify-between items-center p-2 hover:bg-gray-50 border rounded">
                            <span className="text-gray-700 text-sm">
                                {c.name} 
                                <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded ${c.type === 'INCOME' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {c.type === 'INCOME' ? 'ENTRADA' : 'SAÍDA'}
                                </span>
                            </span>
                            <button onClick={() => { if(confirm("Apagar?")) void deleteCat.mutate({ id: c.id }) }} className="text-red-400 hover:text-red-600 text-sm">🗑️</button>
                        </li>
                    ))}
                </ul>
            </div>

            {/* COLUNA: CONTAS BANCÁRIAS */}
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold mb-4 text-gray-800 border-b pb-2">Contas / Caixas</h2>
                <form onSubmit={(e) => { e.preventDefault(); createAcc.mutate({ name: accName }); }} className="flex gap-2 mb-6">
                    <input className="border p-2 rounded flex-1 text-black" placeholder="Nome da Conta..." value={accName} onChange={e => setAccName(e.target.value)} required />
                    <button type="submit" disabled={createAcc.isPending} className="bg-blue-600 text-white px-4 rounded font-bold">+</button>
                </form>

                <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
                    {data?.accounts.map(a => (
                        <li key={a.id} className="flex justify-between items-center p-2 hover:bg-gray-50 border rounded">
                            <span className="text-gray-700 text-sm font-medium">🏦 {a.name}</span>
                            <button onClick={() => { if(confirm("Apagar?")) void deleteAcc.mutate({ id: a.id }) }} className="text-red-400 hover:text-red-600 text-sm">🗑️</button>
                        </li>
                    ))}
                </ul>
            </div>

        </div>
      </div>
    </main>
  );
}
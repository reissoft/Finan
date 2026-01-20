"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "~/trpc/react";

export default function MembersPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");

  const { data: members, refetch } = api.member.getAll.useQuery();

  const createMutation = api.member.create.useMutation({
    onSuccess: () => {
      alert("Membro cadastrado!");
      refetch(); // Atualiza a lista
      setName("");
      setPhone("");
      setBirthDate("");
    },
    onError: (e) => alert("Erro: " + e.message),
  });

  const deleteMutation = api.member.delete.useMutation({
    onSuccess: () => refetch(),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({ 
        name, 
        phone, 
        // Se a data estiver vazia, manda undefined, senão manda a data
        birthDate: birthDate ? new Date(birthDate) : undefined 
    });
  };

  return (
    <main className="min-h-screen bg-gray-100 p-8 flex flex-col items-center">
      <div className="w-full max-w-4xl">
        
        {/* Cabeçalho */}
        <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-blue-900">Gerenciar Membros 👥</h1>
            <Link href="/" className="text-gray-600 hover:text-blue-600 font-bold">
                ← Voltar
            </Link>
        </div>

        {/* Formulário */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
            <h2 className="text-xl font-semibold mb-4">Novo Cadastro</h2>
            <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4">
                <input 
                    type="text" 
                    placeholder="Nome Completo" 
                    className="border p-2 rounded flex-1 text-black"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                />
                <input 
                    type="text" 
                    placeholder="Telefone" 
                    className="border p-2 rounded w-40 text-black"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                />
                {/* Campo de Data de Nascimento */}
                <div className="flex flex-col">
                    <span className="text-xs text-gray-500 mb-1">Nascimento</span>
                    <input 
                        type="date" 
                        className="border p-2 rounded text-black"
                        value={birthDate}
                        onChange={(e) => setBirthDate(e.target.value)}
                    />
                </div>

                <button 
                    type="submit" 
                    disabled={createMutation.isPending}
                    className="bg-blue-600 text-white px-6 py-2 rounded font-bold hover:bg-blue-700"
                >
                    {createMutation.isPending ? "..." : "Salvar"}
                </button>
            </form>
        </div>

        {/* Lista */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <table className="w-full text-left">
                <thead className="bg-gray-50 border-b">
                    <tr>
                        <th className="p-4 text-gray-600">Nome</th>
                        <th className="p-4 text-gray-600">Contato</th>
                        <th className="p-4 text-gray-600">Nascimento</th>
                        <th className="p-4 text-gray-600 text-right">Ações</th>
                    </tr>
                </thead>
                <tbody>
                    {members?.length === 0 ? (
                        <tr><td colSpan={4} className="p-8 text-center text-gray-500">Nenhum membro encontrado.</td></tr>
                    ) : (
                        members?.map((m) => (
                            <tr key={m.id} className="border-b hover:bg-gray-50">
                                <td className="p-4 font-bold text-gray-800">{m.name}</td>
                                <td className="p-4 text-gray-600">{m.phone || "-"}</td>
                                <td className="p-4 text-gray-600">
                                    {m.birthDate ? m.birthDate.toLocaleDateString() : "-"}
                                </td>
                                <td className="p-4 text-right">
                                    <button 
                                        onClick={() => {
                                            if(confirm("Deseja excluir?")) deleteMutation.mutate({ id: m.id })
                                        }}
                                        className="text-red-500 hover:text-red-700 font-bold text-sm"
                                    >
                                        Excluir
                                    </button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </main>
  );
}
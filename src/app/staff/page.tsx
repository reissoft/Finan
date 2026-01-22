"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "~/trpc/react";

export default function StaffPage() {
  // Dados Pessoais
  const [name, setName] = useState("");
  const [roleId, setRoleId] = useState("");
  const [phone, setPhone] = useState("");
  
  // Dados Financeiros
  const [isSalaried, setIsSalaried] = useState(false);
  const [salary, setSalary] = useState("");
  const [inss, setInss] = useState("");
  const [fgts, setFgts] = useState("");
  const [otherTaxes, setOtherTaxes] = useState(""); 
  const [paymentDay, setPaymentDay] = useState(""); // Novo State

  // Auxiliares de Cargo
  const [isCreatingRole, setIsCreatingRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");

  const { data: staff, refetch: refetchStaff } = api.staff.getAll.useQuery();
  const { data: roles, refetch: refetchRoles } = api.staff.getRoles.useQuery();

  const createStaff = api.staff.create.useMutation({
    onSuccess: () => {
      void refetchStaff();
      // Limpa tudo
      setName(""); setRoleId(""); setPhone("");
      setIsSalaried(false); 
      setSalary(""); setInss(""); setFgts(""); setOtherTaxes(""); setPaymentDay("");
      alert("Colaborador salvo com sucesso!");
    },
  });

  const createRole = api.staff.createRole.useMutation({
    onSuccess: (data) => {
        void refetchRoles();
        setRoleId(data.id);
        setIsCreatingRole(false);
        setNewRoleName("");
    }
  });

  const deleteStaff = api.staff.delete.useMutation({
    onSuccess: () => void refetchStaff(),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createStaff.mutate({
        name,
        roleId,
        phone,
        isSalaried,
        salary: salary ? parseFloat(salary) : 0,
        inss: inss ? parseFloat(inss) : 0,
        fgts: fgts ? parseFloat(fgts) : 0,
        otherTaxes: otherTaxes ? parseFloat(otherTaxes) : 0,
        paymentDay: paymentDay ? parseInt(paymentDay) : undefined,
    });
  };

  const handleCreateRole = () => {
      if(!newRoleName) return;
      createRole.mutate({ name: newRoleName });
  }

  return (
    <main className="min-h-screen bg-gray-100 p-8 flex flex-col items-center">
      <div className="w-full max-w-5xl">
        
        <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-blue-900">Equipe & RH 👔</h1>
            <Link href="/" className="text-gray-600 hover:text-blue-600 font-bold">← Voltar</Link>
        </div>

        {/* Formulário */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 border-b pb-2">Novo Colaborador</h2>
            
            <form onSubmit={handleSubmit}>
                {/* Linha 1: Dados Básicos */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <input 
                        type="text" placeholder="Nome Completo" required
                        className="border p-2 rounded text-black w-full"
                        value={name} onChange={(e) => setName(e.target.value)}
                    />
                    
                    {/* Seletor de Cargo Inteligente */}
                    <div className="flex gap-2">
                        {isCreatingRole ? (
                            <div className="flex flex-1 gap-1">
                                <input 
                                    autoFocus
                                    className="border p-2 rounded text-black flex-1 border-blue-500"
                                    placeholder="Nome do cargo..."
                                    value={newRoleName} onChange={e => setNewRoleName(e.target.value)}
                                />
                                <button type="button" onClick={handleCreateRole} className="bg-green-600 text-white px-3 rounded">OK</button>
                                <button type="button" onClick={() => setIsCreatingRole(false)} className="text-red-500 px-2">X</button>
                            </div>
                        ) : (
                            <>
                                <select 
                                    className="border p-2 rounded text-black flex-1"
                                    value={roleId} onChange={(e) => setRoleId(e.target.value)}
                                    required
                                >
                                    <option value="">Selecione o Cargo...</option>
                                    {roles?.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                </select>
                                <button 
                                    type="button" 
                                    onClick={() => setIsCreatingRole(true)}
                                    className="bg-blue-100 text-blue-600 px-3 rounded font-bold hover:bg-blue-200"
                                    title="Criar novo cargo"
                                >
                                    +
                                </button>
                            </>
                        )}
                    </div>

                    <input 
                        type="text" placeholder="Telefone / Celular"
                        className="border p-2 rounded text-black w-full"
                        value={phone} onChange={(e) => setPhone(e.target.value)}
                    />
                </div>

                {/* Checkbox Salário */}
                <div className="mb-4">
                    <label className="flex items-center gap-2 text-gray-700 cursor-pointer w-fit">
                        <input 
                            type="checkbox" 
                            className="w-5 h-5"
                            checked={isSalaried}
                            onChange={(e) => setIsSalaried(e.target.checked)}
                        />
                        <span className="font-semibold">Este colaborador é remunerado?</span>
                    </label>
                </div>

                {/* Linha 2: Dados Financeiros (Só aparece se for remunerado) */}
                {isSalaried && (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 bg-gray-50 rounded border border-gray-200 mb-4 animate-fade-in">
                        <div className="col-span-1">
                            <label className="text-xs text-gray-500">Dia Pagto</label>
                            <input 
                                type="number" min="1" max="31" placeholder="Ex: 5"
                                className="border p-2 rounded text-black w-full"
                                value={paymentDay} onChange={(e) => setPaymentDay(e.target.value)}
                            />
                        </div>
                        <div className="col-span-1">
                            <label className="text-xs text-gray-500">Salário Bruto (R$)</label>
                            <input 
                                type="number" step="0.01" placeholder="0,00"
                                className="border p-2 rounded text-black w-full"
                                value={salary} onChange={(e) => setSalary(e.target.value)}
                            />
                        </div>
                        <div className="col-span-1">
                            <label className="text-xs text-gray-500">INSS (R$)</label>
                            <input 
                                type="number" step="0.01" placeholder="0,00"
                                className="border p-2 rounded text-black w-full"
                                value={inss} onChange={(e) => setInss(e.target.value)}
                            />
                        </div>
                        <div className="col-span-1">
                            <label className="text-xs text-gray-500">FGTS (R$)</label>
                            <input 
                                type="number" step="0.01" placeholder="0,00"
                                className="border p-2 rounded text-black w-full"
                                value={fgts} onChange={(e) => setFgts(e.target.value)}
                            />
                        </div>
                        <div className="col-span-1">
                            <label className="text-xs text-gray-500 font-bold">Taxas Extras (%)</label>
                            <input 
                                type="number" step="0.01" placeholder="0%"
                                className="border p-2 rounded text-black w-full border-blue-200"
                                value={otherTaxes} onChange={(e) => setOtherTaxes(e.target.value)}
                            />
                        </div>
                    </div>
                )}

                <button 
                    type="submit" 
                    disabled={createStaff.isPending}
                    className="bg-green-600 text-white px-8 py-2 rounded font-bold hover:bg-green-700 w-full md:w-auto"
                >
                    {createStaff.isPending ? "Salvando..." : "Cadastrar Colaborador"}
                </button>
            </form>
        </div>

        {/* Tabela de Colaboradores */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <table className="w-full text-left">
                <thead className="bg-gray-50 border-b">
                    <tr>
                        <th className="p-4 text-gray-600">Nome</th>
                        <th className="p-4 text-gray-600">Cargo</th>
                        <th className="p-4 text-gray-600">Vínculo Financeiro</th>
                        <th className="p-4 text-gray-600 text-right">Ações</th>
                    </tr>
                </thead>
                <tbody>
                    {staff?.length === 0 ? (
                        <tr><td colSpan={4} className="p-8 text-center text-gray-500">Nenhum registro.</td></tr>
                    ) : (
                        staff?.map((s) => (
                            <tr key={s.id} className="border-b hover:bg-gray-50">
                                <td className="p-4 font-bold text-gray-800">{s.name}</td>
                                <td className="p-4">
                                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-bold uppercase">
                                        {s.role.name}
                                    </span>
                                </td>
                                <td className="p-4 text-gray-600 text-sm">
                                    {s.isSalaried ? (
                                        <div className="flex flex-col gap-1">
                                            <div className="flex justify-between items-center">
                                                <span className="text-green-600 font-bold">Remunerado</span>
                                                {s.paymentDay && (
                                                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 rounded">
                                                        Dia {s.paymentDay}
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-xs">Salário: R$ {Number(s.salary).toFixed(2)}</span>
                                            {(Number(s.otherTaxes) > 0) && (
                                                <span className="text-xs text-orange-600">
                                                    + Taxas: {Number(s.otherTaxes)}% 
                                                    (R$ {((Number(s.salary) * Number(s.otherTaxes)) / 100).toFixed(2)})
                                                </span>
                                            )}
                                        </div>
                                    ) : (
                                        <span className="text-gray-400">Voluntário</span>
                                    )}
                                </td>
                                <td className="p-4 text-right">
                                    <button 
                                        onClick={() => { if(confirm("Excluir?")) void deleteStaff.mutate({ id: s.id }) }}
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
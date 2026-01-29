"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "https://finan-production.up.railway.app/" })} // <--- Isso força ir para a Home e pula a confirmação
      className="bg-red-100 text-red-600 px-4 py-2 rounded text-sm font-bold hover:bg-red-200 transition"
    >
      Sair
    </button>
  );
}
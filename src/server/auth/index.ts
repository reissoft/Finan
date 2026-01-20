import NextAuth from "next-auth";
import { authConfig } from "./config";

// Inicializa o NextAuth e exporta as funções principais
export const {
  auth,
  handlers,
  signIn,
  signOut,
} = NextAuth(authConfig);
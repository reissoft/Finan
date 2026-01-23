import { PrismaAdapter } from "@auth/prisma-adapter";
import { type DefaultSession, type NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { db } from "~/server/db";
// 1. IMPORTANTE: Importe a classe base de erro
import { CredentialsSignin } from "next-auth";

// 2. Crie classes para seus erros personalizados
class InvalidLoginError extends CredentialsSignin {
  code = "INVALID_CREDENTIALS"; // Esse código vai chegar no frontend
}

class EmailNotVerifiedError extends CredentialsSignin {
  code = "EMAIL_NOT_VERIFIED"; // Esse código vai chegar no frontend
}

/**
 * Module augmentation... (seu código continua igual aqui)
 */
declare module "next-auth" {
  // ...
}

export const authConfig: NextAuthConfig = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user?.password) {
          // 3. USE A CLASSE PERSONALIZADA
          throw new InvalidLoginError();
        }

        const isValid = await compare(credentials.password as string, user.password);

        if (!isValid) {
          // 3. USE A CLASSE PERSONALIZADA
          throw new InvalidLoginError();
        }

        if (!user.emailVerified) {
          // 3. AQUI ESTÁ A MÁGICA: USE A CLASSE ESPECÍFICA
          throw new EmailNotVerifiedError();
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        };
      },
    }),
  ],
  adapter: PrismaAdapter(db),
  callbacks: {
    // ... seus callbacks continuam iguais
    session: ({ session, token }) => ({
      ...session,
      user: {
        ...session.user,
        id: token.sub!,
      },
    }),
    jwt: ({ token, user }) => {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
  },
  session: {
    strategy: "jwt",
  },
} satisfies NextAuthConfig;
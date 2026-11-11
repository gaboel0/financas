import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { getSetting } from "@/server/repo/settings";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "Finanças da Casa",
  description: "Finanças pessoais: contas, cartões, gastos por categoria, reserva e metas.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const jar = await cookies();
  const cookieTheme = jar.get("theme")?.value;
  const privacy = jar.get("privacy")?.value === "on" ? "on" : "off";
  const theme = (cookieTheme ?? getSetting("theme")) === "dark" ? "dark" : "light";
  return (
    <html lang="pt-BR" className={theme === "dark" ? "dark" : ""} data-privacy={privacy} suppressHydrationWarning>
      <body className={`${inter.variable} bg-page font-sans text-ink antialiased`}>{children}</body>
    </html>
  );
}

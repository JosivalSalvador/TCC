import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

// A fonte principal: Neutra, limpa e padrão ouro para SaaS e Portfólios Tech
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

// A fonte secundária: Monoespaçada para os metadados, tags e código
const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: {
    default: "Josival | Software Engineer",
    template: "%s | Josival",
  },
  description:
    "Portfólio de Engenharia de Software. Arquitetura Full Stack, Next.js, Fastify, Prisma e soluções de alta performance.",
};

export const viewport: Viewport = {
  themeColor: "#050505", // Tom escuro que casa com o nosso OLED do globals.css
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`dark ${inter.variable} ${jetBrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body className="bg-background text-foreground min-h-screen font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

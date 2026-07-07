import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: {
    default: "Viralize | Geração de Conteúdo com IA",
    template: "%s | Viralize",
  },
  description:
    "Gere estruturas de vídeo e roteiros virais com IA. Escolha seu nicho, defina seu público e receba em segundos tudo que precisa para criar conteúdo de alto impacto.",
  keywords: [
    "geração de conteúdo",
    "roteiro para vídeo",
    "IA para criadores",
    "viral",
    "nicho",
    "YouTube",
    "criador de conteúdo",
  ],
};

export const viewport: Viewport = {
  themeColor: "#0d0d14",
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

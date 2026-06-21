import "./globals.css";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { Ticker } from "@/components/Ticker";
import { Topbar } from "@/components/Topbar";
import { StatusBar } from "@/components/StatusBar";
import { GridGlow } from "@/components/GridGlow";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-display" });

export const metadata = {
  title: "Preflight — Behavioural pre-execution interceptor for npm",
  description: "Behavioral pre-execution interceptor for the npm supply chain. Lives in your PR. Free forever, MIT.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} ${spaceGrotesk.variable}`}>
      <body>
        <div id="root">
          <GridGlow />
          <Ticker />
          <Topbar />
          <div className="app-shell">
            {children}
          </div>
          <StatusBar />
        </div>
      </body>
    </html>
  );
}

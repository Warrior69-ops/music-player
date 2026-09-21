import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers/Providers";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MELØ",
  description: "Listen differently.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <Providers>
          {children}
          <Toaster 
            theme="dark" 
            position="top-center"
            duration={2400}
            toastOptions={{
              className: '!bg-[#140c26]/80 !border !border-white/20 !text-white !shadow-[0_16px_36px_rgba(0,0,0,0.6)] !backdrop-blur-2xl !rounded-full !px-4 !py-2 !text-xs !font-medium tracking-tight',
            }}
          />
        </Providers>
      </body>
    </html>
  );
}

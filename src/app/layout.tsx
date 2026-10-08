import "./globals.css";
import type { Metadata } from "next";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
  title: "ApparelFlow ERP | Cutting Gatekeeper",
  description: "Cutting verification terminal and sewing queue",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-100 text-gray-900 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
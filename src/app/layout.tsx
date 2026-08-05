import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sneakers Take Off",
  description: "متجرك الموثوق لأحدث وأفضل الأحذية الرياضية",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppBackground } from "@/components/layout/app-background";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PartyGenie",
  description: "AI-powered party planning, invitations, guests, shopping, and tasks in one dashboard.",
  icons: {
    icon: [{ url: "/icon.png", type: "image/png", sizes: "512x512" }],
    apple: [{ url: "/apple-icon.png", type: "image/png", sizes: "180x180" }],
    shortcut: ["/icon.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-canvas text-ink">
        <AppBackground>{children}</AppBackground>
      </body>
    </html>
  );
}

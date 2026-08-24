import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BloodLink — AI-Powered Emergency Blood Coordination",
  description: "AI-powered emergency blood coordination connecting hospitals with suitable donors faster. Decision-support only — not a medical device.",
  keywords: ["blood donation", "emergency", "donor matching", "blood bank", "AI matching", "healthcare", "coordination"],
  authors: [{ name: "BloodLink" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "BloodLink — Find the Right Blood. When Every Minute Matters.",
    description: "AI-powered emergency blood coordination connecting hospitals with suitable donors faster.",
    siteName: "BloodLink",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "BloodLink — Emergency Blood Coordination",
    description: "AI-powered emergency blood coordination connecting hospitals with suitable donors faster.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}

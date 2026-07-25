import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  metadataBase: new URL("https://buildyouroperator.com"),
  title: "Operator — Learn AI by talking to it",
  description: "The free AI course taught entirely through conversation. No videos. No slides. Six conversations with a teacher that remembers you.",
  openGraph: {
    title: "Operator — Learn AI by talking to it",
    description: "The free AI course taught entirely through conversation. Six lessons, zero videos.",
    url: "https://buildyouroperator.com",
    siteName: "Operator",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Operator — Learn AI by talking to it",
    description: "The free AI course taught entirely through conversation. Six lessons, zero videos.",
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
      <head>
        {/* Runs before hydration to apply saved theme and prevent flash */}
        {/* Safe: hardcoded string, no user input, only reads/sets localStorage + data-attribute */}
        {/* eslint-disable-next-line @next/next/no-before-interactive-script-outside-document */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('operator-theme');if(t==='light')document.documentElement.setAttribute('data-theme','light');}catch(e){}})()` }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

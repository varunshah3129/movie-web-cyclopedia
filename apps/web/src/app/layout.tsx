import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import { ActionToastHost } from "@/components/ActionToastHost";
import "./globals.css";

const poppins = Poppins({
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Moviepedia",
  description: "A modern movie discovery app inspired by your Figma direction.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${poppins.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ActionToastHost />
        {children}
      </body>
    </html>
  );
}

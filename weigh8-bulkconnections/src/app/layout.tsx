import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { QueryProvider } from "@/components/providers/QueryProvider";
import type { Metadata } from "next";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "RouteWise-BulkConnections",
  description: "Next Generation Logistics Management",
  icons: {
    icon: "/Mindrift_Logo-06.png",
    shortcut: "/Mindrift_Logo-06.png",
    apple: "/Mindrift_Logo-06.png", // Ensure it works on all devices
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={cn(inter.className, "antialiased")}>
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}

"use client";

import "./globals.css";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/";

  return (
    <html lang="fr">
      <head>
        <title>Big Boss Fitness - Admin</title>
        <meta name="description" content="Panel d'administration Big Boss Fitness" />
      </head>
      <body className="bg-gray-100 min-h-screen">
        {!isLoginPage && <Sidebar />}
        <div className={!isLoginPage ? "ml-64" : ""}>
          {children}
        </div>
      </body>
    </html>
  );
}

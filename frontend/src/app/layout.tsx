import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tasqflow | Enterprise Custom Kanban & Dashboard Workspace",
  description: "A collaborative, enterprise-ready workflow tracker featuring analytical Recharts data and secure JWT verification.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PC Memorial Kalawati Hospital - Prescription Management",
  description: "Comprehensive prescription management system for PC Memorial Kalawati Hospital with patient records, diagnosis, and bilingual prescriptions.",
  icons: {
    icon: "/hospital-logo.jpeg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
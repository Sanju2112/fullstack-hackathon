import "./globals.css";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "Wellnest | Personal wellness planner", description: "A calm space for everyday wellness habits." };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="en"><body>{children}</body></html>; }

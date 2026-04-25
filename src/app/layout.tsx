import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Sidebar } from "@/components/ui/sidebar"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Services Command Center",
  description: "Track and manage service delivery across teams",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Sidebar />
        {/* Main content area - offset for sidebar on desktop, top bar on mobile */}
        <main className="lg:pl-64 pt-14 lg:pt-0 min-h-screen bg-gray-50">
          {children}
        </main>
      </body>
    </html>
  )
}

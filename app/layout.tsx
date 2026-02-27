import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/toaster'
import { FinanceProvider } from '@/context/finance-context'

export const metadata: Metadata = {
  title: 'Personal Finance Tracker',
  description: 'Upload credit card statements, categorize transactions, and track your financial health',
  generator: 'v0.dev',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {/* FinanceProvider supplies shared selectedMonth + refresh state
              to every client component in the tree via useFinance(). */}
          <FinanceProvider>
            {children}
            <Toaster />
          </FinanceProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

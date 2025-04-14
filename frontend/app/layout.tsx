import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Einstein AI',
  description: 'PDF to Learning Resource Analyzer',
  generator: 'Einstein AI',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'CoreDesk',
  description: 'IT 기업을 위한 사내 ERP 시스템',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  )
}

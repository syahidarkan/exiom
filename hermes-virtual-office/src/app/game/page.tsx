'use client'

import dynamic from 'next/dynamic'

const VirtualOfficeGame = dynamic(
  () => import('@/components/VirtualOfficeGame'),
  { ssr: false },
)

export default function GamePage() {
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000' }}>
      <VirtualOfficeGame />
    </div>
  )
}

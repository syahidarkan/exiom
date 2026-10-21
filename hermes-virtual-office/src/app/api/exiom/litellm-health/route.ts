import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const res = await fetch('http://localhost:4001/health', {
      signal: AbortSignal.timeout(3000),
      cache: 'no-store',
    })
    const data = await res.json().catch(() => ({}))
    return NextResponse.json({ live: res.ok, httpStatus: res.status, detail: data })
  } catch (e) {
    return NextResponse.json({ live: false, error: String(e) })
  }
}

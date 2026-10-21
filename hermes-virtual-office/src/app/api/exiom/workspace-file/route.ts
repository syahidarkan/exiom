import { NextRequest, NextResponse } from 'next/server'
import { existsSync, readFileSync, statSync, createReadStream } from 'node:fs'
import { join, resolve, extname } from 'node:path'

export const dynamic = 'force-dynamic'

const WORKSPACE_ROOT = resolve(join(process.cwd(), '..', 'virtual office agent', 'workspace'))

const BINARY_TYPES: Record<string, string> = {
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
}

export async function GET(req: NextRequest) {
  const filePath = req.nextUrl.searchParams.get('path') ?? ''

  if (!filePath) {
    return NextResponse.json({ error: 'path wajib' }, { status: 400 })
  }

  const cleaned = filePath.replace(/^[./\\]+/, '').replace(/\.\./g, '')
  const absPath = resolve(join(WORKSPACE_ROOT, cleaned))

  if (!absPath.startsWith(WORKSPACE_ROOT)) {
    return NextResponse.json({ error: 'akses ditolak' }, { status: 403 })
  }

  if (!existsSync(absPath)) {
    return NextResponse.json({ error: `file tidak ditemukan: ${cleaned}` }, { status: 404 })
  }

  const ext = extname(absPath).toLowerCase()
  const mimeType = BINARY_TYPES[ext]

  // Binary/media files: stream langsung
  if (mimeType) {
    const stat = statSync(absPath)
    const range = req.headers.get('range')

    if (range && mimeType.startsWith('video/')) {
      const [startStr, endStr] = range.replace(/bytes=/, '').split('-')
      const start = parseInt(startStr, 10)
      const end = endStr ? parseInt(endStr, 10) : Math.min(start + 10 * 1024 * 1024, stat.size - 1)
      const chunkSize = end - start + 1

      const stream = createReadStream(absPath, { start, end })
      const body = new ReadableStream({
        start(controller) {
          stream.on('data', chunk => controller.enqueue(chunk))
          stream.on('end', () => controller.close())
          stream.on('error', err => controller.error(err))
        },
      })

      return new NextResponse(body, {
        status: 206,
        headers: {
          'Content-Type': mimeType,
          'Content-Range': `bytes ${start}-${end}/${stat.size}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': String(chunkSize),
        },
      })
    }

    const buf = readFileSync(absPath)
    return new NextResponse(buf, {
      headers: {
        'Content-Type': mimeType,
        'Content-Length': String(stat.size),
        'Accept-Ranges': 'bytes',
      },
    })
  }

  // Text files
  try {
    const content = readFileSync(absPath, 'utf8')
    const lines = content.split('\n').length
    return NextResponse.json({ path: cleaned, content, lines, size: content.length })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

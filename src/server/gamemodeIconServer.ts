// ─── Gamemode Icon Upload — Server Function ────────────────────────────────────
// Accepts a base64-encoded image from the admin panel, saves it to
// public/icons/<key>.<ext>, and returns the public URL path.

import { createServerFn } from '@tanstack/react-start'
import { z }              from 'zod'
import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve }        from 'node:path'

const ICONS_DIR = resolve(process.cwd(), 'public', 'icons')

export const uploadGamemodeIcon = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      key:    z.string().min(1),
      base64: z.string().min(1),
      ext:    z.string().regex(/^(png|jpg|jpeg|gif|webp)$/i),
    }),
  )
  .handler(async ({ data }) => {
    const { key, base64, ext } = data

    // Strip leading data-URL prefix (data:image/png;base64,...)
    const raw    = base64.replace(/^data:[^;]+;base64,/, '')
    const buffer = Buffer.from(raw, 'base64')

    mkdirSync(ICONS_DIR, { recursive: true })

    const filename = `${key}.${ext.toLowerCase()}`
    writeFileSync(resolve(ICONS_DIR, filename), buffer)

    return { path: `/icons/${filename}` }
  })

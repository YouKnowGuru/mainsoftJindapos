/**
 * Cleanup orphaned update files
 * Run this periodically to remove .exe files in public/downloads
 * that are no longer referenced by any update record
 */

import { readdir, unlink, stat } from 'fs/promises'
import path from 'path'
import connectDB from '../lib/db/mongodb'
import Update from '../lib/models/Update'

async function cleanup() {
  await connectDB()

  const downloadsDir = path.join(process.cwd(), 'public', 'downloads')
  const files = await readdir(downloadsDir).catch(() => [])

  // Get all fileUrls from database
  const updates = await Update.find({}, 'fileUrl').lean()
  const usedUrls = new Set(updates.map((u: any) => u.fileUrl).filter(Boolean))

  let deleted = 0
  let saved = 0

  for (const file of files) {
    const filePath = path.join(downloadsDir, file)
    const fileUrl = `/downloads/${file}`
    const fullUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/downloads/${file}`

    // Check if file is referenced (either full URL or path)
    const isUsed = Array.from(usedUrls).some(url => url?.includes(file))

    if (!isUsed) {
      const stats = await stat(filePath)
      await unlink(filePath)
      saved += stats.size
      deleted++
      console.log(`Deleted orphaned file: ${file} (${(stats.size / 1024 / 1024).toFixed(1)} MB)`)
    }
  }

  console.log(`\nCleanup complete: ${deleted} files deleted, ${(saved / 1024 / 1024).toFixed(1)} MB saved`)
  process.exit(0)
}

cleanup().catch(err => {
  console.error('Cleanup failed:', err)
  process.exit(1)
})

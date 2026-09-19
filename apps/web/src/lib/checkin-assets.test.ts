import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'

// The check-in UI and CHECKIN_STREAK_BADGE contract (apps/web/src/lib/checkin.ts)
// reference a real on-disk badge at this exact path. This test is the guard that
// keeps that reference honest: if the art is renamed, moved, or stops being a
// 64x64 PNG, the build's test step fails instead of shipping a broken <img>.
const here = dirname(fileURLToPath(import.meta.url))
const BADGE_PATH = join(here, '..', '..', 'public', 'assets', 'badges', 'badge-daily-streak-10.png')

const EXPECTED_SIGNATURE = '89504e470d0a1a0a'
const EXPECTED_WIDTH = 64
const EXPECTED_HEIGHT = 64

describe('check-in badge art (issue #76)', () => {
  it('ships a 64x64 PNG at the path the UI references', () => {
    expect(existsSync(BADGE_PATH)).toBe(true)

    const buf = readFileSync(BADGE_PATH)
    expect(buf.subarray(0, 8).toString('hex')).toBe(EXPECTED_SIGNATURE)

    // IHDR is the first chunk: width/height are big-endian uint32 at byte 16..23.
    expect(buf.readUInt32BE(16)).toBe(EXPECTED_WIDTH)
    expect(buf.readUInt32BE(20)).toBe(EXPECTED_HEIGHT)

    // ASSETS.md specifies badges as 64x64 RGBA pixel art (color type 6).
    expect(buf[25]).toBe(6)
  })
})

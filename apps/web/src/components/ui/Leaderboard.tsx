import { PixelPanel } from '@/components/ui/PixelPanel'

export interface LeaderboardEntry {
  rank: number
  name: string
  score: number
}

interface LeaderboardProps {
  entries: LeaderboardEntry[]
}

/** Table header row, pixel style. */
function LeaderboardHeader() {
  return (
    <div className="grid grid-cols-[3rem_1fr_auto] gap-2 border-b-2 border-brand-dark-4 px-4 py-3">
      <span className="font-pixel text-[10px] text-brand-gold-bright">RANK</span>
      <span className="font-pixel text-[10px] text-brand-gold-bright">PLAYER</span>
      <span className="font-pixel text-[10px] text-brand-gold-bright">XP</span>
    </div>
  )
}

/**
 * Leaderboard — on-brand pixel-art table of ranked players
 * (rank, name, score). Renders an empty state when there are no entries.
 */
export function Leaderboard({ entries }: LeaderboardProps) {
  if (entries.length === 0) {
    return (
      <PixelPanel variant="soft">
        <LeaderboardHeader />
        <div className="px-4 py-10 text-center">
          <p className="font-pixel text-xs text-brand-gold/70">NO ADVENTURERS YET</p>
          <p className="mt-3 font-sans text-sm text-brand-gold/60">
            Play some levels to earn XP and climb the rankings.
          </p>
        </div>
      </PixelPanel>
    )
  }

  return (
    <PixelPanel variant="soft">
      <LeaderboardHeader />
      <ul className="divide-y divide-brand-dark-4">
        {entries.map((e) => (
          <li
            key={`${e.rank}-${e.name}`}
            className="grid grid-cols-[3rem_1fr_auto] items-center gap-2 px-4 py-3"
          >
            <span className="font-pixel text-xs text-brand-gold/80">{e.rank}</span>
            <span className="truncate font-sans text-sm text-brand-gold/90">{e.name}</span>
            <span className="font-pixel text-xs text-brand-gold-bright">{e.score}</span>
          </li>
        ))}
      </ul>
    </PixelPanel>
  )
}
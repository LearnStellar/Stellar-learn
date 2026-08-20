import {
  buildCharacterLayers,
  type EquipSlot,
  type EquippedItemMap,
  type Facing,
} from '@stellar-learn/game-engine/characterRender'
import { characterPortraitPath } from '@/lib/characters'

interface CharacterPortraitProps {
  characterId: string
  equippedItems?: EquippedItemMap
  facing?: Facing
  /** See `buildCharacterLayers`'s `resolveItemAsset` — omit to render the bare character. */
  resolveItemAsset?: (itemId: string, slot: EquipSlot) => string | undefined
  size?: number
  className?: string
}

/**
 * CharacterPortrait — the ONE place a character + its equipped cosmetics are
 * stacked into DOM layers, so HUD, dashboard, and AvatarSelect never each
 * reimplement this. Consumes `buildCharacterLayers` (packages/game-engine)
 * for ordering/offsets/flip; this component only turns that data into
 * positioned <img> elements.
 *
 * The body layer always renders the static portrait icon
 * (`characterPortraitPath`), not `buildCharacterLayers`'s body `assetPath`
 * (a Phaser texture key such as `char-warrior`, meaningful only inside the
 * game engine) — the in-DOM and in-engine body images are different assets
 * for the same character by design.
 */
export function CharacterPortrait({
  characterId,
  equippedItems,
  facing = 'right',
  resolveItemAsset,
  size = 56,
  className = '',
}: CharacterPortraitProps) {
  const layers = buildCharacterLayers({ characterId, equippedItems, facing, resolveItemAsset })
  // Slot offsets are tuned against the 128px character frame; scale them to
  // whatever pixel size this portrait is actually rendered at.
  const offsetScale = size / 128

  return (
    <div
      className={`relative overflow-hidden rounded-lg border border-brand-dark-4 bg-brand-dark-3 ${className}`}
      style={{ width: size, height: size, imageRendering: 'pixelated' }}
    >
      {layers.map((layer) => {
        const translate = `translate(${layer.offsetX * offsetScale}px, ${layer.offsetY * offsetScale}px)`
        const flip = layer.flipX ? ' scaleX(-1)' : ''
        return (
          // eslint-disable-next-line @next/next/no-img-element -- pixel-art layer stack, size varies per caller
          <img
            key={`${layer.slot}-${layer.itemId ?? 'base'}`}
            src={layer.slot === 'body' ? characterPortraitPath(characterId) : layer.assetPath}
            alt={layer.slot === 'body' ? characterId : `${layer.slot} cosmetic`}
            className="absolute inset-0 h-full w-full object-contain"
            style={{
              zIndex: layer.z,
              transform: translate + flip,
              imageRendering: 'pixelated',
            }}
          />
        )
      })}
    </div>
  )
}

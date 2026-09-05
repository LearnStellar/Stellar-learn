/**
 * Stellar Learn pixel game-UI component library.
 * Recreated from the Claude Design handoff (Stellar Learn UI.html).
 */

// primitives
export { Coin } from './Coin'
export { SpriteSlot } from './SpriteSlot'
export { PixelButton } from './PixelButton'
export { PixelPanel, PixelStrip } from './PixelPanel'
export { StarField } from './StarField'
export { Modal } from './Modal'
export { Footer } from './Footer'
export { ToastProvider, ToastContainer, type ToastVariant } from './Toast'

// screens
export { MainMenu } from './MainMenu'
export { CharacterSelect } from './CharacterSelect'
export { WorldMap } from './WorldMap'
export { GameplayScene } from './GameplayScene'
export { GameHUD } from './GameHUD'
export { Achievements } from './Achievements'
export { QuestModal, type QuizOption } from './QuestModal'

// shell
export { GameShell } from './GameShell'

// content data
export {
  CHARACTERS,
  ANIMS,
  WORLDS,
  BADGES,
  type PixelCharacter,
  type PixelWorld,
  type PixelBadge,
  type WorldState,
} from './pixel-data'

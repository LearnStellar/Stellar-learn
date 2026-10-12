import * as Phaser from 'phaser'
import {
  ART_MANIFEST,
  BOSS_ANIMS,
  BOSS_FRAME_SIZE,
  CHARACTER_ANIMS,
  CHARACTER_FRAME_SIZE,
  TILE_SIZE,
  WORLD_BOSSES,
} from '../config'
import { createSheetAnimations } from '../animations'
import { ensureBossTexture, ensureCharacterTexture } from '../textures'

/**
 * Data the boss battle is started with. `won` comes from the quest pass/fail
 * results the React layer tracked (Issue #3) — the outcome is deterministic,
 * never random. `bossName` is passed in because curriculum lives in
 * `@stellar-learn/content`, which the engine deliberately does not import.
 */
export interface BossSceneData {
  worldId: string
  characterId: string
  won: boolean
  bossName?: string
}

/**
 * BossScene — the world-finale cinematic (Issue #4).
 *
 * A short, non-interactive battle between the player's character and the
 * world boss. On a pass the character defeats the boss; on a fail the boss
 * defeats the character. When the sequence ends it emits
 * `boss-resolved { won, worldId }` on the game event bus for the React layer
 * (world progression — Issue #5).
 *
 * Every beat has two implementations: the real spritesheet animation when the
 * art loaded, and a tween-based placeholder otherwise — so the scene works
 * before boss/character art lands (same fallback strategy as LevelScene).
 */
export class BossScene extends Phaser.Scene {
  private worldId!: string
  private characterId!: string
  private won!: boolean
  private bossName!: string

  private player!: Phaser.GameObjects.Sprite
  private boss!: Phaser.GameObjects.Sprite
  private bossHover?: Phaser.Tweens.Tween
  /** Set on shutdown so the async sequence stops touching a dead scene. */
  private ended = false

  constructor() {
    super({ key: 'BossScene' })
  }

  init(data: BossSceneData) {
    this.worldId = data.worldId
    this.characterId = data.characterId
    this.won = data.won === true
    this.bossName = data.bossName ?? 'The World Boss'
  }

  preload() {
    // Textures persist on the game, so when LevelScene already loaded these
    // sheets the cache check makes this a no-op. The manifest guard keeps a
    // missing file from 404ing (same policy as LevelScene.preload).
    const charKey = `char-${this.characterId}`
    if (ART_MANIFEST.characters.includes(this.characterId) && !this.textures.exists(charKey)) {
      this.load.spritesheet(charKey, `/assets/sprites/characters/${this.characterId}.png`, {
        frameWidth: CHARACTER_FRAME_SIZE,
        frameHeight: CHARACTER_FRAME_SIZE,
      })
    }

    const bossId = WORLD_BOSSES[this.worldId]
    if (bossId && ART_MANIFEST.bosses.includes(bossId) && !this.textures.exists(`boss-${bossId}`)) {
      this.load.spritesheet(`boss-${bossId}`, `/assets/sprites/bosses/boss-${bossId}.png`, {
        frameWidth: BOSS_FRAME_SIZE,
        frameHeight: BOSS_FRAME_SIZE,
      })
    }
  }

  create() {
    this.ended = false
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.ended = true
    })

    const bossId = WORLD_BOSSES[this.worldId] ?? 'unknown'
    ensureCharacterTexture(this, this.characterId)
    ensureBossTexture(this, bossId)
    createSheetAnimations(this, `char-${this.characterId}`, this.characterId, CHARACTER_ANIMS)
    createSheetAnimations(this, `boss-${bossId}`, `boss-${bossId}`, BOSS_ANIMS)

    this.createArena()
    this.createFighters(bossId)

    this.cameras.main.fadeIn(500, 0, 0, 0)
    void this.runSequence()
  }

  /** Ominous arena backdrop: blood-tinted sky, embers and a stone floor. */
  private createArena() {
    const w = this.scale.width
    const h = this.scale.height

    const sky = this.add.graphics().setDepth(-20)
    sky.fillGradientStyle(0x12081f, 0x12081f, 0x2b1030, 0x3a1224, 1)
    sky.fillRect(0, 0, w, h)

    // Drifting embers instead of the level's calm stars.
    for (let i = 0; i < 40; i++) {
      const ember = this.add
        .circle(
          Phaser.Math.Between(0, w),
          Phaser.Math.Between(0, h),
          Phaser.Math.FloatBetween(1, 2.4),
          Phaser.Math.Between(0, 2) === 0 ? 0xff6b4a : 0xffd700,
          Phaser.Math.FloatBetween(0.25, 0.8)
        )
        .setDepth(-19)
      this.tweens.add({
        targets: ember,
        y: ember.y - Phaser.Math.Between(30, 90),
        alpha: 0,
        duration: Phaser.Math.Between(2200, 4200),
        repeat: -1,
        delay: Phaser.Math.Between(0, 2000),
      })
    }

    // Arena floor.
    this.add.rectangle(w / 2, h - TILE_SIZE / 2, w, TILE_SIZE, 0x241b2e).setDepth(1)
    this.add.rectangle(w / 2, h - TILE_SIZE + 4, w, 8, 0x3b2b4a).setDepth(2)
    this.add.rectangle(w / 2, h - TILE_SIZE + 1, w, 3, 0x120b1a).setDepth(2)
  }

  private createFighters(bossId: string) {
    const floorY = this.scale.height - TILE_SIZE + 6

    const charKey = `char-${this.characterId}`
    this.player = this.add.sprite(this.scale.width * 0.26, floorY, charKey).setOrigin(0.5, 1).setDepth(5)
    if (!this.isPlaceholder(charKey)) this.player.setScale(0.85)
    this.playLoop(this.player, `${this.characterId}-idle`)

    const bossKey = `boss-${bossId}`
    this.boss = this.add.sprite(this.scale.width * 0.72, floorY, bossKey).setOrigin(0.5, 1).setDepth(5)
    this.boss.setFlipX(true)
    if (!this.isPlaceholder(bossKey)) this.boss.setScale(1.1)
    this.playLoop(this.boss, `boss-${bossId}-idle`)

    // Placeholder wraith gets a spectral hover so it never reads as a static box.
    if (!this.anims.exists(`boss-${bossId}-idle`)) {
      this.bossHover = this.tweens.add({
        targets: this.boss,
        y: floorY - 12,
        duration: 1400,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      })
    }
  }

  // ------------------------------------------------------------------
  // The cinematic itself
  // ------------------------------------------------------------------

  private async runSequence() {
    const bossId = WORLD_BOSSES[this.worldId] ?? 'unknown'

    await this.showTitle()
    if (this.ended) return

    // The boss opens with an attack either way — the fight should feel earned.
    await this.bossAttack(bossId, /* lethal */ false)
    if (this.ended) return

    if (this.won) {
      await this.playerStrikes(bossId, /* finishing */ false)
      if (this.ended) return
      await this.playerStrikes(bossId, /* finishing */ true)
      if (this.ended) return
      await this.showOutcome('VICTORY!', '#ffd700', `${this.bossName} has fallen`)
    } else {
      // A doomed counter-attack, then the boss lands the killing blow.
      await this.playerStrikes(bossId, /* finishing */ false)
      if (this.ended) return
      await this.bossAttack(bossId, /* lethal */ true)
      if (this.ended) return
      await this.showOutcome('DEFEATED', '#ff5566', `${this.bossName} prevails...`)
    }
    if (this.ended) return

    await this.wait(1100)
    if (this.ended) return
    this.game.events.emit('boss-resolved', { won: this.won, worldId: this.worldId })
  }

  /** "BOSS BATTLE — <name>" banner that fades in, holds, and fades out. */
  private async showTitle() {
    const cx = this.cameras.main.width / 2
    const label = this.add
      .text(cx, this.scale.height * 0.3, 'BOSS BATTLE', {
        fontFamily: '"Press Start 2P"',
        fontSize: '16px',
        color: '#ff5566',
      })
      .setOrigin(0.5)
      .setDepth(30)
      .setAlpha(0)
    const name = this.add
      .text(cx, this.scale.height * 0.3 + 40, this.bossName.toUpperCase(), {
        fontFamily: '"Press Start 2P"',
        fontSize: '26px',
        color: '#e8d5b7',
      })
      .setOrigin(0.5)
      .setDepth(30)
      .setAlpha(0)

    await this.tween({ targets: [label, name], alpha: 1, duration: 500 })
    await this.wait(1200)
    await this.tween({ targets: [label, name], alpha: 0, duration: 400 })
    label.destroy()
    name.destroy()
  }

  /**
   * Boss lunges at the player. Non-lethal: the player staggers and recovers.
   * Lethal: the player falls — the fail-path death beat.
   */
  private async bossAttack(bossId: string, lethal: boolean) {
    const startX = this.boss.x

    await this.play(this.boss, `boss-${bossId}-attack`, async () => {
      await this.tween({
        targets: this.boss,
        x: this.player.x + 110,
        duration: 340,
        ease: 'Quad.easeIn',
      })
    })
    if (this.ended) return

    this.cameras.main.shake(lethal ? 400 : 220, lethal ? 0.012 : 0.006)
    this.flash(this.player, 0xff5566)

    if (lethal) {
      await this.play(this.player, `${this.characterId}-death`, async () => {
        await this.tween({
          targets: this.player,
          angle: -90,
          y: this.player.y + 8,
          alpha: 0.25,
          duration: 700,
          ease: 'Quad.easeIn',
        })
      })
      if (this.ended) return
      // Real death anims end on the final frame; keep the sprite lying there.
      if (!this.anims.exists(`${this.characterId}-death`)) this.player.setTint(0x777788)
    } else {
      // Stagger knock-back, then recover to idle.
      await this.tween({
        targets: this.player,
        x: this.player.x - 60,
        duration: 260,
        ease: 'Quad.easeOut',
      })
      if (this.ended) return
      this.playLoop(this.player, `${this.characterId}-idle`)
    }

    await this.tween({ targets: this.boss, x: startX, duration: 420, ease: 'Quad.easeOut' })
    if (this.ended) return
    this.playLoop(this.boss, `boss-${bossId}-idle`)
  }

  /**
   * Player dashes in and strikes the boss. A finishing strike plays the boss
   * defeat animation and dissolves it; otherwise the boss is hurt and endures.
   */
  private async playerStrikes(bossId: string, finishing: boolean) {
    const startX = this.player.x
    const strikeX = this.boss.x - 130

    this.playLoop(this.player, `${this.characterId}-run`)
    await this.tween({ targets: this.player, x: strikeX, duration: 450, ease: 'Quad.easeIn' })
    if (this.ended) return

    await this.play(this.player, `${this.characterId}-attack`, async () => {
      await this.tween({
        targets: this.player,
        x: strikeX + 34,
        duration: 130,
        yoyo: true,
        ease: 'Quad.easeIn',
      })
    })
    if (this.ended) return

    this.cameras.main.shake(finishing ? 380 : 200, finishing ? 0.01 : 0.005)
    this.flash(this.boss, 0xffffff)

    if (finishing) {
      this.bossHover?.stop()
      await this.play(this.boss, `boss-${bossId}-defeat`, async () => {
        await this.tween({
          targets: this.boss,
          angle: 12,
          y: this.boss.y + 26,
          duration: 600,
          ease: 'Quad.easeIn',
        })
      })
      if (this.ended) return
      // The boss dissolves into embers either way.
      await this.tween({ targets: this.boss, alpha: 0, duration: 700, ease: 'Quad.easeOut' })
      if (this.ended) return
      this.playLoop(this.player, `${this.characterId}-idle`)
    } else {
      await this.play(this.boss, `boss-${bossId}-hurt`, async () => {
        await this.tween({
          targets: this.boss,
          x: this.boss.x + 40,
          duration: 200,
          yoyo: true,
          ease: 'Quad.easeOut',
        })
      })
      if (this.ended) return
      this.playLoop(this.boss, `boss-${bossId}-idle`)
      this.playLoop(this.player, `${this.characterId}-run`)
      await this.tween({ targets: this.player, x: startX, duration: 400, ease: 'Quad.easeOut' })
      if (this.ended) return
      this.playLoop(this.player, `${this.characterId}-idle`)
    }
  }

  private async showOutcome(title: string, color: string, subtitle: string) {
    const cx = this.cameras.main.width / 2
    const cy = this.scale.height * 0.34
    const text = this.add
      .text(cx, cy, title, {
        fontFamily: '"Press Start 2P"',
        fontSize: '40px',
        color,
        stroke: '#07071a',
        strokeThickness: 8,
      })
      .setOrigin(0.5)
      .setDepth(30)
      .setAlpha(0)
      .setScale(0.6)
    const sub = this.add
      .text(cx, cy + 52, subtitle, {
        fontFamily: '"Press Start 2P"',
        fontSize: '12px',
        color: '#e8d5b7',
      })
      .setOrigin(0.5)
      .setDepth(30)
      .setAlpha(0)

    await this.tween({ targets: text, alpha: 1, scale: 1, duration: 450, ease: 'Back.easeOut' })
    await this.tween({ targets: sub, alpha: 1, duration: 350 })
  }

  // ------------------------------------------------------------------
  // Small promise helpers so the sequence reads top-to-bottom
  // ------------------------------------------------------------------

  private wait(ms: number) {
    return new Promise<void>((resolve) => this.time.delayedCall(ms, resolve))
  }

  private tween(config: Phaser.Types.Tweens.TweenBuilderConfig) {
    return new Promise<void>((resolve) => {
      this.tweens.add({ ...config, onComplete: () => resolve() })
    })
  }

  /**
   * Play a one-shot animation and resolve when it completes; when the
   * animation doesn't exist (placeholder art) run the tween fallback instead.
   */
  private play(sprite: Phaser.GameObjects.Sprite, animKey: string, fallback: () => Promise<void>) {
    if (this.anims.exists(animKey)) {
      return new Promise<void>((resolve) => {
        sprite.once(`animationcomplete-${animKey}`, () => resolve())
        sprite.play(animKey)
      })
    }
    return fallback()
  }

  /** Play a looping animation if it exists; placeholders just stay static. */
  private playLoop(sprite: Phaser.GameObjects.Sprite, animKey: string) {
    if (this.anims.exists(animKey)) sprite.play(animKey, true)
  }

  /** Brief tint pulse used as a hit flash. */
  private flash(sprite: Phaser.GameObjects.Sprite, color: number) {
    sprite.setTintFill(color)
    this.time.delayedCall(120, () => {
      if (!this.ended) sprite.clearTint()
    })
  }

  private isPlaceholder(textureKey: string) {
    return this.textures.get(textureKey).frameTotal <= 1
  }
}

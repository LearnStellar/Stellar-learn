import Phaser from 'phaser'
import {
  ART_MANIFEST,
  BOSS_ANIMS,
  BOSS_FRAME_SIZE,
  CHARACTER_ANIMS,
  CHARACTER_FRAME_SIZE,
  ENEMY_ANIMS,
  ENEMY_FRAME_SIZE,
  TILE_SIZE,
  WORLD_BOSSES,
  WORLD_ENEMIES,
} from '../config'
import { createSheetAnimations } from '../animations'
import { ensureCharacterTexture } from '../textures'

/**
 * LevelScene — the main 2D platformer level.
 * Player walks through the level, collecting quest items and triggering lesson panels.
 * Each "trigger zone" opens a lesson/quiz in the React overlay layer.
 */
interface QuestTrigger {
  zone: Phaser.GameObjects.Zone
  rune: Phaser.GameObjects.Rectangle
  glow: Phaser.GameObjects.Arc
  glowTween: Phaser.Tweens.Tween
  indicator: Phaser.GameObjects.Text
  completed: boolean
}

export class LevelScene extends Phaser.Scene {
  /** X positions of the quest runes along the level, in quest order. */
  private static readonly TRIGGER_POSITIONS = [420, 760, 1100, 1440, 1780]

  private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>
  private interactKey!: Phaser.Input.Keyboard.Key
  private questTriggers: QuestTrigger[] = []
  private interactPrompt!: Phaser.GameObjects.Text
  private isInteracting = false
  private bossStarted = false
  private questsLabel!: Phaser.GameObjects.Text

  constructor() {
    super({ key: 'LevelScene' })
  }

  init(data: { worldId: string; levelId: string; characterId: string }) {
    this.registry.set('worldId', data.worldId)
    this.registry.set('levelId', data.levelId)
    this.registry.set('characterId', data.characterId)
  }

  preload() {
    // Only request assets the ART_MANIFEST says exist — anything missing keeps
    // its generated placeholder instead of 404ing or crashing on empty anims.
    const characterId = this.registry.get('characterId') as string
    if (ART_MANIFEST.characters.includes(characterId)) {
      this.load.spritesheet(`char-${characterId}`, `/assets/sprites/characters/${characterId}.png`, {
        frameWidth: CHARACTER_FRAME_SIZE,
        frameHeight: CHARACTER_FRAME_SIZE,
      })
    }

    const worldId = this.registry.get('worldId') as string
    if (ART_MANIFEST.tilesets.includes(worldId)) {
      this.load.image(`tileset-${worldId}`, `/assets/tilesets/${worldId}.png`)
      this.load.tilemapTiledJSON(`map-${worldId}`, `/assets/maps/${worldId}.json`)
    }

    // This world's boss + enemies, so their animations are ready for the
    // boss-battle and hazard work (Issue #4) without another load pass.
    const bossId = WORLD_BOSSES[worldId]
    if (bossId && ART_MANIFEST.bosses.includes(bossId)) {
      this.load.spritesheet(`boss-${bossId}`, `/assets/sprites/bosses/boss-${bossId}.png`, {
        frameWidth: BOSS_FRAME_SIZE,
        frameHeight: BOSS_FRAME_SIZE,
      })
    }
    for (const enemyId of WORLD_ENEMIES[worldId] ?? []) {
      if (ART_MANIFEST.enemies.includes(enemyId)) {
        this.load.spritesheet(`enemy-${enemyId}`, `/assets/sprites/enemies/enemy-${enemyId}.png`, {
          frameWidth: ENEMY_FRAME_SIZE,
          frameHeight: ENEMY_FRAME_SIZE,
        })
      }
    }
  }

  create() {
    this.isInteracting = false
    this.bossStarted = false
    this.questTriggers = []

    // When the real spritesheet didn't load (no art yet, or a 404), a
    // generated placeholder box keeps the player rendering.
    ensureCharacterTexture(this, this.registry.get('characterId') as string)
    this.createAnimations()
    this.createBackground()
    this.createMap()
    this.createPlayer()
    this.createQuestTriggers()
    this.createInteractPrompt()
    this.setupCamera()
    this.setupInput()
    this.createHUD()

    // Tell the React layer the level is fully built so it can sync any
    // previously completed quests into the scene.
    this.game.events.emit('level-ready')
  }

  /**
   * Cosmic "Origin Plains" backdrop — a night-sky gradient, twinkling stars and
   * a parallax tree-line. Fixed/low scroll factors so it reads as depth while
   * the ground scrolls past. Placeholder until the real tileset art lands.
   */
  private createBackground() {
    const w = this.scale.width
    const h = this.scale.height

    // Sky gradient (pinned to the camera).
    const sky = this.add.graphics().setScrollFactor(0).setDepth(-20)
    sky.fillGradientStyle(0x161235, 0x161235, 0x20303a, 0x24402a, 1)
    sky.fillRect(0, 0, w, h)

    // Stars in the upper two-thirds.
    for (let i = 0; i < 70; i++) {
      const x = Phaser.Math.Between(0, w)
      const y = Phaser.Math.Between(0, h * 0.62)
      const r = Phaser.Math.FloatBetween(0.5, 1.6)
      const tint = Phaser.Math.Between(0, 9) > 8 ? 0xffd700 : 0xffffff
      this.add
        .circle(x, y, r, tint, Phaser.Math.FloatBetween(0.3, 1))
        .setScrollFactor(0)
        .setDepth(-19)
    }

    // Parallax tree-line hugging the horizon.
    const trees = this.add.graphics().setScrollFactor(0.35).setDepth(-10)
    trees.fillStyle(0x12281a, 1)
    for (let x = -120; x < w * 1.6; x += 150) {
      const hump = Phaser.Math.Between(70, 120)
      trees.fillCircle(x, h - TILE_SIZE + 10, hump)
    }
  }

  override update() {
    if (this.isInteracting) {
      this.interactPrompt.setVisible(false)
      return
    }
    this.handleMovement()
    this.updateAnimations()
    this.updateQuestInteraction()
  }

  private createAnimations() {
    const characterId = this.registry.get('characterId') as string
    const worldId = this.registry.get('worldId') as string

    createSheetAnimations(this, `char-${characterId}`, characterId, CHARACTER_ANIMS)

    // Boss/enemy animations for this world (played by the boss battle and
    // hazards — Issue #4). Same guard: only when the sheet actually loaded.
    const bossId = WORLD_BOSSES[worldId]
    if (bossId) createSheetAnimations(this, `boss-${bossId}`, `boss-${bossId}`, BOSS_ANIMS)
    for (const enemyId of WORLD_ENEMIES[worldId] ?? []) {
      createSheetAnimations(this, `enemy-${enemyId}`, `enemy-${enemyId}`, ENEMY_ANIMS)
    }
  }

  private createMap() {
    const worldId = this.registry.get('worldId') as string

    // No tilemap loaded (no art yet) — use the fallback ground instead of
    // calling make.tilemap on a missing key, which logs "No map data found".
    if (!this.cache.tilemap.has(`map-${worldId}`)) {
      this.createFallbackGround()
      return
    }

    try {
      const map = this.make.tilemap({ key: `map-${worldId}` })
      const tileset = map.addTilesetImage('tileset', `tileset-${worldId}`)
      if (!tileset) return

      map.createLayer('Background', tileset, 0, 0)
      const ground = map.createLayer('Ground', tileset, 0, 0)
      if (ground) {
        ground.setCollisionByProperty({ collides: true })
        this.registry.set('groundLayer', ground)
      }
      map.createLayer('Foreground', tileset, 0, 0)?.setDepth(10)
    } catch {
      // Fallback ground for development before tilesets are added
      this.createFallbackGround()
    }
  }

  private createFallbackGround() {
    const levelWidth = this.scale.width * 4
    const groundTop = this.scale.height - TILE_SIZE

    // Soil body (this is the physics collider).
    const ground = this.add
      .rectangle(levelWidth / 2, this.scale.height - TILE_SIZE / 2, levelWidth, TILE_SIZE, 0x2d5a1b)
      .setDepth(1)
    // Grass highlight strip along the top edge.
    this.add.rectangle(levelWidth / 2, groundTop + 5, levelWidth, 10, 0x3a6e26).setDepth(2)
    this.add.rectangle(levelWidth / 2, groundTop + 1, levelWidth, 3, 0x173d0e).setDepth(2)

    const groundBody = this.physics.add.staticGroup()
    groundBody.add(ground)
    this.registry.set('groundBodyGroup', groundBody)
    this.registry.set('groundTop', groundTop)
    this.registry.set('levelWidth', levelWidth)
  }

  private createPlayer() {
    const characterId = this.registry.get('characterId') as string
    const key = `char-${characterId}`

    // Spawn on top of the first quest rune so a new player lands straight on
    // the interaction prompt for the first quest — no wandering to find it.
    const spawnX = LevelScene.TRIGGER_POSITIONS[0] ?? 160
    this.player = this.physics.add.sprite(spawnX, this.scale.height - TILE_SIZE - 140, key)
    this.player.setCollideWorldBounds(true)
    // Real spritesheets are 128px → scale down; the generated placeholder is
    // already screen-sized, so leave it at 1× to keep its body aligned.
    const isPlaceholder = this.textures.get(key).frameTotal <= 1
    this.player.setScale(isPlaceholder ? 1 : 0.5)
    if (!isPlaceholder) {
      // Collide with the hero's torso, not the transparent frame margins or
      // the weapon reach (frame coordinates; Phaser applies the sprite scale).
      this.player.body.setSize(48, 114).setOffset(40, 10)
    }
    this.player.setDepth(5)

    const groundLayer = this.registry.get('groundLayer')
    const groundBodyGroup = this.registry.get('groundBodyGroup')

    if (groundLayer) {
      this.physics.add.collider(this.player, groundLayer as Phaser.Tilemaps.TilemapLayer)
    }
    if (groundBodyGroup) {
      this.physics.add.collider(this.player, groundBodyGroup as Phaser.Physics.Arcade.StaticGroup)
    }
  }

  private createQuestTriggers() {
    // Quest trigger zones along the level — each opens a lesson panel in React.
    // Quests open on an explicit key press while overlapping (see
    // updateQuestInteraction), never on mere overlap.
    const groundTop = (this.registry.get('groundTop') as number | undefined) ?? this.scale.height - TILE_SIZE

    LevelScene.TRIGGER_POSITIONS.forEach((x) => {
      const zone = this.add.zone(x, groundTop - 60, 90, 160)

      // Glowing rune pedestal standing on the ground.
      const pedestal = this.add.container(x, groundTop)
      const glow = this.add.circle(0, -20, 22, 0xffd700, 0.18)
      const rune = this.add.rectangle(0, -20, 22, 22, 0x3d5afe).setStrokeStyle(3, 0x07071a)
      const post = this.add.rectangle(0, -2, 10, 26, 0x1a1a2e).setStrokeStyle(2, 0x07071a)
      pedestal.add([glow, post, rune])
      pedestal.setDepth(4)

      const glowTween = this.tweens.add({ targets: glow, alpha: 0.4, scale: 1.25, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })

      // Bobbing "!" above the rune.
      const indicator = this.add.text(x, groundTop - 64, '!', {
        fontFamily: '"Press Start 2P"',
        fontSize: '18px',
        color: '#ffd700',
      }).setOrigin(0.5).setDepth(5)

      this.tweens.add({
        targets: indicator,
        y: groundTop - 74,
        duration: 600,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      })

      this.questTriggers.push({ zone, rune, glow, glowTween, indicator, completed: false })
    })
  }

  /**
   * "Press E to interact" affordance shown only while the player stands on an
   * uncompleted rune. Positioned in updateQuestInteraction each frame.
   */
  private createInteractPrompt() {
    this.interactPrompt = this.add
      .text(0, 0, 'PRESS E TO INTERACT', {
        fontFamily: '"Press Start 2P"',
        fontSize: '10px',
        color: '#07071a',
        backgroundColor: '#ffd700',
        padding: { x: 8, y: 6 },
      })
      .setOrigin(0.5, 1)
      .setDepth(21)
      .setVisible(false)
  }

  /** Index of the uncompleted quest rune the player currently stands on, or -1. */
  private getOverlappedTriggerIndex(): number {
    const playerBounds = this.player.getBounds()
    return this.questTriggers.findIndex(
      (trigger) =>
        !trigger.completed &&
        Phaser.Geom.Intersects.RectangleToRectangle(playerBounds, trigger.zone.getBounds())
    )
  }

  private updateQuestInteraction() {
    const index = this.getOverlappedTriggerIndex()
    if (index === -1) {
      this.interactPrompt.setVisible(false)
      return
    }

    const trigger = this.questTriggers[index]
    if (!trigger) return

    this.interactPrompt
      .setPosition(trigger.zone.x, trigger.zone.getBounds().top - 26)
      .setVisible(true)

    if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
      this.isInteracting = true
      this.player.setVelocityX(0)
      trigger.indicator.setVisible(false)
      this.game.events.emit('quest-triggered', { questIndex: index })
    }
  }

  /**
   * Mark a quest rune as completed — it stops pulsing and can no longer be
   * re-opened. A passed quest leaves the rune lit gold; a failed one leaves it
   * dull red so the player can see which material the boss will punish.
   */
  private markQuestCompleted(index: number, passed = true) {
    const trigger = this.questTriggers[index]
    if (!trigger || trigger.completed) return

    trigger.completed = true
    trigger.glowTween.stop()
    trigger.glow.setVisible(false)
    trigger.rune.setFillStyle(passed ? 0xffd700 : 0x7a2a35)
    trigger.indicator.setVisible(false)
    this.updateQuestsLabel()
  }

  /** Refresh the "QUESTS n/5" HUD text from the runes' actual completed state. */
  private updateQuestsLabel() {
    if (!this.questsLabel) return
    const completed = this.questTriggers.filter((trigger) => trigger.completed).length
    this.questsLabel.setText(`QUESTS ${completed}/${this.questTriggers.length}`)
  }

  private setupCamera() {
    const levelWidth = (this.registry.get('levelWidth') as number | undefined) ?? this.scale.width * 4
    this.physics.world.setBounds(0, 0, levelWidth, this.scale.height)
    this.cameras.main.setBounds(0, 0, levelWidth, this.scale.height)
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08)
    this.cameras.main.setZoom(1.2)
  }

  private setupInput() {
    this.cursors = this.input.keyboard!.createCursorKeys()
    this.wasd = {
      up: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      left: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    }
    this.interactKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E)

    // React layer telling us a quest panel closed. When it was completed the
    // rune is retired so a finished quest can never be reopened.
    const onQuestClosed = (data?: { questIndex?: number; completed?: boolean; passed?: boolean }) => {
      this.isInteracting = false
      if (data?.questIndex === undefined) return
      if (data.completed) {
        this.markQuestCompleted(data.questIndex, data.passed !== false)
      } else {
        this.questTriggers[data.questIndex]?.indicator.setVisible(true)
      }
    }

    // React layer syncing quests the player already completed (persisted
    // progress fetched after the level booted).
    const onQuestsSynced = (indices: number[]) => {
      indices.forEach((index) => this.markQuestCompleted(index))
    }

    // React layer starting the world finale (Issue #4). It decides the
    // outcome from the tracked quest pass/fail results; the scene only
    // verifies the trigger condition — every rune of this world retired.
    const onBossStart = (data?: { won?: boolean; bossName?: string }) => {
      if (this.bossStarted) return
      if (!this.questTriggers.every((trigger) => trigger.completed)) return

      this.bossStarted = true
      this.isInteracting = true
      this.player.setVelocityX(0)

      // A short beat so the player sees the final rune retire, then fade
      // into the battle.
      this.time.delayedCall(700, () => {
        this.cameras.main.fadeOut(450, 0, 0, 0)
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
          this.scene.start('BossScene', {
            worldId: this.registry.get('worldId') as string,
            characterId: this.registry.get('characterId') as string,
            won: data?.won === true,
            bossName: data?.bossName,
          })
        })
      })
    }

    this.game.events.on('quest-closed', onQuestClosed)
    this.game.events.on('quests-synced', onQuestsSynced)
    this.game.events.on('boss-start', onBossStart)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off('quest-closed', onQuestClosed)
      this.game.events.off('quests-synced', onQuestsSynced)
      this.game.events.off('boss-start', onBossStart)
    })
  }

  private handleMovement() {
    const onGround = this.player.body.blocked.down
    const goLeft = this.cursors.left.isDown || this.wasd['left']?.isDown
    const goRight = this.cursors.right.isDown || this.wasd['right']?.isDown
    const jump = Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
      Phaser.Input.Keyboard.JustDown(this.wasd['up'] as Phaser.Input.Keyboard.Key)

    if (goLeft) {
      this.player.setVelocityX(-220)
      this.player.setFlipX(true)
    } else if (goRight) {
      this.player.setVelocityX(220)
      this.player.setFlipX(false)
    } else {
      this.player.setVelocityX(0)
    }

    if (jump && onGround) {
      this.player.setVelocityY(-520)
    }
  }

  private updateAnimations() {
    const characterId = this.registry.get('characterId') as string

    // No animations were created (placeholder/missing spritesheet) — playing a
    // non-existent / zero-frame animation throws in Phaser, so bail early.
    if (!this.anims.exists(`${characterId}-idle`)) return

    const onGround = this.player.body.blocked.down
    const vx = this.player.body.velocity.x
    const vy = this.player.body.velocity.y

    if (!onGround && vy < 0) {
      this.player.play(`${characterId}-jump`, true)
    } else if (Math.abs(vx) > 10) {
      this.player.play(`${characterId}-run`, true)
    } else {
      this.player.play(`${characterId}-idle`, true)
    }
  }

  /**
   * XP and quest-progress readout. XP is owned by React (reconciled with the
   * progress API), so this scene only displays what it's told via
   * `xp-updated` — it never computes XP itself. The quest counter, by
   * contrast, is derived locally from the same rune state `markQuestCompleted`
   * already tracks, so it can never drift from what's actually on screen.
   */
  private createHUD() {
    const hud = this.add.container(0, 0).setScrollFactor(0).setDepth(20)

    const xpLabel = this.add.text(20, 20, 'XP: 0', {
      fontFamily: '"Press Start 2P"',
      fontSize: '10px',
      color: '#ffd700',
    })
    hud.add(xpLabel)

    this.questsLabel = this.add.text(20, 38, `QUESTS 0/${this.questTriggers.length}`, {
      fontFamily: '"Press Start 2P"',
      fontSize: '10px',
      color: '#e8d5b7',
    })
    hud.add(this.questsLabel)
    this.updateQuestsLabel()

    const onXPUpdated = (xp: number) => {
      xpLabel.setText(`XP: ${xp}`)
    }
    this.game.events.on('xp-updated', onXPUpdated)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off('xp-updated', onXPUpdated)
    })
  }
}

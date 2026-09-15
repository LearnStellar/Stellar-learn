import { describe, expect, it } from 'vitest'
import { toEquippedItemMap } from './equippedItems'

describe('toEquippedItemMap', () => {
  it('returns an empty map for null, undefined, arrays, and primitives', () => {
    expect(toEquippedItemMap(null)).toEqual({})
    expect(toEquippedItemMap(undefined)).toEqual({})
    expect(toEquippedItemMap([])).toEqual({})
    expect(toEquippedItemMap('not-an-object')).toEqual({})
    expect(toEquippedItemMap(42)).toEqual({})
  })

  it('returns an empty map for {}', () => {
    expect(toEquippedItemMap({})).toEqual({})
  })

  it('keeps valid slot -> string itemId entries', () => {
    expect(
      toEquippedItemMap({ weapon: 'sword-legendary', head: 'helmet-rare' })
    ).toEqual({ weapon: 'sword-legendary', head: 'helmet-rare' })
  })

  it('drops entries with an unknown slot key', () => {
    expect(toEquippedItemMap({ boots: 'boots-epic', weapon: 'sword-rare' })).toEqual({
      weapon: 'sword-rare',
    })
  })

  it('drops entries whose value is not a string', () => {
    expect(toEquippedItemMap({ weapon: 123, offhand: null, body: ['armor-rare'] })).toEqual({})
  })

  it('accepts all four defined slots', () => {
    const input = { weapon: 'a', offhand: 'b', body: 'c', head: 'd' }
    expect(toEquippedItemMap(input)).toEqual(input)
  })
})

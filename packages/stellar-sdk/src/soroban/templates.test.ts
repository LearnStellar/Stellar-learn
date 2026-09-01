import { describe, expect, it } from 'vitest'
import {
  getSorobanPlaygroundTemplate,
  matchesSorobanPlaygroundTemplate,
  SOROBAN_PLAYGROUND_TEMPLATES,
  type PlaygroundTemplateId,
} from './templates'

const TEMPLATE_IDS: PlaygroundTemplateId[] = ['hello', 'counter']

describe('matchesSorobanPlaygroundTemplate', () => {
  it.each(TEMPLATE_IDS)('accepts the unmodified %s template source', (id) => {
    expect(matchesSorobanPlaygroundTemplate(id, getSorobanPlaygroundTemplate(id).source)).toBe(true)
  })

  it.each(TEMPLATE_IDS)('accepts %s source with only whitespace changes', (id) => {
    const reformatted = getSorobanPlaygroundTemplate(id).source
      .split('\n')
      .map((line) => `    ${line.trim()}`)
      .join('\n\n')

    expect(matchesSorobanPlaygroundTemplate(id, reformatted)).toBe(true)
  })

  it.each(TEMPLATE_IDS)('accepts %s source with line and block comments added', (id) => {
    const withComments = `// A helpful comment for learners\n${getSorobanPlaygroundTemplate(id).source}\n/* trailing note */`

    expect(matchesSorobanPlaygroundTemplate(id, withComments)).toBe(true)
  })

  it.each(TEMPLATE_IDS)('rejects %s source with a semantic change', (id) => {
    const tampered = getSorobanPlaygroundTemplate(id).source.replace('env', 'environment')

    expect(matchesSorobanPlaygroundTemplate(id, tampered)).toBe(false)
  })

  it('rejects code that is not derived from any reviewed template', () => {
    const arbitrary = `#![no_std]\nuse soroban_sdk::{contract, contractimpl, Env};\n#[contract]\npub struct Evil;\n#[contractimpl]\nimpl Evil {\n    pub fn drain(env: Env) {}\n}\n`

    expect(matchesSorobanPlaygroundTemplate('hello', arbitrary)).toBe(false)
    expect(matchesSorobanPlaygroundTemplate('counter', arbitrary)).toBe(false)
  })

  it('rejects one template checked against a different template id', () => {
    expect(
      matchesSorobanPlaygroundTemplate('counter', SOROBAN_PLAYGROUND_TEMPLATES.hello.source)
    ).toBe(false)
    expect(
      matchesSorobanPlaygroundTemplate('hello', SOROBAN_PLAYGROUND_TEMPLATES.counter.source)
    ).toBe(false)
  })

  it('rejects an empty or unrelated string', () => {
    expect(matchesSorobanPlaygroundTemplate('hello', '')).toBe(false)
    expect(matchesSorobanPlaygroundTemplate('hello', 'fn main() {}')).toBe(false)
  })
})

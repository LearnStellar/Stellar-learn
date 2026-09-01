/**
 * Reviewed Soroban templates used by the browser playground. Source is exposed
 * to the editor, while the matching Wasm is kept as a fixed deployable artifact.
 */
export type PlaygroundTemplateId = 'hello' | 'counter'

export interface SorobanPlaygroundTemplate {
  id: PlaygroundTemplateId
  title: string
  description: string
  source: string
  wasmBase64: string
  invoke: {
    functionName: string
    argument?: string
  }
}

export const SOROBAN_PLAYGROUND_TEMPLATES: Record<
  PlaygroundTemplateId,
  SorobanPlaygroundTemplate
> = {
  hello: {
    id: 'hello',
    title: 'Hello World',
    description: 'Returns a greeting from a Soroban contract.',
    source: `#![no_std]

use soroban_sdk::{contract, contractimpl, vec, Env, String, Vec};

#[contract]
pub struct Contract;

#[contractimpl]
impl Contract {
    pub fn hello(env: Env, to: String) -> Vec<String> {
        vec![&env, String::from_str(&env, "Hello"), to]
    }
}
`,
    wasmBase64:
      'AGFzbQEAAAABDAJgAn5+AX5gAX4BfgINAgFiAWkAAAF2AWcAAAMCAQEFAwEAEQYRAn8BQYCAwAALfwBBhYDAAAsHFgMGbWVtb3J5AgAFaGVsbG8AAgFfAwEMAQEKrQEBqgECAn8BfiMAQSBrIgIkACAAQv8Bg0LJAFEEQEKEgICAgICACEKEgICA0AAQACEDIAIgADcDCCACIAM3AwADQCABQRBGBEBBACEBA0AgAUEQRwRAIAJBEGogAWogASACaikDADcDACABQQhqIQEMAQsLIAJBEGqtQiCGQgSEQoSAgIAgEAEgAkEgaiQADwUgAkEQaiABakICNwMAIAFBCGohAQwBCwALAAsACwsOAQBBgIDAAAsFSGVsbG8AQw5jb250cmFjdHNwZWN2MAAAAAAAAAAAAAAABWhlbGxvAAAAAAAAAQAAAAAAAAACdG8AAAAAABAAAAABAAAD6gAAABAAHhFjb250cmFjdGVudm1ldGF2MAAAAAAAAAAbAAAAAABvDmNvbnRyYWN0bWV0YXYwAAAAAAAAAAVyc3ZlcgAAAAAAAAYxLjk3LjEAAAAAAAAAAAAIcnNzZGt2ZXIAAAAvMjcuMC41I2VhNTRmOTVkM2YyZjQ5ZTA0ODdiMjlmZDFhOWY0Njk2MzhmMDlhYmEAAFMOY29udHJhY3RtZXRhdjAAAAAAAAAABmNsaXZlcgAAAAAALzI3LjEuMCM4ZTQwMmVhMjgyMDI5NTBiMjcyZmJhYmMzNGNhYWQ0ZDJmNjRmZTg3AA==',
    invoke: {
      functionName: 'hello',
      argument: 'Playground',
    },
  },
  counter: {
    id: 'counter',
    title: 'Counter',
    description: 'Stores and increments a counter in contract instance storage.',
    source: `#![no_std]

use soroban_sdk::{contract, contractimpl, symbol_short, Env};

#[contract]
pub struct Counter;

#[contractimpl]
impl Counter {
    pub fn increment(env: Env) -> u32 {
        let count: u32 = env
            .storage()
            .instance()
            .get(&symbol_short!("COUNT"))
            .unwrap_or(0);
        let next = count + 1;
        env.storage().instance().set(&symbol_short!("COUNT"), &next);
        next
    }

    pub fn get_count(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&symbol_short!("COUNT"))
            .unwrap_or(0)
    }
}
`,
    wasmBase64:
      'AGFzbQEAAAABFgRgAn5+AX5gAAF+YAN+fn4BfmABfwACEwMBbAEwAAABbAExAAABbAFfAAIDBAMDAQEFAwEAEAYRAn8BQYCAwAALfwBBgIDAAAsHJgQGbWVtb3J5AgAJZ2V0X2NvdW50AAQJaW5jcmVtZW50AAUBXwMBCtwBA08CAX4CfwJAQo6+mdDmAUICEABCAVIEf0EABUKOvpnQ5gFCAhABIgFC/wGDQgRSDQEgAUIgiKchAkEBCyEDIAAgAjYCBCAAIAM2AgAPCwALNwICfwF+IwBBEGsiACQAIABBCGoQAyAAKAIIIQEgADUCDCAAQRBqJABCIIZCBIRCBCABQQFxGwtSAgJ/AX4jAEEQayIAJAAgAEEIahADIAAoAgxBACAAKAIIQQFxGyIBQX9GBEAAC0KOvpnQ5gEgAUEBaq1CIIZCBIQiAkICEAIaIABBEGokACACCwBXDmNvbnRyYWN0c3BlY3YwAAAAAAAAAAAAAAAJZ2V0X2NvdW50AAAAAAAAAAAAAAEAAAAEAAAAAAAAAAAAAAAJaW5jcmVtZW50AAAAAAAAAAAAAAEAAAAEAB4RY29udHJhY3RlbnZtZXRhdjAAAAAAAAAAGwAAAAAAbw5jb250cmFjdG1ldGF2MAAAAAAAAAAFcnN2ZXIAAAAAAAAGMS45Ny4xAAAAAAAAAAAACHJzc2RrdmVyAAAALzI3LjAuNSNlYTU0Zjk1ZDNmMmY0OWUwNDg3YjI5ZmQxYTlmNDY5NjM4ZjA5YWJhAABTDmNvbnRyYWN0bWV0YXYwAAAAAAAAAAZjbGl2ZXIAAAAAAC8yNy4xLjAjOGU0MDJlYTI4MjAyOTUwYjI3MmZiYWJjMzRjYWFkNGQyZjY0ZmU4NwA=',
    invoke: {
      functionName: 'increment',
    },
  },
}

export function getSorobanPlaygroundTemplate(
  id: PlaygroundTemplateId
): SorobanPlaygroundTemplate {
  return SOROBAN_PLAYGROUND_TEMPLATES[id]
}

/**
 * The playground is intentionally capability-limited: only reviewed template
 * Wasm can be deployed. Whitespace and comments remain editable for learning.
 */
export function matchesSorobanPlaygroundTemplate(id: PlaygroundTemplateId, source: string): boolean {
  return normalizeSource(source) === normalizeSource(getSorobanPlaygroundTemplate(id).source)
}

function normalizeSource(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '').replace(/\s+/g, '')
}

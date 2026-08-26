# Soroban Playground Sandboxing

The playground does not compile or execute arbitrary user Rust on the Next.js server.
It exposes editable source for reviewed Hello World and Counter templates, then compares
the submitted source with the selected template after ignoring whitespace and comments.
Only the matching, precompiled Wasm artifact can be deployed.

The API accepts only an action, template identifier, source, and an optional contract ID.
It rejects network URLs, passphrases, secret keys, and unknown request fields. The server
hardcodes `Networks.TESTNET`, the Soroban testnet RPC endpoint, and the testnet Friendbot.
Every deployment and invocation uses a new server-generated Friendbot-funded keypair; no
wallet secret is accepted, persisted, or returned to the browser.

This provides live testnet deployment and invocation while keeping mainnet and arbitrary
server-side code execution outside the playground's capability boundary.

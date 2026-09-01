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

## v1 limitation: template-only, not free-form authoring

Issue #81 asked for an environment to freely write, run, and deploy contracts. This first
version does not meet that bar: the editor only accepts the two reviewed templates above,
and any code that doesn't match one of them byte-for-byte (ignoring whitespace/comments) is
rejected before anything reaches testnet. You can rename things, restructure formatting, or
study the two contracts closely, but you cannot author or deploy a contract of your own.

This is the deliberate v1 tradeoff: matching against reviewed source is what lets the server
skip a real Rust/Wasm compilation step entirely, which is what makes it safe to run without a
sandboxed build service. Supporting arbitrary contracts would mean compiling untrusted Rust to
Wasm server-side (or shipping a client-side toolchain), which is a meaningfully bigger and
riskier undertaking than this PR takes on. Until that lands, treat the playground as a guided,
runnable demo of two contracts rather than a general Soroban authoring tool.

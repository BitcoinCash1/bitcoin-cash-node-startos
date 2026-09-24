# AGENTS.md

This is a StartOS service-package repository — it builds a `.s9pk` for StartOS.

Develop it inside a StartOS packaging workspace created by `start-cli s9pk init-workspace`,
which provides the packaging guide and agent context one level up. If you're reading this in a
bare clone with no workspace, the full guide is at <https://docs.start9.com/packaging>.

**Start every task at the recipe index** — `../start-technologies/projects/start-sdk/docs/src/recipes.md`
(or <https://docs.start9.com/packaging/recipes.html>). It maps an intent ("prompt the user to create
admin credentials", "expose a web UI") to the constructs, the reference pages, and a named production
package to copy. Find the recipe before you read this package's neighbours: a package you reach by
grepping may be non-conformant, and the recipe outranks it.

Freshly scaffolded? Work the
[New Package Checklist](../start-technologies/projects/start-sdk/docs/src/new-package-checklist.md)
(or <https://docs.start9.com/packaging/new-package-checklist.html>) from top to bottom. It is a
guide page, not a file in this repo — read it, don't copy it in.

Keep `README.md` (technical reference for an AI support or administering agent) and
`instructions.md` (end-user docs) in sync with your changes.

**Bugs and feature requests are GitHub issues on this repo** — file them as you find them.
Don't record work in the repo instead: no `TODO.md`, no `NOTES.md`, no `PLAN.md`. What you
verified, tried, and decided belongs in the commit message and the PR body.

## This repo

- **The package id is `bitcoincashd`, not `bchn` or `bitcoin-cash-node`.** Dependent packages (Fulcrum BCH, BCH Explorer, the mining pools) reference it by that id, and the interface id constants they import live in `startos/utils.ts`.
- **testnet4's ports are remapped to 28342/28343 on purpose.** BCHN's defaults for it are 28332/28333, which are this package's ZMQ block and transaction ports. Don't "restore" the upstream defaults.
- **`-listenonion=0` is forced.** BCHN would otherwise try a Tor control port on `127.0.0.1:9051`, which `tor-startos` does not offer — its control interface is a Unix socket. Inbound onion comes from attaching the Tor service's URL plugin to the Peer interface.
- **Tor's SOCKS proxy is reached over the service bridge with a `9050` fallback.** The fallback holds the address constant while Tor is absent, so the `.const()` doesn't restart the node on Tor install/uninstall, and a dead address is just connection-refused — which is why `-onion` is safe to pass unconditionally.
- **Onion-only mode adds `-proxy`, `-dnsseed=0` and `-dns=0`, and all three belong together.** Without them a clearnet DNS-seed or addrman fallback leaks the node's address while the user believes they are Tor-only.

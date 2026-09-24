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

## Repository conventions

This repo is the original the Start9-Community copy is imported from. Keep it a
near-replica of that copy: every difference must be one of those listed below.

- **Syncing with Start9-Community:** `git merge` their `master` into ours, never
  rebase or force-push. Take their side for packaging, layout, docs and CI;
  keep only the deliberate differences below.
- **Branches:** `master` is released — every push to it runs Tag and Release,
  and so does the upstream bot's dispatch after an auto-bump.
  `next` is kept on purpose: Start9's Sync Next workflow mirrors `master` into
  it, so do not delete it.
- **Versions:** `<upstream>:<revision>` in the single `startos/versions/current.ts`.
  Never change the upstream part by hand; a new upstream starts at `:0` (the
  auto-bump does this). The revision is bumped only when the maintainer
  decides — never for alignment, template, docs, CI or archive changes. `ALLOW_DOWNGRADE` stays `false` unless a
  release is known to be reversible.
- **`assets/` vs `archive/`:** `assets/` is packed into the s9pk as a whole, so
  it holds only `.gitkeep` unless the service reads a file at runtime.
  `archive/` holds reference material (`ABOUT.md`, logos, picture variants) and
  is not packed. Never delete anything in `archive/`.
- **What StartOS shows:** name from `title` in `startos/manifest/index.ts`,
  description and About text from `short`/`long` in `startos/manifest/i18n.ts`,
  Instructions tab from `instructions.md` (required), logo from `icon.png`.
- **Commit and PR hygiene:** no session links, `Co-Authored-By` trailers or
  "Generated with" footers in commit messages, PR descriptions or comments.
  The Session Link Guard workflow fails any PR or push that carries one.
  Commits are authored by the maintainer, and all repository text (code
  comments, docs, commit messages, PR text) is written in the maintainer's
  voice, without naming the tools used to produce it.
- **Toolchain:** always follow the latest Start9 tooling — the newest
  `@start9labs/start-sdk` on npm (pinned exactly, with the `overrides` entry),
  the newest `start-cli` release, and the latest `Start9Labs/hello-world-startos`
  template. Its boilerplate files (workflows, `Makefile`, `tsconfig.json`,
  `.gitignore`, `.dockerignore`, `CLAUDE.md`, `startos/index.ts`,
  `startos/sdk.ts`, `startos/i18n/index.ts`, `startos/versions/index.ts`) stay
  byte-identical to it unless a difference is listed below. When the template,
  SDK or CLI moves, update every package. Where the template and the
  Start9-Community copy disagree, the template wins.
- **Deliberate differences from Start9-Community:** newer upstream BCHN; fixes Start9 lacks (`minrelaytxfee` must be above 0 and is only written when set, the ancestor/descendant limit options removed upstream in 23.1.0 are stripped, RPC health calls retry); translations in `startos/i18n/` (Spanish, German, Polish and French, as in the hello-world template; Start9-Community's copy has none); `ALLOW_DOWNGRADE` in `current.ts`; `check-upstream.yml` + `scripts/auto-bump.sh` (GitLab releases, commits the bump to `master` and dispatches Tag and Release; `tagAndRelease.yml` accepts that dispatch); `dependabot.yml`; `session-link-guard.yml`; `startos/fileModels/README.md`; `archive/`; the matching README/instructions notes.

# AGENTS.md

This is a StartOS service-package repository — it builds a `.s9pk` for StartOS.

Develop it inside a StartOS packaging workspace created by `start-cli s9pk init-workspace`,
which provides the packaging guide and agent context one level up. If you're reading this in a
bare clone with no workspace, the full guide is at <https://docs.start9.com/packaging>.

Work this package's `TODO.md` from top to bottom. Keep `README.md` (architecture, for developers and LLMs) and `instructions.md` (end-user docs) in sync with your changes.

## This repo

- **Package id is `bitcoincashd`.** Bitcoin Cash Node (BCHN) — a full BCH node. Dependent services (Fulcrum BCH, BCH Explorer, mining pools) connect over the exported RPC interface, and subscribe to the ZMQ interfaces; interface ids (`rpcInterfaceId`, `peerInterfaceId`, `zmqInterfaceId`) live in `startos/utils.ts`.
- **Networks remap ports.** RPC/P2P ports change per network (`networkPorts` in `utils.ts`); testnet4 is remapped off BCHN's defaults (28342/28343) to avoid colliding with the ZMQ ports (28332-28335). DSP ZMQ streams (28334/28335) are always on; block/tx ZMQ (28332/28333) is conditional on the ZeroMQ toggle.
- **Tor is SOCKS-only.** Outbound peers route through tor's SOCKS proxy at the stable OS bridge address (`sdk.getOsIp(effects)` + `:9050`), resolved reactively via the `bridgeAddress` helper in `utils.ts` from tor's exported `socksHostId`/`socksPort` (`tor-startos/startos/utils`). `-onion` is set unconditionally — a dead bridge address is just connection-refused when Tor is absent, and the `9050` fallback keeps the value constant so BCHN never restarts on Tor install/update/uninstall. Inbound onion uses the Tor service's URL plugin on the Peer interface (`-listenonion` is force-disabled — tor-startos has no TCP control port).

## Inspecting a running install

To run a command inside the service's container (read its generated config, grep app logs), use `start-cli package attach bitcoincashd -n node-sub -- <cmd>`. Select the subcontainer by **name** with `-n` (the name passed to `SubContainer.of` in `main.ts` — here `node-sub`) or by image with `-i`. Note: `-s/--subcontainer` matches the internal **Guid**, not the name, so passing a name to `-s` fails with "no matching subcontainers".

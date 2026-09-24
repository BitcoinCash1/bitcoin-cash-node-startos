<p align="center">
  <img src="icon.png" alt="Bitcoin Cash Node Logo" width="21%">
</p>

# Bitcoin Cash Node on StartOS

> Everything not listed in this document should behave the same as upstream
> Bitcoin Cash Node. If a feature, setting, or behavior is not mentioned here,
> the upstream documentation is accurate and fully applicable — see the
> Documentation section of `instructions.md` for links.

[Bitcoin Cash Node](https://gitlab.com/bitcoin-cash-node/bitcoin-cash-node) (BCHN) is the reference C++ implementation of the Bitcoin Cash protocol — a full node that downloads, verifies, and relays the entire BCH chain. This package runs it on any of six networks, publishes its RPC and ZeroMQ streams for dependent services, and manages RPC credentials as hashed `rpcauth` entries rather than a shared password.

- **Upstream repo:** <https://gitlab.com/bitcoin-cash-node/bitcoin-cash-node>
- **Wrapper repo:** <https://github.com/Start9-Community/bitcoin-cash-node-startos>

---

## Table of Contents

- [Image and Container Runtime](#image-and-container-runtime)
- [Volume and Data Layout](#volume-and-data-layout)
- [File Models](#file-models)
- [Dependencies](#dependencies)
- [Network Access and Interfaces](#network-access-and-interfaces)
- [Installation and First-Run Flow](#installation-and-first-run-flow)
- [Actions](#actions)
- [Tasks](#tasks)
- [Health Checks](#health-checks)
- [Backups and Restore](#backups-and-restore)
- [Limitations and Differences](#limitations-and-differences)
- [Upstream Updates](#upstream-updates)
- [Quick Reference for AI Consumers](#quick-reference-for-ai-consumers)

---

## Image and Container Runtime

One upstream image, consumed unmodified.

| Property      | Value                                                           |
| ------------- | --------------------------------------------------------------- |
| Image         | `mainnet/bitcoin-cash-node`                                     |
| Architectures | x86_64, aarch64 — with aarch64 falling back to emulated x86_64  |
| Command       | `bitcoind`, with the network-dependent settings passed as flags |

| Subcontainer | Purpose                                                                       |
| ------------ | ----------------------------------------------------------------------------- |
| `node-sub`   | The `bitcoind` daemon — the one to `attach` to, and where `bitcoin-cli` lives |

`emulateMissingAs: 'x86_64'` means an ARM board runs the x86_64 image under emulation when no native one is published. It works, and it is markedly slower than a native build — worth knowing before diagnosing a slow sync on ARM.

**The daemon is given 5 minutes to shut down.** `sigtermTimeout` is set to 300 seconds because BCHN flushes its databases on exit, and killing it mid-flush is how a chainstate gets corrupted. A stop that appears to hang is usually this working correctly.

## Volume and Data Layout

One volume, holding the chain and everything else.

| Volume | Mount Point | Purpose                                                    |
| ------ | ----------- | ---------------------------------------------------------- |
| `main` | `/data`     | Blockchain, chainstate, indexes, config, and package state |

| Path                       | Written by  | Holds                                        |
| -------------------------- | ----------- | -------------------------------------------- |
| `bitcoin.conf`             | The package | Node configuration, including `rpcauth`      |
| `store.json`               | The package | Chain selection, credentials, one-shot flags |
| `blocks/`, `chainstate/`   | BCHN        | The chain and the UTXO set                   |
| `indexes/txindex/`         | BCHN        | The transaction index                        |
| `peers.dat`, `banlist.dat` | BCHN        | Peer and ban state                           |

The volume is marked NoCOW (`chattr +C`) on first start. That matters on btrfs, where copy-on-write plus a blockchain's sequential append pattern fragments the filesystem badly. It is applied best-effort: a filesystem that does not support it logs a warning and start-up continues.

## File Models

Two models. `bitcoin.conf` is upstream's own configuration file; `store.json` is what only StartOS knows.

| File           | Format | Modelled                | Written by                     |
| -------------- | ------ | ----------------------- | ------------------------------ |
| `bitcoin.conf` | INI    | Yes — `FileHelper.ini`  | Install and the config actions |
| `store.json`   | JSON   | Yes — `FileHelper.json` | Install, actions, and `main`   |

**`bitcoin.conf` is modelled loosely on purpose.** The schema names the keys the package manages, but unknown keys are preserved rather than stripped — so a setting added by hand for something the actions do not cover survives a config action rewriting its neighbours. The keys the package _does_ name are its own, and an action that touches one overwrites it.

INI parsing returns strings, and a duplicated key returns an array. The model coerces both: a numeric field accepts `"450"`, a boolean accepts `"1"`, and where a key legitimately repeats — `rpcauth`, `onlynet`, `externalip`, `addnode` — it is modelled as a list.

**RPC access is `rpcauth`, not a shared password.** Each credential is stored as `username:salt$hmac`, so the password itself is never in the config file and is shown exactly once, when generated. The consequence is that there is no way to recover a lost password — only to generate a replacement for that username, which the action does by removing the old entry first.

**`store.json`** carries the selected network, the initial RPC user and password, the ZeroMQ and index toggles, and the one-shot reindex flags. `main` clears a reindex flag as it consumes it, so a reindex happens once rather than on every start.

Five settings in `bitcoin.conf` are asserted by the package and not left to the user: `server`, `listen`, `rpcbind`, `rpcallowip`, and the ZeroMQ publisher addresses. StartOS decides reachability at the network layer, so binding the RPC narrowly inside the container would only prevent the OS from reaching it.

## Dependencies

Tor, and **only when the configuration actually uses it**.

| Configuration                                                       | Tor dependency              |
| ------------------------------------------------------------------- | --------------------------- |
| An `.onion` external address is set, or onion is an allowed network | Required, `kind: 'running'` |
| Neither                                                             | Not a dependency at all     |

The dependency is derived from the config rather than from a toggle, which means it appears and disappears as the user changes their networking. Tor exports no interface of its own, so the package resolves its SOCKS proxy over the internal bridge with a fallback that holds the address stable while Tor is absent.

That fallback is what makes it safe to pass `-onion` unconditionally: an unreachable proxy is a refused connection, not a start-up failure, and BCHN falls back to clearnet.

**Inbound onion comes from the Tor service, not from BCHN.** `-listenonion` is force-disabled, because BCHN would try to reach a Tor control port on TCP that the Tor package does not offer — it exposes a Unix socket instead. The onion address is published by attaching Tor to the Peer interface, which is the platform's own mechanism.

## Network Access and Interfaces

Three named interfaces, plus three ports bound without one.

| Interface        | Id     | Type | Mainnet Port | Description                             |
| ---------------- | ------ | ---- | ------------ | --------------------------------------- |
| RPC Interface    | `rpc`  | api  | 8332         | JSON-RPC over HTTP                      |
| Peer Interface   | `peer` | p2p  | 8333         | The Bitcoin Cash P2P network            |
| ZeroMQ Interface | `zmq`  | api  | 28332        | Block notifications — only when enabled |

| Port  | Stream                          | Bound                  |
| ----- | ------------------------------- | ---------------------- |
| 28332 | Raw and hashed **blocks**       | With the ZeroMQ toggle |
| 28333 | Raw and hashed **transactions** | With the ZeroMQ toggle |
| 28334 | Double Spend Proof hashes       | **Always**             |
| 28335 | Double Spend Proof raw          | **Always**             |

Only 28332 carries a named interface. The other three ports are bound so subscribers can reach them, but they show no entry on the service page — an agent looking for a "ZMQ transactions" address will not find one and should use the ZeroMQ interface's address with the port substituted.

**The DSP streams are always on.** Double Spend Proof is a Bitcoin Cash feature with no equivalent elsewhere, and merchants' point-of-sale software depends on it, so it is not made optional.

**RPC and P2P ports move with the chain:**

| Network  | RPC   | Peer  |
| -------- | ----- | ----- |
| mainnet  | 8332  | 8333  |
| testnet3 | 18332 | 18333 |
| testnet4 | 28342 | 28343 |
| scalenet | 38332 | 38333 |
| chipnet  | 48332 | 48333 |
| regtest  | 18443 | 18444 |

**testnet4 is deliberately remapped.** BCHN's own defaults for it are 28332/28333, which are exactly the ZeroMQ block and transaction ports — so the package overrides them to 28342/28343. Anything documenting BCHN's stock testnet4 ports is describing a configuration this package does not run.

## Installation and First-Run Flow

Install generates a random RPC password, writes the initial `bitcoin.conf`, and sizes the database cache to the machine: 25% of system RAM, capped at 5 GB. There is no task and no wizard; the node starts syncing mainnet immediately.

The defaults are chosen for a node that other services will use: the transaction index on, ZeroMQ on, mempool persistence on. That combination is what Fulcrum BCH, block explorers, and mining pools need, so a fresh install is usable by a dependent without reconfiguration.

Start-up runs a oneshot first to create the data directory and apply the NoCOW attribute, then starts the daemon. Initial sync is the long part, and nothing about it needs attention beyond waiting.

## Actions

Fourteen actions in four groups, plus one hidden.

### Node Info — ungrouped

Reports version, network, connection counts, block height, and sync progress from the running node. Read-only, `only-running`, immediate.

### Network — Configuration

Switches which BCH chain the node runs: mainnet, testnet3, testnet4, scalenet, chipnet, or regtest.

- **What it changes:** `network` in the store, and with it the RPC and P2P ports and the data directory in use.
- **Cost:** restarts, and the newly selected chain syncs from scratch if it has no prior data.
- **Repeat safety:** idempotent. Data for other chains is preserved, not deleted.
- **What to expect:** the interfaces are rebuilt reactively, so the address on the service page changes port when you switch. A `.once()` read here would leave the old chain's ports bound — this is one of the few places in the package where the reactive read is load-bearing rather than convenient.

### Node Settings — Configuration

The transaction index, ZeroMQ, pruning, mempool persistence, and database performance.

- **What it changes:** `bitcoin.conf`.
- **Cost:** applies on the next start. Turning the transaction index on makes the next start rebuild it, which takes hours.
- **Repeat safety:** idempotent.
- **The one hard conflict:** pruning and the transaction index are mutually exclusive. Enabling pruning turns the index off, and anything depending on it — Fulcrum, an explorer — stops being able to look up arbitrary transactions.
- **Turning ZeroMQ off removes an interface**, so a subscriber loses its address rather than getting an empty stream.

### RPC & Peers Settings — Configuration

Connection limits, allowed networks, external addresses, and added nodes.

- **What it changes:** `bitcoin.conf`, and through it the Tor dependency: adding an `.onion` external address or restricting to onion makes Tor required.
- **Restricting to onion alone changes more than routing.** The package then also routes _everything_ through SOCKS and disables DNS seeding and DNS resolution, so a clearnet seed lookup cannot leak the node's address. That is why onion-only is a meaningfully different mode rather than a filter.

### Mempool & Block Policy — Configuration

Mempool size and expiry, relay fee, and excessive block size. Writes `bitcoin.conf`; applies on the next start. The relay fee must be above 0, and the ancestor/descendant limit options are not offered: Bitcoin Cash Node removed them in 23.1.0 and refuses to start with either set, so any leftover value is stripped from `bitcoin.conf` on every write.

### Credentials — three actions

**View RPC Credentials** shows the initial credential. **Generate RPC Credentials** creates a new `rpcauth` entry for a named user. **Delete RPC Users** removes entries.

- **A generated password is shown once and cannot be recovered.** Only the salted hash is stored. Re-generating for the same username replaces its entry, which invalidates the old password.
- **Deletion takes effect on the next restart**, not immediately — the running daemon has the old set loaded.
- All three are available at any status.

### Maintenance — five actions

| Action                   | Availability   | What it does                                        |
| ------------------------ | -------------- | --------------------------------------------------- |
| Reindex Blockchain       | any            | Re-verifies every block from genesis, then restarts |
| Reindex Chainstate       | any            | Rebuilds the UTXO set from existing blocks          |
| Delete Peer List         | `only-stopped` | Removes cached peers and the ban list               |
| Delete Transaction Index | `only-stopped` | Removes the index so it rebuilds                    |
| Delete Test Network Data | any            | Deletes data for selected test networks             |

- **Reindex Blockchain is the expensive one** — hours to days, and it must not be interrupted. Reach for Reindex Chainstate first: it rebuilds only the UTXO set from blocks already on disk and is far quicker. Both set a one-shot flag and restart; the flag is cleared as it is consumed.
- **Delete Transaction Index** is the targeted fix for a corrupted index. With the index still enabled, the next start rebuilds it, which takes hours but does not touch the chain.
- **Delete Peer List** requires the service stopped, and the node rediscovers peers from DNS seeds afterwards.

### Auto-Configure — hidden

**Not user-facing.** It exists so a dependent package can raise a task that sets exactly the BCHN settings it needs, with those fields pre-filled and locked. A user encounters it as a task on this service's page, raised by another service — never as something to go and run.

## Tasks

None. This package raises no tasks, so the service is never held on a prompt and its ordinary controls are always available.

## Health Checks

Five checks. Two probe the node, and three report state that would otherwise be invisible.

| Check              | Displayed as       | Method                                       |
| ------------------ | ------------------ | -------------------------------------------- |
| `primary`          | "RPC"              | `getrpcinfo` succeeds                        |
| `sync-progress`    | "Blockchain Sync"  | `getblockchaininfo`                          |
| `peer-connections` | "Peer Connections" | `getpeerinfo`, counting inbound and outbound |
| `tor`              | "Tor"              | Tor's live package status plus the config    |
| `clearnet`         | "Clearnet"         | Allowed networks plus advertised addresses   |

**Sync is not reported from `initialblockdownload` alone.** A node at the tip — and regtest permanently — can report that flag true while verification progress is already complete, which would display a nonsensical "Syncing 100%". The check requires both the flag _and_ progress genuinely below completion before it says syncing.

The sync and peer checks poll every 30 seconds normally and every 5 while starting or failing, so a node coming up reports progress quickly and a settled node costs little.

**"Peer Connections" reports `loading`, not failure, below three peers.** A node that has just started legitimately has none, and being briefly under-connected is not a fault.

**"Tor" and "Clearnet" both distinguish outbound-only from inbound-and-outbound** by whether a matching external address is advertised — an onion for the first, a public IP for the second. Either reports itself excluded when the allowed-networks setting rules it out, which is a configuration state rather than a failure. Tor additionally reports whether the Tor package is installed and running, tracked live so installing Tor changes the reading without restarting the node.

## Backups and Restore

The `main` volume is copied, with everything regenerable excluded:

| Excluded                             | Why                         |
| ------------------------------------ | --------------------------- |
| `/blocks`, `/chainstate`, `/indexes` | Re-downloadable and derived |
| `/peers.dat`, `/banlist.dat`         | Rediscovered from DNS seeds |
| `/fee_estimates.dat`, `/mempool.dat` | Rebuilt from live traffic   |

So the backup is the **configuration**, not the chain: `bitcoin.conf` with its `rpcauth` entries, and `store.json` with the chain selection and the initial credential.

**A restored node re-syncs from scratch.** That is the deliberate trade — a backup measured in kilobytes rather than hundreds of gigabytes, at the cost of a full initial sync afterwards. Anything depending on this node's RPC is unusable until that completes, and if the transaction index is on it must rebuild as well.

The `rpcauth` entries surviving is what stops a restore from breaking every dependent service and external wallet.

## Limitations and Differences

1. **Blockchain data is not backed up**, by design.
2. **A generated RPC password cannot be recovered** — only the hash is stored. Generate a replacement instead.
3. **Pruning and the transaction index are mutually exclusive**, and enabling pruning breaks anything that indexes this node.
4. **testnet4 does not use BCHN's default ports**, because they collide with the ZeroMQ ports; they are remapped.
5. **Only the block ZeroMQ port carries a named interface.** The transaction and DSP ports are bound but do not appear on the service page.
6. **Inbound onion is published by the Tor service**, not by BCHN — `-listenonion` is disabled because the Tor package offers no TCP control port.
7. **On ARM the image may run emulated**, which is substantially slower than a native build.
8. **RPC is bound to all interfaces inside the container** and allows any source. Reachability is StartOS's decision, not the daemon's.

---

## Upstream Updates

`check-upstream.yml` looks for a new Bitcoin Cash Node release on GitLab daily. When one appears, `scripts/auto-bump.sh` sets `startos/versions/current.ts` to `<upstream>:0`, resets `ALLOW_DOWNGRADE` to `false`, updates the image tag in the manifest and the version in the store description, commits the bump straight to `master`, and the workflow dispatches Tag and Release, which builds and publishes the new version. Package-only fixes bump the revision after the colon by hand.

## Quick Reference for AI Consumers

```yaml
package_id: bitcoincashd # note: the title is "Bitcoin Cash Node (BCHN)"
image: mainnet/bitcoin-cash-node
architectures:
  - x86_64
  - aarch64 # emulateMissingAs: x86_64
subcontainers:
  - node-sub
volumes:
  main: /data
file_models:
  - bitcoin.conf
  - store.json
startos_managed_env_vars: [] # settings are passed as bitcoind flags
dependencies:
  - tor # required only when an .onion externalip or onion-only is configured
interfaces:
  rpc: { type: api, port: 8332 }
  peer: { type: p2p, port: 8333 }
  zmq: { type: api, port: 28332 } # blocks; exported only when ZeroMQ is enabled
actions:
  - runtime-info
  - network-config
  - other-config
  - peers-config
  - mempool-config
  - view-credentials
  - generate-rpc-user
  - delete-rpc-user
  - reindex-blockchain
  - reindex-chainstate
  - delete-peers
  - delete-tx-index
  - delete-test-network-data
  - autoconfig # hidden; called by dependent packages
tasks: []
health_checks:
  - primary # displayed "RPC"
  - sync-progress # displayed "Blockchain Sync"
  - peer-connections # displayed "Peer Connections"
  - tor # displayed "Tor"
  - clearnet # displayed "Clearnet"
```

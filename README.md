<p align="center">
  <img src="icon.png" alt="Bitcoin Cash Node Logo" width="21%">
</p>

# Bitcoin Cash Node on StartOS

> **Upstream docs:** <https://docs.bitcoincashnode.org/>
>
> Everything not listed in this document should behave the same as upstream
> Bitcoin Cash Node. If a feature, setting, or behavior is not mentioned here,
> the upstream documentation is accurate and fully applicable.

Bitcoin Cash Node (BCHN) is the reference C++ implementation of the Bitcoin Cash protocol — a full node that downloads, verifies, and relays the entire BCH blockchain. See the [upstream project](https://gitlab.com/bitcoin-cash-node/bitcoin-cash-node) for general BCHN documentation.

This package wraps **BCHN v29.0.0**, which implements the May 15, 2026 network upgrade (P2S32, native loops, functions, bitwise opcodes). Nodes running v28.x stop following the main chain after that upgrade activates.

---

## Table of Contents

- [Image and Container Runtime](#image-and-container-runtime)
- [Volume and Data Layout](#volume-and-data-layout)
- [Installation and First-Run Flow](#installation-and-first-run-flow)
- [Default Networking](#default-networking)
- [Configuration Management](#configuration-management)
- [Network Access and Interfaces](#network-access-and-interfaces)
- [Actions (StartOS UI)](#actions-startos-ui)
- [Backups and Restore](#backups-and-restore)
- [Health Checks](#health-checks)
- [Dependencies](#dependencies)
- [Default Overrides](#default-overrides)
- [Limitations and Differences](#limitations-and-differences)
- [What Is Unchanged from Upstream](#what-is-unchanged-from-upstream)
- [Contributing](#contributing)
- [Quick Reference for AI Consumers](#quick-reference-for-ai-consumers)

---

## Image and Container Runtime

| Property      | Value                                            |
| ------------- | ------------------------------------------------ |
| Image         | `mainnet/bitcoin-cash-node:v29.0.0` (Docker Hub) |
| Architectures | x86_64, aarch64 (aarch64 emulated as x86_64)     |
| Command       | `bitcoind` with StartOS-managed flags            |

The pre-built upstream BCHN image ships `bitcoind` and `bitcoin-cli`, plus ZMQ support. No Dockerfile is built; the image is pulled by digest at pack time.

## Volume and Data Layout

| Volume | Mount Point | Purpose                                            |
| ------ | ----------- | -------------------------------------------------- |
| `main` | `/data`     | All BCHN data (blockchain, config, wallets, peers) |

StartOS-specific files on the `main` volume:

| File           | Purpose                                                                    |
| -------------- | -------------------------------------------------------------------------- |
| `bitcoin.conf` | INI config written from the configuration actions                         |
| `store.json`   | Persistent StartOS state (RPC credentials, network, reindex/sync flags)    |

Blockchain data (`blocks/`, `chainstate/`, `indexes/`) resides on the `main` volume alongside `bitcoin.conf`, `peers.dat`, and wallet data.

## Installation and First-Run Flow

1. On install, StartOS sets the `nocow` attribute on the data directory (btrfs optimization via `chattr -R +C`).
2. `store.json` and `bitcoin.conf` are seeded. A random 32-character RPC password is generated; `dbcache` is sized to 25% of system RAM (capped at 5120 MB); `txindex`, ZeroMQ, and mempool persistence are enabled by default.
3. BCHN begins syncing the full BCH blockchain (Initial Block Download). A full IBD takes several hours to a few days depending on hardware, disk, and network speed.
4. Dependent services (Fulcrum BCH, BCH Explorer, mining pools) install, connect, and configure themselves automatically via the hidden **Auto-Configure** action.

## Default Networking

Out of the box, BCHN connects to the Bitcoin Cash network over clearnet with no user configuration required. When the **Tor** service is installed, outbound peer connections are additionally routed over Tor.

| Transport     | Default                                    | Inbound                                       | How to change                                       |
| ------------- | ------------------------------------------ | --------------------------------------------- | --------------------------------------------------- |
| **IPv4/IPv6** | Enabled (clearnet peer discovery)          | No (no `externalip` advertised)               | Publish an IP address on the Peer interface          |
| **Tor**       | Outbound via StartOS Tor proxy (`-onion`)  | No (no onion address advertised)              | Add an onion address on the Peer interface           |

Set **RPC & Peers Settings → Allowed Networks** to **Tor (.onion)** only to run a fully Tor-only node — BCHN is then started with `-proxy`, `-dnsseed=0`, and `-dns=0` so no clearnet lookups leak. In that mode you must add at least one `.onion` peer under **Add Peers**.

BCHN's automatic onion-listen feature (`-listenonion`) requires a TCP Tor control port (9051), which the StartOS Tor service does not expose (it offers a Unix control socket only). `-listenonion=0` is therefore set unconditionally; for inbound onion connectivity, add an onion service on the Peer interface instead.

## Configuration Management

BCHN is configured through **StartOS actions** that write to `bitcoin.conf` (INI format) on the `main` volume. Four actions in the **Configuration** group cover all user-facing settings:

| Action                    | Settings                                                                                              |
| ------------------------- | ----------------------------------------------------------------------------------------------------- |
| **Network**               | Network selection (mainnet / testnet3 / testnet4 / scalenet / chipnet / regtest)                      |
| **Node Settings**         | txindex, prune, ZeroMQ, mempool persistence, dbcache, dbbatchsize, blocknotify, wallet files          |
| **RPC & Peers Settings**  | RPC timeout/threads/workqueue, max connections, max upload target, bloom filters, allowed networks, peers |
| **Mempool & Block Policy**| max mempool, min relay fee, mempool expiry, excessive block size, ancestor/descendant limits          |

Selecting a network switches the data directory and the RPC/P2P port set automatically. Enabling pruning forces `txindex` off (the two are incompatible). Double Spend Proof (DSP) relay is always forced on.

Settings that are always managed by StartOS (not user-editable):

| Setting      | Value         | Reason                                            |
| ------------ | ------------- | ------------------------------------------------- |
| `server`     | `1`           | RPC server always on                              |
| `listen`     | `1`           | Always accepting peer connections                 |
| `rpcbind`    | `0.0.0.0`     | RPC reachable by dependent containers             |
| `rpcallowip` | `0.0.0.0/0`   | RPC reachable by dependent containers             |
| `-onion`     | `<torIp>:9050`| StartOS Tor proxy (set at runtime when Tor is up) |

## Network Access and Interfaces

Ports adjust automatically to the selected network. Mainnet defaults:

| Interface | Port  | Protocol | Purpose                                   | Condition        |
| --------- | ----- | -------- | ----------------------------------------- | ---------------- |
| RPC       | 8332  | HTTP     | JSON-RPC commands                         | Always           |
| Peer      | 8333  | TCP      | BCH peer-to-peer connections              | Always           |
| ZeroMQ    | 28332 | TCP      | Block notifications (rawblock, hashblock) | When ZMQ enabled |
| ZeroMQ    | 28333 | TCP      | Tx notifications (rawtx, hashtx)          | When ZMQ enabled |
| ZMQ DSP   | 28334 | TCP      | Double Spend Proof hash notifications     | Always           |
| ZMQ DSP   | 28335 | TCP      | Double Spend Proof raw-tx notifications   | Always           |

RPC/P2P ports per network: testnet3 `18332/18333`, testnet4 `28342/28343`, scalenet `38332/38333`, chipnet `48332/48333`, regtest `18443/18444`. (testnet4's BCHN-default RPC/P2P ports collide with the ZMQ range and are remapped to `28342/28343`.)

## Actions (StartOS UI)

### Configuration

| Action                     | Purpose                                       | Availability |
| -------------------------- | --------------------------------------------- | ------------ |
| **Network**                | Select the Bitcoin Cash network               | Any          |
| **Node Settings**          | Indexes, pruning, ZMQ, performance, advanced  | Any          |
| **RPC & Peers Settings**   | RPC tuning, peer connections, network limits  | Any          |
| **Mempool & Block Policy** | Mempool size, relay fees, block policy        | Any          |

### Info

| Action        | Purpose                                                           | Availability |
| ------------- | ----------------------------------------------------------------- | ------------ |
| **Node Info** | Version, network, connections, and sync status from live RPC      | Running only |

### Credentials

| Action                       | Purpose                                                       | Availability |
| ---------------------------- | ------------------------------------------------------------- | ------------ |
| **View RPC Credentials**     | Show username, password, and RPC port for a selected credential | Any        |
| **Generate RPC Credentials** | Create a new `rpcauth` entry for an external service          | Any          |
| **Delete RPC Users**         | Remove existing `rpcauth` entries                             | Any          |

### Maintenance

| Action                       | Purpose                                                         | Availability |
| ---------------------------- | --------------------------------------------------------------- | ------------ |
| **Reindex Blockchain**       | Re-verify every block from genesis (rebuilds index + chainstate)| Any          |
| **Reindex Chainstate**       | Rebuild the UTXO chainstate from existing block files           | Any          |
| **Delete Peer List**         | Delete a corrupted `peers.dat`                                  | Stopped only |
| **Delete Transaction Index** | Delete a corrupted txindex                                      | Stopped only |
| **Delete Test Network Data** | Free disk space by deleting block data for selected test networks (never touches mainnet; refuses the active network) | Any |

### Hidden (Dependent Service Automation)

| Action           | Purpose                                                          | Availability |
| ---------------- | ---------------------------------------------------------------- | ------------ |
| **Auto-Configure** | Prefill `bitcoin.conf` with the settings a dependent service needs | Any        |

## Backups and Restore

**Backed up:** the `main` volume, **excluding** `blocks/`, `chainstate/`, `indexes/`, `peers.dat`, `banlist.dat`, `fee_estimates.dat`, and `mempool.dat`.

**What is backed up:** `bitcoin.conf`, `store.json` (RPC credentials), and wallet data.

**What is NOT backed up:** blockchain data — it must be re-synced after a restore.

**Restore warning:** restoring overwrites current configuration and wallet data.

## Health Checks

| Check                | Method                                  | Messages                                                                          |
| -------------------- | --------------------------------------- | --------------------------------------------------------------------------------- |
| **RPC**              | `bitcoin-cli getrpcinfo` (daemon ready) | "BCHN RPC Interface is ready"                                                      |
| **Blockchain Sync**  | `bitcoin-cli getblockchaininfo`         | Percentage during IBD; "Synced — block N" when complete                           |
| **Peer Connections** | `bitcoin-cli getpeerinfo`               | Connected peer count with inbound/outbound split; warns when fewer than 3 peers   |
| **Tor**              | Tor install/running + onion address     | "Inbound and outbound" when an onion address is published; otherwise "Outbound only" |
| **Clearnet**         | Published IP address check              | "Inbound and outbound" when an IP is published; otherwise "Outbound only"          |

## Dependencies

### Tor (optional, conditional)

| Property           | Value                                                              |
| ------------------ | ----------------------------------------------------------------- |
| Version constraint | `>= 0.4.9.5`                                                      |
| Required state     | Running                                                           |
| Health checks      | None                                                             |
| Mounted volumes    | None                                                             |
| Purpose            | Tor SOCKS proxy for outbound connections and onion advertisement |

The dependency becomes **required** only when `externalip` contains a `.onion` address or `onlynet` includes `onion`. Otherwise Tor is entirely optional.

## Default Overrides

Values seeded into `bitcoin.conf` / `store.json` on install:

| Setting          | Our Default                       | Reason                                                |
| ---------------- | --------------------------------- | ----------------------------------------------------- |
| `txindex`        | `1` (on)                          | Required by Fulcrum BCH and BCH Explorer              |
| ZMQ block/tx     | `tcp://0.0.0.0:28332` / `:28333`  | Required by indexers and explorers                    |
| ZMQ DSP          | `tcp://0.0.0.0:28334` / `:28335`  | Double Spend Proof streams (always on)                |
| `doublespendproof` | `1` (on)                        | DSP relay always enabled                              |
| `persistmempool` | `1` (on)                          | Reload mempool across restarts                        |
| `maxconnections` | `125`                             | Upstream default, written explicitly                  |
| `dbcache`        | 25% of system RAM (max 5120 MB)   | Faster IBD on machines with more RAM                  |
| `rpcthreads`     | `4`                               | RPC concurrency for dependent services                |
| `rpcworkqueue`   | `64`                              | RPC queue depth for dependent services                |

## Limitations and Differences

1. **Pre-built upstream image** — pulls `mainnet/bitcoin-cash-node:v29.0.0` rather than building from source.
2. **RPC bound to `0.0.0.0`** — so dependent StartOS containers (Fulcrum BCH, BCH Explorer) can reach the node; authentication is via the generated `rpcuser`/`rpcpassword` and any `rpcauth` entries.
3. **Tor inbound is manual** — `-listenonion` is disabled because the StartOS Tor service exposes only a Unix control socket; use an onion service on the Peer interface for inbound onion connectivity.
4. **DSP relay always on** — Double Spend Proof ZMQ streams (28334/28335) are always active regardless of the ZeroMQ toggle.
5. **5-minute shutdown timeout** — SIGTERM allows 300 seconds for the database to flush; let it finish rather than force-stopping.
6. **Blockchain data is not backed up** — only config, credentials, and wallets; block/chainstate data re-syncs after a restore.

## What Is Unchanged from Upstream

- Block validation and consensus rules
- Peer-to-peer networking (gossip, block relay, transaction relay)
- Wallet functionality (key management, signing, coin selection)
- JSON-RPC API (all commands)
- ZeroMQ notification interface
- Transaction and block index behavior
- Mempool policy

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for build instructions and development workflow.

---

## Quick Reference for AI Consumers

```yaml
package_id: bitcoincashd
image: mainnet/bitcoin-cash-node:v29.0.0
architectures: [x86_64, aarch64]
volumes:
  main: /data
ports:
  rpc: 8332
  peer: 8333
  zmq-block: 28332 (conditional)
  zmq-tx: 28333 (conditional)
  zmq-dsp-hash: 28334
  zmq-dsp-raw: 28335
dependencies:
  tor: conditional (onion connectivity)
startos_managed_files:
  - bitcoin.conf
  - store.json
actions:
  - network-config
  - other-config
  - peers-config
  - mempool-config
  - runtime-info
  - view-credentials
  - generate-rpc-user
  - delete-rpc-user
  - reindex-blockchain
  - reindex-chainstate
  - delete-peers
  - delete-tx-index
  - delete-test-network-data
  - autoconfig (hidden, dependent service automation)
health_checks:
  - rpc: bitcoin-cli getrpcinfo (daemon ready)
  - sync-progress: bitcoin-cli getblockchaininfo
  - peer-connections: bitcoin-cli getpeerinfo
  - tor: install/running status + onion address check
  - clearnet: published IP address check
backup_volumes:
  - main (excluding blocks/, chainstate/, indexes/, peers.dat, banlist.dat, fee_estimates.dat, mempool.dat)
```

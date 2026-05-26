# Bitcoin Cash Node (BCHN)

Bitcoin Cash Node begins its Initial Block Download — fetching and verifying the
entire BCH chain — the moment it launches; nothing needs configuring first. This
page covers what is specific to running it on StartOS.

## Documentation

- [Bitcoin Cash Node documentation](https://docs.bitcoincashnode.org/) — the upstream operator and configuration reference for `bitcoind` and `bitcoin-cli`.

## What you get on StartOS

- A full BCH node — downloads, verifies, and relays the entire blockchain, then stays in sync.
- A **JSON-RPC interface** on port 8332 that other StartOS services (Fulcrum BCH, BCH
  Explorer, mining pools) and external wallets connect to.
- **ZeroMQ** block and transaction notifications on ports 28332/28333 for services
  that subscribe to them (enable in Config). Double Spend Proof (DSP) ZMQ streams
  on ports 28334/28335 are always active.
- **Tor** support — when Tor is installed, BCHN routes outbound peer connections through
  Tor. A hybrid mode (clearnet + onion) runs by default; restrict to onion-only via
  Config if you want a fully private node.
- Multiple networks: **mainnet**, **testnet3**, **testnet4**, **scalenet**, **chipnet**, and **regtest**.
- The **May 2026 network upgrade** is included: P2S32 (32-byte script hash),
  native loops, functions, and bitwise opcodes — required for continued operation
  after May 15, 2026.

## Getting started

There is no setup wizard and nothing required to start using Bitcoin Cash Node — it
begins syncing on first launch.

Open the **Dashboard** to watch sync progress. A full Initial Block Download takes
anywhere from several hours to a few days depending on your hardware, disk, and
network speed.

Services that depend on Bitcoin Cash Node — Fulcrum BCH, BCH Explorer, mining pools —
install, connect, and configure themselves automatically. They report that they are
waiting for Bitcoin Cash Node to sync until IBD finishes; no manual wiring is needed.

## RPC access

The JSON-RPC API listens on **port 8332** (mainnet). Dependent StartOS services
connect and configure themselves automatically when you install them.

For an external wallet or app, run **Actions → View RPC Credentials** to get the
auto-generated username, password, and port for your selected network.

## Configuration

All settings live under **Config**, organized into four actions:

- **Network** — mainnet (default), testnet3, testnet4, scalenet, chipnet, or regtest.
  Switching network changes the data directory and the RPC/P2P port set.
- **Node Settings** — transaction index (`txindex`), pruning, ZeroMQ notifications,
  mempool persistence, database cache/batch size, block-notify script, and wallet
  files. `txindex` is required by Fulcrum BCH and BCH Explorer and is incompatible
  with pruning — enabling pruning turns it off.
- **RPC & Peers Settings** — RPC timeout, threads, and work-queue depth; maximum
  connections (default 125); upload target; bloom-filter serving; allowed networks;
  and manual peers (`addnode`).
- **Mempool & Block Policy** — mempool size, minimum relay fee, expiry, excessive
  block size (default 32 MB), and ancestor/descendant limits.

## Tor networking

By default BCHN runs in hybrid mode: clearnet peers over IPv4/IPv6 and `.onion`
peers over Tor (when Tor is installed). To go fully Tor-only, set **RPC & Peers
Settings → Allowed Networks** to **Tor (.onion)** only — BCHN then disables DNS
seeds and routes everything through Tor. In that mode, add at least one `.onion`
peer under **Add Peers**, since DNS seeds are off.

For inbound onion connectivity (being reachable from Tor): open **Interfaces →
Peer Interface → Add Onion Service** in StartOS. This creates a hidden service
forwarding your `.onion:8333` to the node so peers can reach you.

## Actions

Beyond the four Config actions above, the service exposes:

- **Node Info** — live version, network, connection count, and sync status (available while running).
- **View RPC Credentials** — display the username, password, and RPC port for a credential.
- **Generate RPC Credentials** — create a new `rpcauth` entry for an external service; the password is shown once.
- **Delete RPC Users** — remove `rpcauth` entries.
- **Reindex Blockchain** — re-verify every block from genesis (rebuilds index and chainstate).
- **Reindex Chainstate** — rebuild the UTXO set from stored block files.
- **Delete Peer List** — remove a corrupted `peers.dat`. Stop the service first.
- **Delete Transaction Index** — remove a corrupted txindex. Stop the service first.
- **Delete Test Network Data** — free disk space by deleting block data for selected test networks (testnet3/testnet4/scalenet/chipnet/regtest). Never touches mainnet, and refuses to delete the network the node is currently running on.

## Ports

| Port  | Protocol | Purpose                                          |
|-------|----------|--------------------------------------------------|
| 8332  | HTTP     | JSON-RPC — mainnet                               |
| 8333  | TCP      | Peer-to-peer — mainnet                           |
| 18332 | HTTP     | JSON-RPC — testnet3                              |
| 18333 | TCP      | Peer-to-peer — testnet3                          |
| 28342 | HTTP     | JSON-RPC — testnet4                              |
| 28343 | TCP      | Peer-to-peer — testnet4                          |
| 38332 | HTTP     | JSON-RPC — scalenet                              |
| 38333 | TCP      | Peer-to-peer — scalenet                          |
| 48332 | HTTP     | JSON-RPC — chipnet                               |
| 48333 | TCP      | Peer-to-peer — chipnet                           |
| 18443 | HTTP     | JSON-RPC — regtest                               |
| 18444 | TCP      | Peer-to-peer — regtest                           |
| 28332 | TCP      | ZMQ block notifications (when enabled)           |
| 28333 | TCP      | ZMQ transaction notifications (when enabled)     |
| 28334 | TCP      | ZMQ DSP hash notifications (always on)           |
| 28335 | TCP      | ZMQ DSP raw tx notifications (always on)         |

## May 2026 network upgrade

BCHN v29.0.0 implements the **May 15, 2026 network upgrade**:

- **P2S32** — Pay-to-Script-Hash with 32-byte hashes.
- **Native Loops** — looping opcodes in scripts.
- **Functions** — script-defined callable functions.
- **Bitwise Operations** — new bitwise opcodes.

Nodes running v28.x stopped following the main chain after the upgrade activated.
**Upgrade to v29.0.0 immediately if you are on an older version.**

## Limitations

- Blockchain data is not backed up. Backups cover `bitcoin.conf`, credentials, and
  wallet data — block, chainstate, and peer data re-sync after a restore.
- Shutdown can take up to 5 minutes while the database flushes; let it finish rather
  than force-stopping.
- Pruning disables `txindex`, which is required by Fulcrum BCH and BCH Explorer.
- Tor inbound (`-listenonion`) requires a TCP control port not available in the Start9
  Tor service — use the onion-service URL flow in Interfaces instead.

## Support

- Package: <https://github.com/Start9-Community/bitcoin-cash-node-startos>
- Upstream: <https://gitlab.com/bitcoin-cash-node/bitcoin-cash-node>
- Upstream docs: <https://docs.bitcoincashnode.org/>

# 🔥 FlameLink — Cryptographically Guaranteed One‑Time Secrets on BotChain

FlameLink is a decentralized, zero‑knowledge one‑time secret sharing app. It encrypts secrets in the browser, stores only ciphertext on the **BotChain EVM Mainnet**, and releases the missing key share via a one‑time claim gate. Without both key shares, decryption is impossible.

— Built with Next.js 15, React 19, BotChain (EVM), and the Web Crypto API.

## ✨ What problem does it solve?

- **Leaking secrets in transit**: Traditional tools send secrets to centralized servers you must trust.
- **Fake one‑time “flags”**: Many services enforce one‑time access with a database flag, not cryptography.
- **Censorship and outages**: Centralized storage can be blocked or taken down.

FlameLink provides mathematical guarantees: client‑side encryption, decentralized smart contract storage, and a cryptographic one‑time claim gate.

## 🧠 How it works (high‑level)

```
Create secret
  -> Encrypt in browser (AES‑256‑GCM)
  -> Split key: K = K1 XOR K2
  -> Store ciphertext on BotChain Smart Contract (Creator pays Gas)
  -> Store K2 in claim gate
  -> Generate one‑time link
Recipient opens link
  -> Claim K2 once
  -> Reconstruct key (K1 XOR K2) and decrypt client‑side
  -> Secret burned from BotChain (Recipient pays Gas to burn)
```

### URL format
`/secret/{transactionId}#K1_b64url.IV_b64url.claimId.token_b64url`

- `transactionId`: BotChain Transaction ID for ciphertext
- `K1`, `IV`: client‑only; never sent to server (URL fragment)
- `claimId`, `token`: authenticate one‑time claim for `K2`

## 🔬 Detailed flow

```
Creator -> Browser: enter text secret
Browser: encrypt (AES‑256‑GCM)
Browser: split key (K1, K2)
Browser -> BotChain: sendTransaction to storeSecret(id, ciphertext)
Browser -> Claim API: POST /api/claim/init {K2, ttl, maxUses} => {claimId, token}
Browser -> Creator: share /secret/{id}#K1.IV.claimId.token

Recipient -> Browser: open link
Browser -> Claim API: POST /api/claim {claimId, token} => K2 (once/up to maxUses)
Browser -> BotChain: call getSecret(id) => ciphertext
Browser: reconstruct key + decrypt; show secret
Browser -> BotChain: sendTransaction to burnSecret(id)
```

## 🧩 Architecture

```
[App]
  - React UI
  - crypto.ts
  - botchain.ts
  - /api/claim, /api/claim/init

[BotChain Mainnet]
  - EVM Smart Contract (Flamelink.sol)

Flows:
  UI <-> crypto.ts
  UI <-> botchain.ts
  UI <-> API
  botchain.ts -> BotChain (store/retrieve/burn)
```

### BotChain endpoints (currently configured)
- RPC: `https://rpc.botchain.ai`
- Chain ID: `677`

## 🚀 Quickstart

Prereqs: Node 18+ recommended. Web3 Wallet (e.g., MetaMask) required.

```bash
npm install
npm run dev
# open http://localhost:3000
```

Create a link:
1) Go to Create, paste secret text.
2) Connect Wallet to pay gas on BotChain.
3) Generate link and share it.

## 🖥️ Usage

- Creator: Generate and share the link. Requires BOT tokens for gas.
- Recipient: Open link, click Reveal. The recipient must sign a burn transaction to destroy the secret on-chain.

## 🔐 Security model

- **Zero‑knowledge**: Server never sees plaintext or full key.
- **Key separation**: K = K1 ⊕ K2; neither share alone is useful.
- **One‑time/multi‑use gate**: `maxUses` 1‑5 with atomic decrement.
- **Client‑side crypto**: Web Crypto API, AES‑256‑GCM.
- **Decentralized storage**: Ciphertext on BotChain EVM smart contracts.

## 🛠️ API

- `POST /api/claim/init`
  - Body: `{ share2B64Url: string, ttlSeconds?: number, maxUses?: 1|2|3|4|5 }`
  - Resp: `{ claimId: string, token: string }`

- `POST /api/claim`
  - Body: `{ claimId: string, token: string }`
  - Resp: `{ share2B64Url: string, usesRemaining: number, maxUses: number }`

## ⚙️ Implementation notes

- Key split/URL helpers live in `src/app/lib/crypto.ts`.
- BotChain EVM integration in `src/app/lib/botchain.ts`.
- Creation flow in `src/app/create/page.tsx`.
- Reveal flow in `src/app/secret/[blobId]/page.tsx`.

## 📦 Deployment (production tips)

- Replace in‑memory claim store with Redis/Upstash KV.
- Deploy `contracts/Flamelink.sol` to BotChain mainnet and update the address in `botchain.ts`.

# 🔥 FlameLink Architecture Documentation

> **Decentralized One-Time Secrets on BotChain EVM**

FlameLink combines **BotChain EVM Smart Contracts** with **client-side encryption** and a **one-time claim gate** to create truly unstoppable, trustless one-time secrets.

---

## 🎯 Simple Overview

```mermaid
graph TB
    A[User creates secret] --> B[Encrypt + Split Key]
    B --> C[Store on BotChain Smart Contract]
    B --> D[Store key share on server]
    C --> E[Generate one-time link]
    D --> E
    E --> F[Share link]
    F --> G[Recipient clicks reveal]
    G --> H[Claim key share ONCE]
    H --> I[Decrypt secret]
    I --> J[Secret burned forever via BotChain Transaction]
    
    style A fill:#ff9999
    style J fill:#ff6666
    style C fill:#66ccff
    style D fill:#ffcc66
```

**Key Innovation**: The AES decryption key is split in two. Half goes in the URL, half is stored server-side and can only be claimed once. The ciphertext is stored publicly on BotChain, requiring a small gas fee to store and a small gas fee to burn.

---

## 🏗️ Detailed Flow Diagram

```mermaid
sequenceDiagram
    participant User as 👤 Creator
    participant Browser as 🌐 Browser
    participant ClaimAPI as 🔐 Claim API
    participant BotChain as 🔗 BotChain
    participant Recipient as 👥 Recipient
    
    Note over User,BotChain: Secret Creation Flow
    User->>Browser: Enter secret text
    Browser->>Browser: Generate AES-256-GCM key
    Browser->>Browser: Encrypt secret with key
    Browser->>Browser: Split key: K = K1 ⊕ K2
    
    Browser->>BotChain: sendTransaction storeSecret(id, ciphertext)
    BotChain-->>Browser: Return Transaction Hash
    
    Browser->>ClaimAPI: Initialize claim with K2
    ClaimAPI-->>Browser: Return claimId + token
    
    Browser->>Browser: Generate URL: /secret/id#K1.IV.claimId.token
    Browser->>User: Display shareable link
    
    Note over User,Recipient: Secret Access Flow
    User->>Recipient: Share link (via email/chat)
    Recipient->>Browser: Open link
    Browser->>Browser: Parse URL parameters
    Browser->>Recipient: Show "Click to Reveal"
    
    Recipient->>Browser: Click reveal button
    Browser->>ClaimAPI: POST /api/claim {claimId, token}
    
    alt First access
        ClaimAPI->>ClaimAPI: Verify token, mark as claimed
        ClaimAPI-->>Browser: Return K2 (once only)
        Browser->>BotChain: call getSecret(id)
        BotChain-->>Browser: Return ciphertext
        Browser->>Browser: Reconstruct key: K = K1 ⊕ K2
        Browser->>Browser: Decrypt with reconstructed key
        Browser->>Recipient: Show secret
        Browser->>BotChain: sendTransaction burnSecret(id)
    else Already claimed
        ClaimAPI-->>Browser: 409 Already claimed
        Browser->>Recipient: Show "Secret already burned"
    end
```

---

## 🐋 BotChain Integration Architecture

```mermaid
graph TB
    subgraph "FlameLink Application"
        FE[Frontend React App]
        API[Claim API Routes]
        CRYPTO[Crypto Module]
    end
    
    subgraph "BotChain Network"
        RPC[RPC Node]
        CONTRACT[Flamelink.sol Smart Contract]
    end
    
    subgraph "Client Browser"
        WEBCRYPTO[Web Crypto API]
        METAMASK[Web3 Wallet]
    end
    
    FE -->|Transaction Data| METAMASK
    METAMASK -->|Sign & Submit| RPC
    RPC -->|Execute| CONTRACT
    
    FE -->|AES Operations| WEBCRYPTO
    FE -->|Key Split/Claim| API
    
    CRYPTO -->|Encryption/Decryption| WEBCRYPTO
    
    style CONTRACT fill:#66ccff
    style WEBCRYPTO fill:#99ff99
    style API fill:#ffcc66
```

### BotChain Endpoints Used

- **RPC**: `https://rpc.botchain.ai`
- **Chain ID**: `677`

---

## 🔐 Security Architecture

```mermaid
graph TB
    subgraph "Client Side (Browser)"
        SECRET[Original Secret]
        AES[AES-256-GCM Key]
        K1[Key Share 1]
        ENCRYPTED[Encrypted Data]
    end
    
    subgraph "BotChain Smart Contract"
        BLOB[Ciphertext State]
    end
    
    subgraph "Claim Gate Server"
        K2[Key Share 2]
        TOKEN[Auth Token]
        CLAIMED[Claimed Flag]
    end
    
    subgraph "URL Fragment"
        LINK[K1 + IV + ClaimId + Token]
    end
    
    SECRET -->|Web Crypto API| ENCRYPTED
    AES -->|XOR Split| K1
    AES -->|XOR Split| K2
    
    ENCRYPTED -->|RPC TX| BLOB
    K2 -->|Secure Store| CLAIMED
    
    K1 -->|URL Fragment| LINK
    TOKEN -->|URL Fragment| LINK
    
    style SECRET fill:#ff9999
    style BLOB fill:#66ccff
    style K2 fill:#ffcc66
    style CLAIMED fill:#ff6666
```

### Security Properties

1. **Zero-Knowledge**: Server never sees plaintext secrets
2. **Key Separation**: Decryption impossible without both K1 (client) and K2 (server)
3. **One-Time Claim**: K2 can only be retrieved once, ever
4. **Client-Side Crypto**: All encryption/decryption in browser
5. **Decentralized Storage**: Stored publicly on EVM (but encrypted)
6. **No Local Storage**: Nothing persisted in browser

---

## 📊 Component Breakdown

### Frontend Components

```mermaid
graph TB
    subgraph "React Components"
        HOME[HomePage]
        SECRET[SecretPage]
    end
    
    subgraph "Utility Modules"
        CRYPTO[crypto.ts]
        BOTCHAIN[botchain.ts]
    end
    
    subgraph "API Routes"
        INIT[/api/claim/init]
        CLAIM[/api/claim]
    end
    
    HOME --> CRYPTO
    HOME --> BOTCHAIN
    HOME --> INIT
    
    SECRET --> CRYPTO
    SECRET --> BOTCHAIN
    SECRET --> CLAIM
    
    style CRYPTO fill:#99ff99
    style BOTCHAIN fill:#66ccff
    style INIT fill:#ffcc66
    style CLAIM fill:#ffcc66
```

### File Structure
```
src/
├── app/
│   ├── secret/[blobId]/
│   │   └── page.tsx             # Secret reveal page
│   ├── api/claim/
│   │   ├── init/route.ts        # Initialize claim gate
│   │   └── route.ts             # One-time claim endpoint
│   ├── lib/
│   │   ├── crypto.ts            # Encryption utilities
│   │   └── botchain.ts          # BotChain EVM integration
│   ├── layout.tsx               # App layout
│   └── page.tsx                 # Homepage
contracts/
└── Flamelink.sol                # Storage Smart Contract
```

---

## 🛡️ Security Model

### Threat Model

| Attack Vector | Mitigation |
|---------------|------------|
| **Server Compromise** | Server never sees plaintext; only stores random K2 shares |
| **Network Interception** | HTTPS + key in URL fragment (never sent to server) |
| **Multiple Access** | Claim gate ensures K2 released only once |
| **BotChain Data Access** | All data is AES-256 encrypted on-chain |
| **Browser Extension** | Client-side crypto; no persistent storage |

### Cryptographic Guarantees

```mermaid
graph LR
    subgraph "Cryptographic Chain"
        PLAINTEXT[Secret] -->|AES-256-GCM| CIPHERTEXT[Encrypted]
        KEY[256-bit Key] -->|XOR Split| K1[Share 1]
        KEY -->|XOR Split| K2[Share 2]
        CIPHERTEXT -->|BotChain| ONCHAIN[On-Chain Storage]
        K2 -->|Claim Gate| ONESHOT[One-Shot Release]
    end
    
    ONCHAIN -.->|Cannot Decrypt| CIPHERTEXT
    K1 -.->|Cannot Decrypt Alone| CIPHERTEXT
    K2 -.->|Cannot Decrypt Alone| CIPHERTEXT
    
    K1 -->|XOR| RECONSTRUCT[Reconstructed Key]
    ONESHOT -->|XOR| RECONSTRUCT
    RECONSTRUCT -->|AES Decrypt| PLAINTEXT
    
    style PLAINTEXT fill:#ff9999
    style ONCHAIN fill:#66ccff
    style ONESHOT fill:#ffcc66
    style RECONSTRUCT fill:#99ff99
```

---

## 🚀 Deployment Architecture

### Development Setup
- **Frontend**: Next.js 15 with React 19
- **Storage**: BotChain Mainnet Smart Contracts
- **Claim Gate**: In-memory Map (dev only)
- **Crypto**: Web Crypto API (browser native)

### Production Considerations

- Replace in-memory store with Redis/Upstash KV
- Deploy `Flamelink.sol` to production BotChain Mainnet

---

*Built with ❤️ using Next.js, BotChain EVM, and Web Crypto API*

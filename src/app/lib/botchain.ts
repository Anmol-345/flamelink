/**
 * FlameLink BotChain Integration
 * Interfaces with BotChain Mainnet smart contracts for storing text secrets
 */
import { BrowserProvider, Contract, randomBytes, hexlify } from 'ethers'

// BotChain Mainnet configuration
export const BOTCHAIN_RPC_URL = 'https://rpc.botchain.ai'
export const BOTCHAIN_CHAIN_ID = 677

// Read the contract address from environment variable, falling back to empty address if not set
export const FLAMELINK_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_FLAMELINK_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000'

// Simple ABI for the Flamelink contract
const FLAMELINK_ABI = [
  'function storeSecret(bytes32 id, string calldata ciphertext) external',
  'function getSecret(bytes32 id) external view returns (string memory)',
  'function burnSecret(bytes32 id) external'
]

export interface StoredSecret {
  blobId: string
  size: number
}

const BURNED_MARKER = 'FLAMELINK_BURNED'

async function getProviderAndContract(requireSigner = false) {
  if (typeof window === 'undefined' || !(window as any).ethereum) {
    throw new Error('Please install a Web3 wallet like MetaMask')
  }

  const provider = new BrowserProvider((window as any).ethereum)
  
  // Ensure we are on the right network (BotChain)
  const network = await provider.getNetwork()
  if (Number(network.chainId) !== BOTCHAIN_CHAIN_ID) {
    try {
      await (window as any).ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${BOTCHAIN_CHAIN_ID.toString(16)}` }]
      })
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        // Network not added to wallet, add it
        await (window as any).ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: `0x${BOTCHAIN_CHAIN_ID.toString(16)}`,
              chainName: 'BotChain Mainnet',
              rpcUrls: [BOTCHAIN_RPC_URL],
              nativeCurrency: {
                name: 'BOT',
                symbol: 'BOT',
                decimals: 18
              }
            }
          ]
        })
      } else {
        throw new Error('Failed to switch to BotChain network')
      }
    }
  }

  let contract = new Contract(FLAMELINK_CONTRACT_ADDRESS, FLAMELINK_ABI, provider)

  if (requireSigner) {
    const signer = await provider.getSigner()
    contract = contract.connect(signer) as Contract
  }

  return contract
}

/**
 * Store encrypted text secret on BotChain EVM smart contract
 */
export async function storeSecret(encryptedData: ArrayBuffer): Promise<StoredSecret> {
  const contract = await getProviderAndContract(true)
  
  // Generate a random 32-byte ID for the secret
  const idBytes = randomBytes(32)
  const id = hexlify(idBytes)
  
  // Convert ArrayBuffer to base64 string for storage
  const base64Data = Buffer.from(encryptedData).toString('base64')
  
  console.log('🔄 Storing secret on BotChain:', { id })

  try {
    const tx = await contract.storeSecret(id, base64Data)
    console.log('📡 Transaction sent:', tx.hash)
    
    // Wait for transaction to be mined
    await tx.wait()
    console.log('✅ Secret stored successfully in transaction:', tx.hash)
    
    return { blobId: id, size: encryptedData.byteLength }
  } catch (error) {
    console.error('💥 Failed to store secret on BotChain:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Failed to store secret. Please try again.')
  }
}

/**
 * Retrieve data from BotChain smart contract
 */
export async function retrieveSecret(blobId: string): Promise<ArrayBuffer> {
  // If the blobId isn't a 32-byte hex string (e.g. from an old Walrus testnet link), format it
  let id = blobId
  if (!id.startsWith('0x') || id.length !== 66) {
    throw new Error('Invalid Secret ID format for BotChain')
  }

  console.log('📥 Retrieving secret from BotChain:', { id })

  try {
    const provider = new BrowserProvider((window as any).ethereum)
    const contract = new Contract(FLAMELINK_CONTRACT_ADDRESS, FLAMELINK_ABI, provider)
    
    const ciphertextBase64 = await contract.getSecret(id)
    
    // Check if the secret has been burned
    if (ciphertextBase64 === BURNED_MARKER || !ciphertextBase64) {
      console.log('🔥 Secret was already burned')
      throw new Error('Secret has been burned')
    }

    console.log('✅ Secret retrieved successfully')
    
    // Convert base64 back to ArrayBuffer
    const buffer = Buffer.from(ciphertextBase64, 'base64')
    const arrayBuffer = new ArrayBuffer(buffer.length)
    const view = new Uint8Array(arrayBuffer)
    for (let i = 0; i < buffer.length; ++i) {
      view[i] = buffer[i]
    }
    
    return arrayBuffer
  } catch (error: any) {
    console.error('💥 Failed to retrieve secret:', error)
    if (error.message && error.message.includes('Secret not found or burned')) {
      throw new Error('Secret not found or has been burned')
    }
    throw new Error('Failed to retrieve secret')
  }
}

/**
 * Mark a secret as burned by overwriting it
 */
export async function burnSecret(blobId: string): Promise<void> {
  let id = blobId
  if (!id.startsWith('0x') || id.length !== 66) {
    throw new Error('Invalid Secret ID format for BotChain')
  }
  
  console.log('🔥 Burning secret:', { id })

  try {
    const contract = await getProviderAndContract(true)
    const tx = await contract.burnSecret(id)
    console.log('📡 Burn transaction sent:', tx.hash)
    
    await tx.wait()
    console.log('✅ Secret burned successfully')
  } catch (error) {
    console.warn('⚠️ Failed to burn secret marker:', error)
    throw new Error('Failed to burn secret.')
  }
}

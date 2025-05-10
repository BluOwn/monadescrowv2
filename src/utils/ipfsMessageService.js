import { ethers } from 'ethers';
import { updateMessageCidOnChain, getMessageCidFromChain } from './registryIntegration';

// Configuration for Pinata
const PINATA_API_KEY = '17913b5e655bd05ad05c';  // Replace with your Pinata API key
const PINATA_API_SECRET = '86f08ecea9882b3744a52f95ecfa22b6ef9eee16804de357f4fba4524440d1f3';  // Replace with your Pinata API secret
const PINATA_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiI1ZTM1Y2FjYS1jZmVmLTRhZmMtYmMyYS0xM2U2MzBhNWNkZmYiLCJlbWFpbCI6InRlYmEuNzQxQGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJwaW5fcG9saWN5Ijp7InJlZ2lvbnMiOlt7ImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxLCJpZCI6IkZSQTEifSx7ImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxLCJpZCI6Ik5ZQzEifV0sInZlcnNpb24iOjF9LCJtZmFfZW5hYmxlZCI6ZmFsc2UsInN0YXR1cyI6IkFDVElWRSJ9LCJhdXRoZW50aWNhdGlvblR5cGUiOiJzY29wZWRLZXkiLCJzY29wZWRLZXlLZXkiOiIxNzkxM2I1ZTY1NWJkMDVhZDA1YyIsInNjb3BlZEtleVNlY3JldCI6Ijg2ZjA4ZWNlYTk4ODJiMzc0NGE1MmY5NWVjZmEyMmI2ZWY5ZWVlMTY4MDRkZTM1N2Y0ZmJhNDUyNDQ0MGQxZjMiLCJleHAiOjE3Nzc1NjQ3MzV9.RKO5PaTIPkySTTLk3ep0I6HzuLeRq3a6RiIr72Pjl6Q';  // Optional: Replace with your Pinata JWT if you prefer using JWT

// Cache keys in localStorage 
const MESSAGE_CID_PREFIX = 'escrow_msg_cid_';  // For message CIDs
const MESSAGE_CONTENT_PREFIX = 'escrow_msg_content_';  // For message content

// Flag to determine if we should use on-chain registry
const USE_ONCHAIN_REGISTRY = false; // Set to true if you deploy the registry contract

// Pinata API endpoints
const PINATA_PIN_JSON_URL = 'https://api.pinata.cloud/pinning/pinJSONToIPFS';
const PINATA_GATEWAY = 'https://gateway.pinata.cloud/ipfs/';  // Pinata's IPFS gateway

// Backup gateways if Pinata is unavailable
const BACKUP_GATEWAYS = [
  'https://ipfs.io/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
  'https://dweb.link/ipfs/'
];

/**
 * Create a signed message
 * @param {string} escrowId - Escrow ID
 * @param {string} content - Message content
 * @param {ethers.Signer} signer - Ethers signer for the current user
 * @returns {Promise<Object>} - The signed message object
 */
export const createSignedMessage = async (escrowId, content, signer) => {
  const sender = await signer.getAddress();
  const timestamp = Date.now();
  
  // Create message hash for signing (escrowId + sender + timestamp + content)
  // Fixed for ethers v5:
  const messageHash = ethers.utils.solidityKeccak256(
    ['uint256', 'address', 'uint256', 'string'],
    [escrowId, sender, timestamp, content]
  );
  
  // Sign the message hash
  const signature = await signer.signMessage(ethers.utils.arrayify(messageHash));
  
  return {
    escrowId,
    sender,
    timestamp,
    content,
    signature
  };
};

/**
 * Verify if user is a participant in the escrow
 * @param {string} escrowId - Escrow ID
 * @param {string} userAddress - User address to check
 * @param {ethers.Contract} contract - Escrow contract instance
 * @returns {Promise<boolean>} - True if user is a participant
 */
export const isEscrowParticipant = async (escrowId, userAddress, contract) => {
  try {
    // Make sure userAddress isn't null or undefined
    if (!userAddress) {
      console.error("User address is null or undefined");
      return false;
    }
    
    console.log(`Checking if ${userAddress} is participant in escrow ${escrowId}`);
    
    // Get escrow details
    const details = await contract.getEscrowDetails(escrowId);
    
    // Normalize addresses to lowercase for comparison
    const normalizedUserAddress = userAddress.toLowerCase();
    const buyer = details[0].toLowerCase();
    const seller = details[1].toLowerCase();
    const arbiter = details[2].toLowerCase();
    
    // Log the addresses for debugging
    console.log(`Escrow participants: Buyer=${buyer}, Seller=${seller}, Arbiter=${arbiter}`);
    console.log(`Checking against user: ${normalizedUserAddress}`);
    
    // Check if user is buyer, seller, or arbiter
    const isBuyer = normalizedUserAddress === buyer;
    const isSeller = normalizedUserAddress === seller;
    const isArbiter = normalizedUserAddress === arbiter;
    
    console.log(`Is buyer: ${isBuyer}, Is seller: ${isSeller}, Is arbiter: ${isArbiter}`);
    
    return isBuyer || isSeller || isArbiter;
  } catch (error) {
    console.error("Error verifying participant:", error);
    return false;
  }
};

/**
 * Verify a message's authenticity
 * @param {Object} message - The message object
 * @returns {boolean} - True if the message is authentic
 */
export const verifyMessage = (message) => {
  try {
    // Skip verification for null or invalid messages
    if (!message || !message.sender || !message.signature || message.escrowId === undefined) {
      return false;
    }
    
    // Fixed for ethers v5:
    const messageHash = ethers.utils.solidityKeccak256(
      ['uint256', 'address', 'uint256', 'string'],
      [message.escrowId, message.sender, message.timestamp, message.content]
    );
    
    const recoveredSender = ethers.utils.verifyMessage(
      ethers.utils.arrayify(messageHash),
      message.signature
    );
    
    return recoveredSender.toLowerCase() === message.sender.toLowerCase();
  } catch (error) {
    console.error('Error verifying message:', error);
    return false;
  }
};

/**
 * Pin JSON data to IPFS using Pinata
 * @param {Object} jsonData - The JSON data to pin
 * @returns {Promise<string>} - The CID of the pinned content
 */
export const pinJSONToPinata = async (jsonData) => {
  try {
    let headers = {
      'Content-Type': 'application/json',
    };
    
    // Add authentication headers
    if (PINATA_JWT) {
      headers['Authorization'] = `Bearer ${PINATA_JWT}`;
    } else {
      headers['pinata_api_key'] = PINATA_API_KEY;
      headers['pinata_secret_api_key'] = PINATA_API_SECRET;
    }
    
    const response = await fetch(PINATA_PIN_JSON_URL, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(jsonData)
    });
    
    if (!response.ok) {
      throw new Error(`Pinata API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.IpfsHash;
  } catch (error) {
    console.error('Error pinning to Pinata:', error);
    throw error;
  }
};

/**
 * Get shared storage key for an escrow
 * This ensures all participants use the same key regardless of which one wrote the message
 * @param {string} escrowId - Escrow ID
 * @returns {string} - Storage key
 */
const getSharedStorageKey = (escrowId) => {
  return `${MESSAGE_CONTENT_PREFIX}${escrowId}`;
};

/**
 * Store messages locally
 * @param {string} escrowId - Escrow ID
 * @param {Array} messages - Messages array
 */
const storeMessagesLocally = (escrowId, messages) => {
  const storageKey = getSharedStorageKey(escrowId);
  const messageObject = {
    escrowId,
    lastUpdated: Date.now(),
    messages
  };
  localStorage.setItem(storageKey, JSON.stringify(messageObject));
};

/**
 * Load messages from local storage
 * @param {string} escrowId - Escrow ID
 * @returns {Object} - Message object or null
 */
const loadMessagesLocally = (escrowId) => {
  const storageKey = getSharedStorageKey(escrowId);
  const data = localStorage.getItem(storageKey);
  if (data) {
    try {
      return JSON.parse(data);
    } catch (error) {
      console.error('Error parsing stored messages:', error);
    }
  }
  return null;
};

/**
 * Send a message to an escrow
 * @param {string} escrowId - Escrow ID
 * @param {string} content - Message content
 * @param {ethers.Signer} signer - Ethers signer for the current user
 * @param {ethers.Contract} contract - Escrow contract instance
 * @returns {Promise<Object>} - Result of the operation
 */
export const sendMessage = async (escrowId, content, signer, contract) => {
  try {
    const userAddress = await signer.getAddress();
    console.log(`Sending message for escrow ${escrowId} from user ${userAddress}`);
    
    // Get escrow details to identify roles
    const details = await contract.getEscrowDetails(escrowId);
    const buyer = details[0].toLowerCase();
    const seller = details[1].toLowerCase();
    const arbiter = details[2].toLowerCase();
    
    console.log(`Escrow roles: Buyer=${buyer}, Seller=${seller}, Arbiter=${arbiter}`);
    console.log(`Current user: ${userAddress.toLowerCase()}`);
    
    // Explicitly check each role
    const isBuyer = userAddress.toLowerCase() === buyer;
    const isSeller = userAddress.toLowerCase() === seller;
    const isArbiter = userAddress.toLowerCase() === arbiter;
    
    console.log(`Is buyer: ${isBuyer}, Is seller: ${isSeller}, Is arbiter: ${isArbiter}`);
    
    // Verify the user is a participant (buyer, seller, or arbiter)
    if (!isBuyer && !isSeller && !isArbiter) {
      throw new Error("Only escrow participants (buyer, seller, or arbiter) can send messages");
    }
    
    // Load existing messages - FIRST try local storage for fresh messages
    let messageData = loadMessagesLocally(escrowId);
    
    // If not in local storage, try the traditional IPFS approach
    if (!messageData) {
      messageData = await loadMessages(escrowId, signer.provider);
    }
    
    const messages = messageData?.messages || [];
    console.log(`Loaded ${messages.length} existing messages`);
    
    // Create new signed message
    const newMessage = await createSignedMessage(escrowId, content, signer);
    console.log('Created signed message:', newMessage);
    
    // Add new message to the array
    messages.push(newMessage);
    
    // Create updated message object
    const messageObject = {
      escrowId,
      lastUpdated: Date.now(),
      messages
    };
    
    // IMMEDIATELY save to local storage for instant sync between users
    storeMessagesLocally(escrowId, messages);
    
    // Add optional metadata for Pinata
    const pinataMetadata = {
      name: `Escrow-${escrowId}-Messages`,
      keyvalues: {
        escrowId: escrowId,
        lastUpdated: Date.now().toString()
      }
    };
    
    const pinataOptions = {
      cidVersion: 1
    };
    
    const pinataData = {
      pinataContent: messageObject,
      pinataMetadata,
      pinataOptions
    };
    
    // For development/testing without Pinata keys, use local storage only
    if (!PINATA_API_KEY && !PINATA_JWT) {
      console.log('Development mode: storing messages in local storage only');
      const mockCid = `local-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
      localStorage.setItem(`${MESSAGE_CID_PREFIX}${escrowId}`, mockCid);
      
      return {
        success: true,
        cid: mockCid,
        messages,
        messageObject
      };
    }
    
    // Upload to IPFS via Pinata
    try {
      const cid = await pinJSONToPinata(pinataData);
      console.log(`Successfully pinned to IPFS with CID: ${cid}`);
      
      // Store CID in local storage
      localStorage.setItem(`${MESSAGE_CID_PREFIX}${escrowId}`, cid);
      
      // If on-chain registry is enabled, update the CID on chain
      if (USE_ONCHAIN_REGISTRY) {
        try {
          await updateMessageCidOnChain(escrowId, cid, signer);
        } catch (error) {
          console.warn('Failed to update message CID on-chain:', error);
          // Continue anyway since we've stored it locally
        }
      }
      
      return {
        success: true,
        cid,
        messages,
        messageObject
      };
    } catch (pinataError) {
      console.warn('Pinata upload failed, using local storage fallback:', pinataError);
      // We're already using local storage as the primary method, so just return success
      return {
        success: true,
        messages,
        messageObject,
        warning: 'Using local storage due to Pinata upload failure'
      };
    }
  } catch (error) {
    console.error('Error sending message:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Load messages for an escrow
 * @param {string} escrowId - Escrow ID
 * @param {ethers.providers.Provider} provider - Ethers provider (optional, for on-chain registry)
 * @returns {Promise<Object>} - Message object with messages array
 */
export const loadMessages = async (escrowId, provider = null) => {
  try {
    // FIRST check local storage as it has the freshest messages
    const localData = loadMessagesLocally(escrowId);
    if (localData) {
      console.log(`Found ${localData.messages.length} messages in local storage for escrow ${escrowId}`);
      return localData;
    }
    
    // If nothing in local storage, try IPFS
    let cid = null;
    
    // Try to get CID from local storage
    const cachedCid = localStorage.getItem(`${MESSAGE_CID_PREFIX}${escrowId}`);
    if (cachedCid) {
      cid = cachedCid;
    }
    
    // If on-chain registry is enabled and provider is available, try to get CID from chain
    if (USE_ONCHAIN_REGISTRY && provider && !cid) {
      const chainCid = await getMessageCidFromChain(escrowId, provider);
      if (chainCid && chainCid !== "") {
        cid = chainCid;
        // Cache the CID locally
        localStorage.setItem(`${MESSAGE_CID_PREFIX}${escrowId}`, cid);
      }
    }
    
    // If we have a CID, try to fetch messages
    if (cid) {
      try {
        // Check if this is a local storage CID
        if (cid.startsWith('local-')) {
          const storedData = localStorage.getItem(cid);
          if (storedData) {
            const parsedData = JSON.parse(storedData);
            // Also store in the shared key for future access
            storeMessagesLocally(escrowId, parsedData.messages);
            return parsedData;
          }
        }
        
        // Otherwise, fetch from IPFS
        const messages = await fetchMessagesFromIPFS(cid);
        if (messages && messages.messages) {
          // Store in local storage for future access
          storeMessagesLocally(escrowId, messages.messages);
        }
        return messages;
      } catch (error) {
        console.warn('Error loading messages from IPFS:', error);
      }
    }
    
    // If no CID or error occurred, return empty messages
    return { escrowId, messages: [] };
  } catch (error) {
    console.error('Error loading messages:', error);
    return { escrowId, messages: [] };
  }
};

/**
 * Fetch messages from IPFS using Pinata gateway or backups
 * @param {string} cid - IPFS Content ID
 * @returns {Promise<Object>} - Message object
 */
export const fetchMessagesFromIPFS = async (cid) => {
  // Try Pinata gateway first
  try {
    const response = await fetch(`${PINATA_GATEWAY}${cid}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch from Pinata: ${response.status}`);
    }
    return await response.json();
  } catch (pinataError) {
    console.warn('Failed to fetch from Pinata gateway, trying backup gateways:', pinataError);
    
    // Try backup gateways
    for (const gateway of BACKUP_GATEWAYS) {
      try {
        const response = await fetch(`${gateway}${cid}`);
        if (response.ok) {
          return await response.json();
        }
      } catch (error) {
        console.warn(`Failed to fetch from ${gateway}:`, error);
        // Continue to next gateway
      }
    }
    
    // If all gateways fail, throw error
    throw new Error('Failed to fetch messages from all IPFS gateways');
  }
};

/**
 * Format date for display
 * @param {number} timestamp - Timestamp in milliseconds
 * @returns {string} - Formatted date string
 */
export const formatMessageDate = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleString();
};
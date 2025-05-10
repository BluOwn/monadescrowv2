import { ethers } from 'ethers';
import { create } from 'ipfs-http-client';
import { updateMessageCidOnChain, getMessageCidFromChain } from './registryIntegration';
import { createSimplifiedIpfsClient } from './simplifiedIpfsClient';

// Configuration for IPFS using Pinata
const PINATA_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiI1ZTM1Y2FjYS1jZmVmLTRhZmMtYmMyYS0xM2U2MzBhNWNkZmYiLCJlbWFpbCI6InRlYmEuNzQxQGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJwaW5fcG9saWN5Ijp7InJlZ2lvbnMiOlt7ImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxLCJpZCI6IkZSQTEifSx7ImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxLCJpZCI6Ik5ZQzEifV0sInZlcnNpb24iOjF9LCJtZmFfZW5hYmxlZCI6ZmFsc2UsInN0YXR1cyI6IkFDVElWRSJ9LCJhdXRoZW50aWNhdGlvblR5cGUiOiJzY29wZWRLZXkiLCJzY29wZWRLZXlLZXkiOiIxNzkxM2I1ZTY1NWJkMDVhZDA1YyIsInNjb3BlZEtleVNlY3JldCI6Ijg2ZjA4ZWNlYTk4ODJiMzc0NGE1MmY5NWVjZmEyMmI2ZWY5ZWVlMTY4MDRkZTM1N2Y0ZmJhNDUyNDQ0MGQxZjMiLCJleHAiOjE3Nzc1NjQ3MzV9.RKO5PaTIPkySTTLk3ep0I6HzuLeRq3a6RiIr72Pjl6Q'; // Replace with your actual Pinata JWT

// Cache message CIDs in localStorage with a prefix
const MESSAGE_CID_PREFIX = 'escrow_msg_cid_';

// Flag to determine if we should use on-chain registry
const USE_ONCHAIN_REGISTRY = false; // Set to true if you deploy the registry contract

// Initialize IPFS client with Pinata
let ipfs;
try {
  ipfs = create({
    url: 'https://api.pinata.cloud/ipfs/v1',
    headers: {
      Authorization: PINATA_JWT
    }
  });

  // Test the connection
  ipfs.add('test').then(() => {
    console.log('Pinata IPFS client initialized successfully');
  }).catch(err => {
    console.warn('Error with Pinata client, falling back to simplified client:', err);
    ipfs = createSimplifiedIpfsClient();
  });
} catch (error) {
  console.warn('Could not initialize Pinata IPFS client, using simplified client:', error);
  ipfs = createSimplifiedIpfsClient();
}

/**
 * Create a signed message
 */
export const createSignedMessage = async (escrowId, content, signer) => {
  const sender = await signer.getAddress();
  const timestamp = Date.now();
  const messageHash = ethers.utils.solidityKeccak256(
    ['uint256', 'address', 'uint256', 'string'],
    [escrowId, sender, timestamp, content]
  );
  const signature = await signer.signMessage(ethers.utils.arrayify(messageHash));
  return { escrowId, sender, timestamp, content, signature };
};

/**
 * Check if user is a participant
 */
export const isEscrowParticipant = async (escrowId, userAddress, contract) => {
  try {
    const escrow = await contract.getEscrowDetails(escrowId);
    return (
      userAddress.toLowerCase() === escrow[0].toLowerCase() ||
      userAddress.toLowerCase() === escrow[1].toLowerCase() ||
      userAddress.toLowerCase() === escrow[2].toLowerCase()
    );
  } catch (error) {
    console.error("Error verifying participant:", error);
    return false;
  }
};

/**
 * Verify message signature
 */
export const verifyMessage = (message) => {
  try {
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
 * Send a signed message to escrow
 */
export const sendMessage = async (escrowId, content, signer, contract) => {
  try {
    const userAddress = await signer.getAddress();
    const isParticipant = await isEscrowParticipant(escrowId, userAddress, contract);
    if (!isParticipant) throw new Error("Only escrow participants can send messages");

    const { messages = [] } = await loadMessages(escrowId, signer.provider);
    const newMessage = await createSignedMessage(escrowId, content, signer);
    messages.push(newMessage);

    const messageObject = {
      escrowId,
      lastUpdated: Date.now(),
      messages
    };

    const result = await ipfs.add(JSON.stringify(messageObject));
    const cid = result.path;

    localStorage.setItem(`${MESSAGE_CID_PREFIX}${escrowId}`, cid);

    if (USE_ONCHAIN_REGISTRY) {
      try {
        await updateMessageCidOnChain(escrowId, cid, signer);
      } catch (error) {
        console.warn('Failed to update message CID on-chain:', error);
      }
    }

    return { success: true, cid, messages, messageObject };
  } catch (error) {
    console.error('Error sending message:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Load messages from IPFS using CID
 */
export const loadMessages = async (escrowId, provider = null) => {
  try {
    let cid = localStorage.getItem(`${MESSAGE_CID_PREFIX}${escrowId}`);

    if (USE_ONCHAIN_REGISTRY && provider && !cid) {
      const chainCid = await getMessageCidFromChain(escrowId, provider);
      if (chainCid && chainCid !== "") {
        cid = chainCid;
        localStorage.setItem(`${MESSAGE_CID_PREFIX}${escrowId}`, cid);
      }
    }

    if (cid) {
      try {
        const messages = await fetchMessagesFromIpfs(cid);
        return messages;
      } catch (error) {
        console.warn('Error loading messages from IPFS:', error);
      }
    }

    return { escrowId, messages: [] };
  } catch (error) {
    console.error('Error loading messages:', error);
    return { escrowId, messages: [] };
  }
};

/**
 * Fetch a JSON object from IPFS by CID
 */
export const fetchMessagesFromIpfs = async (cid) => {
  try {
    if (ipfs.cat) {
      const chunks = [];
      for await (const chunk of ipfs.cat(cid)) {
        chunks.push(chunk);
      }
      const data = Buffer.concat(chunks).toString();
      return JSON.parse(data);
    }

    // Fallback to gateway
    const response = await fetch(`https://gateway.pinata.cloud/ipfs/${cid}`);
    if (!response.ok) throw new Error(`IPFS fetch failed: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Error fetching from IPFS:', error);
    throw error;
  }
};

/**
 * Stub for CID sharing (for real app, use backend, smart contract, or P2P)
 */
export const shareMessageCid = async (escrowId, cid, participants) => {
  console.log(`Sharing CID ${cid} for escrow ${escrowId} with participants:`, participants);
};

/**
 * Utility to format timestamp into readable string
 */
export const formatMessageDate = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleString();
};

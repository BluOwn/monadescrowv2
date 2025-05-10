import { ethers } from 'ethers';

// Registry contract details
const MESSAGE_REGISTRY_ABI = [
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "escrowId",
				"type": "uint256"
			}
		],
		"name": "getEscrowDetails",
		"outputs": [
			{
				"internalType": "address",
				"name": "buyer",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "seller",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "arbiter",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "tokenAddress",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "creationTime",
				"type": "uint256"
			},
			{
				"internalType": "bool",
				"name": "fundsDisbursed",
				"type": "bool"
			},
			{
				"internalType": "bool",
				"name": "disputeRaised",
				"type": "bool"
			},
			{
				"internalType": "string",
				"name": "description",
				"type": "string"
			},
			{
				"internalType": "string",
				"name": "documentHash",
				"type": "string"
			}
		],
		"stateMutability": "view",
		"type": "function"
	}
];

// Replace with your deployed registry contract address
const MESSAGE_REGISTRY_ADDRESS = "0x8101a2C153D4176055DcED1C9F2423f6eabBeb9f"; // Replace with actual address

/**
 * Get a message registry contract instance
 * @param {ethers.Signer} signer - Ethers signer
 * @returns {ethers.Contract} - Registry contract instance
 */
export const getRegistryContract = (signer) => {
  return new ethers.Contract(
    MESSAGE_REGISTRY_ADDRESS,
    MESSAGE_REGISTRY_ABI,
    signer
  );
};

/**
 * Update message CID in the registry contract
 * @param {string} escrowId - Escrow ID
 * @param {string} cid - IPFS Content ID
 * @param {ethers.Signer} signer - Ethers signer
 * @returns {Promise<Object>} - Transaction receipt
 */
export const updateMessageCidOnChain = async (escrowId, cid, signer) => {
  try {
    // Skip if using dummy registry address
    if (MESSAGE_REGISTRY_ADDRESS === "0x8101a2C153D4176055DcED1C9F2423f6eabBeb9f") {
      console.log('Skipping on-chain registry update: no registry contract address set');
      return { success: false, error: 'Registry contract not configured' };
    }
    
    const registryContract = getRegistryContract(signer);
    
    const tx = await registryContract.updateMessageCid(escrowId, cid);
    const receipt = await tx.wait();
    
    return { success: true, receipt };
  } catch (error) {
    console.error('Error updating message CID on-chain:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to update message CID' 
    };
  }
};

/**
 * Get message CID from the registry contract
 * @param {string} escrowId - Escrow ID
 * @param {ethers.providers.Provider} provider - Ethers provider
 * @returns {Promise<string>} - IPFS Content ID
 */
export const getMessageCidFromChain = async (escrowId, provider) => {
  try {
    // Skip if using dummy registry address
    if (MESSAGE_REGISTRY_ADDRESS === "0x8101a2C153D4176055DcED1C9F2423f6eabBeb9f") {
      console.log('Skipping on-chain registry fetch: no registry contract address set');
      return null;
    }
    
    const registryContract = new ethers.Contract(
      MESSAGE_REGISTRY_ADDRESS,
      MESSAGE_REGISTRY_ABI,
      provider
    );
    
    const cid = await registryContract.getMessageCid(escrowId);
    return cid;
  } catch (error) {
    console.error('Error getting message CID from chain:', error);
    return null;
  }
};
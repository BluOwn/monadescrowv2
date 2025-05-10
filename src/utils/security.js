import { ethers } from 'ethers';

export const ESCROW_SERVICE_ADDRESS = "0xDF337E85503399ecbf3F006fF85b7Ea5eefE7AC8";

// Security notice for users
export const SECURITY_NOTICE = `⚠️ SECURITY NOTICE:
- This is an open-source escrow service
- Always verify the contract address: ${ESCROW_SERVICE_ADDRESS}
- Never share your private keys
- Use only on Monad Testnet
- View source code: https://github.com/BluOwn/monadescrow`;

// Validate network connection
export const validateNetwork = async (provider) => {
  const network = await provider.getNetwork();
  const expectedChainId = 10143; // Monad Testnet
  
  if (network.chainId !== expectedChainId) {
    throw new Error(`Please switch to Monad Testnet manually in your wallet`);
  }
  
  return true;
};

// Verify smart contract
export const verifyContract = async (provider, contractAddress, contractABI) => {
  try {
    // Check if contract exists
    const code = await provider.getCode(contractAddress);
    if (code === '0x') {
      throw new Error('Contract not found at this address');
    }
    
    // Additional verification - check for expected functions
    const contract = new ethers.Contract(contractAddress, contractABI, provider);
    
    // Verify key functions exist
    const methods = ['createEscrow', 'releaseFunds', 'getEscrow'];
    for (const method of methods) {
      if (typeof contract[method] !== 'function') {
        throw new Error(`Contract missing required function: ${method}`);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Contract verification failed:', error);
    return false;
  }
};

// Execute transaction securely
export const executeTransactionSecurely = async (contract, method, params = [], value = null) => {
  try {
    // Execute transaction
    const tx = await contract[method](...params, value ? { value } : {});
    
    // Wait for confirmation
    const receipt = await tx.wait();
    
    return receipt;
  } catch (error) {
    console.error('Transaction failed:', error);
    throw error;
  }
};

// Validate Ethereum address
export const validateAddress = (address, name = 'Address') => {
  if (!address) {
    throw new Error(`${name} is required`);
  }
  
  // FIXED: Use ethers.utils.isAddress instead of ethers.isAddress
  if (!ethers.utils.isAddress(address)) {
    throw new Error(`${name} is not a valid Ethereum address`);
  }
  
  return true;
};

// Validate amount
export const validateAmount = (amount) => {
  if (!amount || isNaN(amount) || Number(amount) <= 0) {
    throw new Error('Please enter a valid amount greater than 0');
  }
  
  // Check if amount is not too large
  const maxAmount = 1000; // 1000 MON max for security
  if (Number(amount) > maxAmount) {
    throw new Error(`Amount cannot exceed ${maxAmount} MON`);
  }
  
  return true;
};

// Enhanced error handling
export const handleError = (error, operation = 'operation') => {
  console.error(`Error during ${operation}:`, error);
  
  let userMessage = `Failed to ${operation}. `;
  
  if (error.code === 'ACTION_REJECTED') {
    userMessage += 'Transaction was cancelled by user.';
  } else if (error.code === 'INSUFFICIENT_FUNDS') {
    userMessage += 'Insufficient funds for this transaction.';
  } else if (error.message?.includes('user rejected')) {
    userMessage += 'Transaction was rejected by user.';
  } else if (error.message?.includes('switch to Monad Testnet')) {
    userMessage = error.message;
  } else {
    userMessage += error.message || 'Please try again or contact support.';
  }
  
  return userMessage;
};

// Add security headers
export const addSecurityHeaders = () => {
  // Prevent clickjacking
  if (window.top !== window.self) {
    window.top.location = window.self.location;
  }
};
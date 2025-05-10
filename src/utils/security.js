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
    const methods = ['createEscrow', 'releaseFunds', 'getEscrowDetails'];
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
    let tx;
    
    if (value) {
      tx = await contract[method](...params, { value });
    } else {
      tx = await contract[method](...params);
    }
    
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
  
  // Fixed: Use ethers.utils.isAddress for ethers v5
  if (!ethers.utils.isAddress(address)) {
    throw new Error(`${name} is not a valid Ethereum address`);
  }
  
  return true;
};

// Validate amount
export const validateAmount = (amount) => {
  if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
    throw new Error('Please enter a valid amount greater than 0');
  }
  
  // Check if amount is not too large
  const maxAmount = 1000; // 1000 MON max for security
  if (parseFloat(amount) > maxAmount) {
    throw new Error(`Amount cannot exceed ${maxAmount} MON`);
  }
  
  return true;
};

// Enhanced error handling
export const handleError = (error, operation = 'operation') => {
  console.error(`Error during ${operation}:`, error);
  
  let userMessage = `Failed to ${operation}. `;
  
  if (error.code === 4001) { // MetaMask and other wallets use this code for user rejection
    userMessage += 'Transaction was cancelled by user.';
  } else if (error.code === 'INSUFFICIENT_FUNDS' || 
             (error.data && error.data.message && error.data.message.includes('insufficient funds'))) {
    userMessage += 'Insufficient funds for this transaction.';
  } else if (error.message?.includes('user rejected') || 
             error.message?.includes('User denied')) {
    userMessage += 'Transaction was rejected by user.';
  } else if (error.message?.includes('switch to Monad Testnet')) {
    userMessage = error.message;
  } else if (error.message?.includes('Arbiter address is required')) {
    userMessage = 'Arbiter address is required. Please enter a valid Ethereum address.';
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
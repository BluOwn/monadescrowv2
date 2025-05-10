import { ethers } from 'ethers';

// The deployed contract address on Monad Testnet
export const ESCROW_SERVICE_ADDRESS = "0xDF337E85503399ecbf3F006fF85b7Ea5eefE7AC8";

// Security notice for users
export const SECURITY_NOTICE = `⚠️ SECURITY NOTICE:
- This is an open-source escrow service
- Always verify the contract address: ${ESCROW_SERVICE_ADDRESS}
- Never share your private keys
- Use only on Monad Testnet
- View source code: https://github.com/BluOwn/monadescrow`;

/**
 * Validate that the user is on the correct network
 * @param {ethers.providers.Provider} provider - Ethers provider
 * @returns {Promise<boolean>} - True if on correct network
 */
export const validateNetwork = async (provider) => {
  const network = await provider.getNetwork();
  const expectedChainId = 10143; // Monad Testnet
  
  if (network.chainId !== expectedChainId) {
    throw new Error(`Please switch to Monad Testnet manually in your wallet`);
  }
  
  return true;
};

/**
 * Verify that the contract exists at the address and has expected functions
 * @param {ethers.providers.Provider} provider - Ethers provider
 * @param {string} contractAddress - Contract address to verify
 * @param {Array} contractABI - Contract ABI
 * @returns {Promise<boolean>} - True if contract verified
 */
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

/**
 * Execute a transaction securely with proper error handling
 * @param {ethers.Contract} contract - Contract instance
 * @param {string} method - Method name to call
 * @param {Array} params - Parameters for the method
 * @param {Object} value - ETH value to send (optional)
 * @returns {Promise<ethers.providers.TransactionReceipt>} - Transaction receipt
 */
export const executeTransactionSecurely = async (contract, method, params = [], value = null) => {
  try {
    // Execute transaction
    let tx;
    
    if (value) {
      // Make sure value is properly formatted as an object
      tx = await contract[method](...params, { value: value });
    } else {
      tx = await contract[method](...params);
    }
    
    // Wait for confirmation
    const receipt = await tx.wait();
    
    return receipt;
  } catch (error) {
    console.error(`Transaction failed for method ${method}:`, error);
    
    // Improved error handling for common contract errors
    if (error.reason) {
      throw new Error(`Contract error: ${error.reason}`);
    }
    
    throw error;
  }
};

/**
 * Validate an Ethereum address format
 * @param {string} address - Address to validate
 * @param {string} name - Name of the field for error message
 * @returns {boolean} - True if valid
 */
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

/**
 * Validate a token address
 * @param {string} address - Token address to validate
 * @param {ethers.providers.Provider} provider - Ethers provider
 * @returns {Promise<boolean>} - True if valid
 */
export const validateTokenAddress = async (address, provider) => {
  try {
    validateAddress(address, 'Token address');
    
    // Check if address is a contract
    const code = await provider.getCode(address);
    if (code === '0x') {
      throw new Error('Token address is not a contract');
    }
    
    // Check if it has ERC-20 interface
    const tokenContract = new ethers.Contract(
      address,
      [
        'function balanceOf(address) view returns (uint256)',
        'function symbol() view returns (string)'
      ],
      provider
    );
    
    // Try to call the symbol method - should succeed for ERC-20
    await tokenContract.symbol();
    
    return true;
  } catch (error) {
    console.error('Token validation failed:', error);
    throw new Error('Invalid ERC-20 token address');
  }
};

/**
 * Validate amount
 * @param {string} amount - Amount to validate
 * @param {number} maxAmount - Maximum allowed amount
 * @returns {boolean} - True if valid
 */
export const validateAmount = (amount, maxAmount = 1000) => {
  if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
    throw new Error('Please enter a valid amount greater than 0');
  }
  
  // Check if amount is not too large
  if (parseFloat(amount) > maxAmount) {
    throw new Error(`Amount cannot exceed ${maxAmount} MON`);
  }
  
  return true;
};

/**
 * Enhanced error handling with user-friendly messages
 * @param {Error} error - Error object
 * @param {string} operation - Operation that failed
 * @returns {string} - User-friendly error message
 */
export const handleError = (error, operation = 'operation') => {
  console.error(`Error during ${operation}:`, error);
  
  let userMessage = `Failed to ${operation}. `;
  
  if (error.code === 4001) { // MetaMask and other wallets use this code for user rejection
    userMessage += 'Transaction was cancelled by user.';
  } else if (error.code === 'INSUFFICIENT_FUNDS' || 
             (error.data && error.data.message && error.data.message.includes('insufficient funds'))) {
    userMessage += 'Insufficient funds for this transaction.';
  } else if (error.code === 'UNPREDICTABLE_GAS_LIMIT' || 
             (error.error && error.error.message && error.error.message.includes('gas required exceeds'))) {
    userMessage += 'Transaction may fail. Check your inputs.';
  } else if (error.message?.includes('user rejected') || 
             error.message?.includes('User denied')) {
    userMessage += 'Transaction was rejected by user.';
  } else if (error.message?.includes('switch to Monad Testnet')) {
    userMessage = error.message;
  } else if (error.message?.includes('Arbiter address is required')) {
    userMessage = 'Arbiter address is required. Please enter a valid Ethereum address.';
  } else if (error.message?.includes('Not approved')) {
    userMessage = 'Token allowance not set. Please approve the token first.';
  } else if (error.message?.includes('No dispute')) {
    userMessage = 'No dispute has been raised for this escrow.';
  } else if (error.message?.includes('Already paid')) {
    userMessage = 'This escrow has already been completed.';
  } else if (error.message?.includes('Already disputed')) {
    userMessage = 'A dispute has already been raised for this escrow.';
  } else if (error.message?.includes('Paused')) {
    userMessage = 'The escrow service is currently paused. Please try again later.';
  } else {
    userMessage += error.message || 'Please try again or contact support.';
  }
  
  return userMessage;
};

/**
 * Add security headers to prevent clickjacking
 */
export const addSecurityHeaders = () => {
  // Prevent clickjacking
  if (window.top !== window.self) {
    window.top.location = window.self.location;
  }
};

/**
 * Format ERC-20 token amount with proper decimals
 * @param {string|ethers.BigNumber} amount - Amount in wei or token units
 * @param {number} decimals - Number of decimals for the token
 * @returns {string} - Formatted amount
 */
export const formatTokenAmount = (amount, decimals = 18) => {
  try {
    if (!amount) return '0';
    
    // Convert string to BigNumber if needed
    const bigNumberAmount = ethers.BigNumber.isBigNumber(amount) 
      ? amount 
      : ethers.BigNumber.from(amount);
    
    return ethers.utils.formatUnits(bigNumberAmount, decimals);
  } catch (error) {
    console.error('Error formatting token amount:', error);
    return '0';
  }
};

/**
 * Parse token amount to token units
 * @param {string} amount - Human-readable amount
 * @param {number} decimals - Number of decimals for the token
 * @returns {ethers.BigNumber} - Amount in token units
 */
export const parseTokenAmount = (amount, decimals = 18) => {
  try {
    if (!amount || isNaN(parseFloat(amount))) return ethers.BigNumber.from(0);
    
    return ethers.utils.parseUnits(amount, decimals);
  } catch (error) {
    console.error('Error parsing token amount:', error);
    throw new Error('Invalid amount format');
  }
};

/**
 * Check if a token is ERC-20 compliant
 * @param {string} tokenAddress - Token address
 * @param {ethers.providers.Provider} provider - Ethers provider
 * @returns {Promise<boolean>} - True if token is ERC-20 compliant
 */
export const isERC20Compliant = async (tokenAddress, provider) => {
  try {
    // Create basic ERC-20 interface to check
    const tokenContract = new ethers.Contract(
      tokenAddress,
      [
        'function totalSupply() view returns (uint256)',
        'function balanceOf(address) view returns (uint256)',
        'function transfer(address, uint256) returns (bool)',
        'function allowance(address, address) view returns (uint256)',
        'function approve(address, uint256) returns (bool)',
        'function transferFrom(address, address, uint256) returns (bool)',
      ],
      provider
    );
    
    // Check if contract has these methods
    await Promise.all([
      tokenContract.totalSupply(),
      tokenContract.balanceOf(tokenAddress)
    ]);
    
    return true;
  } catch (error) {
    console.error('Token ERC-20 compliance check failed:', error);
    return false;
  }
};

/**
 * Calculate fee for an escrow transaction
 * @param {string|ethers.BigNumber} amount - Transaction amount
 * @param {number} feePercentage - Fee percentage in permille (0.1%)
 * @returns {ethers.BigNumber} - Fee amount
 */
export const calculateFee = (amount, feePercentage) => {
  try {
    // Convert string to BigNumber if needed
    const bigNumberAmount = ethers.BigNumber.isBigNumber(amount) 
      ? amount 
      : ethers.utils.parseEther(amount);
    
    // Calculate fee (feePercentage is in permille, so divide by 1000)
    return bigNumberAmount.mul(feePercentage).div(1000);
  } catch (error) {
    console.error('Error calculating fee:', error);
    return ethers.BigNumber.from(0);
  }
};

/**
 * Extract escrow ID from transaction receipt
 * @param {ethers.providers.TransactionReceipt} receipt - Transaction receipt
 * @param {ethers.utils.Interface} contractInterface - Contract interface
 * @returns {string|null} - Escrow ID if found
 */
export const getEscrowIdFromReceipt = (receipt, contractInterface) => {
  try {
    if (!receipt || !receipt.logs || !contractInterface) return null;
    
    // Find EscrowCreated event
    for (const log of receipt.logs) {
      try {
        const parsedLog = contractInterface.parseLog(log);
        if (parsedLog.name === 'EscrowCreated' && parsedLog.args && parsedLog.args.escrowId) {
          return parsedLog.args.escrowId.toString();
        }
      } catch (e) {
        // Skip logs that are not from our contract
        continue;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting escrow ID from receipt:', error);
    return null;
  }
};

/**
 * Get token details (symbol, name, decimals)
 * @param {string} tokenAddress - Token address
 * @param {ethers.providers.Provider} provider - Ethers provider
 * @returns {Promise<Object>} - Token details
 */
export const getTokenDetails = async (tokenAddress, provider) => {
  try {
    // Handle native token
    if (tokenAddress === ethers.constants.AddressZero) {
      return {
        address: ethers.constants.AddressZero,
        symbol: 'MON',
        name: 'Monad Native Token',
        decimals: 18,
        isNative: true
      };
    }
    
    // Create token contract instance
    const tokenContract = new ethers.Contract(
      tokenAddress,
      [
        'function symbol() view returns (string)',
        'function name() view returns (string)',
        'function decimals() view returns (uint8)'
      ],
      provider
    );
    
    // Get token details
    const [symbol, name, decimals] = await Promise.all([
      tokenContract.symbol().catch(() => 'UNKNOWN'),
      tokenContract.name().catch(() => 'Unknown Token'),
      tokenContract.decimals().catch(() => 18)
    ]);
    
    return {
      address: tokenAddress,
      symbol,
      name,
      decimals,
      isNative: false
    };
  } catch (error) {
    console.error('Error getting token details:', error);
    return {
      address: tokenAddress,
      symbol: 'UNKNOWN',
      name: 'Unknown Token',
      decimals: 18,
      isNative: false
    };
  }
};

/**
 * Check token allowance
 * @param {string} tokenAddress - Token address
 * @param {string} ownerAddress - Token owner address
 * @param {string} spenderAddress - Spender address
 * @param {ethers.providers.Provider} provider - Ethers provider
 * @returns {Promise<ethers.BigNumber>} - Allowance amount
 */
export const checkTokenAllowance = async (tokenAddress, ownerAddress, spenderAddress, provider) => {
  try {
    // Handle native token
    if (tokenAddress === ethers.constants.AddressZero) {
      return ethers.constants.MaxUint256; // Native token doesn't need allowance
    }
    
    // Create token contract instance
    const tokenContract = new ethers.Contract(
      tokenAddress,
      ['function allowance(address,address) view returns (uint256)'],
      provider
    );
    
    // Get allowance
    const allowance = await tokenContract.allowance(ownerAddress, spenderAddress);
    return allowance;
  } catch (error) {
    console.error('Error checking token allowance:', error);
    return ethers.BigNumber.from(0);
  }
};

/**
 * Generate secure random hex string
 * @param {number} length - Length of string (in bytes)
 * @returns {string} - Random hex string
 */
export const generateRandomHex = (length = 32) => {
  const randomBytes = new Uint8Array(length);
  window.crypto.getRandomValues(randomBytes);
  return Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
};
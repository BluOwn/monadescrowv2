import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';

// Cache for providers, signers, and contract instances
let cachedProvider = null;
let cachedSigner = null;
let cachedContract = null;
const contractCache = new Map();

// Cache for escrow data with TTL
const escrowCache = new Map();
const CACHE_TTL = 30000; // 30 seconds

export const useWeb3 = (contractAddress, contractAbi) => {
  const [state, setState] = useState({
    provider: null,
    signer: null,
    contract: null,
    account: '',
    networkName: '',
    connected: false,
    loading: false,
    error: '',
  });

  // Initialize or get cached provider
  const getProvider = useCallback(async () => {
    if (!window.ethereum) {
      throw new Error('Please install MetaMask');
    }
    
    if (!cachedProvider) {
      cachedProvider = new ethers.BrowserProvider(window.ethereum);
    }
    return cachedProvider;
  }, []);

  // Initialize or get cached signer
  const getSigner = useCallback(async () => {
    if (!cachedSigner) {
      const provider = await getProvider();
      cachedSigner = await provider.getSigner();
    }
    return cachedSigner;
  }, [getProvider]);

  // Initialize or get cached contract instance
  const getContract = useCallback(async () => {
    const cacheKey = `${contractAddress}`;
    
    if (!contractCache.has(cacheKey)) {
      const signer = await getSigner();
      const contract = new ethers.Contract(
        contractAddress,
        contractAbi,
        signer
      );
      contractCache.set(cacheKey, contract);
    }
    
    return contractCache.get(cacheKey);
  }, [contractAddress, contractAbi, getSigner]);

  // Connect to wallet
  const connectWallet = useCallback(async () => {
    if (!window.ethereum) {
      setState(prev => ({ ...prev, error: 'Please install MetaMask' }));
      return;
    }

    try {
      setState(prev => ({ ...prev, loading: true, error: '' }));
      
      // Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      if (accounts.length > 0) {
        const provider = await getProvider();
        const network = await provider.getNetwork();
        const signer = await getSigner();
        const chainId = network.chainId;
        
        // Check if we're on Monad Testnet
        if (chainId === 10143n) {
          const contract = await getContract();
          
          setState(prev => ({
            ...prev,
            provider,
            signer,
            contract,
            account: accounts[0],
            networkName: 'Monad Testnet',
            connected: true,
            loading: false,
          }));
          
          return {
            provider,
            signer,
            contract,
            account: accounts[0]
          };
        } else {
          setState(prev => ({ ...prev, error: 'Please connect to Monad Testnet', loading: false }));
          try {
            // Prompt user to switch to Monad Testnet
            await window.ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: '0x2797' }], // 10143 in hex
            });
          } catch (switchError) {
            // If the network is not added, try to add it
            if (switchError.code === 4902) {
              try {
                await window.ethereum.request({
                  method: 'wallet_addEthereumChain',
                  params: [{
                    chainId: '0x2797', // 10143 in hex
                    chainName: 'Monad Testnet',
                    nativeCurrency: {
                      name: 'MON',
                      symbol: 'MON',
                      decimals: 18
                    },
                    rpcUrls: ['https://testnet-rpc.monad.xyz'],
                    blockExplorerUrls: ['https://testnet.monadexplorer.com']
                  }]
                });
              } catch (addError) {
                setState(prev => ({ 
                  ...prev, 
                  error: 'Failed to add Monad Testnet to MetaMask',
                  loading: false 
                }));
              }
            } else {
              setState(prev => ({ 
                ...prev, 
                error: 'Failed to switch to Monad Testnet',
                loading: false 
              }));
            }
          }
        }
      }
    } catch (error) {
      console.error("Error connecting to MetaMask", error);
      setState(prev => ({ 
        ...prev, 
        error: `Failed to connect wallet: ${error.message}`,
        loading: false 
      }));
    }
  }, [getProvider, getSigner, getContract]);

  // Get escrow with caching
  const getEscrowWithCache = useCallback(async (escrowId) => {
    if (!state.contract) {
      throw new Error('Contract not initialized');
    }
    
    const now = Date.now();
    const cacheKey = `escrow-${escrowId}`;
    const cached = escrowCache.get(cacheKey);
    
    // Return cached data if fresh
    if (cached && now - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
    
    try {
      // Otherwise fetch fresh data
      const details = await state.contract.getEscrow(escrowId);
      
      // Ensure we have valid details before processing
      if (!details || !details[0]) {
        throw new Error(`Invalid escrow data returned for ID: ${escrowId}`);
      }
      
      const escrowData = {
        id: Number(escrowId), // Convert to Number for safety
        buyer: details[0],
        seller: details[1],
        arbiter: details[2],
        amount: ethers.formatEther(details[3]),
        fundsDisbursed: details[4],
        disputeRaised: details[5]
      };
      
      // Update cache
      escrowCache.set(cacheKey, {
        timestamp: now,
        data: escrowData
      });
      
      return escrowData;
    } catch (error) {
      console.error(`Error fetching escrow #${escrowId}:`, error);
      throw new Error(`Failed to fetch escrow #${escrowId}: ${error.message}`);
    }
  }, [state.contract]);

  // Load user's escrows with batching when possible
  const loadUserEscrows = useCallback(async (userAddress) => {
    if (!state.contract) {
      throw new Error('Contract not initialized');
    }

    try {
      let escrowIds;
      try {
        // Try to get user escrows, but handle potential errors
        escrowIds = await state.contract.getUserEscrows(userAddress);
      } catch (contractError) {
        console.warn("Contract call to getUserEscrows failed:", contractError);
        // Return empty array instead of failing completely
        return [];
      }
      
      // Only proceed if we have escrow IDs
      if (!escrowIds || escrowIds.length === 0) {
        return [];
      }
      
      // Process each escrow ID individually to prevent one failure from blocking all
      const escrowDetails = [];
      
      for (const id of escrowIds) {
        try {
          const escrow = await getEscrowWithCache(id);
          escrowDetails.push(escrow);
        } catch (err) {
          console.warn(`Failed to load escrow #${id}:`, err);
          // Continue to next escrow instead of failing completely
        }
      }
      
      return escrowDetails;
    } catch (error) {
      console.error("Error loading escrows", error);
      throw new Error(`Failed to load escrows: ${error.message}`);
    }
  }, [state.contract, getEscrowWithCache]);

  // Load arbitrated escrows
  const loadArbitratedEscrows = useCallback(async (arbiterAddress) => {
    if (!state.contract) {
      throw new Error('Contract not initialized');
    }

    try {
      let escrowCount;
      try {
        // Get total escrow count - this could potentially be expensive
        escrowCount = await state.contract.getEscrowCount();
      } catch (countError) {
        console.warn("Error getting escrow count:", countError);
        return []; // Return empty array instead of failing
      }
      
      // Convert BigInt to Number safely for looping
      const count = Number(escrowCount);
      
      const arbitratedEscrows = [];
      const batchSize = 10; // Process in smaller batches to avoid timeouts
      
      for (let i = 0; i < count; i += batchSize) {
        const promises = [];
        
        // Create batch of promises
        for (let j = i; j < Math.min(i + batchSize, count); j++) {
          promises.push(
            state.contract.getEscrow(j)
              .then(details => {
                // Check if the user is the arbiter for this escrow
                if (details[2].toLowerCase() === arbiterAddress.toLowerCase()) {
                  return {
                    id: j,
                    buyer: details[0],
                    seller: details[1],
                    arbiter: details[2],
                    amount: ethers.formatEther(details[3]),
                    fundsDisbursed: details[4],
                    disputeRaised: details[5]
                  };
                }
                return null;
              })
              .catch(err => {
                // Skip any errors (e.g., if an escrow ID doesn't exist)
                console.log(`Error fetching escrow #${j}:`, err);
                return null;
              })
          );
        }
        
        // Wait for batch to complete
        const results = await Promise.all(promises);
        
        // Filter out nulls and add to results
        arbitratedEscrows.push(...results.filter(result => result !== null));
      }
      
      return arbitratedEscrows;
    } catch (error) {
      console.error("Error loading arbitrated escrows", error);
      throw new Error(`Failed to load arbitrated escrows: ${error.message}`);
    }
  }, [state.contract]);

  // Setup event listeners for account and network changes
  useEffect(() => {
    if (!window.ethereum) return;
    
    const handleAccountsChanged = (accounts) => {
      if (accounts.length > 0) {
        setState(prev => ({ ...prev, account: accounts[0] }));
      } else {
        setState(prev => ({ ...prev, connected: false, account: '' }));
      }
    };
    
    const handleChainChanged = () => {
      // Reset caches when chain changes
      cachedProvider = null;
      cachedSigner = null;
      cachedContract = null;
      contractCache.clear();
      escrowCache.clear();
      
      // Reload the page to ensure clean state
      window.location.reload();
    };
    
    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);
    
    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum.removeListener('chainChanged', handleChainChanged);
    };
  }, []);

  // Create, execute, and track a contract transaction
  const executeContractTransaction = useCallback(async (method, ...args) => {
    if (!state.contract) {
      throw new Error('Contract not initialized');
    }

    try {
      // Check if the last argument is a transaction options object
      const lastArg = args.length > 0 ? args[args.length - 1] : undefined;
      const hasOptions = lastArg && typeof lastArg === 'object' && !Array.isArray(lastArg) && !ethers.isAddress(lastArg);
      
      // If there are transaction options, add gas estimation
      if (hasOptions) {
        // Remove options to estimate gas
        const params = args.slice(0, args.length - 1);
        try {
          // Estimate gas for the transaction
          const gasEstimate = await state.contract[method].estimateGas(...params, lastArg);
          // Add 20% buffer to gas estimate
          const gasLimit = Math.floor(Number(gasEstimate) * 1.2);
          // Add gas limit to options
          args[args.length - 1] = {
            ...lastArg,
            gasLimit
          };
        } catch (estError) {
          console.warn(`Gas estimation failed for ${method}:`, estError);
          // Continue without gas estimation if it fails
        }
      }
      
      // Execute transaction
      const tx = await state.contract[method](...args);
      
      // Wait for transaction confirmation
      const receipt = await tx.wait();
      
      // Clear relevant cache entries
      escrowCache.clear();
      
      return {
        success: true,
        receipt,
        hash: tx.hash
      };
    } catch (error) {
      console.error(`Error executing ${method}:`, error);
      
      // Extract a more user-friendly error message
      let errorMessage = error.message || 'Transaction failed';
      
      // Try to extract revert reason if possible
      if (error.data) {
        try {
          // Sometimes the revert reason is in error.data
          errorMessage = `Contract error: ${error.data}`;
        } catch (e) {
          // Continue with original error message
        }
      }
      
      throw new Error(`Failed to execute ${method}: ${errorMessage}`);
    }
  }, [state.contract]);

  return {
    ...state,
    connectWallet,
    getEscrowWithCache,
    loadUserEscrows,
    loadArbitratedEscrows,
    executeContractTransaction
  };
};
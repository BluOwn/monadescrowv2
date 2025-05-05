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
    
    // Otherwise fetch fresh data
    const details = await state.contract.getEscrow(escrowId);
    const escrowData = {
      id: escrowId,
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
  }, [state.contract]);

  // Load user's escrows with batching when possible
  const loadUserEscrows = useCallback(async (userAddress) => {
    if (!state.contract) {
      throw new Error('Contract not initialized');
    }

    try {
      const escrowIds = await state.contract.getUserEscrows(userAddress);
      
      // Prepare promises for all escrow details
      const promises = escrowIds.map(id => getEscrowWithCache(id));
      
      // Wait for all promises to resolve
      const escrowDetails = await Promise.all(promises);
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
      // Get total escrow count - this could potentially be expensive
      // In production, consider using events or indexing
      const escrowCount = await state.contract.getEscrowCount();
      
      const arbitratedEscrows = [];
      const batchSize = 10; // Process in smaller batches to avoid timeouts
      
      for (let i = 0; i < escrowCount; i += batchSize) {
        const promises = [];
        
        // Create batch of promises
        for (let j = i; j < Math.min(i + batchSize, escrowCount); j++) {
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
      // Optimistic UI update management could go here
      
      // Execute transaction
      const tx = await state.contract[method](...args);
      
      // Wait for transaction confirmation
      const receipt = await tx.wait();
      
      // Clear relevant cache entries
      // This is a simple approach - in production you might want more targeted cache invalidation
      escrowCache.clear();
      
      return {
        success: true,
        receipt,
        hash: tx.hash
      };
    } catch (error) {
      console.error(`Error executing ${method}`, error);
      throw new Error(`Failed to execute ${method}: ${error.message}`);
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
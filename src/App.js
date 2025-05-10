import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Button, Card, Container, Form, ListGroup, Nav, Spinner, Alert, Modal, Badge, Tabs, Tab } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
// Import ABI for the EscrowService contract
import { ESCROW_SERVICE_ABI } from './contracts/EscrowServiceABI';

// Import security utilities and components
import {
  ESCROW_SERVICE_ADDRESS,
  validateNetwork,
  verifyContract,
  executeTransactionSecurely,
  validateAddress,
  validateAmount,
  handleError,
  addSecurityHeaders
} from './utils/security';

import {
  ContractInfo,
  SecurityWarningModal,
  SecurityBanner,
  NetworkWarning
} from './components/SecurityComponents';

// Import Components
import MessagePanel from './components/MessagePanel';
import ContactForm from './components/ContactForm';
import TokenSelector from './components/TokenSelector';
import ArbiterSelector from './components/ArbiterSelector';
import DocumentUploader from './components/DocumentUploader';
import DisputeReasonSelector from './components/DisputeReasonSelector';

// Creator Information
const CREATOR_WALLET = "0x0b977acab5d9b8f654f48090955f5e00973be0fe";
const CREATOR_TWITTER = "@Oprimedev";

// Helper function to truncate address
const truncateAddress = (address) => {
  return address.slice(0, 6) + '...' + address.slice(-4);
};

// Helper for formatting dates
const formatDate = (timestamp) => {
  if (!timestamp) return 'Unknown';
  return new Date(Number(timestamp) * 1000).toLocaleString();
};

function App() {
  // State variables
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState('');
  const [networkName, setNetworkName] = useState('');
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [activeTab, setActiveTab] = useState('create');
  const [escrows, setEscrows] = useState([]);
  const [arbitratedEscrows, setArbitratedEscrows] = useState([]);
  const [selectedEscrowId, setSelectedEscrowId] = useState(null);
  const [selectedEscrow, setSelectedEscrow] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [contractFeePercentage, setContractFeePercentage] = useState(0);
  const [feeRecipient, setFeeRecipient] = useState('');
  const [contractPaused, setContractPaused] = useState(false);

  // Form states
  const [sellerAddress, setSellerAddress] = useState('');
  const [arbiterAddress, setArbiterAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [documentHash, setDocumentHash] = useState('');
  const [escrowIdToView, setEscrowIdToView] = useState('');
  const [recipientForDispute, setRecipientForDispute] = useState('');
  const [disputeReason, setDisputeReason] = useState(0);
  const [disputeDescription, setDisputeDescription] = useState('');
  
  // Token-related states
  const [useToken, setUseToken] = useState(false);
  const [selectedToken, setSelectedToken] = useState(null);
  const [supportedTokens, setSupportedTokens] = useState([]);
  const [tokenAllowance, setTokenAllowance] = useState('0');
  const [showApproveModal, setShowApproveModal] = useState(false);

  // Security states
  const [showSecurityWarning, setShowSecurityWarning] = useState(false);
  const [hasAcceptedSecurity, setHasAcceptedSecurity] = useState(false);
  const [firstTimeUser, setFirstTimeUser] = useState(true);

  // Loading states for better UX
  const [loadingEscrows, setLoadingEscrows] = useState(false);
  const [loadingArbitratedEscrows, setLoadingArbitratedEscrows] = useState(false);
  const [loadingTokens, setLoadingTokens] = useState(false);
  const [loadingContractInfo, setLoadingContractInfo] = useState(false);

  // Pagination
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalEscrows, setTotalEscrows] = useState(0);

  // New escrow creation modals
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeEscrowId, setDisputeEscrowId] = useState(null);

  // Initialize security headers on component mount
  useEffect(() => {
    addSecurityHeaders();
    
    // Check if user has previously accepted security warning
    const hasAccepted = localStorage.getItem('monad-escrow-security-accepted');
    if (hasAccepted === 'true') {
      setHasAcceptedSecurity(true);
      setFirstTimeUser(false);
    }
  }, []);

  // Load contract info like fee percentage, pause status, etc.
  const loadContractInfo = async (contract) => {
    try {
      setLoadingContractInfo(true);
      
      // Get fee percentage
      const fee = await contract.feePercentage();
      // Fee is in permille (0.1%), convert to human-readable percentage
      setContractFeePercentage(fee.toNumber() / 10);
      
      // Get fee recipient
      const recipient = await contract.feeRecipient();
      setFeeRecipient(recipient);
      
      // Check if contract is paused
      const isPaused = await contract.paused();
      setContractPaused(isPaused);
      
      // Get supported tokens
      await loadSupportedTokens(contract);
      
      setLoadingContractInfo(false);
    } catch (error) {
      console.error("Error loading contract info:", error);
      setLoadingContractInfo(false);
    }
  };

  // Load supported tokens
  const loadSupportedTokens = async (contractInstance) => {
    try {
      setLoadingTokens(true);
      
      const tokenAddresses = await contractInstance.getSupportedTokens();
      const tokens = [];
      
      // Add native token
      tokens.push({
        address: '0x0000000000000000000000000000000000000000',
        symbol: 'MON',
        name: 'Monad Native Token',
        decimals: 18,
        isNative: true
      });
      
      // Get ERC20 token details
      for (const tokenAddress of tokenAddresses) {
        // Skip the zero address (native token)
        if (tokenAddress === '0x0000000000000000000000000000000000000000') continue;
        
        try {
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
          
          tokens.push({
            address: tokenAddress,
            symbol,
            name,
            decimals,
            isNative: false
          });
        } catch (err) {
          console.warn(`Error loading token details for ${tokenAddress}:`, err);
          // Add token with limited info
          tokens.push({
            address: tokenAddress,
            symbol: 'UNKNOWN',
            name: 'Unknown Token',
            decimals: 18,
            isNative: false
          });
        }
      }
      
      setSupportedTokens(tokens);
      
      // Set default token to native MON
      if (tokens.length > 0 && !selectedToken) {
        setSelectedToken(tokens[0]);
      }
      
      setLoadingTokens(false);
    } catch (error) {
      console.error("Error loading supported tokens:", error);
      setLoadingTokens(false);
    }
  };

  // Check token allowance for selected token
  const checkTokenAllowance = async (tokenAddress) => {
    if (!tokenAddress || tokenAddress === '0x0000000000000000000000000000000000000000' || !account || !contract) {
      return;
    }
    
    try {
      const tokenContract = new ethers.Contract(
        tokenAddress,
        [
          'function allowance(address owner, address spender) view returns (uint256)'
        ],
        provider
      );
      
      const allowance = await tokenContract.allowance(account, ESCROW_SERVICE_ADDRESS);
      setTokenAllowance(allowance.toString());
      
      return allowance;
    } catch (error) {
      console.error("Error checking token allowance:", error);
      setTokenAllowance('0');
      return ethers.constants.Zero;
    }
  };

  // Approve token spending
  const approveToken = async (tokenAddress, amount) => {
    if (!tokenAddress || tokenAddress === '0x0000000000000000000000000000000000000000') {
      return;
    }
    
    try {
      setLoading(true);
      
      const tokenContract = new ethers.Contract(
        tokenAddress,
        [
          'function approve(address spender, uint256 amount) returns (bool)'
        ],
        signer
      );
      
      // Approve a large amount to avoid frequent approvals
      const tx = await tokenContract.approve(ESCROW_SERVICE_ADDRESS, amount);
      await tx.wait();
      
      // Update allowance
      await checkTokenAllowance(tokenAddress);
      
      setLoading(false);
      setShowApproveModal(false);
      
      return true;
    } catch (error) {
      console.error("Error approving token:", error);
      setError(handleError(error, 'approve token'));
      setLoading(false);
      return false;
    }
  };

  // Connect to MetaMask
  const connectWallet = async () => {
    // Show security warning for first-time users
    if (firstTimeUser && !hasAcceptedSecurity) {
      setShowSecurityWarning(true);
      return;
    }

    if (window.ethereum) {
      try {
        setLoading(true);
        setError('');
        
        // Request account access
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        
        if (accounts.length > 0) {
          // Use Web3Provider for MetaMask
          const provider = new ethers.providers.Web3Provider(window.ethereum);
          
          // Validate network
          try {
            await validateNetwork(provider);
          } catch (networkError) {
            setError(networkError.message);
            setLoading(false);
            return;
          }
          
          const network = await provider.getNetwork();
          const signer = provider.getSigner();
          
          setProvider(provider);
          setSigner(signer);
          setAccount(accounts[0]);
          setNetworkName('Monad Testnet');
          setConnected(true);
          
          // Initialize contract with verification
          const isContractValid = await verifyContract(provider, ESCROW_SERVICE_ADDRESS, ESCROW_SERVICE_ABI);
          
          if (!isContractValid) {
            throw new Error('Contract verification failed. Please check the contract address.');
          }
          
          const escrowContract = new ethers.Contract(
            ESCROW_SERVICE_ADDRESS,
            ESCROW_SERVICE_ABI,
            signer
          );
          setContract(escrowContract);
          
          // Load contract info
          await loadContractInfo(escrowContract);
          
          // Load escrows with a small delay to ensure contract is fully initialized
          setTimeout(async () => {
            await loadUserEscrows(escrowContract, accounts[0]);
            await loadArbitratedEscrows(escrowContract, accounts[0]);
          }, 500);
        }
      } catch (error) {
        console.error("Error connecting to MetaMask", error);
        setError(handleError(error, 'connect wallet'));
      } finally {
        setLoading(false);
      }
    } else {
      setError('Please install MetaMask');
    }
  };

  // Handle security warning acceptance
  const handleSecurityAccept = () => {
    setHasAcceptedSecurity(true);
    setFirstTimeUser(false);
    setShowSecurityWarning(false);
    localStorage.setItem('monad-escrow-security-accepted', 'true');
    
    // Continue with wallet connection
    connectWallet();
  };

  const handleSecurityDecline = () => {
    setShowSecurityWarning(false);
    // Don't connect wallet if user declines
  };

  // Load user's escrows with retry logic
  const loadUserEscrows = async (escrowContract, userAddress, maxRetries = 3) => {
    let retries = 0;
    setLoadingEscrows(true);
    
    while (retries < maxRetries) {
      try {
        // Add a small delay to ensure contract is properly initialized
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // First check if contract is properly initialized
        if (!escrowContract || !escrowContract.getUserEscrows) {
          throw new Error('Contract not properly initialized');
        }
        
        // Get user escrows with pagination
        const offset = page * pageSize;
        const limit = pageSize;
        const result = await escrowContract.getUserEscrows(userAddress, offset, limit);
        
        const escrowIds = result[0]; // Array of escrow IDs
        const totalCount = result[1]; // Total count of user's escrows
        
        setTotalEscrows(totalCount.toNumber());
        
        const escrowDetails = [];
        for (let i = 0; i < escrowIds.length; i++) {
          try {
            const escrowId = escrowIds[i];
            const details = await escrowContract.getEscrowDetails(escrowId);
            
            const amount = details[4];
            const tokenAddress = details[3];
            
            // Format amount based on token (native or ERC20)
            let formattedAmount;
            let symbol = 'MON';
            
            if (tokenAddress === ethers.constants.AddressZero) {
              formattedAmount = ethers.utils.formatEther(amount); 
            } else {
              try {
                const tokenContract = new ethers.Contract(
                  tokenAddress,
                  ['function symbol() view returns (string)', 'function decimals() view returns (uint8)'],
                  provider
                );
                
                const [tokenSymbol, decimals] = await Promise.all([
                  tokenContract.symbol().catch(() => 'UNKNOWN'),
                  tokenContract.decimals().catch(() => 18)
                ]);
                
                symbol = tokenSymbol;
                formattedAmount = ethers.utils.formatUnits(amount, decimals);
              } catch (err) {
                console.warn(`Error getting token details for ${tokenAddress}:`, err);
                formattedAmount = ethers.utils.formatEther(amount);
              }
            }
            
            escrowDetails.push({
              id: escrowId,
              buyer: details[0],
              seller: details[1],
              arbiter: details[2],
              tokenAddress: tokenAddress,
              amount: formattedAmount,
              tokenSymbol: symbol,
              creationTime: formatDate(details[5]),
              fundsDisbursed: details[6],
              disputeRaised: details[7],
              description: details[8] || '',
              documentHash: details[9] || ''
            });
          } catch (innerError) {
            console.warn(`Error loading escrow ${escrowIds[i]}:`, innerError);
            // Continue with other escrows even if one fails
          }
        }
        
        setEscrows(escrowDetails);
        setLoadingEscrows(false);
        return; // Success, exit the retry loop
        
      } catch (error) {
        console.error(`Attempt ${retries + 1} failed loading escrows:`, error);
        retries++;
        
        if (retries >= maxRetries) {
          setLoadingEscrows(false);
          if (error.message.includes('missing revert data')) {
            setError('Unable to load escrows. Please ensure you are connected to the correct network and the contract is deployed. Try refreshing the page.');
          } else {
            setError('Failed to load escrows: ' + error.message);
          }
        }
      }
    }
  };
  
  // Load escrows where user is arbiter with retry logic
  const loadArbitratedEscrows = async (escrowContract, arbiterAddress, maxRetries = 3) => {
    let retries = 0;
    setLoadingArbitratedEscrows(true);
    
    while (retries < maxRetries) {
      try {
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        if (!escrowContract || !escrowContract.getEscrowCount) {
          throw new Error('Contract not properly initialized');
        }
        
        // Get user escrows first - this is more efficient than checking all escrows
        const offset = 0;
        const limit = 100; // Higher limit for arbitrated escrows, as they're usually fewer
        const result = await escrowContract.getUserEscrows(arbiterAddress, offset, limit);
        
        const escrowIds = result[0]; // Array of escrow IDs
        
        const arbitratedEscrows = [];
        for (let i = 0; i < escrowIds.length; i++) {
          try {
            const escrowId = escrowIds[i];
            const details = await escrowContract.getEscrowDetails(escrowId);
            
            // Check if the user is the arbiter for this escrow
            if (details[2].toLowerCase() === arbiterAddress.toLowerCase()) {
              const amount = details[4];
              const tokenAddress = details[3];
              
              // Format amount based on token
              let formattedAmount;
              let symbol = 'MON';
              
              if (tokenAddress === ethers.constants.AddressZero) {
                formattedAmount = ethers.utils.formatEther(amount); 
              } else {
                try {
                  const tokenContract = new ethers.Contract(
                    tokenAddress,
                    ['function symbol() view returns (string)', 'function decimals() view returns (uint8)'],
                    provider
                  );
                  
                  const [tokenSymbol, decimals] = await Promise.all([
                    tokenContract.symbol().catch(() => 'UNKNOWN'),
                    tokenContract.decimals().catch(() => 18)
                  ]);
                  
                  symbol = tokenSymbol;
                  formattedAmount = ethers.utils.formatUnits(amount, decimals);
                } catch (err) {
                  console.warn(`Error getting token details for ${tokenAddress}:`, err);
                  formattedAmount = ethers.utils.formatEther(amount);
                }
              }
              
              arbitratedEscrows.push({
                id: escrowId,
                buyer: details[0],
                seller: details[1],
                arbiter: details[2],
                tokenAddress: tokenAddress,
                amount: formattedAmount,
                tokenSymbol: symbol,
                creationTime: formatDate(details[5]),
                fundsDisbursed: details[6],
                disputeRaised: details[7],
                description: details[8] || '',
                documentHash: details[9] || ''
              });
            }
          } catch (err) {
            console.warn(`Error fetching escrow #${escrowIds[i]}:`, err);
          }
        }
        
        setArbitratedEscrows(arbitratedEscrows);
        setLoadingArbitratedEscrows(false);
        return; // Success, exit the retry loop
        
      } catch (error) {
        console.error(`Attempt ${retries + 1} failed loading arbitrated escrows:`, error);
        retries++;
        
        if (retries >= maxRetries) {
          setLoadingArbitratedEscrows(false);
          if (error.message.includes('missing revert data')) {
            setError('Unable to load arbitrated escrows. Please ensure you are connected to the correct network and the contract is deployed. Try refreshing the page.');
          } else {
            setError('Failed to load arbitrated escrows: ' + error.message);
          }
        }
      }
    }
  };

  // Get dispute details
  const loadDisputeDetails = async (escrowId) => {
    if (!contract || escrowId === null) return null;
    
    try {
      const details = await contract.getDisputeDetails(escrowId);
      
      return {
        initiator: details[0],
        timestamp: formatDate(details[1]),
        reason: details[2], // Reason code (0-5)
        description: details[3] || '',
        resolved: details[4],
        resolvedInFavorOf: details[5],
        resolutionTime: formatDate(details[6])
      };
    } catch (error) {
      console.error(`Error loading dispute details for escrow ${escrowId}:`, error);
      return null;
    }
  };

  // Create new escrow
  const handleCreateEscrow = async (e) => {
    e.preventDefault();
    
    try {
      // Validate inputs
      if (!sellerAddress) {
        throw new Error('Seller address is required');
      }
      validateAddress(sellerAddress, 'Seller address');
      
      if (!arbiterAddress) {
        throw new Error('Arbiter address is required');
      }
      validateAddress(arbiterAddress, 'Arbiter address');
      
      validateAmount(amount);
      
      // Check that addresses are different
      if (sellerAddress.toLowerCase() === account.toLowerCase()) {
        throw new Error('Seller address cannot be the same as buyer address');
      }
      if (arbiterAddress.toLowerCase() === account.toLowerCase()) {
        throw new Error('Arbiter address cannot be the same as buyer address');
      }
      if (sellerAddress.toLowerCase() === arbiterAddress.toLowerCase()) {
        throw new Error('Seller and arbiter addresses must be different');
      }
      
      setLoading(true);
      setError('');
      
      let tx;
      
      // Using empty strings for description and documentHash fields
      const description = "";
      const documentHash = "";
      
      if (useToken && selectedToken && !selectedToken.isNative) {
        // ERC20 token escrow
        const tokenAddress = selectedToken.address;
        const decimals = selectedToken.decimals || 18;
        const amountInTokenUnits = ethers.utils.parseUnits(amount, decimals);
        
        // Check if allowance is sufficient
        const allowance = await checkTokenAllowance(tokenAddress);
        
        if (allowance.lt(amountInTokenUnits)) {
          setShowApproveModal(true);
          setLoading(false);
          return;
        }
        
        // Create token escrow
        tx = await contract.createTokenEscrow(
          sellerAddress,
          arbiterAddress,
          tokenAddress,
          amountInTokenUnits,
          description, // Empty description field
          documentHash // Empty document hash field
        );
      } else {
        // Native currency escrow
        const amountInWei = ethers.utils.parseEther(amount);
        
        tx = await contract.createEscrow(
          sellerAddress, 
          arbiterAddress,
          description, // Empty description field
          documentHash, // Empty document hash field
          { value: amountInWei }
        );
      }
      
      // Wait for confirmation
      const receipt = await tx.wait();
      
      // Extract escrow ID from events
      let escrowId;
      const escrowCreatedEvent = receipt.events?.find(
        event => event.event === 'EscrowCreated'
      );
      
      if (escrowCreatedEvent && escrowCreatedEvent.args) {
        escrowId = escrowCreatedEvent.args[0].toString();
        setSuccessMessage(`Escrow #${escrowId} created successfully! Transaction hash: ${receipt.transactionHash}`);
      } else {
        setSuccessMessage(`Escrow created successfully! Transaction hash: ${receipt.transactionHash}`);
      }
      
      // Reset form
      setSellerAddress('');
      setArbiterAddress('');
      setAmount('');
      setUseToken(false);
      setSelectedToken(supportedTokens.find(t => t.isNative) || null);
      
      // Reload escrows after a short delay
      setTimeout(async () => {
        try {
          await loadUserEscrows(contract, account);
          await loadArbitratedEscrows(contract, account);
          
          // If escrow ID was extracted, view its details
          if (escrowId) {
            viewEscrowDetails(escrowId);
          }
        } catch (err) {
          console.error('Error reloading escrows:', err);
        }
      }, 2000);
    } catch (error) {
      console.error("Error creating escrow:", error);
      setError(typeof error === 'string' ? error : (error.message || 'Failed to create escrow'));
    } finally {
      setLoading(false);
    }
  };

  // Handle approve modal
  const handleApproveToken = async () => {
    if (!selectedToken || selectedToken.isNative) return;
    
    const decimals = selectedToken.decimals || 18;
    const amountInTokenUnits = ethers.utils.parseUnits(amount, decimals);
    
    // Approve a bit more than needed to account for potential fee changes
    const amountToApprove = amountInTokenUnits.mul(120).div(100); // 120% of the amount
    
    const success = await approveToken(selectedToken.address, amountToApprove);
    
    if (success) {
      // Continue with escrow creation
      handleCreateEscrow({ preventDefault: () => {} });
    }
  };

  // View escrow details
  const viewEscrowDetails = async (escrowId) => {
    try {
      setLoading(true);
      setError('');
      
      const details = await contract.getEscrowDetails(escrowId);
      
      const amount = details[4];
      const tokenAddress = details[3];
      
      // Format amount based on token
      let formattedAmount;
      let symbol = 'MON';
      
      if (tokenAddress === ethers.constants.AddressZero) {
        formattedAmount = ethers.utils.formatEther(amount); 
      } else {
        try {
          const tokenContract = new ethers.Contract(
            tokenAddress,
            ['function symbol() view returns (string)', 'function decimals() view returns (uint8)'],
            provider
          );
          
          const [tokenSymbol, decimals] = await Promise.all([
            tokenContract.symbol().catch(() => 'UNKNOWN'),
            tokenContract.decimals().catch(() => 18)
          ]);
          
          symbol = tokenSymbol;
          formattedAmount = ethers.utils.formatUnits(amount, decimals);
        } catch (err) {
          console.warn(`Error getting token details for ${tokenAddress}:`, err);
          formattedAmount = ethers.utils.formatEther(amount);
        }
      }
      
      const escrow = {
        id: escrowId,
        buyer: details[0],
        seller: details[1],
        arbiter: details[2],
        tokenAddress: tokenAddress,
        amount: formattedAmount,
        tokenSymbol: symbol,
        creationTime: formatDate(details[5]),
        fundsDisbursed: details[6],
        disputeRaised: details[7],
        description: details[8] || '',
        documentHash: details[9] || ''
      };
      
      // If there's a dispute, load dispute details
      if (escrow.disputeRaised) {
        const disputeDetails = await loadDisputeDetails(escrowId);
        escrow.dispute = disputeDetails;
      }
      
      setSelectedEscrow(escrow);
      setShowDetailsModal(true);
    } catch (error) {
      console.error("Error viewing escrow", error);
      setError('Failed to view escrow: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle raising dispute
  const handleRaiseDispute = async (escrowId) => {
    setDisputeEscrowId(escrowId);
    setDisputeReason(0); // Default reason
    setDisputeDescription('');
    setShowDisputeModal(true);
  };

  // Submit dispute
  const submitDispute = async () => {
    if (!disputeEscrowId) return;
    
    try {
      setLoading(true);
      setError('');
      
      const tx = await contract.raiseDispute(
        disputeEscrowId,
        disputeReason,
        disputeDescription
      );
      
      const receipt = await tx.wait();
      
      setSuccessMessage(`Dispute raised successfully! Transaction hash:(filesize: 0): Transaction hash: ${receipt.transactionHash}`);
      setShowDisputeModal(false);
      
      // Reload escrows and update details if modal is open
      await loadUserEscrows(contract, account);
      await loadArbitratedEscrows(contract, account);
      
      if (selectedEscrow && selectedEscrow.id === disputeEscrowId) {
        viewEscrowDetails(disputeEscrowId);
      }
    } catch (error) {
      console.error("Error raising dispute:", error);
      setError(handleError(error, 'raise dispute'));
    } finally {
      setLoading(false);
    }
  };

  // Handle action on escrow
  const handleEscrowAction = async (action, escrowId, recipient = null) => {
    try {
      setLoading(true);
      setError('');
      
      let tx;
      
      switch (action) {
        case 'release':
          tx = await contract.releaseFunds(escrowId);
          break;
        case 'refund':
          tx = await contract.refundBuyer(escrowId);
          break;
        case 'resolve':
          if (!recipient) {
            setError('Recipient address is required to resolve a dispute');
            setLoading(false);
            return;
          }
          validateAddress(recipient, 'Recipient');
          tx = await contract.resolveDispute(escrowId, recipient);
          break;
        default:
          setError('Invalid action');
          setLoading(false);
          return;
      }
      
      // Wait for confirmation
      const receipt = await tx.wait();
      
      setSuccessMessage(`Action ${action} executed successfully! Transaction hash: ${receipt.transactionHash}`);
      
      // Reload escrows
      await loadUserEscrows(contract, account);
      await loadArbitratedEscrows(contract, account);
      
      // If we were showing a modal for this escrow, refresh its details
      if (selectedEscrow && selectedEscrow.id === escrowId) {
        viewEscrowDetails(escrowId);
      }
    } catch (error) {
      console.error(`Error executing ${action}`, error);
      setError(handleError(error, action));
    } finally {
      setLoading(false);
    }
  };

  // Find escrow by ID
  const handleFindEscrow = async (e) => {
    e.preventDefault();
    
    if (!escrowIdToView) {
      setError('Please enter an escrow ID');
      return;
    }
    
    try {
      await viewEscrowDetails(escrowIdToView);
      setEscrowIdToView('');
    } catch (error) {
      console.error("Error finding escrow", error);
      setError('Failed to find escrow: ' + error.message);
    }
  };

  // Calculate estimated fee
  const calculateEstimatedFee = () => {
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return '0';
    }
    
    // Fee is contractFeePercentage / 100 * amount
    const fee = (parseFloat(amount) * contractFeePercentage) / 1000;
    return fee.toFixed(6);
  };

  // Format dispute reason code into human readable text
  const formatDisputeReason = (reasonCode) => {
    const reasons = [
      'Product Not Received',
      'Product Damaged',
      'Product Not As Described',
      'Service Not Provided',
      'Service Quality Poor',
      'Other'
    ];
    
    return reasons[reasonCode] || 'Unknown';
  };

  // Handle token selection
  const handleTokenSelect = (token) => {
    setSelectedToken(token);
    
    // Check allowance if it's an ERC20 token
    if (token && !token.isNative) {
      checkTokenAllowance(token.address);
    }
  };

  // Effect for handling account changes
  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = async (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          if (contract) {
            await loadUserEscrows(contract, accounts[0]);
            await loadArbitratedEscrows(contract, accounts[0]);
          }
        } else {
          setConnected(false);
          setAccount('');
        }
      };
      
      const handleChainChanged = () => {
        window.location.reload();
      };
      
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
      
      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, [contract]);

  // Effect to check token allowance when token selection changes
  useEffect(() => {
    if (selectedToken && !selectedToken.isNative && connected) {
      checkTokenAllowance(selectedToken.address);
    }
  }, [selectedToken, connected]);

  // Retry loading escrows button
  const retryLoadingEscrows = async () => {
    if (contract && account) {
      await loadUserEscrows(contract, account);
      await loadArbitratedEscrows(contract, account);
    }
  };

  // Pagination handlers
  const handlePrevPage = () => {
    if (page > 0) {
      setPage(page - 1);
      // Reload with new page
      if (contract && account) {
        loadUserEscrows(contract, account);
      }
    }
  };

  const handleNextPage = () => {
    if ((page + 1) * pageSize < totalEscrows) {
      setPage(page + 1);
      // Reload with new page
      if (contract && account) {
        loadUserEscrows(contract, account);
      }
    }
  };

  return (
    <div className="app-wrapper">
      <Container className="py-5">
        <div className="app-header">
          <h1>Monad Escrow Service</h1>
          <p>Secure your transactions with smart contract escrow on Monad Testnet</p>
          {contractPaused && connected && (
            <Alert variant="warning" className="mt-2">
              <strong>⚠️ Notice:</strong> The escrow service is currently paused. 
              You can view existing escrows, but new escrows cannot be created.
            </Alert>
          )}
        </div>
        
        {/* Security Warning Modal */}
        <SecurityWarningModal 
          show={showSecurityWarning}
          onAccept={handleSecurityAccept}
          onDecline={handleSecurityDecline}
        />
        
        {/* Token Approval Modal */}
        <Modal show={showApproveModal} onHide={() => setShowApproveModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Token Approval Required</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p>To create an escrow with {selectedToken?.symbol}, you need to approve the escrow contract to use your tokens.</p>
            <p>Amount to escrow: {amount} {selectedToken?.symbol}</p>
            <p>Current allowance: {ethers.utils.formatUnits(tokenAllowance, selectedToken?.decimals || 18)} {selectedToken?.symbol}</p>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowApproveModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleApproveToken} disabled={loading}>
              {loading ? <Spinner animation="border" size="sm" /> : 'Approve Token'}
            </Button>
          </Modal.Footer>
        </Modal>
        
        {/* Dispute Modal */}
        <Modal show={showDisputeModal} onHide={() => setShowDisputeModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Raise Dispute</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Dispute Reason</Form.Label>
                <Form.Select 
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(Number(e.target.value))}
                >
                  <option value="0">Product Not Received</option>
                  <option value="1">Product Damaged</option>
                  <option value="2">Product Not As Described</option>
                  <option value="3">Service Not Provided</option>
                  <option value="4">Service Quality Poor</option>
                  <option value="5">Other</option>
                </Form.Select>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Description (Optional)</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={disputeDescription}
                  onChange={(e) => setDisputeDescription(e.target.value)}
                  placeholder="Provide details about the dispute..."
                />
              </Form.Group>
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowDisputeModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={submitDispute} disabled={loading}>
              {loading ? <Spinner animation="border" size="sm" /> : 'Raise Dispute'}
            </Button>
          </Modal.Footer>
        </Modal>

        {!connected ? (
          <div className="connect-wallet-container">
            <SecurityBanner />
            <ContractInfo />
            <p>Connect your wallet to use the escrow service</p>
            <Button 
              className="wallet-button"
              onClick={connectWallet} 
              disabled={loading}
            >
              {loading ? <Spinner animation="border" size="sm" /> : 'Connect Wallet'}
            </Button>
          </div>
        ) : (
          <>
            <div className="wallet-info mb-4">
              <div>
                <small>Connected to: <span className="network-badge">{networkName}</span></small>
                <p className="mb-0"><strong>Account:</strong> {truncateAddress(account)}</p>
              </div>
              <Button variant="outline-secondary" size="sm" onClick={() => window.location.reload()}>
                Disconnect
              </Button>
            </div>
            
            {/* Security Banner */}
            <SecurityBanner />
            
            {/* Network Warning */}
            <NetworkWarning currentNetwork={networkName} />
            
            {error && (
              <Alert variant="danger" onClose={() => setError('')} dismissible>
                {error}
                {error.includes('refresh') && (
                  <div className="mt-2">
                    <Button variant="danger" size="sm" onClick={retryLoadingEscrows}>
                      Retry Loading
                    </Button>
                  </div>
                )}
              </Alert>
            )}
            
            {successMessage && (
              <Alert variant="success" onClose={() => setSuccessMessage('')} dismissible>
                {successMessage}
              </Alert>
            )}
            
            <Nav variant="tabs" className="mb-4" activeKey={activeTab} onSelect={(k) => setActiveTab(k)}>
              <Nav.Item>
                <Nav.Link eventKey="create" disabled={contractPaused}>Create Escrow</Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="my">
                  My Escrows
                  {loadingEscrows && <Spinner animation="border" size="sm" className="ms-2" />}
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="arbitrated">
                  Arbitrated Escrows
                  {arbitratedEscrows.length > 0 && (
                    <Badge bg="primary" className="ms-2">{arbitratedEscrows.length}</Badge>
                  )}
                  {loadingArbitratedEscrows && <Spinner animation="border" size="sm" className="ms-2" />}
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="find">Find Escrow</Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="contact">Contact</Nav.Link>
              </Nav.Item>
            </Nav>
            
            {activeTab === 'create' && (
              <Card>
                <Card.Body>
                  <Card.Title>Create New Escrow</Card.Title>
                  <ContractInfo />
                  
                  {contractPaused ? (
                    <Alert variant="warning">
                      The escrow service is currently paused. New escrows cannot be created. 
                      Please check back later or contact the administrator.
                    </Alert>
                  ) : (
                    <Form onSubmit={handleCreateEscrow}>
                      <Form.Group className="mb-3">
                        <Form.Label>Seller Address</Form.Label>
                        <Form.Control
                          type="text"
                          placeholder="0x..."
                          value={sellerAddress}
                          onChange={(e) => setSellerAddress(e.target.value)}
                          required
                        />
                        <Form.Text className="text-muted">
                          The address that will receive funds when released
                        </Form.Text>
                      </Form.Group>
                      
                      {/* New Arbiter Selector Component */}
                      <ArbiterSelector 
                        value={arbiterAddress}
                        onChange={setArbiterAddress}
                        contract={contract}
                      />
                      
                      {/* Token Selection */}
                      <Form.Group className="mb-3">
                        <Form.Check
                          type="checkbox"
                          label="Use ERC-20 Token Instead of Native MON"
                          checked={useToken}
                          onChange={(e) => setUseToken(e.target.checked)}
                          id="use-token-checkbox"
                        />
                      </Form.Group>
                      
                      {useToken && (
                        <TokenSelector
                          tokens={supportedTokens}
                          onSelect={handleTokenSelect}
                          selectedToken={selectedToken}
                          loading={loadingTokens}
                          provider={provider}
                        />
                      )}
                      
                      <Form.Group className="mb-3">
                        <Form.Label>Amount ({useToken ? selectedToken?.symbol || 'Token' : 'MON'})</Form.Label>
                        <Form.Control
                          type="text"
                          placeholder="0.01"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          required
                        />
                        <Form.Text className="text-muted">
                          The amount to place in escrow
                          {contractFeePercentage > 0 && (
                            <>
                              {' '}(Fee: {calculateEstimatedFee()} {useToken ? selectedToken?.symbol || 'Token' : 'MON'} - {contractFeePercentage / 10}%)
                            </>
                          )}
                        </Form.Text>
                      </Form.Group>
                      
                      {/* Description and Document Hash fields removed */}
                      
                      <Button 
                        variant="primary" 
                        type="submit" 
                        disabled={loading}
                      >
                        {loading ? <Spinner animation="border" size="sm" /> : 'Create Escrow'}
                      </Button>
                    </Form>
                  )}
                </Card.Body>
              </Card>
            )}
            
            {activeTab === 'my' && (
              <Card>
                <Card.Body>
                  <Card.Title>My Escrows</Card.Title>
                  {loadingEscrows ? (
                    <div className="text-center my-4">
                      <Spinner animation="border" />
                      <p className="mt-2">Loading escrows...</p>
                    </div>
                  ) : escrows.length === 0 ? (
                    <div className="text-center my-4">
                      <p>You don't have any escrows yet</p>
                      <Button variant="outline-primary" size="sm" onClick={retryLoadingEscrows}>
                        Refresh
                      </Button>
                    </div>
                  ) : (
                    <>
                      <ListGroup>
                        {escrows.map((escrow) => (
                          <ListGroup.Item 
                            key={escrow.id.toString()} 
                            className="escrow-item"
                          >
                            <div className="escrow-info">
                              <strong>Escrow #{escrow.id.toString()}</strong>
                              <p className="mb-0">Amount: {escrow.amount} {escrow.tokenSymbol}</p>
                              <div className="escrow-roles">
                                {account.toLowerCase() === escrow.buyer.toLowerCase() && (
                                  <span className="role-badge buyer-badge">Buyer</span>
                                )}
                                {account.toLowerCase() === escrow.seller.toLowerCase() && (
                                  <span className="role-badge seller-badge">Seller</span>
                                )}
                                {account.toLowerCase() === escrow.arbiter.toLowerCase() && (
                                  <span className="role-badge arbiter-badge">Arbiter</span>
                                )}
                              </div>
                              <span 
                                className={`escrow-status ${
                                  escrow.fundsDisbursed 
                                    ? 'status-completed' 
                                    : escrow.disputeRaised 
                                      ? 'status-disputed' 
                                      : 'status-active'
                                }`}
                              >
                                {escrow.fundsDisbursed 
                                  ? 'Completed' 
                                  : escrow.disputeRaised 
                                    ? 'Disputed' 
                                    : 'Active'}
                              </span>
                            </div>
                            <Button 
                              variant="outline-info" 
                              size="sm"
                              onClick={() => viewEscrowDetails(escrow.id)}
                            >
                              View Details
                            </Button>
                          </ListGroup.Item>
                        ))}
                      </ListGroup>
                      
                      {totalEscrows > pageSize && (
                        <div className="d-flex justify-content-between align-items-center mt-3">
                          <Button 
                            variant="outline-secondary" 
                            size="sm" 
                            onClick={handlePrevPage}
                            disabled={page === 0}
                          >
                            Previous
                          </Button>
                          <span>Page {page + 1} of {Math.ceil(totalEscrows / pageSize)}</span>
                          <Button 
                            variant="outline-secondary" 
                            size="sm" 
                            onClick={handleNextPage}
                            disabled={(page + 1) * pageSize >= totalEscrows}
                          >
                            Next
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </Card.Body>
              </Card>
            )}

            {activeTab === 'arbitrated' && (
              <Card>
                <Card.Body>
                  <Card.Title>Escrows You're Arbitrating</Card.Title>
                  {loadingArbitratedEscrows ? (
                    <div className="text-center my-4">
                      <Spinner animation="border" />
                      <p className="mt-2">Loading arbitrated escrows...</p>
                    </div>
                  ) : arbitratedEscrows.length === 0 ? (
                    <div className="text-center my-4">
                      <p>You're not arbitrating any escrows yet</p>
                      <Button variant="outline-primary" size="sm" onClick={retryLoadingEscrows}>
                        Refresh
                      </Button>
                    </div>
                  ) : (
                    <ListGroup>
                      {arbitratedEscrows.map((escrow) => (
                        <ListGroup.Item 
                          key={escrow.id.toString()} 
                          className="escrow-item arbiter-item"
                        >
                          <div className="escrow-info">
                            <div className="d-flex align-items-center">
                              <strong>Escrow #{escrow.id.toString()}</strong>
                              <span className="role-badge arbiter-badge ms-2">You are the Arbiter</span>
                            </div>
                            <p className="mb-1">Amount: {escrow.amount} {escrow.tokenSymbol}</p>
                            <p className="mb-1">Buyer: {truncateAddress(escrow.buyer)}</p>
                            <p className="mb-1">Seller: {truncateAddress(escrow.seller)}</p>
                            <span 
                              className={`escrow-status ${
                                escrow.fundsDisbursed 
                                  ? 'status-completed' 
                                  : escrow.disputeRaised 
                                    ? 'status-disputed' 
                                    : 'status-active'
                              }`}
                            >
                              {escrow.fundsDisbursed 
                                ? 'Completed' 
                                : escrow.disputeRaised 
                                  ? 'Disputed' 
                                  : 'Active'}
                            </span>
                          </div>
                          <div className="d-flex flex-column">
                            <Button 
                              variant="outline-info" 
                              size="sm"
                              className="mb-2"
                              onClick={() => viewEscrowDetails(escrow.id)}
                            >
                              View Details
                            </Button>
                            
                            {!escrow.fundsDisbursed && !escrow.disputeRaised && (
                              <Button 
                                variant="outline-warning" 
                                size="sm"
                                onClick={() => handleEscrowAction('refund', escrow.id)}
                                disabled={loading}
                              >
                                Refund Buyer
                              </Button>
                            )}
                          </div>
                        </ListGroup.Item>
                      ))}
                    </ListGroup>
                  )}
                </Card.Body>
              </Card>
            )}
            
            {activeTab === 'find' && (
              <Card>
                <Card.Body>
                  <Card.Title>Find Escrow by ID</Card.Title>
                  <Form onSubmit={handleFindEscrow} className="mb-4">
                    <Form.Group className="mb-3">
                      <Form.Label>Escrow ID</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Enter escrow ID"
                        value={escrowIdToView}
                        onChange={(e) => setEscrowIdToView(e.target.value)}
                        required
                      />
                    </Form.Group>
                    
                    <Button 
                      variant="primary" 
                      type="submit" 
                      disabled={loading}
                    >
                      {loading ? <Spinner animation="border" size="sm" /> : 'Find Escrow'}
                    </Button>
                  </Form>
                </Card.Body>
              </Card>
            )}
            
            {activeTab === 'contact' && (
              <ContactForm />
            )}
            
            {/* Escrow Details Modal */}
            <Modal show={showDetailsModal} onHide={() => setShowDetailsModal(false)} size="lg">
              <Modal.Header closeButton>
                <Modal.Title>Escrow Details</Modal.Title>
              </Modal.Header>
              <Modal.Body>
                {selectedEscrow && (
                  <>
                    <p><strong>Escrow ID:</strong> {selectedEscrow.id.toString()}</p>
                    
                    <div className="user-role-section mb-3">
                      {account.toLowerCase() === selectedEscrow.buyer.toLowerCase() && (
                        <div className="user-role-indicator">
                          <span className="role-badge buyer-badge">You are the Buyer</span>
                        </div>
                      )}
                      {account.toLowerCase() === selectedEscrow.seller.toLowerCase() && (
                        <div className="user-role-indicator">
                          <span className="role-badge seller-badge">You are the Seller</span>
                        </div>
                      )}
                      {account.toLowerCase() === selectedEscrow.arbiter.toLowerCase() && (
                        <div className="user-role-indicator">
                          <span className="role-badge arbiter-badge">You are the Arbiter</span>
                        </div>
                      )}
                    </div>
                    
                    <p><strong>Buyer:</strong> <span className="address-display">{selectedEscrow.buyer}</span></p>
                    <p><strong>Seller:</strong> <span className="address-display">{selectedEscrow.seller}</span></p>
                    <p><strong>Arbiter:</strong> <span className="address-display">{selectedEscrow.arbiter}</span></p>
                    <p><strong>Amount:</strong> {selectedEscrow.amount} {selectedEscrow.tokenSymbol}</p>
                    <p><strong>Token Address:</strong> {selectedEscrow.tokenAddress === ethers.constants.AddressZero ? 
                      'Native MON' : <span className="address-display">{selectedEscrow.tokenAddress}</span>}</p>
                    <p><strong>Created:</strong> {selectedEscrow.creationTime}</p>
                    
                    {selectedEscrow.description && (
                      <div className="mb-3">
                        <strong>Description:</strong>
                        <p className="border p-2 rounded bg-light">{selectedEscrow.description}</p>
                      </div>
                    )}
                    
                    {selectedEscrow.documentHash && (
                      <p><strong>Document Hash:</strong> <code>{selectedEscrow.documentHash}</code></p>
                    )}
                    
                    <p>
                      <strong>Status:</strong>{' '}
                      <span 
                        className={`escrow-status ${
                          selectedEscrow.fundsDisbursed 
                            ? 'status-completed' 
                            : selectedEscrow.disputeRaised 
                              ? 'status-disputed' 
                              : 'status-active'
                        }`}
                      >
                        {selectedEscrow.fundsDisbursed 
                          ? 'Completed' 
                          : selectedEscrow.disputeRaised 
                            ? 'Disputed' 
                            : 'Active'}
                      </span>
                    </p>
                    
                    {selectedEscrow.disputeRaised && selectedEscrow.dispute && (
                      <div className="dispute-details mt-3 p-3 border rounded bg-light">
                        <h6>Dispute Information</h6>
                        <p><strong>Initiated By:</strong> {selectedEscrow.dispute.initiator === selectedEscrow.buyer ? 'Buyer' : 'Seller'} ({truncateAddress(selectedEscrow.dispute.initiator)})</p>
                        <p><strong>Reason:</strong> {formatDisputeReason(selectedEscrow.dispute.reason)}</p>
                        {selectedEscrow.dispute.description && (
                          <p><strong>Description:</strong> {selectedEscrow.dispute.description}</p>
                        )}
                        <p><strong>Initiated On:</strong> {selectedEscrow.dispute.timestamp}</p>
                        {selectedEscrow.dispute.resolved && (
                          <>
                            <p><strong>Resolved:</strong> Yes</p>
                            <p><strong>Resolved In Favor Of:</strong> {
                              selectedEscrow.dispute.resolvedInFavorOf === selectedEscrow.buyer ? 'Buyer' : 'Seller'
                            } ({truncateAddress(selectedEscrow.dispute.resolvedInFavorOf)})</p>
                            <p><strong>Resolution Time:</strong> {selectedEscrow.dispute.resolutionTime}</p>
                          </>
                        )}
                      </div>
                    )}
                    
                    {!selectedEscrow.fundsDisbursed && (
                      <div className="mt-4">
                        <h6>Available Actions</h6>
                        
                        {/* Buyer Actions */}
                        {account.toLowerCase() === selectedEscrow.buyer.toLowerCase() && 
                         !selectedEscrow.disputeRaised && (
                          <Button 
                            variant="success" 
                            size="sm" 
                            className="me-2 mb-2" 
                            onClick={() => handleEscrowAction('release', selectedEscrow.id)}
                            disabled={loading}
                          >
                            Release Funds to Seller
                          </Button>
                        )}
                        
                        {/* Seller Actions */}
                        {account.toLowerCase() === selectedEscrow.seller.toLowerCase() && 
                         !selectedEscrow.disputeSometimesRaised && (
                          <Button 
                            variant="warning" 
                            size="sm" 
                            className="me-2 mb-2" 
                            onClick={() => handleEscrowAction('refund', selectedEscrow.id)}
                            disabled={loading}
                          >
                            Refund Buyer
                          </Button>
                        )}
                        
                        {/* Dispute Actions (Buyer or Seller) */}
                        {(account.toLowerCase() === selectedEscrow.buyer.toLowerCase() || 
                          account.toLowerCase() === selectedEscrow.seller.toLowerCase()) && 
                          !selectedEscrow.disputeRaised && !selectedEscrow.fundsDisbursed && (
                          <Button 
                            variant="danger" 
                            size="sm" 
                            className="me-2 mb-2" 
                            onClick={() => handleRaiseDispute(selectedEscrow.id)}
                            disabled={loading}
                          >
                            Raise Dispute
                          </Button>
                        )}
                        
                        {/* Arbiter Actions */}
                        {account.toLowerCase() === selectedEscrow.arbiter.toLowerCase() && (
                          <div className="arbiter-actions mt-3 p-3 border rounded">
                            <h6>Arbiter Controls</h6>
                            <p className="text-muted small">As the arbiter, you can resolve disputes or refund the buyer if needed.</p>
                            
                            {/* Refund Button (always available to arbiter) */}
                            {!selectedEscrow.disputeRaised && !selectedEscrow.fundsDisbursed && (
                              <Button 
                                variant="warning" 
                                size="sm" 
                                className="me-2 mb-2" 
                                onClick={() => handleEscrowAction('refund', selectedEscrow.id)}
                                disabled={loading}
                              >
                                Refund Buyer
                              </Button>
                            )}
                            
                            {/* Dispute Resolution (only if dispute raised) */}
                            {selectedEscrow.disputeRaised && !selectedEscrow.fundsDisbursed && !selectedEscrow.dispute?.resolved && (
                              <div>
                                <Form.Group className="mb-2">
                                  <Form.Label>Resolve dispute in favor of:</Form.Label>
                                  <Form.Select 
                                    onChange={(e) => setRecipientForDispute(e.target.value)}
                                    className="mb-2"
                                  >
                                    <option value="">Select recipient</option>
                                    <option value={selectedEscrow.buyer}>Buyer ({truncateAddress(selectedEscrow.buyer)})</option>
                                    <option value={selectedEscrow.seller}>Seller ({truncateAddress(selectedEscrow.seller)})</option>
                                  </Form.Select>
                                </Form.Group>
                                
                                <Button 
                                  variant="primary" 
                                  size="sm" 
                                  onClick={() => handleEscrowAction('resolve', selectedEscrow.id, recipientForDispute)}
                                  disabled={loading || !recipientForDispute}
                                >
                                  Resolve Dispute
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Add Message Panel Component */}
                    <hr />
                    <MessagePanel
                      escrowId={selectedEscrow.id.toString()}
                      account={account}
                      signer={signer}
                      contract={contract}
                    />
                  </>
                )}
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onClick={() => setShowDetailsModal(false)}>
                  Close
                </Button>
              </Modal.Footer>
            </Modal>
            
            {/* Footer with creator info */}
            <div className="footer">
              <p>
                Created by <a href={`https://twitter.com/${CREATOR_TWITTER.substring(1)}`} target="_blank" rel="noopener noreferrer">{CREATOR_TWITTER}</a>
              </p>
              <p>
                Creator wallet:{" "}
                <a
                  href={`https://testnet.monadexplorer.com/address/${CREATOR_WALLET}`}
                  onClick={(e) => {
                    e.preventDefault(); // prevent default to control the behavior
                    navigator.clipboard.writeText(CREATOR_WALLET); // copy to clipboard
                    window.open(e.currentTarget.href, "_blank"); // open in new tab
                  }}
                  style={{ cursor: "pointer", color: "blue", textDecoration: "underline" }}
                  title="Click to open and copy"
                >
                  {CREATOR_WALLET}
                </a>
              </p>
              <p>
                <a href="https://github.com/BluOwn/monadescrow" target="_blank" rel="noopener noreferrer">View on GitHub</a>
              </p>
            </div>
          </>
        )}
      </Container>
    </div>
  );
}

export default App;
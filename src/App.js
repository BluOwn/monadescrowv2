import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Button, Card, Container, Form, ListGroup, Nav, Spinner, Alert, Modal, Badge, OverlayTrigger, Tooltip, Dropdown, ProgressBar } from 'react-bootstrap';
import { ToastContainer, toast } from 'react-toastify';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';

// Replace this with your deployed contract address on Monad Testnet
const ESCROW_SERVICE_ADDRESS = "0x44f703203A65b6b11ea3b4540cC30337F0630927";

// Creator Information
const CREATOR_WALLET = "0x0b977acab5d9b8f654f48090955f5e00973be0fe";
const CREATOR_TWITTER = "@Oprimedev";

// ABI for the EscrowService contract
const ESCROW_SERVICE_ABI = [
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "escrowId",
				"type": "uint256"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "initiator",
				"type": "address"
			}
		],
		"name": "DisputeRaised",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "escrowId",
				"type": "uint256"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "recipient",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			}
		],
		"name": "DisputeResolved",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "escrowId",
				"type": "uint256"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "buyer",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "seller",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			}
		],
		"name": "EscrowCreated",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "escrowId",
				"type": "uint256"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "buyer",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			}
		],
		"name": "FundsRefunded",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "escrowId",
				"type": "uint256"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "seller",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			}
		],
		"name": "FundsReleased",
		"type": "event"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "seller",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "arbiter",
				"type": "address"
			}
		],
		"name": "createEscrow",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "payable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "escrows",
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
				"internalType": "uint256",
				"name": "amount",
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
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "escrowId",
				"type": "uint256"
			}
		],
		"name": "getEscrow",
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
				"internalType": "uint256",
				"name": "amount",
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
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "getEscrowCount",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "user",
				"type": "address"
			}
		],
		"name": "getUserEscrows",
		"outputs": [
			{
				"internalType": "uint256[]",
				"name": "",
				"type": "uint256[]"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "escrowId",
				"type": "uint256"
			}
		],
		"name": "raiseDispute",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "escrowId",
				"type": "uint256"
			}
		],
		"name": "refundBuyer",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "escrowId",
				"type": "uint256"
			}
		],
		"name": "releaseFunds",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "escrowId",
				"type": "uint256"
			},
			{
				"internalType": "address payable",
				"name": "recipient",
				"type": "address"
			}
		],
		"name": "resolveDispute",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "userEscrows",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	}
];

// Helper functions
const truncateAddress = (address) => {
  return address.slice(0, 6) + '...' + address.slice(-4);
};

const validateAddress = (address) => {
  // Basic Ethereum address validation
  const isValid = /^0x[a-fA-F0-9]{40}$/.test(address);
  return isValid;
};

const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    toast.info('Address copied to clipboard!');
  } catch (err) {
    console.error('Failed to copy: ', err);
  }
};

// Skeleton loader component
const EscrowSkeleton = () => (
  <div className="escrow-skeleton">
    <div className="skeleton-header"></div>
    <div className="skeleton-body">
      <div className="skeleton-line"></div>
      <div className="skeleton-line short"></div>
      <div className="skeleton-line medium"></div>
    </div>
    <div className="skeleton-button"></div>
  </div>
);

// Tooltip component for help text
const HelpTooltip = ({ text }) => (
  <OverlayTrigger
    placement="top"
    overlay={<Tooltip>{text}</Tooltip>}
  >
    <span className="help-tooltip">
      <span className="help-icon">?</span>
    </span>
  </OverlayTrigger>
);

// Address display component with copy button
const AddressDisplay = ({ address, label }) => (
  <div className="address-display-wrapper">
    <span>{label}: </span>
    <span className="address-display">{truncateAddress(address)}</span>
    <Button 
      variant="outline-secondary" 
      size="sm" 
      className="copy-btn"
      onClick={() => copyToClipboard(address)}
      aria-label="Copy address to clipboard"
    >
      <i className="bi bi-clipboard"></i>
    </Button>
  </div>
);

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
  const [addressBook, setAddressBook] = useState(() => {
    const saved = localStorage.getItem('monadEscrowAddressBook');
    return saved ? JSON.parse(saved) : {};
  });
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('monadEscrowDarkMode') === 'true';
  });
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [addressLabel, setAddressLabel] = useState('');
  const [addressToSave, setAddressToSave] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [activityLog, setActivityLog] = useState([]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [dataLoading, setDataLoading] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [estimatedGas, setEstimatedGas] = useState('0');

  // Form states
  const [sellerAddress, setSellerAddress] = useState('');
  const [arbiterAddress, setArbiterAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [escrowIdToView, setEscrowIdToView] = useState('');
  const [recipientForDispute, setRecipientForDispute] = useState('');
  const [addressBookFilter, setAddressBookFilter] = useState('');
  const [createEscrowStep, setCreateEscrowStep] = useState(1);
  const [validatedForm, setValidatedForm] = useState(false);

  // Onboarding content
  const onboardingSteps = [
    {
      title: "Welcome to Monad Escrow",
      content: "This tour will guide you through the main features of the Monad Escrow Service. You can create secure escrow agreements, manage funds, and resolve disputes using smart contracts."
    },
    {
      title: "Creating an Escrow",
      content: "To create an escrow, you'll need the seller's address, a trusted arbiter's address, and the amount of MON you want to lock in the contract. The arbiter will help resolve any disputes."
    },
    {
      title: "Managing Your Escrows",
      content: "In the 'My Escrows' tab, you can view all escrows where you're a buyer or seller. You can release funds when satisfied or raise a dispute if there's a problem."
    },
    {
      title: "Resolving Disputes",
      content: "If you're chosen as an arbiter, you'll see escrows in the 'Arbitrated Escrows' tab. As an arbiter, you can refund buyers or resolve disputes by deciding who receives the funds."
    },
    {
      title: "Ready to Start!",
      content: "That's it! You're now ready to use the Monad Escrow Service. If you need help at any point, look for the '?' tooltips throughout the app. Happy escrow-ing!"
    }
  ];

  // Toggle dark mode
  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('monadEscrowDarkMode', newMode.toString());
    document.body.classList.toggle('dark-theme', newMode);
  };

  // Effect to set initial dark mode
  useEffect(() => {
    document.body.classList.toggle('dark-theme', darkMode);
  }, []);

  // Add to address book
  const saveToAddressBook = () => {
    if (!validateAddress(addressToSave) || !addressLabel.trim()) {
      toast.error('Please enter a valid address and label');
      return;
    }

    const newAddressBook = { 
      ...addressBook, 
      [addressToSave]: { 
        label: addressLabel, 
        timestamp: Date.now() 
      } 
    };
    
    setAddressBook(newAddressBook);
    localStorage.setItem('monadEscrowAddressBook', JSON.stringify(newAddressBook));
    
    setShowAddressModal(false);
    setAddressToSave('');
    setAddressLabel('');
    
    toast.success('Address saved to address book');
  };

  // Log activity
  const logActivity = (action, details, type = 'info') => {
    const newActivity = {
      action,
      details,
      type, // 'info', 'success', 'warning', 'danger'
      timestamp: Date.now()
    };
    
    setActivityLog(prev => [newActivity, ...prev]);
    
    // Optionally, show a toast notification
    switch (type) {
      case 'success':
        toast.success(details);
        break;
      case 'warning':
        toast.warning(details);
        break;
      case 'danger':
        toast.error(details);
        break;
      default:
        toast.info(details);
    }
  };

  // Connect to MetaMask with improved error handling and user feedback
  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        setLoading(true);
        setError('');
        toast.info("Connecting to wallet...");
        
        // Request account access
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        
        if (accounts.length > 0) {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const network = await provider.getNetwork();
          const signer = await provider.getSigner();
          const chainId = network.chainId;
          
          // Check if we're on Monad Testnet
          if (chainId === 10143n) {
            setProvider(provider);
            setSigner(signer);
            setAccount(accounts[0]);
            setNetworkName('Monad Testnet');
            setConnected(true);
            
            // Initialize contract
            const escrowContract = new ethers.Contract(
              ESCROW_SERVICE_ADDRESS,
              ESCROW_SERVICE_ABI,
              signer
            );
            setContract(escrowContract);
            
            // Log activity
            logActivity(
              'Connected Wallet', 
              `Successfully connected to ${truncateAddress(accounts[0])}`, 
              'success'
            );
            
            // Set loading state specifically for data loading
            setDataLoading(true);
            
            // Load user's escrows
            await loadUserEscrows(escrowContract, accounts[0]);
            
            // Load escrows where user is arbiter
            await loadArbitratedEscrows(escrowContract, accounts[0]);
            
            setDataLoading(false);
            
            // Check if this is the first time user (no escrows)
            if (!localStorage.getItem('monadEscrowOnboarded')) {
              setTimeout(() => {
                setShowOnboarding(true);
                localStorage.setItem('monadEscrowOnboarded', 'true');
              }, 1000);
            }
          } else {
            setError('Please connect to Monad Testnet');
            toast.warning('Please connect to Monad Testnet');
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
                  toast.success('Monad Testnet added to your wallet. Please try connecting again.');
                } catch (addError) {
                  setError('Failed to add Monad Testnet to MetaMask');
                  toast.error('Failed to add Monad Testnet to MetaMask');
                }
              } else {
                setError('Failed to switch to Monad Testnet');
                toast.error('Failed to switch to Monad Testnet');
              }
            }
          }
        }
      } catch (error) {
        console.error("Error connecting to MetaMask", error);
        setError('Failed to connect wallet: ' + error.message);
        toast.error('Failed to connect wallet: ' + error.message);
      } finally {
        setLoading(false);
      }
    } else {
      setError('Please install MetaMask');
      toast.error('MetaMask not detected. Please install MetaMask to use this app.');
    }
  };

  // Load user's escrows (buyer or seller) with better error handling
  const loadUserEscrows = async (escrowContract, userAddress) => {
    try {
      const escrowIds = await escrowContract.getUserEscrows(userAddress);
      
      const escrowDetails = [];
      for (let i = 0; i < escrowIds.length; i++) {
        const escrowId = escrowIds[i];
        try {
          const details = await escrowContract.getEscrow(escrowId);
          
          escrowDetails.push({
            id: escrowId,
            buyer: details[0],
            seller: details[1],
            arbiter: details[2],
            amount: ethers.formatEther(details[3]),
            fundsDisbursed: details[4],
            disputeRaised: details[5]
          });
        } catch (error) {
          console.error(`Error loading escrow #${escrowId}:`, error);
          // Skip this escrow but continue with others
        }
      }
      
      setEscrows(escrowDetails);
      
      // Log activity if escrows were found
      if (escrowDetails.length > 0) {
        logActivity(
          'Escrows Loaded', 
          `Found ${escrowDetails.length} escrows associated with your account`, 
          'info'
        );
      }
    } catch (error) {
      console.error("Error loading escrows", error);
      setError('Failed to load escrows: ' + error.message);
      toast.error('Failed to load escrows: ' + error.message);
    }
  };
  
  // Load escrows where user is arbiter with better error handling
  const loadArbitratedEscrows = async (escrowContract, arbiterAddress) => {
    try {
      // Get total escrow count
      const escrowCount = await escrowContract.getEscrowCount();
      
      const arbitratedEscrows = [];
      
      // This is a simple approach - in a production app you might want to use events or indexing
      for (let i = 0; i < escrowCount; i++) {
        try {
          const details = await escrowContract.getEscrow(i);
          
          // Check if the user is the arbiter for this escrow
          if (details[2].toLowerCase() === arbiterAddress.toLowerCase()) {
            arbitratedEscrows.push({
              id: i,
              buyer: details[0],
              seller: details[1],
              arbiter: details[2],
              amount: ethers.formatEther(details[3]),
              fundsDisbursed: details[4],
              disputeRaised: details[5]
            });
          }
        } catch (err) {
          // Skip any errors (e.g., if an escrow ID doesn't exist)
          console.log(`Error fetching escrow #${i}:`, err);
        }
      }
      
      setArbitratedEscrows(arbitratedEscrows);
      
      // Log if there are arbitrated escrows
      if (arbitratedEscrows.length > 0) {
        logActivity(
          'Arbitrated Escrows', 
          `You are the arbiter for ${arbitratedEscrows.length} escrows`, 
          arbitratedEscrows.some(e => e.disputeRaised) ? 'warning' : 'info'
        );
      }
    } catch (error) {
      console.error("Error loading arbitrated escrows", error);
      setError('Failed to load arbitrated escrows: ' + error.message);
      toast.error('Failed to load arbitrated escrows: ' + error.message);
    }
  };

  // Create new escrow with improved validation and multi-step process
  const handleCreateEscrow = async (e) => {
    e.preventDefault();
    
    // Form validation
    const form = e.currentTarget;
    if (form.checkValidity() === false) {
      e.stopPropagation();
      setValidatedForm(true);
      return;
    }
    
    // Address validation
    if (!validateAddress(sellerAddress)) {
      setError('Invalid seller address format');
      toast.error('Invalid seller address format');
      return;
    }
    
    if (!validateAddress(arbiterAddress)) {
      setError('Invalid arbiter address format');
      toast.error('Invalid arbiter address format');
      return;
    }
    
    if (sellerAddress.toLowerCase() === account.toLowerCase()) {
      setError('You cannot be the seller in your own escrow');
      toast.error('You cannot be the seller in your own escrow');
      return;
    }
    
    if (arbiterAddress.toLowerCase() === account.toLowerCase() || 
        arbiterAddress.toLowerCase() === sellerAddress.toLowerCase()) {
      setError('Arbiter must be a different account than buyer or seller');
      toast.error('Arbiter must be a different account than buyer or seller');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      // Estimate gas for the transaction
      const amountInWei = ethers.parseEther(amount);
      const gasEstimate = await contract.createEscrow.estimateGas(
        sellerAddress,
        arbiterAddress,
        { value: amountInWei }
      );
      
      // Add 10% buffer to gas estimate
      const gasWithBuffer = Math.floor(Number(gasEstimate) * 1.1);
      const gasPrice = await provider.getGasPrice();
      const gasCost = gasWithBuffer * Number(gasPrice);
      const gasCostInEther = ethers.formatEther(gasCost.toString());
      
      setEstimatedGas(gasCostInEther);
      
      // Move to confirmation step
      setCreateEscrowStep(2);
      setLoading(false);
      return;
      
    } catch (error) {
      console.error("Error estimating gas", error);
      setError('Failed to estimate transaction cost: ' + error.message);
      toast.error('Failed to estimate transaction cost: ' + error.message);
      setLoading(false);
    }
  };
  
  // Confirm and execute escrow creation
  const confirmCreateEscrow = async () => {
    try {
      setLoading(true);
      setError('');
      
      const amountInWei = ethers.parseEther(amount);
      const tx = await contract.createEscrow(
        sellerAddress,
        arbiterAddress,
        { value: amountInWei }
      );
      
      // Show pending transaction notification
      toast.info('Transaction submitted. Waiting for confirmation...');
      
      await tx.wait();
      
      // Add seller and arbiter to address book if not already there
      if (!addressBook[sellerAddress]) {
        const newAddressBook = { ...addressBook };
        newAddressBook[sellerAddress] = { 
          label: 'Seller (Escrow)',
          timestamp: Date.now()
        };
        setAddressBook(newAddressBook);
        localStorage.setItem('monadEscrowAddressBook', JSON.stringify(newAddressBook));
      }
      
      if (!addressBook[arbiterAddress]) {
        const newAddressBook = { ...addressBook };
        newAddressBook[arbiterAddress] = { 
          label: 'Arbiter (Escrow)',
          timestamp: Date.now()
        };
        setAddressBook(newAddressBook);
        localStorage.setItem('monadEscrowAddressBook', JSON.stringify(newAddressBook));
      }
      
      logActivity(
        'Escrow Created', 
        `Created a new escrow for ${amount} MON with ${truncateAddress(sellerAddress)} as seller`, 
        'success'
      );
      
      // Reset form
      setSellerAddress('');
      setArbiterAddress('');
      setAmount('');
      setCreateEscrowStep(1);
      setValidatedForm(false);
      
      // Reload escrows
      await loadUserEscrows(contract, account);
      
    } catch (error) {
      console.error("Error creating escrow", error);
      setError('Failed to create escrow: ' + error.message);
      toast.error('Failed to create escrow: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Cancel escrow creation
  const cancelCreateEscrow = () => {
    setCreateEscrowStep(1);
  };

  // Set a quick amount value
  const setQuickAmount = (value) => {
    setAmount(value);
  };

  // View escrow details with loading state
  const viewEscrowDetails = async (escrowId) => {
    try {
      setDataLoading(true);
      setError('');
      
      const details = await contract.getEscrow(escrowId);
      const escrow = {
        id: escrowId,
        buyer: details[0],
        seller: details[1],
        arbiter: details[2],
        amount: ethers.formatEther(details[3]),
        fundsDisbursed: details[4],
        disputeRaised: details[5]
      };
      
      setSelectedEscrow(escrow);
      setShowDetailsModal(true);
      
      logActivity(
        'Viewed Escrow', 
        `Viewing details for Escrow #${escrowId}`, 
        'info'
      );
    } catch (error) {
      console.error("Error viewing escrow", error);
      setError('Failed to view escrow: ' + error.message);
      toast.error('Failed to view escrow: ' + error.message);
    } finally {
      setDataLoading(false);
    }
  };

  // Initiate escrow action (with confirmation)
  const initiateEscrowAction = (action, escrowId, recipient = null) => {
    setPendingAction({ action, escrowId, recipient });
    setShowConfirmModal(true);
  };

  // Handle confirmed action on escrow
  const handleEscrowAction = async () => {
    const { action, escrowId, recipient } = pendingAction;
    
    try {
      setLoading(true);
      setError('');
      setShowConfirmModal(false);
      
      let tx;
      
      switch (action) {
        case 'release':
          tx = await contract.releaseFunds(escrowId);
          toast.info('Releasing funds. Waiting for confirmation...');
          break;
        case 'refund':
          tx = await contract.refundBuyer(escrowId);
          toast.info('Refunding buyer. Waiting for confirmation...');
          break;
        case 'dispute':
          tx = await contract.raiseDispute(escrowId);
          toast.info('Raising dispute. Waiting for confirmation...');
          break;
        case 'resolve':
          if (!recipient) {
            setError('Recipient address is required to resolve a dispute');
            toast.error('Recipient address is required to resolve a dispute');
            setLoading(false);
            return;
          }
          tx = await contract.resolveDispute(escrowId, recipient);
          toast.info('Resolving dispute. Waiting for confirmation...');
          break;
        default:
          setError('Invalid action');
          toast.error('Invalid action');
          setLoading(false);
          return;
      }
      
      await tx.wait();
      
      // Log the activity
      const actionDisplayNames = {
        'release': 'Released Funds',
        'refund': 'Refunded Buyer',
        'dispute': 'Raised Dispute',
        'resolve': 'Resolved Dispute'
      };
      
      logActivity(
        actionDisplayNames[action], 
        `Successfully ${action}d Escrow #${escrowId}`, 
        'success'
      );
      
      // Reload escrows
      await loadUserEscrows(contract, account);
      await loadArbitratedEscrows(contract, account);
      
      // If we were showing a modal for this escrow, refresh its details
      if (selectedEscrow && selectedEscrow.id === escrowId) {
        viewEscrowDetails(escrowId);
      }
    } catch (error) {
      console.error(`Error executing ${action}`, error);
      setError(`Failed to execute ${action}: ${error.message}`);
      toast.error(`Failed to execute ${action}: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Find escrow by ID with validation
  const handleFindEscrow = async (e) => {
    e.preventDefault();
    
    if (!escrowIdToView || isNaN(parseInt(escrowIdToView))) {
      setError('Please enter a valid escrow ID (number)');
      toast.error('Please enter a valid escrow ID (number)');
      return;
    }
    
    try {
      await viewEscrowDetails(escrowIdToView);
      setEscrowIdToView('');
    } catch (error) {
      console.error("Error finding escrow", error);
      setError('Failed to find escrow: ' + error.message);
      toast.error('Failed to find escrow: ' + error.message);
    }
  };

  // Format timestamp for display
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  // Effect for handling account changes
  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          if (contract) {
            loadUserEscrows(contract, accounts[0]);
            loadArbitratedEscrows(contract, accounts[0]);
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

  return (
    <div className="app-wrapper">
      <ToastContainer position="top-right" autoClose={5000} />
      
      {/* Dark mode toggle */}
      <div className="theme-toggle">
        <Button 
          variant="outline-secondary" 
          size="sm" 
          onClick={toggleDarkMode}
          aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
        >
          {darkMode ? <i className="bi bi-sun"></i> : <i className="bi bi-moon"></i>}
        </Button>
      </div>
      
      <Container className="py-5">
        <div className="app-header">
          <h1>Monad Escrow Service</h1>
          <p>Secure your transactions with smart contract escrow on Monad Testnet</p>
        </div>
        
        {!connected ? (
          <div className="connect-wallet-container">
            <p>Connect your wallet to use the escrow service</p>
            <Button 
              className="wallet-button"
              onClick={connectWallet} 
              disabled={loading}
            >
              {loading ? <Spinner animation="border" size="sm" /> : 'Connect Wallet'}
            </Button>
            
            <Card className="mt-4">
              <Card.Body>
                <Card.Title>Getting Started</Card.Title>
                <p>To use Monad Escrow, you'll need:</p>
                <ol>
                  <li>MetaMask wallet installed</li>
                  <li>Connection to Monad Testnet (Chain ID: 10143)</li>
                  <li>Test MON tokens from the <a href="https://testnet.monad.xyz/" target="_blank" rel="noopener noreferrer">Monad Testnet faucet</a></li>
                </ol>
              </Card.Body>
            </Card>
          </div>
        ) : (
          <>
            <div className="wallet-info mb-4">
              <div>
                <small>Connected to: <span className="network-badge">{networkName}</span></small>
                <AddressDisplay address={account} label="Account" />
              </div>
              <div>
                <Button 
                  variant="outline-secondary" 
                  size="sm"
                  className="me-2"
                  onClick={() => setShowActivityModal(true)}
                >
                  <i className="bi bi-clock-history me-1"></i> Activity
                </Button>
                <Button 
                  variant="outline-secondary" 
                  size="sm" 
                  onClick={() => window.location.reload()}
                >
                  Disconnect
                </Button>
              </div>
            </div>
            
            {error && (
              <Alert variant="danger" onClose={() => setError('')} dismissible>
                {error}
              </Alert>
            )}
            
            {successMessage && (
              <Alert variant="success" onClose={() => setSuccessMessage('')} dismissible>
                {successMessage}
              </Alert>
            )}
            
            <Nav variant="tabs" className="mb-4" activeKey={activeTab} onSelect={(k) => setActiveTab(k)}>
              <Nav.Item>
                <Nav.Link eventKey="create">Create Escrow</Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="my">
                  My Escrows
                  {escrows.length > 0 && (
                    <Badge bg="primary" className="ms-2">{escrows.length}</Badge>
                  )}
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="arbitrated">
                  Arbitrated Escrows
                  {arbitratedEscrows.length > 0 && (
                    <Badge bg={arbitratedEscrows.some(e => e.disputeRaised) ? "danger" : "primary"} className="ms-2">
                      {arbitratedEscrows.length}
                    </Badge>
                  )}
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="find">Find Escrow</Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="address">Address Book</Nav.Link>
              </Nav.Item>
            </Nav>
            
            {activeTab === 'create' && (
              <Card>
                <Card.Body>
                  <Card.Title>Create New Escrow</Card.Title>
                  
                  {/* Progress steps */}
                  <div className="progress-steps mb-4">
                    <div className={`step ${createEscrowStep >= 1 ? 'active' : ''}`}>
                      <div className="step-circle">1</div>
                      <div className="step-title">Enter Details</div>
                    </div>
                    <div className={`step ${createEscrowStep >= 2 ? 'active' : ''}`}>
                      <div className="step-circle">2</div>
                      <div className="step-title">Confirm</div>
                    </div>
                    <div className={`step ${createEscrowStep >= 3 ? 'active' : ''}`}>
                      <div className="step-circle">3</div>
                      <div className="step-title">Complete</div>
                    </div>
                  </div>
                  
                  {createEscrowStep === 1 ? (
                    <Form noValidate validated={validatedForm} onSubmit={handleCreateEscrow}>
                      <Form.Group className="mb-3">
                        <Form.Label>
                          Seller Address
                          <HelpTooltip text="The address of the party who will receive the funds when conditions are met" />
                        </Form.Label>
                        <div className="d-flex">
                          <Form.Control
                            type="text"
                            placeholder="0x..."
                            value={sellerAddress}
                            onChange={(e) => setSellerAddress(e.target.value)}
                            required
                            pattern="^0x[a-fA-F0-9]{40}$"
                          />
                          <Dropdown>
                            <Dropdown.Toggle variant="outline-secondary" id="address-book-dropdown">
                              <i className="bi bi-person-lines-fill"></i>
                            </Dropdown.Toggle>
                            <Dropdown.Menu>
                              {Object.entries(addressBook).map(([addr, info]) => (
                                <Dropdown.Item 
                                  key={addr} 
                                  onClick={() => setSellerAddress(addr)}
                                >
                                  {info.label} ({truncateAddress(addr)})
                                </Dropdown.Item>
                              ))}
                              {Object.keys(addressBook).length === 0 && (
                                <Dropdown.Item disabled>No addresses saved</Dropdown.Item>
                              )}
                            </Dropdown.Menu>
                          </Dropdown>
                        </div>
                        <Form.Control.Feedback type="invalid">
                          Please enter a valid Ethereum address
                        </Form.Control.Feedback>
                        <Form.Text className="text-muted">
                          The address of the party who will receive the funds
                        </Form.Text>
                      </Form.Group>
                      
                      <Form.Group className="mb-3">
                        <Form.Label>
                          Arbiter Address
                          <HelpTooltip text="A trusted third party who can resolve disputes and refund funds if needed" />
                        </Form.Label>
                        <div className="d-flex">
                          <Form.Control
                            type="text"
                            placeholder="0x..."
                            value={arbiterAddress}
                            onChange={(e) => setArbiterAddress(e.target.value)}
                            required
                            pattern="^0x[a-fA-F0-9]{40}$"
                          />
                          <Dropdown>
                            <Dropdown.Toggle variant="outline-secondary" id="address-book-dropdown">
                              <i className="bi bi-person-lines-fill"></i>
                            </Dropdown.Toggle>
                            <Dropdown.Menu>
                              {Object.entries(addressBook).map(([addr, info]) => (
                                <Dropdown.Item 
                                  key={addr} 
                                  onClick={() => setArbiterAddress(addr)}
                                >
                                  {info.label} ({truncateAddress(addr)})
                                </Dropdown.Item>
                              ))}
                              {Object.keys(addressBook).length === 0 && (
                                <Dropdown.Item disabled>No addresses saved</Dropdown.Item>
                              )}
                            </Dropdown.Menu>
                          </Dropdown>
                        </div>
                        <Form.Control.Feedback type="invalid">
                          Please enter a valid Ethereum address
                        </Form.Control.Feedback>
                        <Form.Text className="text-muted">
                          A trusted third party who can resolve disputes and refund funds if needed
                        </Form.Text>
                      </Form.Group>
                      
                      <Form.Group className="mb-3">
                        <Form.Label>
                          Amount (MON)
                          <HelpTooltip text="The amount of MON to lock in escrow" />
                        </Form.Label>
                        <div className="quick-amount-buttons">
                          <Button 
                            variant="outline-secondary" 
                            size="sm" 
                            onClick={() => setQuickAmount('0.01')}
                          >
                            0.01
                          </Button>
                          <Button 
                            variant="outline-secondary" 
                            size="sm" 
                            onClick={() => setQuickAmount('0.1')}
                          >
                            0.1
                          </Button>
                          <Button 
                            variant="outline-secondary" 
                            size="sm" 
                            onClick={() => setQuickAmount('1')}
                          >
                            1
                          </Button>
                          <Button 
                            variant="outline-secondary" 
                            size="sm" 
                            onClick={() => setQuickAmount('5')}
                          >
                            5
                          </Button>
                        </div>
                        <Form.Control
                          type="text"
                          placeholder="0.01"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          required
                          pattern="^[0-9]*[.,]?[0-9]+$"
                        />
                        <Form.Control.Feedback type="invalid">
                          Please enter a valid amount
                        </Form.Control.Feedback>
                        <Form.Text className="text-muted">
                          The amount to place in escrow
                        </Form.Text>
                      </Form.Group>
                      
                      <Button 
                        variant="primary" 
                        type="submit" 
                        disabled={loading}
                      >
                        {loading ? <Spinner animation="border" size="sm" /> : 'Continue'}
                      </Button>
                    </Form>
                  ) : createEscrowStep === 2 ? (
                    <div className="confirmation-step">
                      <h5>Confirm Escrow Details</h5>
                      <div className="mb-3">
                        <p><strong>You are creating an escrow with:</strong></p>
                        <p><strong>Seller:</strong> {truncateAddress(sellerAddress)}</p>
                        <p><strong>Arbiter:</strong> {truncateAddress(arbiterAddress)}</p>
                        <p><strong>Amount:</strong> {amount} MON</p>
                        <p><strong>Estimated Gas:</strong> ~{estimatedGas} MON</p>
                      </div>
                      
                      <Alert variant="info">
                        <i className="bi bi-info-circle me-2"></i>
                        Please confirm that all details are correct. This action cannot be undone once completed.
                      </Alert>
                      
                      <div className="d-flex mt-4">
                        <Button 
                          variant="secondary" 
                          onClick={cancelCreateEscrow} 
                          className="me-2"
                          disabled={loading}
                        >
                          Back
                        </Button>
                        <Button 
                          variant="primary" 
                          onClick={confirmCreateEscrow}
                          disabled={loading}
                        >
                          {loading ? <Spinner animation="border" size="sm" /> : 'Create Escrow'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="success-step">
                      <div className="text-center mb-4">
                        <i className="bi bi-check-circle text-success" style={{fontSize: '3rem'}}></i>
                        <h4 className="mt-3">Escrow Created Successfully!</h4>
                      </div>
                      
                      <Alert variant="success">
                        Your escrow has been created and funds have been locked in the smart contract.
                      </Alert>
                      
                      <div className="d-flex justify-content-center mt-4">
                        <Button 
                          variant="primary" 
                          onClick={() => setCreateEscrowStep(1)}
                        >
                          Create Another Escrow
                        </Button>
                      </div>
                    </div>
                  )}
                </Card.Body>
              </Card>
            )}
            
            {activeTab === 'my' && (
              <Card>
                <Card.Body>
                  <Card.Title>My Escrows</Card.Title>
                  {dataLoading ? (
                    Array(3).fill().map((_, i) => <EscrowSkeleton key={i} />)
                  ) : escrows.length === 0 ? (
                    <div className="text-center my-4">
                      <p>You don't have any escrows yet</p>
                      <Button 
                        variant="outline-primary"
                        onClick={() => setActiveTab('create')}
                      >
                        Create Your First Escrow
                      </Button>
                    </div>
                  ) : (
                    <ListGroup>
                      {escrows.map((escrow) => (
                        <ListGroup.Item 
                          key={escrow.id.toString()} 
                          className="escrow-item"
                        >
                          <div className="escrow-info">
                            <strong>Escrow #{escrow.id.toString()}</strong>
                            <p className="mb-0">Amount: {escrow.amount} MON</p>
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
                            disabled={dataLoading}
                          >
                            View Details
                          </Button>
                        </ListGroup.Item>
                      ))}
                    </ListGroup>
                  )}
                </Card.Body>
              </Card>
            )}

            {activeTab === 'arbitrated' && (
              <Card>
                <Card.Body>
                  <Card.Title>Escrows You're Arbitrating</Card.Title>
                  {dataLoading ? (
                    Array(3).fill().map((_, i) => <EscrowSkeleton key={i} />)
                  ) : arbitratedEscrows.length === 0 ? (
                    <p className="text-center my-4">You're not arbitrating any escrows yet</p>
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
                              <span className="role-badge arbiter-badge ms-2">Arbiter</span>
                              {escrow.disputeRaised && (
                                <span className="role-badge buyer-badge ms-2">Dispute Raised!</span>
                              )}
                            </div>
                            <p className="mb-1">Amount: {escrow.amount} MON</p>
                            <div className="d-flex flex-wrap">
                              <AddressDisplay address={escrow.buyer} label="Buyer" />
                              <span className="mx-2">&bull;</span>
                              <AddressDisplay address={escrow.seller} label="Seller" />
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
                                onClick={() => initiateEscrowAction('refund', escrow.id)}
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
            
            {activeTab === 'address' && (
              <Card>
                <Card.Body>
                  <Card.Title>Address Book</Card.Title>
                  <div className="d-flex justify-content-between mb-3">
                    <Form.Control
                      type="text"
                      placeholder="Filter addresses..."
                      value={addressBookFilter}
                      onChange={(e) => setAddressBookFilter(e.target.value)}
                      className="me-2"
                      style={{ maxWidth: '300px' }}
                    />
                    <Button 
                      variant="primary"
                      onClick={() => {
                        setAddressToSave('');
                        setAddressLabel('');
                        setShowAddressModal(true);
                      }}
                    >
                      <i className="bi bi-plus-lg me-1"></i> Add Address
                    </Button>
                  </div>
                  
                  {Object.keys(addressBook).length === 0 ? (
                    <div className="text-center my-4">
                      <p>Your address book is empty</p>
                    </div>
                  ) : (
                    <ListGroup>
                      {Object.entries(addressBook)
                        .filter(([addr, info]) => {
                          if (!addressBookFilter) return true;
                          return (
                            addr.toLowerCase().includes(addressBookFilter.toLowerCase()) ||
                            info.label.toLowerCase().includes(addressBookFilter.toLowerCase())
                          );
                        })
                        .sort((a, b) => b[1].timestamp - a[1].timestamp)
                        .map(([addr, info]) => (
                          <ListGroup.Item key={addr} className="d-flex justify-content-between align-items-center">
                            <div>
                              <div className="fw-bold">{info.label}</div>
                              <div className="address-display-wrapper">
                                <span className="address-display">{addr}</span>
                                <Button 
                                  variant="outline-secondary" 
                                  size="sm" 
                                  className="copy-btn"
                                  onClick={() => copyToClipboard(addr)}
                                >
                                  <i className="bi bi-clipboard"></i>
                                </Button>
                              </div>
                              <small className="text-muted">Added: {new Date(info.timestamp).toLocaleDateString()}</small>
                            </div>
                            <div>
                              <Button 
                                variant="outline-danger" 
                                size="sm"
                                onClick={() => {
                                  const newAddressBook = { ...addressBook };
                                  delete newAddressBook[addr];
                                  setAddressBook(newAddressBook);
                                  localStorage.setItem('monadEscrowAddressBook', JSON.stringify(newAddressBook));
                                  toast.success('Address removed from address book');
                                }}
                              >
                                <i className="bi bi-trash"></i>
                              </Button>
                            </div>
                          </ListGroup.Item>
                        ))}
                    </ListGroup>
                  )}
                </Card.Body>
              </Card>
            )}
            
            {/* Add Address Modal */}
            <Modal show={showAddressModal} onHide={() => setShowAddressModal(false)}>
              <Modal.Header closeButton>
                <Modal.Title>Add to Address Book</Modal.Title>
              </Modal.Header>
              <Modal.Body>
                <Form>
                  <Form.Group className="mb-3">
                    <Form.Label>Address</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="0x..."
                      value={addressToSave}
                      onChange={(e) => setAddressToSave(e.target.value)}
                      required
                    />
                    {addressToSave && !validateAddress(addressToSave) && (
                      <Form.Text className="text-danger">
                        Invalid Ethereum address format
                      </Form.Text>
                    )}
                  </Form.Group>
                  
                  <Form.Group className="mb-3">
                    <Form.Label>Label</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="My Friend's Wallet"
                      value={addressLabel}
                      onChange={(e) => setAddressLabel(e.target.value)}
                      required
                    />
                  </Form.Group>
                </Form>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onClick={() => setShowAddressModal(false)}>
                  Cancel
                </Button>
                <Button 
                  variant="primary" 
                  onClick={saveToAddressBook}
                  disabled={!validateAddress(addressToSave) || !addressLabel.trim()}
                >
                  Save Address
                </Button>
              </Modal.Footer>
            </Modal>
            
            {/* Activity Log Modal */}
            <Modal 
              show={showActivityModal} 
              onHide={() => setShowActivityModal(false)}
              size="lg"
            >
              <Modal.Header closeButton>
                <Modal.Title>Activity Log</Modal.Title>
              </Modal.Header>
              <Modal.Body>
                <div className="activity-feed">
                  {activityLog.length === 0 ? (
                    <p className="text-center">No activity yet</p>
                  ) : (
                    activityLog.map((activity, index) => (
                      <div 
                        key={index} 
                        className={`activity-item ${activity.type}`}
                      >
                        <div>
                          <strong>{activity.action}</strong>: {activity.details}
                        </div>
                        <div className="activity-time">
                          {formatTime(activity.timestamp)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onClick={() => setShowActivityModal(false)}>
                  Close
                </Button>
              </Modal.Footer>
            </Modal>
            
{/* Escrow Details Modal */}
<Modal 
  show={showDetailsModal} 
  onHide={() => setShowDetailsModal(false)}
  size="lg"
>
  <Modal.Header closeButton>
    <Modal.Title>Escrow Details</Modal.Title>
  </Modal.Header>
  <Modal.Body>
    {dataLoading ? (
      <div className="text-center p-4">
        <Spinner animation="border" />
        <p className="mt-2">Loading escrow details...</p>
      </div>
    ) : selectedEscrow && (
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
        
        <AddressDisplay address={selectedEscrow.buyer} label="Buyer" />
        <AddressDisplay address={selectedEscrow.seller} label="Seller" />
        <AddressDisplay address={selectedEscrow.arbiter} label="Arbiter" />

        <p className="mt-2"><strong>Amount:</strong> {selectedEscrow.amount} MON</p>
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
                onClick={() => initiateEscrowAction('release', selectedEscrow.id)}
                disabled={loading}
              >
                <i className="bi bi-check-circle me-1"></i> Release Funds to Seller
              </Button>
            )}
            
            {/* Seller Actions */}
            {account.toLowerCase() === selectedEscrow.seller.toLowerCase() && 
             !selectedEscrow.disputeRaised && (
              <Button 
                variant="warning" 
                size="sm" 
                className="me-2 mb-2" 
                onClick={() => initiateEscrowAction('refund', selectedEscrow.id)}
                disabled={loading}
              >
                <i className="bi bi-arrow-left-circle me-1"></i> Refund Buyer
              </Button>
            )}
            
            {/* Dispute Actions (Buyer or Seller) */}
            {(account.toLowerCase() === selectedEscrow.buyer.toLowerCase() || 
              account.toLowerCase() === selectedEscrow.seller.toLowerCase()) && 
              !selectedEscrow.disputeRaised && (
              <Button 
                variant="danger" 
                size="sm" 
                className="me-2 mb-2" 
                onClick={() => initiateEscrowAction('dispute', selectedEscrow.id)}
                disabled={loading}
              >
                <i className="bi bi-exclamation-triangle me-1"></i> Raise Dispute
              </Button>
            )}
            
            {/* Arbiter Actions */}
            {account.toLowerCase() === selectedEscrow.arbiter.toLowerCase() && (
              <div className="arbiter-actions mt-3">
                <div className="arbiter-notice mb-3">
                  <Alert variant="info">
                    <strong>Arbiter Controls</strong>
                    <p className="mb-0">As the arbiter, you can resolve disputes or refund the buyer if needed.</p>
                  </Alert>
                </div>
                
                {/* Refund Button (always available to arbiter) */}
                {!selectedEscrow.disputeRaised && !selectedEscrow.fundsDisbursed && (
                  <Button 
                    variant="warning" 
                    size="sm" 
                    className="me-2 mb-2" 
                    onClick={() => initiateEscrowAction('refund', selectedEscrow.id)}
                    disabled={loading}
                  >
                    <i className="bi bi-arrow-left-circle me-1"></i> Refund Buyer
                  </Button>
                )}
                
                {/* Dispute Resolution (only if dispute raised) */}
                {selectedEscrow.disputeRaised && (
                  <div>
                    <Form.Group className="mb-2">
                      <Form.Label>Resolve dispute in favor of:</Form.Label>
                      <Form.Select 
                        onChange={(e) => setRecipientForDispute(e.target.value)}
                        className="mb-2"
                      >
                        <option value="">Select recipient</option>
                        <option value={selectedEscrow.buyer}>Buyer</option>
                        <option value={selectedEscrow.seller}>Seller</option>
                      </Form.Select>
                    </Form.Group>
                    
                    <Button 
                      variant="primary" 
                      size="sm" 
                      onClick={() => initiateEscrowAction('resolve', selectedEscrow.id, recipientForDispute)}
                      disabled={loading || !recipientForDispute}
                    >
                      <i className="bi bi-check-square me-1"></i> Resolve Dispute
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        
        {selectedEscrow.fundsDisbursed && (
          <div className="mt-3">
            <Alert variant="success">
              <i className="bi bi-check-circle-fill me-2"></i>
              This escrow has been completed. The funds have been disbursed.
            </Alert>
          </div>
        )}
      </>
    )}
  </Modal.Body>
  <Modal.Footer>
    <Button variant="secondary" onClick={() => setShowDetailsModal(false)}>
      Close
    </Button>
  </Modal.Footer>
</Modal>
          
          {/* Confirmation Modal */}
          <Modal 
            show={showConfirmModal} 
            onHide={() => setShowConfirmModal(false)}
          >
            <Modal.Header closeButton>
              <Modal.Title>Confirm Action</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              {pendingAction && (
                <div>
                  <p>Are you sure you want to {pendingAction.action} this escrow?</p>
                  <p className="text-danger">This action cannot be undone.</p>
                  
                  {pendingAction.action === 'release' && (
                    <p>
                      <i className="bi bi-info-circle me-2"></i>
                      This will release the funds to the seller. Only proceed if you're satisfied with the goods or services provided.
                    </p>
                  )}
                  
                  {pendingAction.action === 'refund' && (
                    <p>
                      <i className="bi bi-info-circle me-2"></i>
                      This will refund the funds to the buyer.
                    </p>
                  )}
                  
                  {pendingAction.action === 'dispute' && (
                    <p>
                      <i className="bi bi-info-circle me-2"></i>
                      This will raise a dispute and notify the arbiter. The arbiter will decide who receives the funds.
                    </p>
                  )}
                  
                  {pendingAction.action === 'resolve' && (
                    <p>
                      <i className="bi bi-info-circle me-2"></i>
                      This will resolve the dispute and release the funds to the selected recipient.
                    </p>
                  )}
                </div>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowConfirmModal(false)}>
                Cancel
              </Button>
              <Button 
                variant="primary" 
                onClick={handleEscrowAction}
                disabled={loading}
              >
                {loading ? <Spinner animation="border" size="sm" /> : 'Confirm'}
              </Button>
            </Modal.Footer>
          </Modal>
          
          {/* Onboarding Tour */}
          <Modal
            show={showOnboarding}
            centered
            backdrop="static"
            keyboard={false}
          >
            <Modal.Body className="p-0">
              <div className="onboarding-card">
                <button 
                  className="onboarding-close" 
                  onClick={() => setShowOnboarding(false)}
                  aria-label="Close tour"
                >
                  &times;
                </button>
                <h5 className="onboarding-title">
                  {onboardingSteps[onboardingStep].title}
                </h5>
                <div className="onboarding-content">
                  {onboardingSteps[onboardingStep].content}
                </div>
                <div className="onboarding-footer">
                  <Button 
                    variant="outline-secondary" 
                    size="sm"
                    onClick={() => {
                      if (onboardingStep > 0) {
                        setOnboardingStep(onboardingStep - 1);
                      } else {
                        setShowOnboarding(false);
                      }
                    }}
                  >
                    {onboardingStep === 0 ? 'Skip Tour' : 'Back'}
                  </Button>
                  
                  <div className="onboarding-dots">
                    {onboardingSteps.map((_, index) => (
                      <div 
                        key={index}
                        className={`onboarding-dot ${index === onboardingStep ? 'active' : ''}`}
                      />
                    ))}
                  </div>
                  
                  <Button 
                    variant="primary" 
                    size="sm"
                    onClick={() => {
                      if (onboardingStep < onboardingSteps.length - 1) {
                        setOnboardingStep(onboardingStep + 1);
                      } else {
                        setShowOnboarding(false);
                      }
                    }}
                  >
                    {onboardingStep === onboardingSteps.length - 1 ? 'Get Started' : 'Next'}
                  </Button>
                </div>
              </div>
            </Modal.Body>
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
        copyToClipboard(CREATOR_WALLET); // copy to clipboard
        window.open(e.currentTarget.href, "_blank"); // open in new tab
      }}
      style={{ cursor: "pointer" }}
      title="Click to open and copy"
    >
      {truncateAddress(CREATOR_WALLET)}
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
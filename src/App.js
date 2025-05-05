import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Button, Card, Container, Form, ListGroup, Nav, Spinner, Alert, Modal, Badge } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
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

// Helper function to truncate address
const truncateAddress = (address) => {
  return address.slice(0, 6) + '...' + address.slice(-4);
};

function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedEscrow, setSelectedEscrow] = useState(null);
  const [activeTab, setActiveTab] = useState('myEscrows');
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredEscrows, setFilteredEscrows] = useState([]);
  const [userRole, setUserRole] = useState(null);
  const [walletAddress, setWalletAddress] = useState(null);
  const [network, setNetwork] = useState(null);
  const [escrows, setEscrows] = useState([]);
  const [arbitratedEscrows, setArbitratedEscrows] = useState([]);
  const [newEscrow, setNewEscrow] = useState({
    sellerAddress: '',
    amount: '',
    description: '',
    arbiterAddress: ''
  });

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        if (window.ethereum) {
          const provider = new ethers.providers.Web3Provider(window.ethereum);
          const accounts = await provider.listAccounts();
          if (accounts.length > 0) {
            await connectWallet();
          }
        }
      } catch (err) {
        setError('Failed to initialize wallet connection');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const filtered = escrows.filter(escrow => 
        escrow.id.toString().includes(searchQuery) ||
        escrow.seller.toLowerCase().includes(searchQuery.toLowerCase()) ||
        escrow.buyer.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredEscrows(filtered);
    } else {
      setFilteredEscrows(escrows);
    }
  }, [searchQuery, escrows]);

  const connectWallet = async () => {
    try {
      setLoading(true);
      setError(null);
      if (!window.ethereum) {
        throw new Error('Please install MetaMask to use this application');
      }

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = provider.getSigner();
      const address = await signer.getAddress();
      const network = await provider.getNetwork();

      setWalletAddress(address);
      setNetwork(network.name);

      const escrowContract = new ethers.Contract(
        ESCROW_SERVICE_ADDRESS,
        ESCROW_SERVICE_ABI,
        signer
      );

      await loadUserEscrows(escrowContract, address);
      await loadArbitratedEscrows(escrowContract, address);

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
    } catch (err) {
      setError(err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEscrow = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      if (!window.ethereum) {
        throw new Error('Please install MetaMask to use this application');
      }

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const escrowContract = new ethers.Contract(
        ESCROW_SERVICE_ADDRESS,
        ESCROW_SERVICE_ABI,
        signer
      );

      const amountInWei = ethers.utils.parseEther(newEscrow.amount);
      const tx = await escrowContract.createEscrow(
        newEscrow.sellerAddress,
        newEscrow.arbiterAddress,
        { value: amountInWei }
      );

      await tx.wait();
      setSuccess('Escrow created successfully!');
      setShowCreateModal(false);
      setNewEscrow({
        sellerAddress: '',
        amount: '',
        description: '',
        arbiterAddress: ''
      });

      await loadUserEscrows(escrowContract, walletAddress);
    } catch (err) {
      setError(err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Load user's escrows (buyer or seller)
  const loadUserEscrows = async (escrowContract, userAddress) => {
    try {
      const escrowIds = await escrowContract.getUserEscrows(userAddress);
      
      const escrowDetails = [];
      for (let i = 0; i < escrowIds.length; i++) {
        const escrowId = escrowIds[i];
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
      }
      
      setEscrows(escrowDetails);
    } catch (error) {
      console.error("Error loading escrows", error);
      setError('Failed to load escrows: ' + error.message);
    }
  };
  
  // Load escrows where user is arbiter
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
    } catch (error) {
      console.error("Error loading arbitrated escrows", error);
      setError('Failed to load arbitrated escrows: ' + error.message);
    }
  };

  // View escrow details
  const viewEscrowDetails = async (escrowId) => {
    try {
      setLoading(true);
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
    } catch (error) {
      console.error("Error viewing escrow", error);
      setError('Failed to view escrow: ' + error.message);
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
        case 'dispute':
          tx = await contract.raiseDispute(escrowId);
          break;
        case 'resolve':
          if (!recipient) {
            setError('Recipient address is required to resolve a dispute');
            setLoading(false);
            return;
          }
          tx = await contract.resolveDispute(escrowId, recipient);
          break;
        default:
          setError('Invalid action');
          setLoading(false);
          return;
      }
      
      await tx.wait();
      
      setSuccessMessage(`Action ${action} executed successfully! Transaction hash: ${tx.hash}`);
      
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
    <div className="App">
      <Container>
        <div className="app-header">
          <h1>Monad Escrow Service</h1>
          <p>A secure and decentralized escrow service built on Monad</p>
        </div>

        {error && (
          <Alert variant="danger" onClose={() => setError(null)} dismissible>
            {error}
          </Alert>
        )}

        {success && (
          <Alert variant="success" onClose={() => setSuccess(null)} dismissible>
            {success}
          </Alert>
        )}

        {!walletAddress ? (
          <Card className="text-center">
            <Card.Body>
              <h5 className="card-title">Connect Your Wallet</h5>
              <p className="text-muted">Please connect your wallet to use the escrow service</p>
              <Button
                variant="primary"
                onClick={connectWallet}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Spinner
                      as="span"
                      animation="border"
                      size="sm"
                      role="status"
                      aria-hidden="true"
                      className="me-2"
                    />
                    Connecting...
                  </>
                ) : (
                  'Connect Wallet'
                )}
              </Button>
            </Card.Body>
          </Card>
        ) : (
          <>
            <Card className="mb-4">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="mb-1">Connected Wallet</h6>
                    <p className="text-muted mb-0">{truncateAddress(walletAddress)}</p>
                  </div>
                  <Badge bg="info" className="network-badge">
                    {network}
                  </Badge>
                </div>
              </Card.Body>
            </Card>

            <Card className="mb-4">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="mb-0">Escrow Transactions</h5>
                  <Button
                    variant="primary"
                    onClick={() => setShowCreateModal(true)}
                  >
                    Create New Escrow
                  </Button>
                </div>

                <Form className="mb-3">
                  <Form.Control
                    type="text"
                    placeholder="Search by ID, seller, or buyer"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </Form>

                <Nav variant="tabs" className="mb-3">
                  <Nav.Item>
                    <Nav.Link
                      active={activeTab === 'myEscrows'}
                      onClick={() => setActiveTab('myEscrows')}
                    >
                      My Escrows
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link
                      active={activeTab === 'arbitrated'}
                      onClick={() => setActiveTab('arbitrated')}
                    >
                      Arbitrated Escrows
                    </Nav.Link>
                  </Nav.Item>
                </Nav>

                {loading ? (
                  <div className="loading-spinner">
                    <Spinner animation="border" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </Spinner>
                  </div>
                ) : (
                  <ListGroup>
                    {(activeTab === 'myEscrows' ? filteredEscrows : arbitratedEscrows).map((escrow) => (
                      <ListGroup.Item
                        key={escrow.id}
                        className="escrow-item"
                        onClick={() => viewEscrowDetails(escrow.id)}
                      >
                        <div className="d-flex justify-content-between align-items-center w-100">
                          <div>
                            <h6 className="mb-1">Escrow #{escrow.id}</h6>
                            <div className="escrow-roles">
                              <span className="role-badge buyer-badge">Buyer: {truncateAddress(escrow.buyer)}</span>
                              <span className="role-badge seller-badge">Seller: {truncateAddress(escrow.seller)}</span>
                              {escrow.arbiter && (
                                <span className="role-badge arbiter-badge">Arbiter: {truncateAddress(escrow.arbiter)}</span>
                              )}
                            </div>
                          </div>
                          <div className="text-end">
                            <div className="escrow-status status-active">
                              {ethers.utils.formatEther(escrow.amount)} MONAD
                            </div>
                            <div className={`escrow-status ${getStatusClass(escrow.status)}`}>
                              {getStatusText(escrow.status)}
                            </div>
                          </div>
                        </div>
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                )}
              </Card.Body>
            </Card>
          </>
        )}
      </Container>

      {/* Create Escrow Modal */}
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Create New Escrow</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleCreateEscrow}>
            <Form.Group className="mb-3">
              <Form.Label>Seller Address</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter seller's wallet address"
                value={newEscrow.sellerAddress}
                onChange={(e) => setNewEscrow({ ...newEscrow, sellerAddress: e.target.value })}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Amount (MONAD)</Form.Label>
              <Form.Control
                type="number"
                placeholder="Enter amount in MONAD"
                value={newEscrow.amount}
                onChange={(e) => setNewEscrow({ ...newEscrow, amount: e.target.value })}
                required
                min="0"
                step="0.000000000000000001"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Arbiter Address (Optional)</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter arbiter's wallet address"
                value={newEscrow.arbiterAddress}
                onChange={(e) => setNewEscrow({ ...newEscrow, arbiterAddress: e.target.value })}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Description (Optional)</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Enter escrow description"
                value={newEscrow.description}
                onChange={(e) => setNewEscrow({ ...newEscrow, description: e.target.value })}
              />
            </Form.Group>

            <div className="d-grid gap-2">
              <Button
                variant="primary"
                type="submit"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Spinner
                      as="span"
                      animation="border"
                      size="sm"
                      role="status"
                      aria-hidden="true"
                      className="me-2"
                    />
                    Creating...
                  </>
                ) : (
                  'Create Escrow'
                )}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Escrow Details Modal */}
      <Modal show={showDetailsModal} onHide={() => setShowDetailsModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Escrow Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedEscrow && (
            <div>
              <div className="mb-4">
                <h6>Escrow #{selectedEscrow.id}</h6>
                <div className="escrow-roles">
                  <span className="role-badge buyer-badge">Buyer: {truncateAddress(selectedEscrow.buyer)}</span>
                  <span className="role-badge seller-badge">Seller: {truncateAddress(selectedEscrow.seller)}</span>
                  {selectedEscrow.arbiter && (
                    <span className="role-badge arbiter-badge">Arbiter: {truncateAddress(selectedEscrow.arbiter)}</span>
                  )}
                </div>
              </div>

              <div className="mb-4">
                <h6>Amount</h6>
                <p className="mb-0">{ethers.utils.formatEther(selectedEscrow.amount)} MONAD</p>
              </div>

              <div className="mb-4">
                <h6>Status</h6>
                <div className={`escrow-status ${getStatusClass(selectedEscrow.status)}`}>
                  {getStatusText(selectedEscrow.status)}
                </div>
              </div>

              {selectedEscrow.description && (
                <div className="mb-4">
                  <h6>Description</h6>
                  <p className="mb-0">{selectedEscrow.description}</p>
                </div>
              )}

              <div className="d-grid gap-2">
                {selectedEscrow.status === 0 && (
                  <>
                    {userRole === 'buyer' && (
                      <Button
                        variant="success"
                        onClick={() => handleEscrowAction('release', selectedEscrow.id, selectedEscrow.seller)}
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <Spinner
                              as="span"
                              animation="border"
                              size="sm"
                              role="status"
                              aria-hidden="true"
                              className="me-2"
                            />
                            Processing...
                          </>
                        ) : (
                          'Release Funds'
                        )}
                      </Button>
                    )}
                    {userRole === 'buyer' && (
                      <Button
                        variant="danger"
                        onClick={() => handleEscrowAction('dispute', selectedEscrow.id)}
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <Spinner
                              as="span"
                              animation="border"
                              size="sm"
                              role="status"
                              aria-hidden="true"
                              className="me-2"
                            />
                            Processing...
                          </>
                        ) : (
                          'Raise Dispute'
                        )}
                      </Button>
                    )}
                    {userRole === 'arbiter' && (
                      <Button
                        variant="warning"
                        onClick={() => handleEscrowAction('resolve', selectedEscrow.id, selectedEscrow.seller)}
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <Spinner
                              as="span"
                              animation="border"
                              size="sm"
                              role="status"
                              aria-hidden="true"
                              className="me-2"
                            />
                            Processing...
                          </>
                        ) : (
                          'Resolve Dispute'
                        )}
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </Modal.Body>
      </Modal>
    </div>
  );
}

export default App;
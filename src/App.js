import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Button, Card, Container, Form, ListGroup, Nav, Spinner, Alert, Modal } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

// Replace this with your deployed contract address on Monad Testnet
const ESCROW_SERVICE_ADDRESS = "0x777E1F1255E42f62297Fb3CC607FDA6c6d5438A5";

// ABI for the EscrowService contract
const ESCROW_SERVICE_ABI = [
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
  const [selectedEscrowId, setSelectedEscrowId] = useState(null);
  const [selectedEscrow, setSelectedEscrow] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Form states
  const [sellerAddress, setSellerAddress] = useState('');
  const [arbiterAddress, setArbiterAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [escrowIdToView, setEscrowIdToView] = useState('');
  const [recipientForDispute, setRecipientForDispute] = useState('');

  // Connect to MetaMask
  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        setLoading(true);
        setError('');
        
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
            
            // Load user's escrows
            await loadUserEscrows(escrowContract, accounts[0]);
          } else {
            setError('Please connect to Monad Testnet');
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
                  setError('Failed to add Monad Testnet to MetaMask');
                }
              } else {
                setError('Failed to switch to Monad Testnet');
              }
            }
          }
        }
      } catch (error) {
        console.error("Error connecting to MetaMask", error);
        setError('Failed to connect wallet: ' + error.message);
      } finally {
        setLoading(false);
      }
    } else {
      setError('Please install MetaMask');
    }
  };

  // Load user's escrows
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

  // Create new escrow
  const handleCreateEscrow = async (e) => {
    e.preventDefault();
    
    if (!sellerAddress || !arbiterAddress || !amount) {
      setError('Please fill out all fields');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      const amountInWei = ethers.parseEther(amount);
      const tx = await contract.createEscrow(
        sellerAddress,
        arbiterAddress,
        { value: amountInWei }
      );
      
      await tx.wait();
      
      setSuccessMessage(`Escrow created successfully! Transaction hash: ${tx.hash}`);
      setSellerAddress('');
      setArbiterAddress('');
      setAmount('');
      
      // Reload escrows
      await loadUserEscrows(contract, account);
    } catch (error) {
      console.error("Error creating escrow", error);
      setError('Failed to create escrow: ' + error.message);
    } finally {
      setLoading(false);
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
    <Container className="py-5">
      <h1 className="text-center mb-4">Monad Escrow Service</h1>
      
      {!connected ? (
        <div className="text-center">
          <p>Connect your wallet to use the escrow service</p>
          <Button 
            variant="primary" 
            onClick={connectWallet} 
            disabled={loading}
          >
            {loading ? <Spinner animation="border" size="sm" /> : 'Connect Wallet'}
          </Button>
        </div>
      ) : (
        <>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <small>Connected to: {networkName}</small>
              <p className="mb-0"><strong>Account:</strong> {account}</p>
            </div>
            <Button variant="outline-secondary" size="sm" onClick={() => window.location.reload()}>
              Disconnect
            </Button>
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
              <Nav.Link eventKey="my">My Escrows</Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="find">Find Escrow</Nav.Link>
            </Nav.Item>
          </Nav>
          
          {activeTab === 'create' && (
            <Card>
              <Card.Body>
                <Card.Title>Create New Escrow</Card.Title>
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
                      The address of the party who will receive the funds
                    </Form.Text>
                  </Form.Group>
                  
                  <Form.Group className="mb-3">
                    <Form.Label>Arbiter Address</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="0x..."
                      value={arbiterAddress}
                      onChange={(e) => setArbiterAddress(e.target.value)}
                      required
                    />
                    <Form.Text className="text-muted">
                      A trusted third party who can resolve disputes
                    </Form.Text>
                  </Form.Group>
                  
                  <Form.Group className="mb-3">
                    <Form.Label>Amount (MON)</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                    />
                    <Form.Text className="text-muted">
                      The amount to place in escrow
                    </Form.Text>
                  </Form.Group>
                  
                  <Button 
                    variant="primary" 
                    type="submit" 
                    disabled={loading}
                  >
                    {loading ? <Spinner animation="border" size="sm" /> : 'Create Escrow'}
                  </Button>
                </Form>
              </Card.Body>
            </Card>
          )}
          
          {activeTab === 'my' && (
            <Card>
              <Card.Body>
                <Card.Title>My Escrows</Card.Title>
                {escrows.length === 0 ? (
                  <p className="text-center my-4">You don't have any escrows yet</p>
                ) : (
                  <ListGroup>
                    {escrows.map((escrow) => (
                      <ListGroup.Item 
                        key={escrow.id.toString()} 
                        className="d-flex justify-content-between align-items-center"
                      >
                        <div>
                          <strong>Escrow #{escrow.id.toString()}</strong>
                          <p className="mb-0">Amount: {escrow.amount} MON</p>
                          <small>
                            Status: {escrow.fundsDisbursed 
                              ? 'Completed' 
                              : escrow.disputeRaised 
                                ? 'Disputed' 
                                : 'Active'}
                          </small>
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
          
          {/* Escrow Details Modal */}
          <Modal show={showDetailsModal} onHide={() => setShowDetailsModal(false)}>
            <Modal.Header closeButton>
              <Modal.Title>Escrow Details</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              {selectedEscrow && (
                <>
                  <p><strong>Escrow ID:</strong> {selectedEscrow.id.toString()}</p>
                  <p><strong>Buyer:</strong> {selectedEscrow.buyer}</p>
                  <p><strong>Seller:</strong> {selectedEscrow.seller}</p>
                  <p><strong>Arbiter:</strong> {selectedEscrow.arbiter}</p>
                  <p><strong>Amount:</strong> {selectedEscrow.amount} MON</p>
                  <p>
                    <strong>Status:</strong> {selectedEscrow.fundsDisbursed 
                      ? 'Completed' 
                      : selectedEscrow.disputeRaised 
                        ? 'Disputed' 
                        : 'Active'}
                  </p>
                  
                  {!selectedEscrow.fundsDisbursed && (
                    <div className="mt-3">
                      <h6>Actions</h6>
                      
                      {account.toLowerCase() === selectedEscrow.buyer.toLowerCase() && 
                       !selectedEscrow.disputeRaised && (
                        <Button 
                          variant="success" 
                          size="sm" 
                          className="me-2 mb-2" 
                          onClick={() => handleEscrowAction('release', selectedEscrow.id)}
                          disabled={loading}
                        >
                          Release Funds
                        </Button>
                      )}
                      
                      {account.toLowerCase() === selectedEscrow.seller.toLowerCase() && 
                       !selectedEscrow.disputeRaised && (
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
                      
                      {(account.toLowerCase() === selectedEscrow.buyer.toLowerCase() || 
                        account.toLowerCase() === selectedEscrow.seller.toLowerCase()) && 
                        !selectedEscrow.disputeRaised && (
                        <Button 
                          variant="danger" 
                          size="sm" 
                          className="me-2 mb-2" 
                          onClick={() => handleEscrowAction('dispute', selectedEscrow.id)}
                          disabled={loading}
                        >
                          Raise Dispute
                        </Button>
                      )}
                      
                      {account.toLowerCase() === selectedEscrow.arbiter.toLowerCase() && 
                       selectedEscrow.disputeRaised && (
                        <div>
                          <Form.Group className="mb-2">
                            <Form.Label>Resolve in favor of:</Form.Label>
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
                            onClick={() => handleEscrowAction('resolve', selectedEscrow.id, recipientForDispute)}
                            disabled={loading || !recipientForDispute}
                          >
                            Resolve Dispute
                          </Button>
                        </div>
                      )}
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
        </>
      )}
    </Container>
  );
}

export default App;
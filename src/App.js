import React, { useState } from 'react';
import { Button, Card, Container, Form, ListGroup, Nav, Spinner, Alert, Modal, Badge } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import { useWeb3Context } from './contexts/Web3Context';
import { truncateAddress } from './constants/contracts';

function App() {
  // Use the Web3 context
  const {
    account,
    networkName,
    connected,
    loading,
    connectWallet,
    escrows,
    arbitratedEscrows,
    error,
    successMessage,
    setError,
    setSuccessMessage,
    executeEscrowAction,
    createEscrow,
    getEscrowDetails
  } = useWeb3Context();

  // State variables
  const [activeTab, setActiveTab] = useState('create');
  const [selectedEscrow, setSelectedEscrow] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Form states
  const [sellerAddress, setSellerAddress] = useState('');
  const [arbiterAddress, setArbiterAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [escrowIdToView, setEscrowIdToView] = useState('');
  const [recipientForDispute, setRecipientForDispute] = useState('');

  // Handle create escrow form submission
  const handleCreateEscrow = async (e) => {
    e.preventDefault();
    
    if (!sellerAddress || !arbiterAddress || !amount) {
      setError('Please fill out all fields');
      return;
    }
    
    try {
      await createEscrow(sellerAddress, arbiterAddress, amount);
      // Clear form
      setSellerAddress('');
      setArbiterAddress('');
      setAmount('');
    } catch (error) {
      // Error handling is done in context
    }
  };

  // View escrow details
  const viewEscrowDetails = async (escrowId) => {
    try {
      const escrow = await getEscrowDetails(escrowId);
      setSelectedEscrow(escrow);
      setShowDetailsModal(true);
    } catch (error) {
      // Error handling is done in context
    }
  };

  // Handle find escrow form submission
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
      // Error handling is done in context
    }
  };

  return (
    <div className="app-wrapper">
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
                <Nav.Link eventKey="arbitrated">
                  Arbitrated Escrows
                  {arbitratedEscrows.length > 0 && (
                    <Badge bg="primary" className="ms-2">{arbitratedEscrows.length}</Badge>
                  )}
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="find">Find Escrow</Nav.Link>
              </Nav.Item>
            </Nav>
            
            {/* Create Escrow Tab */}
            {activeTab === 'create' && (
              <Card>
                <Card.Body>
                  <Card.Title>Create New Escrow</Card.Title>
                  <Form onSubmit={handleCreateEscrow}>
                    {/* Form content - kept the same */}
                    {/* ... */}
                  </Form>
                </Card.Body>
              </Card>
            )}
            
            {/* My Escrows Tab */}
            {activeTab === 'my' && (
              <Card>
                <Card.Body>
                  <Card.Title>My Escrows</Card.Title>
                  {/* Escrow list - kept the same */}
                  {/* ... */}
                </Card.Body>
              </Card>
            )}

            {/* Arbitrated Escrows Tab */}
            {activeTab === 'arbitrated' && (
              <Card>
                <Card.Body>
                  <Card.Title>Escrows You're Arbitrating</Card.Title>
                  {/* Arbitrated escrow list - kept the same */}
                  {/* ... */}
                </Card.Body>
              </Card>
            )}
            
            {/* Find Escrow Tab */}
            {activeTab === 'find' && (
              <Card>
                <Card.Body>
                  <Card.Title>Find Escrow by ID</Card.Title>
                  <Form onSubmit={handleFindEscrow} className="mb-4">
                    {/* Form content - kept the same */}
                    {/* ... */}
                  </Form>
                </Card.Body>
              </Card>
            )}
            
            {/* Escrow Details Modal */}
            <Modal show={showDetailsModal} onHide={() => setShowDetailsModal(false)}>
              {/* Modal content - kept the same */}
              {/* ... */}
            </Modal>
            
            {/* Footer with creator info */}
            <div className="footer">
              {/* Footer content - kept the same */}
              {/* ... */}
            </div>
          </>
        )}
      </Container>
    </div>
  );
}

export default App;
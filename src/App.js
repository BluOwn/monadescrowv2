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

  // Handle action on escrow (release, refund, dispute, resolve)
  const handleEscrowAction = async (action, escrowId, recipient = null) => {
    try {
      await executeEscrowAction(action, escrowId, recipient);
      
      // If we were showing a modal for this escrow, refresh its details
      if (selectedEscrow && selectedEscrow.id === escrowId) {
        viewEscrowDetails(escrowId);
      }
    } catch (error) {
      // Error handling is done in context
    }
  };

  return (
    <div className="app-wrapper">
      <Container className="py-5">
        {/* Keep the rest of your UI code the same, but replace direct function calls */}
        {/* For example, replace the old connectWallet with the new one from context */}
        {/* The UI structure should remain the same */}
        
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
                        A trusted third party who can resolve disputes and refund funds if needed
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
            
            {/* My Escrows Tab */}
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

            {/* Arbitrated Escrows Tab */}
            {activeTab === 'arbitrated' && (
              <Card>
                <Card.Body>
                  <Card.Title>Escrows You're Arbitrating</Card.Title>
                  {arbitratedEscrows.length === 0 ? (
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
                              <span className="role-badge arbiter-badge ms-2">You are the Arbiter</span>
                            </div>
                            <p className="mb-1">Amount: {escrow.amount} MON</p>
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
            
            {/* Find Escrow Tab */}
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
                    <p><strong>Amount:</strong> {selectedEscrow.amount} MON</p>
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
                            onClick={() => handleEscrowAction('release', selectedEscrow.id)}
                            disabled={loading}
                          >
                            Release Funds to Seller
                          </Button>
                        )}
                        
                        {/* Seller Actions */}
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
                        
                        {/* Dispute Actions (Buyer or Seller) */}
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
                                onClick={() => handleEscrowAction('refund', selectedEscrow.id)}
                                disabled={loading}
                              >
                                Refund Buyer
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
                                  onClick={() => handleEscrowAction('resolve', selectedEscrow.id, recipientForDispute)}
                                  disabled={loading || !recipientForDispute}
                                >Resolve Dispute
                                </Button>
                              </div>
                            )}
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
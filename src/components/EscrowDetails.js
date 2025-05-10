import React, { useState, useEffect } from 'react';
import { Card, Badge, Button, Spinner, Alert } from 'react-bootstrap';
import { ethers } from 'ethers';

/**
 * Component for displaying escrow details
 * 
 * @param {Object} props Component props
 * @param {Object} props.escrow - Escrow details
 * @param {string} props.userAddress - Current user's address
 * @param {Function} props.onAction - Callback for escrow actions
 * @param {boolean} props.loading - Whether action is loading
 */
const EscrowDetails = ({ escrow, userAddress, onAction, loading = false }) => {
  const [userRole, setUserRole] = useState('');
  const [dispute, setDispute] = useState(null);

  // Determine user's role in this escrow
  useEffect(() => {
    if (escrow && userAddress) {
      const normalizedAddress = userAddress.toLowerCase();
      
      if (normalizedAddress === escrow.buyer.toLowerCase()) {
        setUserRole('buyer');
      } else if (normalizedAddress === escrow.seller.toLowerCase()) {
        setUserRole('seller');
      } else if (normalizedAddress === escrow.arbiter.toLowerCase()) {
        setUserRole('arbiter');
      } else {
        setUserRole('observer');
      }
    }
  }, [escrow, userAddress]);

  // Get dispute details if available
  useEffect(() => {
    if (escrow && escrow.dispute) {
      setDispute(escrow.dispute);
    }
  }, [escrow]);

  // Truncate address for display
  const truncateAddress = (address) => {
    return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '';
  };

  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    return new Date(timestamp).toLocaleString();
  };

  // Get status badge color
  const getStatusBadgeVariant = () => {
    if (!escrow) return 'secondary';
    if (escrow.fundsDisbursed) return 'success';
    if (escrow.disputeRaised) return 'danger';
    return 'primary';
  };

  // Get role badge color
  const getRoleBadgeVariant = (role) => {
    switch (role) {
      case 'buyer': 
        return 'primary';
      case 'seller': 
        return 'success';
      case 'arbiter': 
        return 'info';
      default: 
        return 'secondary';
    }
  };

  // Format dispute reason
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

  if (!escrow) {
    return (
      <Card className="mb-4">
        <Card.Body className="text-center">
          <Spinner animation="border" /> Loading escrow details...
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="mb-4">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <div>
          <h5 className="mb-0">Escrow #{escrow.id.toString()}</h5>
        </div>
        <Badge bg={getStatusBadgeVariant()} className="ms-2">
          {escrow.fundsDisbursed
            ? 'Completed'
            : escrow.disputeRaised
              ? 'Disputed'
              : 'Active'}
        </Badge>
      </Card.Header>

      <Card.Body>
        {userRole !== 'observer' && (
          <div className="mb-3 p-2 bg-light rounded">
            <Badge bg={getRoleBadgeVariant(userRole)} className="mb-1">
              You are the {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
            </Badge>
            <p className="mb-0 small text-muted">
              {userRole === 'buyer' && 'You created this escrow and can release funds or raise disputes.'}
              {userRole === 'seller' && 'You will receive funds when the buyer releases them or the dispute is resolved in your favor.'}
              {userRole === 'arbiter' && 'You can refund the buyer or resolve disputes for this escrow.'}
            </p>
          </div>
        )}

        <div className="escrow-participants mb-3">
          <div className="row">
            <div className="col-md-4 mb-2">
              <h6>Buyer</h6>
              <div className="address-container d-flex align-items-center">
                <span className="address-display">{truncateAddress(escrow.buyer)}</span>
                {userRole === 'buyer' && <Badge bg="primary" className="ms-2">You</Badge>}
              </div>
            </div>
            <div className="col-md-4 mb-2">
              <h6>Seller</h6>
              <div className="address-container d-flex align-items-center">
                <span className="address-display">{truncateAddress(escrow.seller)}</span>
                {userRole === 'seller' && <Badge bg="success" className="ms-2">You</Badge>}
              </div>
            </div>
            <div className="col-md-4 mb-2">
              <h6>Arbiter</h6>
              <div className="address-container d-flex align-items-center">
                <span className="address-display">{truncateAddress(escrow.arbiter)}</span>
                {userRole === 'arbiter' && <Badge bg="info" className="ms-2">You</Badge>}
              </div>
            </div>
          </div>
        </div>

        <div className="escrow-details mb-3">
          <div className="row">
            <div className="col-md-6 mb-2">
              <h6>Amount</h6>
              <p className="mb-0">{escrow.amount} {escrow.tokenSymbol}</p>
            </div>
            <div className="col-md-6 mb-2">
              <h6>Created</h6>
              <p className="mb-0">{escrow.creationTime}</p>
            </div>
          </div>
        </div>

        {escrow.tokenAddress !== ethers.constants.AddressZero && (
          <div className="token-details mb-3 p-2 bg-light rounded">
            <h6>Token Details</h6>
            <p className="mb-0"><strong>Symbol:</strong> {escrow.tokenSymbol}</p>
            <p className="mb-0"><strong>Address:</strong> {truncateAddress(escrow.tokenAddress)}</p>
          </div>
        )}

        {escrow.description && (
          <div className="description-section mb-3">
            <h6>Description</h6>
            <div className="border p-2 rounded bg-light">
              <p className="mb-0">{escrow.description}</p>
            </div>
          </div>
        )}

        {escrow.documentHash && (
          <div className="document-section mb-3">
            <h6>Document Hash</h6>
            <div className="border p-2 rounded bg-light">
              <code>{escrow.documentHash}</code>
              {escrow.documentHash.startsWith('Qm') && (
                <div className="mt-2">
                  <Button 
                    variant="outline-primary" 
                    size="sm"
                    href={`https://ipfs.io/ipfs/${escrow.documentHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View on IPFS
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Dispute details if present */}
        {escrow.disputeRaised && dispute && (
          <div className="dispute-details mt-3 p-3 border rounded bg-light">
            <h6>Dispute Information</h6>
            <div className="row">
              <div className="col-md-6 mb-2">
                <strong>Initiated By:</strong> {
                  dispute.initiator === escrow.buyer 
                    ? 'Buyer' 
                    : 'Seller'
                } ({truncateAddress(dispute.initiator)})
              </div>
              <div className="col-md-6 mb-2">
                <strong>Reason:</strong> {formatDisputeReason(dispute.reason)}
              </div>
            </div>
            
            {dispute.description && (
              <div className="mb-2">
                <strong>Description:</strong>
                <p className="mb-0 border p-2 rounded bg-white">{dispute.description}</p>
              </div>
            )}
            
            <div className="row">
              <div className="col-md-6 mb-2">
                <strong>Initiated On:</strong> {dispute.timestamp}
              </div>
              
              {dispute.resolved && (
                <>
                  <div className="col-md-6 mb-2">
                    <strong>Resolution:</strong> Resolved in favor of {
                      dispute.resolvedInFavorOf === escrow.buyer 
                        ? 'Buyer' 
                        : 'Seller'
                    }
                  </div>
                  <div className="col-md-6 mb-2">
                    <strong>Resolution Time:</strong> {dispute.resolutionTime}
                  </div>
                </>
              )}
            </div>
            
            {dispute.resolved && (
              <Alert variant="success" className="mb-0">
                This dispute has been resolved.
              </Alert>
            )}
          </div>
        )}

        {/* Available actions based on role and escrow state */}
        {!escrow.fundsDisbursed && (
          <div className="actions-section mt-4">
            <h6>Available Actions</h6>
            <div className="d-flex flex-wrap gap-2">
              {/* Buyer actions */}
              {userRole === 'buyer' && !escrow.disputeRaised && (
                <Button 
                  variant="success" 
                  size="sm"
                  onClick={() => onAction('release', escrow.id)}
                  disabled={loading}
                >
                  {loading ? <Spinner animation="border" size="sm" /> : 'Release Funds to Seller'}
                </Button>
              )}

              {/* Seller actions */}
              {userRole === 'seller' && !escrow.disputeRaised && (
                <Button 
                  variant="warning" 
                  size="sm"
                  onClick={() => onAction('refund', escrow.id)}
                  disabled={loading}
                >
                  {loading ? <Spinner animation="border" size="sm" /> : 'Refund Buyer'}
                </Button>
              )}

              {/* Buyer or Seller can raise dispute */}
              {(userRole === 'buyer' || userRole === 'seller') && !escrow.disputeRaised && (
                <Button 
                  variant="danger" 
                  size="sm"
                  onClick={() => onAction('dispute', escrow.id)}
                  disabled={loading}
                >
                  {loading ? <Spinner animation="border" size="sm" /> : 'Raise Dispute'}
                </Button>
              )}

              {/* Arbiter actions */}
              {userRole === 'arbiter' && !escrow.disputeRaised && !escrow.fundsDisbursed && (
                <Button 
                  variant="warning" 
                  size="sm"
                  onClick={() => onAction('refund', escrow.id)}
                  disabled={loading}
                >
                  {loading ? <Spinner animation="border" size="sm" /> : 'Refund Buyer'}
                </Button>
              )}

              {/* Arbiter dispute resolution */}
              {userRole === 'arbiter' && escrow.disputeRaised && !dispute?.resolved && (
                <div className="arbiter-resolution w-100 p-2 border rounded">
                  <p className="small text-muted mb-2">As the arbiter, you can resolve this dispute in favor of either party:</p>
                  <div className="d-flex gap-2">
                    <Button 
                      variant="primary" 
                      size="sm"
                      onClick={() => onAction('resolve', escrow.id, escrow.buyer)}
                      disabled={loading}
                    >
                      {loading ? <Spinner animation="border" size="sm" /> : 'Favor Buyer'}
                    </Button>
                    <Button 
                      variant="success" 
                      size="sm"
                      onClick={() => onAction('resolve', escrow.id, escrow.seller)}
                      disabled={loading}
                    >
                      {loading ? <Spinner animation="border" size="sm" /> : 'Favor Seller'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {escrow.fundsDisbursed && (
          <Alert variant="success" className="mt-3 mb-0">
            This escrow has been completed and funds have been disbursed.
          </Alert>
        )}
      </Card.Body>
    </Card>
  );
};

export default EscrowDetails;
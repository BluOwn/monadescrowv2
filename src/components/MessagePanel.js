import React, { useState, useEffect, useRef } from 'react';
import { Form, Button, Spinner, Alert, Badge } from 'react-bootstrap';
import { loadMessages, sendMessage, verifyMessage, formatMessageDate, isEscrowParticipant } from '../utils/ipfsMessageService';

// Helper function to truncate address for display
const truncateAddress = (address) => {
  return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '';
};

/**
 * MessagePanel component for escrow communications
 * 
 * @param {Object} props Component props
 * @param {string} props.escrowId Escrow ID
 * @param {string} props.account User's Ethereum address
 * @param {Object} props.signer Ethers.js signer
 * @param {Object} props.contract Escrow contract instance
 */
const MessagePanel = ({ escrowId, account, signer, contract }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [isParticipant, setIsParticipant] = useState(false);
  const [participantInfo, setParticipantInfo] = useState(null); // Role information
  const [escrowDetails, setEscrowDetails] = useState(null);
  const messagesEndRef = useRef(null);

  // Check if user is a participant and determine their role
  useEffect(() => {
    const checkParticipant = async () => {
      if (!escrowId || !account || !contract) return;
      
      try {
        // Get the escrow details to determine roles
        const details = await contract.getEscrowDetails(escrowId);
        setEscrowDetails({
          buyer: details[0],
          seller: details[1],
          arbiter: details[2]
        });
        
        const buyer = details[0].toLowerCase();
        const seller = details[1].toLowerCase();
        const arbiter = details[2].toLowerCase();
        const userAddress = account.toLowerCase();
        
        const isBuyer = userAddress === buyer;
        const isSeller = userAddress === seller;
        const isArbiter = userAddress === arbiter;
        
        // Set participant info with role
        setParticipantInfo({
          isBuyer,
          isSeller, 
          isArbiter,
          role: isBuyer ? 'Buyer' : isSeller ? 'Seller' : isArbiter ? 'Arbiter' : 'Observer'
        });
        
        // Check if user is a participant
        const participant = await isEscrowParticipant(escrowId, account, contract);
        setIsParticipant(participant);
        
        if (!participant) {
          console.warn(`User ${account} is not a participant in escrow ${escrowId}`);
        }
      } catch (err) {
        console.error('Error checking participant status:', err);
        setError('Error checking your permissions for this escrow.');
      }
    };
    
    checkParticipant();
  }, [escrowId, account, contract]);

  // Load messages on component mount and when escrowId changes
  useEffect(() => {
    if (!escrowId) return;
    
    const fetchMessages = async () => {
      setLoading(true);
      try {
        const result = await loadMessages(escrowId, signer?.provider);
        if (result && Array.isArray(result.messages)) {
          setMessages(result.messages);
        } else {
          setMessages([]);
        }
      } catch (err) {
        console.error('Error loading messages:', err);
        setError('Failed to load messages. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchMessages();
    
    // Set up polling to check for new messages every 30 seconds
    const interval = setInterval(fetchMessages, 30000);
    return () => clearInterval(interval);
  }, [escrowId, signer]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Handle sending a new message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !signer || !contract) return;
    
    setSending(true);
    setError('');
    
    try {
      console.log(`Sending message for escrow ${escrowId} from account ${account}`);
      
      const result = await sendMessage(escrowId, newMessage, signer, contract);
      
      if (result.success) {
        if (Array.isArray(result.messages)) {
          setMessages(result.messages);
        } else if (result.messageObject && Array.isArray(result.messageObject.messages)) {
          setMessages(result.messageObject.messages);
        }
        
        setNewMessage('');
      } else {
        setError(`Failed to send message: ${result.error}`);
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  // Get the role of a sender based on their address
  const getSenderRole = (senderAddress) => {
    if (!escrowDetails || !senderAddress) return '';
    
    const lowerSender = senderAddress.toLowerCase();
    if (lowerSender === escrowDetails.buyer.toLowerCase()) {
      return 'Buyer';
    } else if (lowerSender === escrowDetails.seller.toLowerCase()) {
      return 'Seller';
    } else if (lowerSender === escrowDetails.arbiter.toLowerCase()) {
      return 'Arbiter';
    }
    return '';
  };

  // Get badge variant based on role
  const getRoleBadgeVariant = (role) => {
    switch (role) {
      case 'Buyer': 
        return 'primary';
      case 'Seller': 
        return 'success';
      case 'Arbiter': 
        return 'info';
      default: 
        return 'secondary';
    }
  };

  // Render the role badge based on participant info
  const renderRoleBadge = () => {
    if (!participantInfo) return null;
    
    let variant = 'secondary';
    if (participantInfo.isBuyer) variant = 'primary';
    if (participantInfo.isSeller) variant = 'success';
    if (participantInfo.isArbiter) variant = 'info';
    
    return (
      <Badge bg={variant} className="mb-2">
        You are the {participantInfo.role}
      </Badge>
    );
  };

  return (
    <div className="message-panel mt-4">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h5>Escrow Messages</h5>
        {renderRoleBadge()}
      </div>
      
      <p className="text-muted small">
        Messages are stored on IPFS and cryptographically signed by the sender
      </p>
      
      {error && (
        <Alert variant="danger" onClose={() => setError('')} dismissible>
          {error}
        </Alert>
      )}
      
      {!isParticipant && (
        <Alert variant="warning">
          You don't appear to be a participant in this escrow (buyer, seller, or arbiter). 
          You may still view messages, but you cannot send messages.
        </Alert>
      )}
      
      <div className="message-list p-3 bg-light rounded mb-3" style={{ maxHeight: '300px', overflowY: 'auto' }}>
        {loading && messages.length === 0 ? (
          <div className="text-center p-3">
            <Spinner animation="border" size="sm" /> 
            <p className="mt-2 mb-0">Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center p-3">
            <p className="mb-0">No messages yet. Be the first to send one!</p>
          </div>
        ) : (
          <>
            {messages.map((msg, index) => {
              const isCurrentUser = msg.sender && account && msg.sender.toLowerCase() === account.toLowerCase();
              const isVerified = verifyMessage(msg);
              const senderRole = getSenderRole(msg.sender);
              const roleBadgeVariant = getRoleBadgeVariant(senderRole);
              
              return (
                <div 
                  key={index} 
                  className={`message mb-3 p-2 rounded ${isCurrentUser ? 'bg-primary text-white ms-5' : 'bg-white border me-5'}`}
                >
                  <div className="message-header d-flex justify-content-between align-items-center mb-1">
                    <div>
                      <small className="sender fw-bold">
                        {isCurrentUser ? 'You' : truncateAddress(msg.sender)}
                      </small>
                      {senderRole && (
                        <Badge 
                          bg={roleBadgeVariant} 
                          className="ms-1" 
                          style={{ fontSize: '0.7rem' }}
                        >
                          {senderRole}
                        </Badge>
                      )}
                    </div>
                    <small className="timestamp text-muted" style={{ fontSize: '0.75rem', color: isCurrentUser ? 'rgba(255,255,255,0.7)' : '' }}>
                      {formatMessageDate(msg.timestamp)}
                    </small>
                  </div>
                  <div className="message-content">{msg.content}</div>
                  {!isVerified && (
                    <div className="verification-warning mt-1">
                      <small className={`text-${isCurrentUser ? 'warning' : 'danger'}`}>
                        ⚠️ Signature verification failed
                      </small>
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
      
      <Form onSubmit={handleSendMessage}>
        <div className="d-flex">
          <Form.Control
            type="text"
            placeholder={isParticipant ? "Type your message..." : "You cannot send messages in this escrow"}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            disabled={sending || !signer || !isParticipant}
            className="me-2"
          />
          <Button 
            variant="primary" 
            type="submit" 
            disabled={sending || !newMessage.trim() || !signer || !isParticipant}
          >
            {sending ? <Spinner animation="border" size="sm" /> : 'Send'}
          </Button>
        </div>
        <small className="text-muted mt-1 d-block">
          {isParticipant 
            ? "Messages are verified with your wallet signature" 
            : "You must be a buyer, seller, or arbiter to send messages"}
        </small>
      </Form>
    </div>
  );
};

export default MessagePanel;
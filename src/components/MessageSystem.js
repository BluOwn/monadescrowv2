import React, { useState, useEffect } from 'react';
import { Card, Form, Button, ListGroup, Badge, Spinner, Alert } from 'react-bootstrap';
import { ethers } from 'ethers';
import { executeTransactionSecurely, handleError } from '../utils/security';

const MessageSystem = ({ contract, escrowId, account, participants }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState('');

  // Function to load messages with retry logic
  const loadMessages = async (maxRetries = 3) => {
    let retries = 0;
    setLoadingMessages(true);
    
    while (retries < maxRetries) {
      try {
        setError('');
        
        // Add a small delay on retry attempts
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        const messageCount = await contract.getMessageCount(escrowId);
        const loadedMessages = [];
        
        for (let i = 0; i < messageCount; i++) {
          try {
            const message = await contract.getEscrowMessage(escrowId, i);
            
            loadedMessages.push({
              id: i,
              sender: message[0],
              timestamp: new Date(Number(message[1]) * 1000),
              content: message[2]
            });
          } catch (innerError) {
            console.warn(`Error loading message ${i}:`, innerError);
            // Continue with other messages even if one fails
          }
        }
        
        setMessages(loadedMessages);
        setLoadingMessages(false);
        return; // Success, exit retry loop
        
      } catch (error) {
        console.error(`Attempt ${retries + 1} failed loading messages:`, error);
        retries++;
        
        if (retries >= maxRetries) {
          setLoadingMessages(false);
          setError('Failed to load messages. Please try again later.');
        }
      }
    }
  };

  // Load messages on component mount
  useEffect(() => {
    if (contract && escrowId !== undefined) {
      loadMessages();
    }
  }, [contract, escrowId]);

  // Send a new message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim()) {
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      // Use secure transaction execution
      const receipt = await executeTransactionSecurely(
        contract, 
        'sendMessage',
        [escrowId, newMessage]
      );
      
      setNewMessage('');
      await loadMessages(); // Reload messages after sending
    } catch (error) {
      console.error("Error sending message:", error);
      setError(handleError(error, 'send message'));
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get role badge
  const getRoleBadge = (address) => {
    if (!participants) return null;
    
    if (address.toLowerCase() === participants.buyer.toLowerCase()) {
      return <Badge bg="primary" className="ms-2">Buyer</Badge>;
    } else if (address.toLowerCase() === participants.seller.toLowerCase()) {
      return <Badge bg="success" className="ms-2">Seller</Badge>;
    } else if (address.toLowerCase() === participants.arbiter.toLowerCase()) {
      return <Badge className="ms-2" style={{backgroundColor: 'var(--arbiter-color)'}}>Arbiter</Badge>;
    }
    return null;
  };

  // Helper function to format address
  const formatAddress = (address) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <Card className="message-system-card">
      <Card.Body>
        <Card.Title>Escrow Communication</Card.Title>
        
        {error && (
          <Alert variant="danger" onClose={() => setError('')} dismissible>
            {error}
          </Alert>
        )}
        
        <div className="message-list-container">
          {loadingMessages ? (
            <div className="text-center my-4">
              <Spinner animation="border" size="sm" /> Loading messages...
            </div>
          ) : messages.length === 0 ? (
            <p className="text-center my-4">No messages yet. Start the conversation!</p>
          ) : (
            <ListGroup className="message-list">
              {messages.map((message) => (
                <ListGroup.Item 
                  key={message.id}
                  className={`message-item ${message.sender.toLowerCase() === account.toLowerCase() ? 'sent-message' : 'received-message'}`}
                >
                  <div className="message-header">
                    <strong>{formatAddress(message.sender)}</strong>
                    {getRoleBadge(message.sender)}
                    <small className="message-time">
                      {message.timestamp.toLocaleString()}
                    </small>
                  </div>
                  <div className="message-content">{message.content}</div>
                </ListGroup.Item>
              ))}
            </ListGroup>
          )}
        </div>
        
        <Form onSubmit={handleSendMessage} className="mt-3">
          <Form.Group className="d-flex">
            <Form.Control
              type="text"
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              disabled={loading}
            />
            <Button 
              type="submit" 
              variant="primary" 
              className="ms-2"
              disabled={loading || !newMessage.trim()}
            >
              {loading ? <Spinner animation="border" size="sm" /> : 'Send'}
            </Button>
          </Form.Group>
        </Form>
      </Card.Body>
    </Card>
  );
};

export default MessageSystem;
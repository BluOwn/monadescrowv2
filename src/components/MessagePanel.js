import React, { useState, useEffect, useRef } from 'react';
import { Form, Button, Spinner, Alert } from 'react-bootstrap';
import { loadMessages, sendMessage, verifyMessage, formatMessageDate } from '../utils/ipfsMessageService';

const truncateAddress = (address) => {
  return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '';
};

const MessagePanel = ({ escrowId, account, signer, contract }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);

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

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !signer || !contract) return;
    
    setSending(true);
    setError('');
    
    try {
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

  return (
    <div className="message-panel mt-4">
      <h5>Escrow Messages</h5>
      <p className="text-muted small">
        Messages are stored on IPFS and cryptographically signed by the sender
      </p>
      
      {error && (
        <Alert variant="danger" onClose={() => setError('')} dismissible>
          {error}
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
              
              return (
                <div 
                  key={index} 
                  className={`message mb-3 p-2 rounded ${isCurrentUser ? 'bg-primary text-white ms-5' : 'bg-white border me-5'}`}
                >
                  <div className="message-header d-flex justify-content-between align-items-center mb-1">
                    <small className="sender fw-bold">
                      {isCurrentUser ? 'You' : truncateAddress(msg.sender)}
                    </small>
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
            placeholder="Type your message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            disabled={sending || !signer}
            className="me-2"
          />
          <Button 
            variant="primary" 
            type="submit" 
            disabled={sending || !newMessage.trim() || !signer}
          >
            {sending ? <Spinner animation="border" size="sm" /> : 'Send'}
          </Button>
        </div>
        <small className="text-muted mt-1 d-block">
          Messages are verified with your wallet signature
        </small>
      </Form>
    </div>
  );
};

export default MessagePanel;
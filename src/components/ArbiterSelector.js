import React, { useState, useEffect } from 'react';
import { Form, Button, InputGroup, Spinner } from 'react-bootstrap';

/**
 * ArbiterSelector component with default arbiter suggestion
 * 
 * @param {Object} props Component props 
 * @param {string} props.value Current arbiter address
 * @param {Function} props.onChange Handler for value changes
 * @param {Object} props.contract Escrow contract instance
 */
const ArbiterSelector = ({ value, onChange, contract }) => {
  const [defaultArbiter, setDefaultArbiter] = useState('');
  const [customAddress, setCustomAddress] = useState(value || '');
  const [useDefault, setUseDefault] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch default arbiter from contract
  useEffect(() => {
    const fetchDefaultArbiter = async () => {
      if (!contract) return;
      
      try {
        setLoading(true);
        // Call the getDefaultArbiter method on the contract
        const address = await contract.getDefaultArbiter();
        
        if (address && ethers.utils.isAddress(address)) {
          setDefaultArbiter(address);
          
          // If no arbiter is set yet, use the default
          if (!value) {
            setUseDefault(true);
            onChange(address);
          }
        } else {
          console.warn("Default arbiter address is invalid:", address);
          setErrorMsg("Could not load default arbiter from contract");
        }
      } catch (error) {
        console.error('Error fetching default arbiter:', error);
        setErrorMsg("Could not load default arbiter from contract");
      } finally {
        setLoading(false);
      }
    };
    
    fetchDefaultArbiter();
  }, [contract, onChange, value]);
  
  // Handle toggling between default and custom
  const handleToggleDefault = () => {
    if (!useDefault) {
      // Switching to default
      setUseDefault(true);
      onChange(defaultArbiter);
    } else {
      // Switching to custom
      setUseDefault(false);
      onChange(customAddress);
    }
  };
  
  // Handle custom address change
  const handleAddressChange = (e) => {
    const address = e.target.value;
    setCustomAddress(address);
    if (!useDefault) {
      onChange(address);
    }
  };

  return (
    <Form.Group className="mb-3">
      <Form.Label style={{ fontWeight: 'bold', color: '#6c5ce7' }}>
        Arbiter Address (Required)
      </Form.Label>
      
      {loading ? (
        <div className="d-flex align-items-center mb-2">
          <Spinner animation="border" size="sm" className="me-2" />
          <span>Loading default arbiter...</span>
        </div>
      ) : errorMsg ? (
        <div className="text-danger mb-2 small">{errorMsg}</div>
      ) : (
        <div className="mb-2">
          <Form.Check
            type="checkbox"
            id="use-default-arbiter"
            label={`Use recommended arbiter ${defaultArbiter ? `(${defaultArbiter.slice(0, 6)}...${defaultArbiter.slice(-4)})` : ''}`}
            checked={useDefault}
            onChange={handleToggleDefault}
            disabled={!defaultArbiter}
          />
          <Form.Text className="text-muted">
            The recommended arbiter is a trusted entity that can help resolve disputes
          </Form.Text>
        </div>
      )}
      
      <InputGroup>
        <Form.Control
          type="text"
          placeholder="0x..."
          value={useDefault ? defaultArbiter : customAddress}
          onChange={handleAddressChange}
          disabled={useDefault}
          required
          style={useDefault ? 
            { borderColor: '#6c5ce7', borderWidth: '2px', backgroundColor: '#f8f9fa' } : 
            { borderColor: '#6c5ce7', borderWidth: '2px' }
          }
        />
        {useDefault && defaultArbiter && (
          <Button 
            variant="outline-secondary" 
            onClick={() => {
              navigator.clipboard.writeText(defaultArbiter);
            }}
            title="Copy to clipboard"
          >
            Copy
          </Button>
        )}
      </InputGroup>
      
      <Form.Text className="text-muted">
        A trusted third party who can resolve disputes and refund funds if needed
      </Form.Text>
    </Form.Group>
  );
};

export default ArbiterSelector;
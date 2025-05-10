import React, { useState, useEffect } from 'react';
import { Form, Spinner } from 'react-bootstrap';
import { ethers } from 'ethers';

/**
 * TokenSelector component for selecting ERC-20 tokens from a list
 * 
 * @param {Object} props Component props
 * @param {Array} props.tokens List of token objects
 * @param {Function} props.onSelect Function to call when a token is selected
 * @param {Object} props.selectedToken Currently selected token
 * @param {boolean} props.loading Whether tokens are loading
 * @param {boolean} props.disabled Whether the selector is disabled
 */
const TokenSelector = ({ 
  tokens, 
  onSelect, 
  selectedToken, 
  loading = false,
  disabled = false
}) => {
  const [allowance, setAllowance] = useState('0');
  const [balance, setBalance] = useState('0');

  // Format address for display
  const formatAddress = (address) => {
    if (!address) return '';
    return address.slice(0, 6) + '...' + address.slice(-4);
  };

  // Handle token selection
  const handleTokenChange = (e) => {
    const tokenAddress = e.target.value;
    const token = tokens.find(token => token.address === tokenAddress);
    if (token && onSelect) {
      onSelect(token);
    }
  };

  return (
    <Form.Group className="mb-3">
      <Form.Label>Select Token</Form.Label>
      <Form.Select
        value={selectedToken?.address || ''}
        onChange={handleTokenChange}
        disabled={loading || disabled || tokens.length === 0}
      >
        {loading ? (
          <option>Loading tokens...</option>
        ) : tokens.length === 0 ? (
          <option>No tokens available</option>
        ) : (
          <>
            <option value="">Select a token</option>
            {tokens.map(token => (
              <option key={token.address} value={token.address}>
                {token.symbol} - {token.name} {token.isNative ? '(Native)' : `(${formatAddress(token.address)})`}
              </option>
            ))}
          </>
        )}
      </Form.Select>

      {loading && (
        <div className="text-center my-2">
          <Spinner animation="border" size="sm" /> Loading tokens...
        </div>
      )}

      {selectedToken && (
        <div className="token-info mt-2 p-2 bg-light rounded">
          <p className="mb-1"><strong>Token:</strong> {selectedToken.symbol} ({selectedToken.name})</p>
          {!selectedToken.isNative && (
            <p className="mb-1"><strong>Address:</strong> {formatAddress(selectedToken.address)}</p>
          )}
          <p className="mb-0"><strong>Type:</strong> {selectedToken.isNative ? 'Native Chain Token' : 'ERC-20 Token'}</p>
        </div>
      )}
    </Form.Group>
  );
};

export default TokenSelector;
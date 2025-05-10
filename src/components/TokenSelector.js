import React, { useState, useEffect } from 'react';
import { Form, Spinner, Alert } from 'react-bootstrap';
import { ethers } from 'ethers';

// Known token information for Monad Testnet
const KNOWN_TOKENS = {
  '0xf817257fed379853cDe0fa4F97AB987181B1E5Ea': {
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 6,
    isNative: false
  },
  '0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D': {
    name: 'Tether USD',
    symbol: 'USDT',
    decimals: 6,
    isNative: false
  },
  '0xcf5a6076cfa32686c0Df13aBaDa2b40dec133F1d': {
    name: 'Wrapped Bitcoin',
    symbol: 'WBTC',
    decimals: 8,
    isNative: false
  },
  '0xB5a30b0FDc5EA94A52fDc42e3E9760Cb8449Fb37': {
    name: 'Wrapped Ether',
    symbol: 'WETH',
    decimals: 18,
    isNative: false
  },
  '0x5387C85A4965769f6B0Df430638a1388493486F1': {
    name: 'Wrapped SOL',
    symbol: 'WSOL',
    decimals: 9,
    isNative: false
  }
};

/**
 * Enhanced TokenSelector component for selecting ERC-20 tokens
 * 
 * @param {Object} props Component props
 * @param {Array} props.tokens List of token objects
 * @param {Function} props.onSelect Function to call when a token is selected
 * @param {Object} props.selectedToken Currently selected token
 * @param {boolean} props.loading Whether tokens are loading
 * @param {boolean} props.disabled Whether the selector is disabled
 * @param {ethers.providers.Provider} props.provider Ethers provider for fetching token details
 */
const TokenSelector = ({ 
  tokens, 
  onSelect, 
  selectedToken, 
  loading = false,
  disabled = false,
  provider
}) => {
  const [enhancedTokens, setEnhancedTokens] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState('');

  // Format address for display
  const formatAddress = (address) => {
    if (!address) return '';
    return address.slice(0, 6) + '...' + address.slice(-4);
  };

  // Handle token selection
  const handleTokenChange = (e) => {
    const tokenAddress = e.target.value;
    const token = enhancedTokens.find(token => token.address === tokenAddress);
    if (token && onSelect) {
      onSelect(token);
    }
  };

  // Fetch token details for all tokens in the list
  useEffect(() => {
    const fetchTokenDetails = async () => {
      if (!tokens || tokens.length === 0) {
        return;
      }

      setLoadingDetails(true);
      setError('');

      try {
        const enhanced = await Promise.all(tokens.map(async (token) => {
          // Skip if token is already enhanced or is native token
          if (token.name && token.symbol && token.decimals) {
            return token;
          }

          if (token.address === ethers.constants.AddressZero || token.isNative) {
            return {
              address: ethers.constants.AddressZero,
              name: 'Monad Native Token',
              symbol: 'MON',
              decimals: 18,
              isNative: true
            };
          }

          // Check if it's a known token from our predefined list
          if (KNOWN_TOKENS[token.address]) {
            return {
              ...token,
              ...KNOWN_TOKENS[token.address],
              address: token.address
            };
          }

          // If it's not a known token and we have a provider, try to fetch details
          if (provider) {
            try {
              // Create token contract
              const tokenContract = new ethers.Contract(
                token.address,
                [
                  'function name() view returns (string)',
                  'function symbol() view returns (string)',
                  'function decimals() view returns (uint8)'
                ],
                provider
              );

              // Fetch token details
              const [name, symbol, decimals] = await Promise.all([
                tokenContract.name().catch(() => 'Unknown Token'),
                tokenContract.symbol().catch(() => 'UNKNOWN'),
                tokenContract.decimals().catch(() => 18)
              ]);

              return {
                ...token,
                name,
                symbol,
                decimals,
                isNative: false
              };
            } catch (err) {
              console.warn(`Error fetching details for token ${token.address}:`, err);
            }
          }

          // Fallback if contract call fails or no provider
          return {
            ...token,
            name: `Token at ${formatAddress(token.address)}`,
            symbol: 'UNKNOWN',
            decimals: 18,
            isNative: false
          };
        }));

        setEnhancedTokens(enhanced);
      } catch (err) {
        console.error('Error enhancing tokens:', err);
        setError('Failed to load token details');
        setEnhancedTokens(tokens);
      } finally {
        setLoadingDetails(false);
      }
    };

    fetchTokenDetails();
  }, [tokens, provider]);

  // Sort tokens - native token first, then alphabetically by symbol
  const sortedTokens = [...enhancedTokens].sort((a, b) => {
    if (a.isNative) return -1;
    if (b.isNative) return 1;
    return a.symbol.localeCompare(b.symbol);
  });

  return (
    <div className="token-selector">
      {error && (
        <Alert variant="warning" className="mb-2">
          {error}
        </Alert>
      )}

      <Form.Group className="mb-3">
        <Form.Label>Select Token</Form.Label>
        <Form.Select
          value={selectedToken?.address || ''}
          onChange={handleTokenChange}
          disabled={loading || loadingDetails || disabled || sortedTokens.length === 0}
        >
          {loading || loadingDetails ? (
            <option>Loading tokens...</option>
          ) : sortedTokens.length === 0 ? (
            <option>No tokens available</option>
          ) : (
            <>
              <option value="">Select a token</option>
              {sortedTokens.map(token => (
                <option key={token.address} value={token.address}>
                  {token.symbol} - {token.name} {token.isNative ? '(Native)' : `(${formatAddress(token.address)})`}
                </option>
              ))}
            </>
          )}
        </Form.Select>

        {(loading || loadingDetails) && (
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
    </div>
  );
};

export default TokenSelector;
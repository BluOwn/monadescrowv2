import React, { useState, useEffect } from 'react';
import { Button, Alert, Spinner, ProgressBar } from 'react-bootstrap';
import { ethers } from 'ethers';

/**
 * Component for managing token approvals for ERC-20 tokens
 * 
 * @param {Object} props Component props
 * @param {Object} props.token - Token object with address, symbol, name, decimals
 * @param {string} props.owner - Owner address
 * @param {string} props.spender - Spender address
 * @param {string} props.requiredAmount - Required approval amount
 * @param {ethers.Signer} props.signer - Ethers signer
 * @param {Function} props.onApprovalComplete - Callback when approval completes
 */
const TokenApproval = ({ 
  token, 
  owner, 
  spender, 
  requiredAmount, 
  signer, 
  onApprovalComplete 
}) => {
  const [currentAllowance, setCurrentAllowance] = useState('0');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [approvalPercent, setApprovalPercent] = useState(0);

  // Check if allowance is sufficient
  const checkAllowance = async () => {
    if (!token || token.isNative || !owner || !spender || !signer) {
      return;
    }

    try {
      setChecking(true);
      setError('');
      
      // Create token contract instance
      const tokenContract = new ethers.Contract(
        token.address,
        [
          'function allowance(address,address) view returns (uint256)',
          'function balanceOf(address) view returns (uint256)'
        ],
        signer
      );
      
      // Get current allowance
      const allowance = await tokenContract.allowance(owner, spender);
      setCurrentAllowance(allowance.toString());
      
      // Check if allowance is sufficient
      const requiredBN = ethers.BigNumber.from(requiredAmount);
      const allowanceBN = ethers.BigNumber.from(allowance);
      
      if (allowanceBN.gte(requiredBN)) {
        setApprovalPercent(100);
        setSuccess(true);
      } else if (allowanceBN.gt(0)) {
        // Calculate approval percentage
        const percentage = Math.floor(allowanceBN.mul(100).div(requiredBN).toNumber());
        setApprovalPercent(percentage);
      } else {
        setApprovalPercent(0);
      }
    } catch (err) {
      console.error('Error checking allowance:', err);
      setError('Error checking token allowance');
    } finally {
      setChecking(false);
    }
  };

  // Approve token spending
  const approveToken = async () => {
    if (!token || token.isNative || !owner || !spender || !signer) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess(false);
      
      // Create token contract instance
      const tokenContract = new ethers.Contract(
        token.address,
        [
          'function approve(address,uint256) returns (bool)'
        ],
        signer
      );
      
      // Approve a slightly higher amount to account for potential gas price fluctuations
      const amountToApprove = ethers.BigNumber.from(requiredAmount).mul(120).div(100); // 120% of required amount
      
      // Execute approval transaction
      const tx = await tokenContract.approve(spender, amountToApprove);
      
      // Wait for transaction confirmation
      await tx.wait();
      
      // Update approval status
      setSuccess(true);
      setApprovalPercent(100);
      
      // Update allowance
      await checkAllowance();
      
      // Call completion callback
      if (onApprovalComplete) {
        onApprovalComplete(amountToApprove.toString());
      }
    } catch (err) {
      console.error('Error approving token:', err);
      
      // User-friendly error messages
      if (err.code === 4001) {
        setError('Transaction was rejected by user');
      } else if (err.message?.includes('user rejected')) {
        setError('Transaction was rejected by user');
      } else {
        setError(`Failed to approve token: ${err.message || 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Format amount for display
  const formatAmount = (amount, decimals = 18) => {
    try {
      return ethers.utils.formatUnits(amount, decimals);
    } catch (err) {
      return '0';
    }
  };

  // Check allowance when component mounts or props change
  useEffect(() => {
    if (token && !token.isNative && owner && spender && signer) {
      checkAllowance();
    }
  }, [token, owner, spender, signer, requiredAmount]);

  // Don't render anything for native token
  if (!token || token.isNative) {
    return null;
  }

  // Show loading indicator while checking allowance
  if (checking && currentAllowance === '0') {
    return (
      <div className="token-approval text-center p-3 mb-3 border rounded">
        <Spinner animation="border" size="sm" /> Checking token allowance...
      </div>
    );
  }

  // Show approval status
  const formattedAllowance = formatAmount(currentAllowance, token.decimals);
  const formattedRequired = formatAmount(requiredAmount, token.decimals);
  const hasApproval = ethers.BigNumber.from(currentAllowance).gte(ethers.BigNumber.from(requiredAmount));

  return (
    <div className="token-approval p-3 mb-3 border rounded">
      <h6>Token Approval</h6>
      
      <div className="token-info mb-2">
        <p className="mb-1">
          <strong>Token:</strong> {token.symbol} ({token.name})
        </p>
        
        <div className="d-flex justify-content-between mb-1">
          <span><strong>Current Allowance:</strong></span>
          <span>{formattedAllowance} {token.symbol}</span>
        </div>
        
        <div className="d-flex justify-content-between mb-2">
          <span><strong>Required Amount:</strong></span>
          <span>{formattedRequired} {token.symbol}</span>
        </div>
        
        <ProgressBar 
          variant={hasApproval ? "success" : "primary"} 
          now={approvalPercent} 
          className="mb-3" 
        />
      </div>
      
      {error && (
        <Alert variant="danger" className="mb-2" onClose={() => setError('')} dismissible>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert variant="success" className="mb-2">
          Token approved successfully! You can now proceed with the transaction.
        </Alert>
      )}
      
      {!hasApproval && (
        <Button 
          variant="primary" 
          onClick={approveToken}
          disabled={loading}
          className="w-100"
        >
          {loading ? (
            <>
              <Spinner animation="border" size="sm" /> Approving...
            </>
          ) : (
            `Approve ${token.symbol} for Escrow`
          )}
        </Button>
      )}
      
      {hasApproval && (
        <Alert variant="success" className="mb-0">
          Allowance is sufficient for this transaction.
        </Alert>
      )}
    </div>
  );
};

export default TokenApproval;
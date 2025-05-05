import React, { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '../hooks/useWeb3';

// Import your contract ABI and address
import { ESCROW_SERVICE_ABI, ESCROW_SERVICE_ADDRESS } from '../constants/contracts';

const Web3Context = createContext(null);

export const Web3Provider = ({ children }) => {
  const [escrows, setEscrows] = useState([]);
  const [arbitratedEscrows, setArbitratedEscrows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const web3 = useWeb3(ESCROW_SERVICE_ADDRESS, ESCROW_SERVICE_ABI);

  // Load user's escrows when connected
  useEffect(() => {
    const loadEscrows = async () => {
      if (web3.connected && web3.account) {
        try {
          setLoading(true);
          setError('');
          
          try {
            // Load user's escrows
            const userEscrows = await web3.loadUserEscrows(web3.account);
            setEscrows(userEscrows);
          } catch (escrowError) {
            console.error("Error loading user escrows:", escrowError);
            setEscrows([]);
            // Show error but continue loading arbitrated escrows
            setError(`Error loading your escrows: ${escrowError.message}`);
          }
          
          try {
            // Load escrows where user is arbiter
            const userArbitratedEscrows = await web3.loadArbitratedEscrows(web3.account);
            setArbitratedEscrows(userArbitratedEscrows);
          } catch (arbitratedError) {
            console.error("Error loading arbitrated escrows:", arbitratedError);
            setArbitratedEscrows([]);
            // Show error if we haven't already shown one for user escrows
            if (!error) {
              setError(`Error loading arbitrated escrows: ${arbitratedError.message}`);
            }
          }
        } catch (error) {
          console.error("General error loading escrows:", error);
          setError(`Error: ${error.message}`);
        } finally {
          setLoading(false);
        }
      }
    };
    
    loadEscrows();
  }, [web3.connected, web3.account, web3.loadUserEscrows, web3.loadArbitratedEscrows, error]);

  // Execute escrow action with error handling
  const executeEscrowAction = async (action, escrowId, recipient = null) => {
    try {
      setLoading(true);
      setError('');
      
      let result;
      
      switch (action) {
        case 'release':
          result = await web3.executeContractTransaction('releaseFunds', escrowId);
          break;
        case 'refund':
          result = await web3.executeContractTransaction('refundBuyer', escrowId);
          break;
        case 'dispute':
          result = await web3.executeContractTransaction('raiseDispute', escrowId);
          break;
        case 'resolve':
          if (!recipient) {
            setError('Recipient address is required to resolve a dispute');
            setLoading(false);
            return;
          }
          result = await web3.executeContractTransaction('resolveDispute', escrowId, recipient);
          break;
        default:
          setError('Invalid action');
          setLoading(false);
          return;
      }
      
      setSuccessMessage(`Action ${action} executed successfully! Transaction hash: ${result.hash}`);
      
      // Reload escrows after action
      try {
        const userEscrows = await web3.loadUserEscrows(web3.account);
        setEscrows(userEscrows);
        
        const userArbitratedEscrows = await web3.loadArbitratedEscrows(web3.account);
        setArbitratedEscrows(userArbitratedEscrows);
      } catch (loadError) {
        console.warn("Error reloading escrows after action:", loadError);
        // Continue without reloading if error occurs
      }
      
      return result;
    } catch (error) {
      console.error(`Error executing ${action}:`, error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Create new escrow
  const createEscrow = async (sellerAddress, arbiterAddress, amount) => {
    try {
      setLoading(true);
      setError('');
      
      const amountInWei = ethers.parseEther(amount);
      const result = await web3.executeContractTransaction(
        'createEscrow',
        sellerAddress,
        arbiterAddress,
        { value: amountInWei }
      );
      
      setSuccessMessage(`Escrow created successfully! Transaction hash: ${result.hash}`);
      
      // Reload escrows after creation
      try {
        const userEscrows = await web3.loadUserEscrows(web3.account);
        setEscrows(userEscrows);
      } catch (loadError) {
        console.warn("Error reloading escrows after creation:", loadError);
        // Continue without reloading if error occurs
      }
      
      return result;
    } catch (error) {
      console.error("Error creating escrow:", error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Get escrow details
  const getEscrowDetails = async (escrowId) => {
    try {
      setLoading(true);
      setError('');
      
      const escrow = await web3.getEscrowWithCache(escrowId);
      return escrow;
    } catch (error) {
      console.error("Error viewing escrow:", error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <Web3Context.Provider
      value={{
        ...web3,
        escrows,
        arbitratedEscrows,
        loading,
        error,
        successMessage,
        setError,
        setSuccessMessage,
        executeEscrowAction,
        createEscrow,
        getEscrowDetails
      }}
    >
      {children}
    </Web3Context.Provider>
  );
};

export const useWeb3Context = () => {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3Context must be used within a Web3Provider');
  }
  return context;
};
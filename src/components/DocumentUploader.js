import React, { useState } from 'react';
import { Form, Button, Alert, Spinner } from 'react-bootstrap';
import { create } from 'ipfs-http-client';

// Configure for public IPFS gateway (if possible, connect to Infura or Pinata with auth)
const projectId = '17913b5e655bd05ad05c'; // Add your Infura IPFS project ID
const projectSecret = '86f08ecea9882b3744a52f95ecfa22b6ef9eee16804de357f4fba4524440d1f3'; // Add your Infura IPFS project secret

// Configure IPFS client
const configureIpfsClient = () => {
  if (projectId && projectSecret) {
    const auth = 'Basic ' + Buffer.from(projectId + ':' + projectSecret).toString('base64');
    return create({
      host: 'ipfs.infura.io',
      port: 5001,
      protocol: 'https',
      headers: {
        authorization: auth,
      },
    });
  }
  return null;
};

/**
 * DocumentUploader component for uploading documents to IPFS
 * 
 * @param {Object} props Component props
 * @param {Function} props.onUpload Function to call when a document is uploaded
 * @param {string} props.currentHash Current document hash (if any)
 */
const DocumentUploader = ({ onUpload, currentHash = '' }) => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [ipfsUrl, setIpfsUrl] = useState('');
  const [documentHash, setDocumentHash] = useState(currentHash || '');
  
  // Handle file selection
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setError('');
    }
  };
  
  // Handle manual hash entry
  const handleHashChange = (e) => {
    setDocumentHash(e.target.value);
    if (onUpload) {
      onUpload(e.target.value);
    }
  };
  
  // Upload file to IPFS
  const uploadToIpfs = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const ipfs = configureIpfsClient();
      
      if (!ipfs) {
        // If IPFS client is not configured, simulate upload
        // In a real app, you would use a proper IPFS service
        setTimeout(() => {
          const fakeHash = `Qm${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
          setDocumentHash(fakeHash);
          setIpfsUrl(`https://ipfs.io/ipfs/${fakeHash}`);
          setSuccess('Document uploaded successfully (simulated)');
          if (onUpload) {
            onUpload(fakeHash);
          }
          setLoading(false);
        }, 2000);
        return;
      }
      
      // Read file as buffer
      const buffer = await file.arrayBuffer();
      
      // Upload to IPFS
      const result = await ipfs.add(buffer);
      const hash = result.path;
      
      setDocumentHash(hash);
      setIpfsUrl(`https://ipfs.io/ipfs/${hash}`);
      setSuccess('Document uploaded successfully!');
      
      if (onUpload) {
        onUpload(hash);
      }
    } catch (err) {
      console.error('Error uploading to IPFS:', err);
      setError('Failed to upload document. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="document-uploader">
      <Form.Group className="mb-3">
        <Form.Label>Document Hash</Form.Label>
        <Form.Control
          type="text"
          placeholder="QmHash..."
          value={documentHash}
          onChange={handleHashChange}
        />
        <Form.Text className="text-muted">
          Enter an IPFS hash or other document reference
        </Form.Text>
      </Form.Group>
      
      <div className="border rounded p-3 mb-3">
        <h6>Upload Document (Optional)</h6>
        <p className="text-muted small">
          Upload a document related to this escrow. The file will be stored on IPFS.
        </p>
        
        <Form.Group className="mb-3">
          <Form.Control
            type="file"
            onChange={handleFileChange}
            disabled={loading}
          />
        </Form.Group>
        
        <Button
          variant="outline-primary"
          size="sm"
          onClick={uploadToIpfs}
          disabled={!file || loading}
        >
          {loading ? (
            <>
              <Spinner animation="border" size="sm" /> Uploading...
            </>
          ) : (
            'Upload Document'
          )}
        </Button>
        
        {error && (
          <Alert variant="danger" className="mt-2 mb-0">
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert variant="success" className="mt-2 mb-0">
            {success}
            {ipfsUrl && (
              <div className="mt-1">
                <a href={ipfsUrl} target="_blank" rel="noopener noreferrer">
                  View on IPFS
                </a>
              </div>
            )}
          </Alert>
        )}
      </div>
    </div>
  );
};

export default DocumentUploader;
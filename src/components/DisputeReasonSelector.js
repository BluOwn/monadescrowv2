import React from 'react';
import { Form } from 'react-bootstrap';

/**
 * Component for selecting a dispute reason
 * 
 * @param {Object} props Component props
 * @param {number} props.value Currently selected reason code
 * @param {Function} props.onChange Function to call when reason changes
 * @param {boolean} props.disabled Whether the selector is disabled
 */
const DisputeReasonSelector = ({ value = 0, onChange, disabled = false }) => {
  // Dispute reasons from smart contract:
  // 0=ProductNotReceived, 1=ProductDamaged, 2=ProductNotAsDescribed, 
  // 3=ServiceNotProvided, 4=ServicePoor, 5=Other
  const reasons = [
    { code: 0, label: 'Product Not Received', description: 'The buyer has not received the product' },
    { code: 1, label: 'Product Damaged', description: 'The product was received but is damaged' },
    { code: 2, label: 'Product Not As Described', description: 'The product does not match the description' },
    { code: 3, label: 'Service Not Provided', description: 'The service was not provided' },
    { code: 4, label: 'Service Quality Poor', description: 'The service quality was below expectations' },
    { code: 5, label: 'Other', description: 'Other reason - please explain in the description' }
  ];
  
  // Handle reason change
  const handleChange = (e) => {
    const reasonCode = parseInt(e.target.value, 10);
    if (onChange) {
      onChange(reasonCode);
    }
  };
  
  // Get currently selected reason
  const selectedReason = reasons.find(reason => reason.code === value) || reasons[0];
  
  return (
    <div className="dispute-reason-selector">
      <Form.Group className="mb-3">
        <Form.Label>Dispute Reason</Form.Label>
        <Form.Select
          value={value}
          onChange={handleChange}
          disabled={disabled}
        >
          {reasons.map(reason => (
            <option key={reason.code} value={reason.code}>
              {reason.label}
            </option>
          ))}
        </Form.Select>
        <Form.Text className="text-muted">
          {selectedReason.description}
        </Form.Text>
      </Form.Group>
    </div>
  );
};

export default DisputeReasonSelector;
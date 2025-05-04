# Monad Escrow Service

A secure, decentralized escrow service built on Monad Testnet. This application allows users to create escrow agreements, manage funds, and resolve disputes using smart contracts.

![Monad Escrow Screenshot](https://placeholder-image.com/monad-escrow-screenshot.png)

## Features

- **Secure Escrow Agreements**: Lock funds in a trustless smart contract until conditions are met
- **Role-Based Actions**: Different functionality for buyers, sellers, and arbiters
- **Arbiter Controls**: Arbiters can refund buyers and resolve disputes
- **Dispute Resolution**: Integrated system for raising and resolving disputes
- **Full Testnet Support**: Works with Monad Testnet for gas-efficient transactions
- **Modern UI**: Clean, responsive interface built with React and Bootstrap

## Demo

Visit the live demo at: [https://monad-escrow.vercel.app](https://monad-escrow.vercel.app)

## How to Use

### Setup

1. **Install MetaMask**: If you don't have it already, install the [MetaMask browser extension](https://metamask.io/).

2. **Connect to Monad Testnet**: Configure MetaMask to connect to Monad Testnet with these settings:
   - **Network Name**: Monad Testnet
   - **RPC URL**: https://testnet-rpc.monad.xyz
   - **Chain ID**: 10143
   - **Currency Symbol**: MON
   - **Block Explorer URL**: https://testnet.monadexplorer.com

3. **Get Test Tokens**: Visit the [Monad Testnet faucet](https://testnet.monad.xyz/) to get test MON tokens.

### Creating an Escrow

1. **Connect Your Wallet**: Click the "Connect Wallet" button and approve the connection in MetaMask.

2. **Create a New Escrow**:
   - Go to the "Create Escrow" tab
   - Enter the seller's wallet address
   - Enter a trusted third-party arbiter's wallet address
   - Specify the amount of MON to lock in escrow
   - Click "Create Escrow" and confirm the transaction in MetaMask

3. **Share the Escrow ID**: Once created, share the Escrow ID with the seller and arbiter so they can access it.

### Managing an Escrow

1. **Buyer Actions**:
   - **Release Funds**: When satisfied with the goods/services, release funds to the seller
   - **Raise Dispute**: If there's a problem, raise a dispute to involve the arbiter

2. **Seller Actions**:
   - **Refund Buyer**: Return funds to the buyer if needed
   - **Raise Dispute**: If there's a problem, raise a dispute to involve the arbiter

3. **Arbiter Actions**:
   - **Refund Buyer**: Arbiters can refund the buyer at any time, even without a dispute
   - **Resolve Dispute**: When a dispute is raised, review the case and decide in favor of either the buyer or seller

### Finding an Escrow

1. Go to the "Find Escrow" tab
2. Enter the Escrow ID
3. Click "Find Escrow" to view details and available actions

### Arbitrated Escrows

If you are chosen as an arbiter for any escrow, you'll see a badge count on the "Arbitrated Escrows" tab. This tab shows all escrows where you serve as the arbiter.

As an arbiter, you have special privileges:
1. You can refund the buyer at any time if you believe it's necessary
2. When a dispute is raised, you can decide who receives the funds

## User Roles

- **Buyer**: The party who creates the escrow and deposits funds
- **Seller**: The party who receives the funds when conditions are met
- **Arbiter**: A trusted third party who can resolve disputes and refund buyers when needed

## Escrow Lifecycle

1. **Creation**: Buyer creates an escrow, specifying seller, arbiter, and amount
2. **Active**: Funds are held in the smart contract
3. **Resolution**: 
   - **Normal Completion**: Buyer releases funds to seller
   - **Refund**: Seller or arbiter returns funds to buyer
   - **Dispute**: Either buyer or seller raises a dispute
   - **Dispute Resolution**: Arbiter decides who receives the funds

## Smart Contract Functionality

The escrow service is powered by a smart contract with the following features:

- **Fund Locking**: Securely holds funds until conditions are met
- **Role-Based Access Control**: Only authorized parties can perform specific actions
- **Arbiter Powers**: Arbiters can refund buyers and resolve disputes
- **Dispute Mechanism**: Built-in system for handling disagreements
- **Event Tracking**: All actions are logged on the blockchain for transparency

## Development

### Prerequisites

- Node.js (v14 or later)
- npm or yarn
- MetaMask browser extension

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-github-username/monad-escrow.git
   cd monad-escrow
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Update the contract address:
   In `src/App.js`, replace `YOUR_DEPLOYED_CONTRACT_ADDRESS` with your deployed contract address.

4. Start the development server:
   ```bash
   npm start
   ```

5. Open [http://localhost:3000](http://localhost:3000) to view the app in your browser.

### Deployment

1. Build the production version:
   ```bash
   npm run build
   ```

2. Deploy to your preferred hosting service (e.g., Vercel, Netlify, GitHub Pages).

## Smart Contract

The Escrow Service smart contract is deployed on Monad Testnet. The contract code is available in the `contracts` directory.

### Contract Address

Monad Testnet: `YOUR_DEPLOYED_CONTRACT_ADDRESS`

## Security Considerations

- Always verify addresses before creating an escrow
- Choose a trusted and impartial arbiter
- Never share your private keys
- For large transactions, test with a small amount first
- Remember that arbiters have significant control and can refund buyers at any time

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Creator

- Twitter: [@Oprimedev](https://twitter.com/Oprimedev)
- Wallet: 0x0b977acab5d9b8f654f48090955f5e00973be0fe

## License

This project is licensed under the MIT License - see the LICENSE file for details.
# Naafe Backend

## Overview

This is the backend server for Naafe, a service marketplace platform connecting service seekers with providers. It handles user authentication, job requests, offers, negotiations, payments, and more.

## Core Business Flow

### Chat-First Approach with Negotiation and Escrow

Our platform uses a chat-first approach to service booking, enabling safe and transparent interactions:

1. **Service Request Creation**
   - Seeker posts a job request
   - Providers view and respond to job requests

2. **Initial Offer with Chat**
   - Provider makes an offer on a job request
   - A conversation is automatically created for chat between seeker and provider
   - Offer status is set to "negotiating"

3. **Negotiation Phase (NEW)**
   - Seeker and provider negotiate all terms through chat:
     - Price
     - Date and time
     - Materials
     - Service scope
   - Both parties must confirm all terms using the negotiation system
   - When both confirm, offer status changes to "agreement_reached"

4. **Acceptance and Payment**
   - Seeker accepts the offer (status changes to "accepted")
   - Seeker makes payment which goes to escrow
   - Payment is held in escrow until service is completed
   - Offer status changes to "in_progress"

5. **Service Delivery**
   - Provider performs the service on the agreed date
   - Seeker marks the service as completed
   - Funds are released from escrow to the provider
   - Offer status changes to "completed"

6. **Cancellation and Refund Policy**
   - Either party can request cancellation
   - Refund policy based on time before service:
     - >12 hours before service: 100% refund
     - <12 hours before service: 70% refund (provider keeps 30%)

## Offer Status Flow

```
PENDING → NEGOTIATING → AGREEMENT_REACHED → ACCEPTED → IN_PROGRESS → COMPLETED
                                                                   ↘ CANCELLED
```

## API Endpoints

See the following documentation files for detailed API information:

- [Offer Routes Documentation](./OFFER_ROUTES_DOCUMENTATION.md)
- [API Documentation](./API_DOCUMENTATION.md)
- [Chat System README](./CHAT_SYSTEM_README.md)

## Technology Stack

- **Node.js** - Runtime environment
- **Express** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **JWT** - Authentication
- **Socket.IO** - Real-time communication
- **Stripe** - Payment processing

## Environment Setup

1. Create a `.env` file with the following variables:

```
MONGODB_URI=<your-mongodb-uri>
JWT_SECRET=<your-jwt-secret>
STRIPE_SECRET_KEY=<your-stripe-secret-key>
STRIPE_WEBHOOK_SECRET=<your-stripe-webhook-secret>
FRONTEND_URL=http://localhost:5173
PORT=3000
NODE_ENV=development
```

2. Install dependencies:

```
npm install
```

3. Start the server:

```
npm start
```

## Development

- **Development mode**: `npm run dev` (with nodemon)
- **Run tests**: `npm test`

## Models

The following models define the core business entities:

- **User**: Seeker and Provider user accounts
- **JobRequest**: Service requests created by seekers
- **Offer**: Proposals from providers to seekers
- **Conversation**: Chat container between provider and seeker
- **Message**: Individual chat messages
- **Payment**: Payment transactions with escrow support
- **Review**: Ratings and feedback after service completion 
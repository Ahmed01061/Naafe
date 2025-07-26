# Offer Routes Documentation

This document provides comprehensive documentation for the refactored offer routes in the Naafe' platform.

## Base URL
All offer routes are prefixed with `/api/offers`

## Authentication
All routes require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Route Overview

| Method | Path | Description | Access |
|--------|------|-------------|--------|
| POST | `/api/offers/requests/:jobRequestId` | Create an offer for a job request | Providers only |
| GET | `/api/offers/requests/:jobRequestId` | Get all offers for a job request | Any authenticated user |
| GET | `/api/offers` | Get own offers | Providers only |
| GET | `/api/offers/:offerId` | Get specific offer by ID | Offer owner, job request owner, or admin |
| PATCH | `/api/offers/:offerId` | Update an offer | Offer owner only |
| DELETE | `/api/offers/:offerId` | Delete/withdraw an offer | Offer owner only |
| POST | `/api/offers/:offerId/accept` | Accept an offer | Job request owner only |
| POST | `/api/offers/:offerId/reject` | Reject an offer | Job request owner only |
| PATCH | `/api/offers/:offerId/negotiation` | Update negotiation terms | Provider or seeker |
| POST | `/api/offers/:offerId/confirm-negotiation` | Confirm negotiation terms | Provider or seeker |
| POST | `/api/offers/:offerId/reset-confirmation` | Reset negotiation confirmation | Provider or seeker |
| GET | `/api/offers/:offerId/negotiation-history` | Get negotiation history | Provider or seeker |
| POST | `/api/offers/:offerId/process-payment` | Process escrow payment | Seeker only |
| POST | `/api/offers/:offerId/complete` | Mark service as completed | Seeker only |
| POST | `/api/offers/:offerId/cancel-request` | Request service cancellation | Provider or seeker |
| POST | `/api/offers/:offerId/process-cancellation` | Process cancellation | Admin only |

---

## Detailed Route Documentation

### 1. Create Offer

**Route:** `POST /api/offers/requests/:jobRequestId`

**Description:** Create a new offer for a specific job request. Creates a conversation automatically.

**Access:** Providers only

**Parameters:**
- `jobRequestId` (string, required): ID of the job request

**Request Body:**
```json
{
  "budget": {
    "min": 2500,
    "max": 3000,
    "currency": "EGP"
  },
  "message": "I can complete this job efficiently and on time",
  "estimatedTimeDays": 3,
  "availableDates": ["2024-01-01T00:00:00.000Z", "2024-01-02T00:00:00.000Z"],
  "timePreferences": ["morning", "afternoon"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "offer_id",
    "budget": {
      "min": 2500,
      "max": 3000,
      "currency": "EGP"
    },
    "message": "I can complete this job efficiently and on time",
    "estimatedTimeDays": 3,
    "availableDates": ["2024-01-01T00:00:00.000Z", "2024-01-02T00:00:00.000Z"],
    "timePreferences": ["morning", "afternoon"],
    "status": "negotiating",
    "conversation": "conversation_id",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Offer created successfully"
}
```

**Flow Notes:**
- When an offer is created, its status is set to 'negotiating'
- A conversation is automatically created for chat between provider and seeker
- Seeker and provider must discuss and reach agreement on all terms through chat
- Only after both parties confirm all negotiation terms can the offer be accepted

---

### 2. Get All Offers for Job Request

**Route:** `GET /api/offers/requests/:jobRequestId`

**Description:** Get all offers for a specific job request

**Access:** Any authenticated user

**Parameters:**
- `jobRequestId` (string, required): ID of the job request
- `status` (string, optional): Filter by offer status (pending, negotiating, agreement_reached, accepted, rejected, withdrawn)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "offer_id_1",
      "provider": {
        "_id": "provider_id",
        "name": "Provider Name",
        "email": "provider@example.com",
        "phone": "+1234567890"
      },
      "budget": {
        "min": 2500,
        "max": 3000,
        "currency": "EGP"
      },
      "status": "negotiating",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "message": "Offers retrieved successfully"
}
```

---

### 3. Get Own Offers

**Route:** `GET /api/offers`

**Description:** Get all offers created by the authenticated provider

**Access:** Providers only

**Query Parameters:**
- `status` (string, optional): Filter by offer status (pending, negotiating, agreement_reached, accepted, rejected, withdrawn)
- `jobRequest` (string, optional): Filter by job request ID

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "offer_id",
      "jobRequest": {
        "_id": "job_request_id",
        "title": "Job Request Title"
      },
      "budget": {
        "min": 2500,
        "max": 3000,
        "currency": "EGP"
      },
      "status": "negotiating",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "message": "Offers retrieved successfully"
}
```

---

### 4. Get Specific Offer

**Route:** `GET /api/offers/:offerId`

**Description:** Get details of a specific offer

**Access:** Offer owner, job request owner, or admin

**Parameters:**
- `offerId` (string, required): ID of the offer

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "offer_id",
    "jobRequest": {
      "_id": "job_request_id",
      "title": "Job Request Title",
      "description": "Job request description"
    },
    "provider": {
      "_id": "provider_id",
      "name": "Provider Name",
      "email": "provider@example.com"
    },
    "budget": {
      "min": 2500,
      "max": 3000,
      "currency": "EGP"
    },
    "message": "I can complete this job efficiently and on time",
    "status": "negotiating",
    "negotiation": {
      "price": 2800,
      "date": "2024-01-05T00:00:00.000Z",
      "time": "10:00 AM",
      "materials": "I'll bring all necessary tools",
      "scope": "Full service including cleaning afterward",
      "seekerConfirmed": false,
      "providerConfirmed": true
    },
    "conversation": "conversation_id",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Offer retrieved successfully"
}
```

---

### 5. Update Offer

**Route:** `PATCH /api/offers/:offerId`

**Description:** Update an offer (only pending/negotiating offers can be updated)

**Access:** Offer owner only

**Parameters:**
- `offerId` (string, required): ID of the offer to update

**Request Body:**
```json
{
  "budget": {
    "min": 2800,
    "max": 3000,
    "currency": "EGP"
  },
  "message": "Updated offer message with better terms",
  "estimatedTimeDays": 2
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "offer_id",
    "budget": {
      "min": 2800,
      "max": 3000,
      "currency": "EGP"
    },
    "message": "Updated offer message with better terms",
    "estimatedTimeDays": 2,
    "status": "negotiating",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Offer updated successfully"
}
```

**Error Cases:**
- Offer not found
- Access denied (not offer owner)
- Can only update pending/negotiating offers
- Budget outside job request range
- Invalid validation data

---

### 6. Delete Offer

**Route:** `DELETE /api/offers/:offerId`

**Description:** Delete/withdraw an offer (only pending/negotiating offers can be deleted)

**Access:** Offer owner only

**Parameters:**
- `offerId` (string, required): ID of the offer to delete

**Response:**
```json
{
  "success": true,
  "message": "Offer deleted successfully"
}
```

**Error Cases:**
- Offer not found
- Access denied (not offer owner)
- Can only delete pending/negotiating offers

---

### 7. Update Negotiation Terms

**Route:** `PATCH /api/offers/:offerId/negotiation`

**Description:** Update negotiation terms for an offer

**Access:** Provider or seeker

**Parameters:**
- `offerId` (string, required): ID of the offer

**Request Body:**
```json
{
  "price": 2800,
  "date": "2024-01-05T00:00:00.000Z",
  "time": "10:00 AM",
  "materials": "I'll bring all necessary tools",
  "scope": "Full service including cleaning afterward"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "price": 2800,
    "date": "2024-01-05T00:00:00.000Z",
    "time": "10:00 AM",
    "materials": "I'll bring all necessary tools",
    "scope": "Full service including cleaning afterward",
    "seekerConfirmed": false,
    "providerConfirmed": false,
    "lastModifiedBy": "user_id",
    "lastModifiedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Negotiation terms updated successfully"
}
```

**Error Cases:**
- Offer not found
- Access denied
- Can only update negotiation for pending/negotiating offers
- No changes to negotiation terms

---

### 8. Confirm Negotiation

**Route:** `POST /api/offers/:offerId/confirm-negotiation`

**Description:** Confirm negotiation terms for an offer

**Access:** Provider or seeker

**Parameters:**
- `offerId` (string, required): ID of the offer

**Response:**
```json
{
  "success": true,
  "data": {
    "price": 2800,
    "date": "2024-01-05T00:00:00.000Z",
    "time": "10:00 AM",
    "materials": "I'll bring all necessary tools",
    "scope": "Full service including cleaning afterward",
    "seekerConfirmed": true,
    "providerConfirmed": true,
    "lastModifiedBy": "user_id",
    "lastModifiedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Negotiation confirmed successfully"
}
```

**Notes:**
- All negotiation fields must be set before confirmation
- If both parties confirm, the offer status changes to 'agreement_reached'
- After agreement is reached, the seeker can accept the offer

**Error Cases:**
- Offer not found
- Access denied
- Can only confirm negotiation for pending/negotiating offers
- Required negotiation fields missing

---

### 9. Reset Negotiation Confirmation

**Route:** `POST /api/offers/:offerId/reset-confirmation`

**Description:** Reset negotiation confirmations for an offer

**Access:** Provider or seeker

**Parameters:**
- `offerId` (string, required): ID of the offer

**Response:**
```json
{
  "success": true,
  "data": {
    "price": 2800,
    "date": "2024-01-05T00:00:00.000Z",
    "time": "10:00 AM",
    "materials": "I'll bring all necessary tools",
    "scope": "Full service including cleaning afterward",
    "seekerConfirmed": false,
    "providerConfirmed": false,
    "lastModifiedBy": "user_id",
    "lastModifiedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Negotiation confirmation reset successfully"
}
```

**Error Cases:**
- Offer not found
- Access denied
- Can only reset negotiation for pending/negotiating offers

---

### 10. Accept Offer

**Route:** `POST /api/offers/:offerId/accept`

**Description:** Accept an offer (only job request owner/seeker can accept)

**Access:** Job request owner only

**Parameters:**
- `offerId` (string, required): ID of the offer to accept

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "offer_id",
    "status": "accepted",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "تم قبول العرض بنجاح. يرجى إكمال عملية الدفع للإسكرو لتأكيد الخدمة"
}
```

**Notes:**
- Only offers with status 'agreement_reached' can be accepted
- Both parties must have confirmed all negotiation terms
- All negotiation fields must be set
- After acceptance, payment to escrow is required

**Error Cases:**
- Offer not found
- Access denied (not job request owner)
- Agreement not reached or confirmations incomplete
- Required negotiation fields missing

---

### 11. Process Escrow Payment

**Route:** `POST /api/offers/:offerId/process-payment`

**Description:** Process escrow payment for an accepted offer

**Access:** Seeker only

**Parameters:**
- `offerId` (string, required): ID of the offer

**Request Body:**
```json
{
  "paymentId": "payment_id"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "offer_id",
    "status": "in_progress",
    "payment": {
      "status": "escrowed",
      "amount": 2800,
      "currency": "EGP",
      "escrowedAt": "2024-01-01T00:00:00.000Z",
      "scheduledDate": "2024-01-05T00:00:00.000Z",
      "scheduledTime": "10:00 AM",
      "paymentId": "payment_id"
    }
  },
  "message": "تم معالجة الدفع وتحويله إلى حساب الضمان بنجاح"
}
```

**Error Cases:**
- Offer not found
- Access denied
- Can only process escrow payments for accepted offers

---

### 12. Mark Service Completed

**Route:** `POST /api/offers/:offerId/complete`

**Description:** Mark service as completed and release funds from escrow

**Access:** Seeker only

**Parameters:**
- `offerId` (string, required): ID of the offer

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "offer_id",
    "status": "completed",
    "payment": {
      "status": "released",
      "amount": 2800,
      "currency": "EGP",
      "escrowedAt": "2024-01-01T00:00:00.000Z",
      "releasedAt": "2024-01-06T00:00:00.000Z"
    }
  },
  "message": "تم إكمال الخدمة وتحرير الدفع بنجاح"
}
```

**Error Cases:**
- Offer not found
- Access denied (not seeker)
- Only in-progress services can be marked as completed
- Payment must be in escrow

---

### 13. Request Service Cancellation

**Route:** `POST /api/offers/:offerId/cancel-request`

**Description:** Request service cancellation

**Access:** Provider or seeker

**Parameters:**
- `offerId` (string, required): ID of the offer

**Request Body:**
```json
{
  "reason": "Unable to proceed due to emergency"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "refundPercentage": 100,
    "cancellation": {
      "status": "requested",
      "requestedBy": "user_id",
      "requestedAt": "2024-01-01T00:00:00.000Z",
      "reason": "Unable to proceed due to emergency"
    }
  },
  "message": "تم طلب إلغاء الخدمة بنجاح"
}
```

**Notes:**
- Cancellation refund percentage is calculated based on time before scheduled service:
  - More than 12 hours: 100% refund
  - Less than 12 hours: 70% refund (provider keeps 30%)

**Error Cases:**
- Offer not found
- Access denied
- Only accepted or in-progress services can be cancelled
- Cancellation request already pending

---

### 14. Process Cancellation

**Route:** `POST /api/offers/:offerId/process-cancellation`

**Description:** Process cancellation request (admin only)

**Access:** Admin only

**Parameters:**
- `offerId` (string, required): ID of the offer

**Response:**
```json
{
  "success": true,
  "data": {
    "refundPercentage": 100,
    "status": "cancelled"
  },
  "message": "تم معالجة طلب إلغاء الخدمة بنجاح"
}
```

**Error Cases:**
- Offer not found
- No pending cancellation request
- Access denied (not admin) 
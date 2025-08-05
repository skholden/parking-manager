# Parking Manager Backend API

A Node.js/Express backend API for the Parking Manager application that provides multi-session support with SQLite database storage.

## Features

- 🚀 RESTful API for parking payment management
- 💾 SQLite database for persistent storage
- 🔒 Security middleware (Helmet, CORS, Rate limiting)
- 📊 Payment status tracking and statistics
- 🔍 Audit trail for all operations
- ⚡ Fast license plate lookups with indexing
- 🛡️ Input validation and error handling

## API Endpoints

### Health Check
- `GET /api/health` - Check API status

### Payments
- `GET /api/payments/:licensePlate` - Get payment status for a license plate
- `POST /api/payments` - Create a new parking payment
- `GET /api/payments` - Get recent payments (admin)
- `POST /api/payments/batch-status` - Check multiple plates at once

### Statistics
- `GET /api/stats` - Get parking statistics

## Database Schema

The API uses SQLite with the following tables:

### parking_payments
- `id` - Primary key
- `license_plate` - License plate number (indexed)
- `paid` - Payment status boolean
- `expiration_time` - When parking expires (indexed)
- `duration` - Duration in hours
- `cost` - Cost in dollars
- `paid_at` - Payment timestamp
- `created_at` - Record creation time
- `updated_at` - Last update time

### payment_audit
- `id` - Primary key
- `license_plate` - License plate number
- `action` - Action performed (payment, scan, verification)
- `details` - Additional details
- `timestamp` - When action occurred
- `ip_address` - Client IP address
- `user_agent` - Client user agent

## Setup Instructions

### Prerequisites
- Node.js 16+ installed
- npm or yarn package manager

### Installation

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the server:**
   ```bash
   # Development mode with auto-restart
   npm run dev

   # Production mode
   npm start
   ```

4. **Verify installation:**
   - Open browser to `http://localhost:3000/api/health`
   - Should see: `{"status":"OK","timestamp":"...","service":"parking-manager-api"}`

### Environment Configuration

Create a `.env` file for production settings:

```env
PORT=3000
NODE_ENV=production
CORS_ORIGINS=https://your-domain.com,https://www.your-domain.com
```

## Usage Examples

### Create a Payment
```javascript
// POST /api/payments
{
  "licensePlate": "AB12 CDE",
  "duration": 2,
  "cost": 3.50
}
```

### Check Payment Status
```javascript
// GET /api/payments/AB12%20CDE
{
  "licensePlate": "AB12 CDE",
  "status": "paid",
  "expirationTime": "2024-01-01T14:00:00.000Z",
  "payment": {
    "id": 1,
    "license_plate": "AB12 CDE",
    "duration": 2,
    "cost": 3.50,
    "paid_at": "2024-01-01T12:00:00.000Z"
  }
}
```

### Batch Status Check
```javascript
// POST /api/payments/batch-status
{
  "licensePlates": ["AB12 CDE", "XY98 ZEN"]
}
```

## Frontend Integration

The frontend automatically detects and uses the API when available:

1. **API Available**: All operations use the backend database
2. **API Unavailable**: Falls back to localStorage for offline functionality

The frontend will show connection status in the browser console:
- ✅ "Using backend API for data storage"
- ⚠️ "API unavailable, falling back to localStorage"

## Development

### Database Management

The database is automatically created on first run. Location:
- `backend/database/parking.db`

### Logging

The API includes comprehensive logging:
- HTTP requests (Morgan middleware)
- Database operations
- Error handling
- Connection status

### Security Features

- **Helmet**: Security headers
- **CORS**: Cross-origin request handling
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Input Validation**: All endpoints validate input data
- **SQL Injection Protection**: Parameterized queries

## Deployment

### Production Checklist

1. Set `NODE_ENV=production`
2. Configure CORS origins for your domain
3. Set up reverse proxy (nginx/Apache)
4. Enable HTTPS
5. Set up process manager (PM2)
6. Configure backup for SQLite database

### Docker Deployment (Optional)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## Troubleshooting

### Common Issues

1. **Port already in use**: Change PORT in environment or kill process
2. **Database locked**: Ensure only one instance is running
3. **CORS errors**: Check origin configuration in server.js
4. **API timeout**: Increase timeout in frontend api.js

### Logs Location

- Console output shows all operations
- Database file: `backend/database/parking.db`
- Error details logged to console with timestamps

## Contributing

1. Follow existing code style
2. Add tests for new features
3. Update API documentation
4. Test both API and fallback modes
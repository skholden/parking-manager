const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const DatabaseManager = require('./database/database');

const app = express();
const PORT = process.env.PORT || 3000;
const db = new DatabaseManager();

// Middleware
app.use(helmet());
app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? 
        ['https://your-domain.com'] : 
        ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:8080']
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// API Routes

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        service: 'parking-manager-api'
    });
});

// Get payment status for a license plate
app.get('/api/payments/:licensePlate', async (req, res) => {
    try {
        const { licensePlate } = req.params;
        
        if (!licensePlate || licensePlate.trim().length === 0) {
            return res.status(400).json({ 
                error: 'License plate is required' 
            });
        }

        const paymentStatus = await db.getPaymentStatus(licensePlate);
        
        // Add audit entry
        await db.addAuditEntry(
            licensePlate, 
            'scan', 
            `Status check: ${paymentStatus.status}`,
            req.ip,
            req.get('User-Agent')
        );

        res.json({
            licensePlate: licensePlate.toUpperCase(),
            ...paymentStatus,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error getting payment status:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            message: 'Failed to retrieve payment status'
        });
    }
});

// Create a new payment
app.post('/api/payments', async (req, res) => {
    try {
        const { licensePlate, duration, cost } = req.body;

        // Validation
        if (!licensePlate || !duration || !cost) {
            return res.status(400).json({ 
                error: 'Missing required fields: licensePlate, duration, cost' 
            });
        }

        if (typeof duration !== 'number' || duration <= 0) {
            return res.status(400).json({ 
                error: 'Duration must be a positive number' 
            });
        }

        if (typeof cost !== 'number' || cost <= 0) {
            return res.status(400).json({ 
                error: 'Cost must be a positive number' 
            });
        }

        // Clean and validate license plate format
        const cleanPlate = licensePlate.trim().toUpperCase();
        if (cleanPlate.length < 2 || cleanPlate.length > 10) {
            return res.status(400).json({ 
                error: 'License plate must be between 2 and 10 characters' 
            });
        }

        const payment = await db.addPayment(cleanPlate, duration, cost);
        
        // Add audit entry
        await db.addAuditEntry(
            cleanPlate, 
            'payment', 
            `Payment: ${duration}h for $${cost}`,
            req.ip,
            req.get('User-Agent')
        );

        res.status(201).json({
            success: true,
            payment,
            message: `Payment successful for ${cleanPlate}`
        });

    } catch (error) {
        console.error('Error processing payment:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            message: 'Failed to process payment'
        });
    }
});

// Get recent payments (admin endpoint)
app.get('/api/payments', async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 50, 100); // Max 100 records
        const payments = await db.getRecentPayments(limit);
        
        res.json({
            payments,
            count: payments.length,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error getting recent payments:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            message: 'Failed to retrieve payments'
        });
    }
});

// Batch status check for multiple plates (useful for attendant mode)
app.post('/api/payments/batch-status', async (req, res) => {
    try {
        const { licensePlates } = req.body;

        if (!Array.isArray(licensePlates) || licensePlates.length === 0) {
            return res.status(400).json({ 
                error: 'licensePlates must be a non-empty array' 
            });
        }

        if (licensePlates.length > 20) {
            return res.status(400).json({ 
                error: 'Maximum 20 license plates per batch request' 
            });
        }

        const results = await Promise.all(
            licensePlates.map(async (plate) => {
                try {
                    const status = await db.getPaymentStatus(plate);
                    return {
                        licensePlate: plate.toUpperCase(),
                        ...status
                    };
                } catch (error) {
                    return {
                        licensePlate: plate.toUpperCase(),
                        error: 'Failed to check status'
                    };
                }
            })
        );

        res.json({
            results,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error in batch status check:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            message: 'Failed to process batch status check'
        });
    }
});

// Statistics endpoint
app.get('/api/stats', async (req, res) => {
    try {
        const payments = await db.getRecentPayments(1000); // Get more for stats
        
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        const stats = {
            total: payments.length,
            today: payments.filter(p => new Date(p.paid_at) >= today).length,
            active: payments.filter(p => new Date(p.expiration_time) > now).length,
            expired: payments.filter(p => new Date(p.expiration_time) <= now).length,
            totalRevenue: payments.reduce((sum, p) => sum + parseFloat(p.cost), 0).toFixed(2),
            todayRevenue: payments
                .filter(p => new Date(p.paid_at) >= today)
                .reduce((sum, p) => sum + parseFloat(p.cost), 0)
                .toFixed(2)
        };

        res.json({
            stats,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error getting statistics:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            message: 'Failed to retrieve statistics'
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ 
        error: 'Internal server error',
        message: 'Something went wrong'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ 
        error: 'Not found',
        message: 'The requested endpoint does not exist'
    });
});

// Initialize database and start server
async function startServer() {
    try {
        await db.initialize();
        
        app.listen(PORT, () => {
            console.log(`🚀 Parking Manager API server running on port ${PORT}`);
            console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
            console.log(`🅿️  API docs: http://localhost:${PORT}/api/`);
        });

        // Graceful shutdown
        process.on('SIGINT', () => {
            console.log('\n🔄 Gracefully shutting down...');
            db.close();
            process.exit(0);
        });

        process.on('SIGTERM', () => {
            console.log('\n🔄 Gracefully shutting down...');
            db.close();
            process.exit(0);
        });

    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();
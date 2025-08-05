const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

class DatabaseManager {
    constructor() {
        this.db = null;
        this.dbPath = path.join(__dirname, 'parking.db');
        this.schemaPath = path.join(__dirname, 'schema.sql');
    }

    async initialize() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    console.error('Error opening database:', err);
                    reject(err);
                    return;
                }
                console.log('Connected to SQLite database');
                this.createTables()
                    .then(() => resolve())
                    .catch(reject);
            });
        });
    }

    async createTables() {
        return new Promise((resolve, reject) => {
            const schema = fs.readFileSync(this.schemaPath, 'utf8');
            this.db.exec(schema, (err) => {
                if (err) {
                    console.error('Error creating tables:', err);
                    reject(err);
                    return;
                }
                console.log('Database tables created successfully');
                resolve();
            });
        });
    }

    // Add or update a parking payment
    async addPayment(licensePlate, duration, cost) {
        return new Promise((resolve, reject) => {
            const expirationTime = new Date();
            expirationTime.setHours(expirationTime.getHours() + duration);
            
            const query = `
                INSERT OR REPLACE INTO parking_payments 
                (license_plate, paid, expiration_time, duration, cost, paid_at, updated_at)
                VALUES (?, 1, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `;
            
            this.db.run(query, [
                licensePlate.toUpperCase(),
                expirationTime.toISOString(),
                duration,
                cost
            ], function(err) {
                if (err) {
                    console.error('Error adding payment:', err);
                    reject(err);
                    return;
                }
                resolve({
                    id: this.lastID,
                    licensePlate: licensePlate.toUpperCase(),
                    paid: true,
                    expirationTime: expirationTime.toISOString(),
                    duration,
                    cost,
                    paidAt: new Date().toISOString()
                });
            });
        });
    }

    // Get payment status for a license plate
    async getPaymentStatus(licensePlate) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT * FROM parking_payments 
                WHERE license_plate = ? AND paid = 1
                ORDER BY paid_at DESC 
                LIMIT 1
            `;
            
            this.db.get(query, [licensePlate.toUpperCase()], (err, row) => {
                if (err) {
                    console.error('Error getting payment status:', err);
                    reject(err);
                    return;
                }
                
                if (!row) {
                    resolve({ status: 'unpaid', expirationTime: null });
                    return;
                }
                
                const expirationTime = new Date(row.expiration_time);
                const now = new Date();
                
                if (expirationTime <= now) {
                    resolve({ 
                        status: 'expired', 
                        expirationTime: row.expiration_time,
                        payment: row 
                    });
                } else {
                    resolve({ 
                        status: 'paid', 
                        expirationTime: row.expiration_time,
                        payment: row 
                    });
                }
            });
        });
    }

    // Get all recent payments (for reporting/admin purposes)
    async getRecentPayments(limit = 50) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT * FROM parking_payments 
                ORDER BY paid_at DESC 
                LIMIT ?
            `;
            
            this.db.all(query, [limit], (err, rows) => {
                if (err) {
                    console.error('Error getting recent payments:', err);
                    reject(err);
                    return;
                }
                resolve(rows);
            });
        });
    }

    // Add audit trail entry
    async addAuditEntry(licensePlate, action, details = null, ipAddress = null, userAgent = null) {
        return new Promise((resolve, reject) => {
            const query = `
                INSERT INTO payment_audit 
                (license_plate, action, details, ip_address, user_agent)
                VALUES (?, ?, ?, ?, ?)
            `;
            
            this.db.run(query, [
                licensePlate.toUpperCase(),
                action,
                details,
                ipAddress,
                userAgent
            ], function(err) {
                if (err) {
                    console.error('Error adding audit entry:', err);
                    reject(err);
                    return;
                }
                resolve({ id: this.lastID });
            });
        });
    }

    // Clean up expired payments (optional maintenance)
    async cleanupExpiredPayments(daysOld = 30) {
        return new Promise((resolve, reject) => {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysOld);
            
            const query = `
                DELETE FROM parking_payments 
                WHERE expiration_time < ? AND paid_at < ?
            `;
            
            this.db.run(query, [
                cutoffDate.toISOString(),
                cutoffDate.toISOString()
            ], function(err) {
                if (err) {
                    console.error('Error cleaning up expired payments:', err);
                    reject(err);
                    return;
                }
                resolve({ deletedCount: this.changes });
            });
        });
    }

    // Close database connection
    close() {
        if (this.db) {
            this.db.close((err) => {
                if (err) {
                    console.error('Error closing database:', err);
                } else {
                    console.log('Database connection closed');
                }
            });
        }
    }
}

module.exports = DatabaseManager;
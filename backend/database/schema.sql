-- Parking Management Database Schema

-- Table for storing parking payments
CREATE TABLE IF NOT EXISTS parking_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    license_plate TEXT NOT NULL,
    paid BOOLEAN NOT NULL DEFAULT 0,
    expiration_time DATETIME NOT NULL,
    duration INTEGER NOT NULL, -- in hours
    cost DECIMAL(10,2) NOT NULL,
    paid_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups by license plate
CREATE INDEX IF NOT EXISTS idx_license_plate ON parking_payments(license_plate);

-- Index for expiration time queries
CREATE INDEX IF NOT EXISTS idx_expiration_time ON parking_payments(expiration_time);

-- Table for audit trail (optional - tracks all payment activities)
CREATE TABLE IF NOT EXISTS payment_audit (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    license_plate TEXT NOT NULL,
    action TEXT NOT NULL, -- 'payment', 'scan', 'verification'
    details TEXT,
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT,
    user_agent TEXT
);

-- Index for audit queries
CREATE INDEX IF NOT EXISTS idx_audit_plate ON payment_audit(license_plate);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON payment_audit(timestamp);
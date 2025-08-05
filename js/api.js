/**
 * API Service for Parking Manager
 * Handles all communication with the backend API
 */

class ParkingAPI {
    constructor() {
        // Default to localhost for development, can be configured for production
        this.baseURL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
            ? 'http://localhost:3000/api' 
            : '/api'; // Assume same domain in production
        
        this.timeout = 10000; // 10 second timeout
    }

    /**
     * Generic fetch wrapper with error handling and timeout
     */
    async fetchWithTimeout(url, options = {}) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                throw new Error('Request timeout - please check your connection and try again');
            }
            
            if (error.message.includes('fetch')) {
                throw new Error('Unable to connect to server - please check if the backend is running');
            }
            
            throw error;
        }
    }

    /**
     * Health check - test if API is available
     */
    async healthCheck() {
        try {
            const response = await this.fetchWithTimeout(`${this.baseURL}/health`);
            return { success: true, data: response };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Get payment status for a license plate
     * @param {string} licensePlate - The license plate to check
     * @returns {Object} Payment status information
     */
    async getPaymentStatus(licensePlate) {
        if (!licensePlate || typeof licensePlate !== 'string') {
            throw new Error('License plate is required and must be a string');
        }

        const cleanPlate = licensePlate.trim();
        if (cleanPlate.length === 0) {
            throw new Error('License plate cannot be empty');
        }

        return await this.fetchWithTimeout(
            `${this.baseURL}/payments/${encodeURIComponent(cleanPlate)}`
        );
    }

    /**
     * Create a new parking payment
     * @param {string} licensePlate - The license plate
     * @param {number} duration - Duration in hours
     * @param {number} cost - Cost in dollars
     * @returns {Object} Payment confirmation
     */
    async createPayment(licensePlate, duration, cost) {
        if (!licensePlate || typeof licensePlate !== 'string') {
            throw new Error('License plate is required and must be a string');
        }

        if (!duration || typeof duration !== 'number' || duration <= 0) {
            throw new Error('Duration must be a positive number');
        }

        if (!cost || typeof cost !== 'number' || cost <= 0) {
            throw new Error('Cost must be a positive number');
        }

        return await this.fetchWithTimeout(`${this.baseURL}/payments`, {
            method: 'POST',
            body: JSON.stringify({
                licensePlate: licensePlate.trim(),
                duration,
                cost
            })
        });
    }

    /**
     * Get recent payments (admin function)
     * @param {number} limit - Maximum number of records to return (default: 50)
     * @returns {Object} List of recent payments
     */
    async getRecentPayments(limit = 50) {
        if (limit > 100) limit = 100; // API enforces max 100
        
        return await this.fetchWithTimeout(
            `${this.baseURL}/payments?limit=${limit}`
        );
    }

    /**
     * Batch status check for multiple license plates
     * @param {string[]} licensePlates - Array of license plates to check
     * @returns {Object} Batch status results
     */
    async batchStatusCheck(licensePlates) {
        if (!Array.isArray(licensePlates) || licensePlates.length === 0) {
            throw new Error('licensePlates must be a non-empty array');
        }

        if (licensePlates.length > 20) {
            throw new Error('Maximum 20 license plates per batch request');
        }

        return await this.fetchWithTimeout(`${this.baseURL}/payments/batch-status`, {
            method: 'POST',
            body: JSON.stringify({ licensePlates })
        });
    }

    /**
     * Get parking statistics
     * @returns {Object} Statistics data
     */
    async getStatistics() {
        return await this.fetchWithTimeout(`${this.baseURL}/stats`);
    }

    /**
     * Test API connectivity and display status
     * @returns {Promise<boolean>} True if API is available
     */
    async testConnection() {
        console.log('🔗 Testing API connection...');
        
        const health = await this.healthCheck();
        
        if (health.success) {
            console.log('✅ API connection successful:', health.data);
            return true;
        } else {
            console.error('❌ API connection failed:', health.error);
            return false;
        }
    }
}

// Export for use in other modules
window.ParkingAPI = ParkingAPI;
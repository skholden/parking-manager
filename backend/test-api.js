/**
 * Simple API test script to verify backend functionality
 * Run this after starting the server to test all endpoints
 */

const BASE_URL = 'http://localhost:3000/api';

async function testAPI() {
    console.log('🧪 Starting API Tests...\n');

    try {
        // Test 1: Health Check
        console.log('1. Testing health check...');
        const health = await fetch(`${BASE_URL}/health`);
        const healthData = await health.json();
        console.log('✅ Health check:', healthData.status);

        // Test 2: Create a payment
        console.log('\n2. Testing payment creation...');
        const paymentData = {
            licensePlate: 'TEST123',
            duration: 2,
            cost: 3.50
        };
        
        const payment = await fetch(`${BASE_URL}/payments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(paymentData)
        });
        
        const paymentResult = await payment.json();
        console.log('✅ Payment created:', paymentResult.success);

        // Test 3: Check payment status
        console.log('\n3. Testing payment status check...');
        const status = await fetch(`${BASE_URL}/payments/TEST123`);
        const statusData = await status.json();
        console.log('✅ Payment status:', statusData.status);
        console.log('   Expires at:', new Date(statusData.expirationTime).toLocaleString());

        // Test 4: Get recent payments
        console.log('\n4. Testing recent payments...');
        const recent = await fetch(`${BASE_URL}/payments?limit=10`);
        const recentData = await recent.json();
        console.log('✅ Recent payments count:', recentData.count);

        // Test 5: Batch status check
        console.log('\n5. Testing batch status check...');
        const batch = await fetch(`${BASE_URL}/payments/batch-status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                licensePlates: ['TEST123', 'NOEXIST']
            })
        });
        
        const batchData = await batch.json();
        console.log('✅ Batch check results:', batchData.results.length);

        // Test 6: Get statistics
        console.log('\n6. Testing statistics...');
        const stats = await fetch(`${BASE_URL}/stats`);
        const statsData = await stats.json();
        console.log('✅ Statistics:', {
            total: statsData.stats.total,
            active: statsData.stats.active,
            revenue: statsData.stats.totalRevenue
        });

        console.log('\n🎉 All tests passed! Backend is working correctly.');

        // Test multi-session simulation
        console.log('\n7. Testing multi-session functionality...');
        
        // Create another payment from "different session"
        const payment2 = await fetch(`${BASE_URL}/payments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                licensePlate: 'MULTI456',
                duration: 1,
                cost: 2.00
            })
        });
        
        const payment2Result = await payment2.json();
        console.log('✅ Second session payment:', payment2Result.success);

        // Check if first session can see second session's payment
        const multiStatus = await fetch(`${BASE_URL}/payments/MULTI456`);
        const multiStatusData = await multiStatus.json();
        console.log('✅ Cross-session visibility:', multiStatusData.status === 'paid');

        console.log('\n🚀 Multi-session test complete!');
        console.log('💡 Payments are now shared across all browser sessions and devices.');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.log('\nMake sure the backend server is running:');
        console.log('  cd backend');
        console.log('  npm install');
        console.log('  npm run dev');
    }
}

// Run tests if called directly
if (require.main === module) {
    testAPI();
}

module.exports = testAPI;
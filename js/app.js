class ParkingScanner {
    constructor() {
        this.currentMode = null;
        this.currentVideo = null;
        this.currentCanvas = null;
        this.currentStream = null;
        this.selectedDuration = null;
        this.selectedCost = null;
        this.scannedPlates = [];
        this.stats = { scanned: 0, paid: 0, unpaid: 0 };
        
        // Initialize API service
        this.api = new ParkingAPI();
        this.apiAvailable = false;
        
        // Initialize license plate detector
        this.plateDetector = new LicensePlateDetector();
        
        // Fallback to localStorage if API is not available
        this.parkingDatabase = this.loadParkingDatabase();
        
        this.initEventListeners();
        this.initializeAPI();
    }
    
    async initializeAPI() {
        console.log('🔄 Initializing API connection...');
        try {
            this.apiAvailable = await this.api.testConnection();
            if (this.apiAvailable) {
                console.log('✅ Using backend API for data storage');
            } else {
                console.log('⚠️ API unavailable, falling back to localStorage');
            }
        } catch (error) {
            console.error('🚨 API initialization failed:', error);
            this.apiAvailable = false;
        }
    }

    initEventListeners() {
        // Time selection buttons
        document.querySelectorAll('.time-btn').forEach(btn => {
            btn.addEventListener('click', () => this.selectDuration(btn));
        });
        
        // Pay button
        document.getElementById('payBtn').addEventListener('click', () => this.processPayment());
    }
    
    selectDuration(btn) {
        // Remove previous selection
        document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('selected'));
        
        // Select current
        btn.classList.add('selected');
        this.selectedDuration = parseInt(btn.dataset.hours);
        this.selectedCost = parseFloat(btn.dataset.cost);
        
        const payBtn = document.getElementById('payBtn');
        payBtn.textContent = `Pay $${this.selectedCost} for ${this.selectedDuration} hour${this.selectedDuration > 1 ? 's' : ''}`;
        payBtn.disabled = false;
    }
    
    async processPayment() {
        const plateText = document.getElementById('customerPlateText').textContent;
        
        try {
            this.showStatus('Processing payment...', 'scanning');
            
            if (this.apiAvailable) {
                // Use API for payment processing
                const response = await this.api.createPayment(
                    plateText, 
                    this.selectedDuration, 
                    this.selectedCost
                );
                
                const expirationTime = new Date(response.payment.expirationTime);
                this.showStatus(`Payment successful! Parking expires at ${expirationTime.toLocaleTimeString()}`, 'success');
                
            } else {
                // Fallback to localStorage
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                const expirationTime = new Date();
                expirationTime.setHours(expirationTime.getHours() + this.selectedDuration);
                
                this.parkingDatabase[plateText] = {
                    paid: true,
                    expirationTime: expirationTime.toISOString(),
                    duration: this.selectedDuration,
                    cost: this.selectedCost,
                    paidAt: new Date().toISOString()
                };
                
                this.saveParkingDatabase();
                this.showStatus(`Payment successful! Parking expires at ${expirationTime.toLocaleTimeString()}`, 'success');
            }
            
            // Reset for next customer
            setTimeout(() => {
                document.getElementById('customerResult').style.display = 'none';
                document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('selected'));
                document.getElementById('payBtn').disabled = true;
                document.getElementById('payBtn').textContent = 'Select Duration to Pay';
            }, 3000);
            
        } catch (error) {
            console.error('Payment processing failed:', error);
            this.showStatus(`Payment failed: ${error.message}`, 'error');
        }
    }
    
    selectMode(mode) {
        this.currentMode = mode;
        document.getElementById('modeSelector').style.display = 'none';
        
        if (mode === 'customer') {
            document.getElementById('customerInterface').classList.add('active');
            this.setupCustomerMode();
        } else {
            document.getElementById('attendantInterface').classList.add('active');
            this.setupAttendantMode();
        }
    }
    
    setupCustomerMode() {
        this.currentVideo = document.getElementById('customerVideo');
        this.currentCanvas = document.getElementById('customerCanvas');
        
        document.getElementById('startCustomerCamera').addEventListener('click', () => this.startCamera());
        document.getElementById('scanCustomerPlate').addEventListener('click', () => this.scanPlate('customer'));
    }
    
    setupAttendantMode() {
        this.currentVideo = document.getElementById('attendantVideo');
        this.currentCanvas = document.getElementById('attendantCanvas');
        
        document.getElementById('startAttendantCamera').addEventListener('click', () => this.startCamera());
        document.getElementById('scanAttendantPlate').addEventListener('click', () => this.scanPlate('attendant'));
        document.getElementById('clearAttendantList').addEventListener('click', () => this.clearScanList());
        
        this.updateStats();
    }
    
    async startCamera() {
        try {
            this.showStatus('Starting camera...', 'scanning');
            
            // Progressive camera constraints for better compatibility
            const constraintOptions = [
                // Option 1: Basic back camera
                { video: { facingMode: 'environment' } },
                // Option 2: Any back camera with flexible resolution
                { video: { facingMode: { ideal: 'environment' }, width: { min: 320, ideal: 640 }, height: { min: 240, ideal: 480 } } },
                // Option 3: Any camera with minimal constraints
                { video: { width: { min: 320 }, height: { min: 240 } } },
                // Option 4: Most basic request
                { video: true }
            ];

            let stream = null;
            let successOption = 0;

            for (let i = 0; i < constraintOptions.length; i++) {
                try {
                    console.log(`Trying camera option ${i + 1}:`, constraintOptions[i]);
                    this.showStatus(`Testing camera option ${i + 1}...`, 'scanning');
                    
                    stream = await navigator.mediaDevices.getUserMedia(constraintOptions[i]);
                    successOption = i + 1;
                    console.log(`Camera started with option ${successOption}`);
                    break;
                } catch (error) {
                    console.log(`Option ${i + 1} failed:`, error.name);
                    if (i === constraintOptions.length - 1) throw error;
                    await new Promise(resolve => setTimeout(resolve, 300));
                }
            }

            this.currentStream = stream;
            this.currentVideo.srcObject = stream;
            
            this.currentVideo.onloadedmetadata = () => {
                this.currentCanvas.width = this.currentVideo.videoWidth;
                this.currentCanvas.height = this.currentVideo.videoHeight;
                
                const startBtn = this.currentMode === 'customer' ? 
                    document.getElementById('startCustomerCamera') : 
                    document.getElementById('startAttendantCamera');
                const scanBtn = this.currentMode === 'customer' ? 
                    document.getElementById('scanCustomerPlate') : 
                    document.getElementById('scanAttendantPlate');
                
                startBtn.textContent = 'Stop Camera';
                startBtn.onclick = () => this.stopCamera();
                scanBtn.disabled = false;
                
                this.showStatus(`✅ Camera ready! Option ${successOption} - ${this.currentVideo.videoWidth}x${this.currentVideo.videoHeight}`, 'success');
            };
            
        } catch (error) {
            console.error('Camera error:', error);
            this.showStatus(`Camera error: ${error.name}. Try refreshing the page or check camera permissions.`, 'error');
        }
    }
    
    stopCamera() {
        if (this.currentStream) {
            this.currentStream.getTracks().forEach(track => track.stop());
            this.currentStream = null;
        }
        this.currentVideo.srcObject = null;
        
        const startBtn = this.currentMode === 'customer' ? 
            document.getElementById('startCustomerCamera') : 
            document.getElementById('startAttendantCamera');
        const scanBtn = this.currentMode === 'customer' ? 
            document.getElementById('scanCustomerPlate') : 
            document.getElementById('scanAttendantPlate');
        
        startBtn.textContent = 'Start Camera';
        startBtn.onclick = () => this.startCamera();
        scanBtn.disabled = true;
        
        this.showStatus('Camera stopped.', 'error');
    }
    
    async scanPlate(mode) {
        if (!this.currentStream) {
            this.showStatus('Please start the camera first.', 'error');
            return;
        }
        
        try {
            const scanBtn = mode === 'customer' ? 
                document.getElementById('scanCustomerPlate') : 
                document.getElementById('scanAttendantPlate');
            
            scanBtn.disabled = true;
            this.showStatus('Scanning license plate...', 'scanning');
            
            // Get selected country
            const countrySelector = mode === 'customer' ? 
                document.getElementById('customerCountry') : 
                document.getElementById('attendantCountry');
            const selectedCountry = countrySelector.value;
            
            // Capture current frame
            const ctx = this.currentCanvas.getContext('2d');
            ctx.drawImage(this.currentVideo, 0, 0, this.currentCanvas.width, this.currentCanvas.height);
            const imageData = this.currentCanvas.toDataURL('image/png');
            
            // Get country-specific OCR settings
            const ocrSettings = this.plateDetector.getOCRSettings(selectedCountry);
            
            // Use Tesseract.js for OCR with country-optimized settings
            const { data: { text } } = await Tesseract.recognize(
                imageData,
                'eng',
                {
                    logger: m => {
                        if (m.status === 'recognizing text') {
                            const progress = Math.round(m.progress * 100);
                            this.showStatus(`Processing ${selectedCountry} plate: ${progress}%`, 'scanning');
                        }
                    },
                    ...ocrSettings
                }
            );
            
            const plateText = this.plateDetector.extractLicensePlate(text, selectedCountry);
            
            if (plateText) {
                if (mode === 'customer') {
                    this.handleCustomerScan(plateText);
                } else {
                    this.handleAttendantScan(plateText);
                }
                this.showStatus('License plate detected successfully!', 'success');
            } else {
                this.showStatus('No license plate detected. Try getting closer or adjusting the angle.', 'error');
            }
            
        } catch (error) {
            console.error('OCR Error:', error);
            this.showStatus('Error scanning image. Please try again.', 'error');
        } finally {
            const scanBtn = mode === 'customer' ? 
                document.getElementById('scanCustomerPlate') : 
                document.getElementById('scanAttendantPlate');
            scanBtn.disabled = false;
        }
    }
    
    async handleCustomerScan(plateText) {
        document.getElementById('customerPlateText').textContent = plateText;
        document.getElementById('customerResult').style.display = 'block';
        
        try {
            // Check if already paid
            let paymentStatus;
            
            if (this.apiAvailable) {
                const response = await this.api.getPaymentStatus(plateText);
                paymentStatus = response;
            } else {
                // Fallback to localStorage
                const existing = this.parkingDatabase[plateText];
                if (existing && existing.paid && new Date(existing.expirationTime) > new Date()) {
                    paymentStatus = { 
                        status: 'paid', 
                        expirationTime: existing.expirationTime 
                    };
                } else {
                    paymentStatus = { status: 'unpaid' };
                }
            }
            
            if (paymentStatus.status === 'paid') {
                const expirationTime = new Date(paymentStatus.expirationTime);
                this.showStatus(`Already paid! Expires at ${expirationTime.toLocaleTimeString()}`, 'success');
            }
            
        } catch (error) {
            console.error('Error checking payment status:', error);
            // Don't show error to user, just proceed with payment flow
        }
    }
    
    async handleAttendantScan(plateText) {
        try {
            let paymentStatus;
            
            if (this.apiAvailable) {
                const response = await this.api.getPaymentStatus(plateText);
                paymentStatus = response;
            } else {
                paymentStatus = this.checkPaymentStatus(plateText);
            }
            
            // Add to scan list
            this.scannedPlates.unshift({
                plate: plateText,
                status: paymentStatus.status,
                time: new Date().toLocaleTimeString(),
                expirationTime: paymentStatus.expirationTime
            });
            
            // Keep only last 20 scans
            if (this.scannedPlates.length > 20) {
                this.scannedPlates = this.scannedPlates.slice(0, 20);
            }
            
            this.updateScanList();
            this.updateStats();
            
        } catch (error) {
            console.error('Error checking payment status:', error);
            this.showStatus(`Error checking ${plateText}: ${error.message}`, 'error');
        }
    }
    
    checkPaymentStatus(plateText) {
        const record = this.parkingDatabase[plateText];
        
        if (!record || !record.paid) {
            return { status: 'unpaid', expirationTime: null };
        }
        
        const expirationTime = new Date(record.expirationTime);
        const now = new Date();
        
        if (expirationTime <= now) {
            return { status: 'expired', expirationTime: expirationTime };
        }
        
        return { status: 'paid', expirationTime: expirationTime };
    }
    
    updateScanList() {
        const scanList = document.getElementById('scanList');
        scanList.innerHTML = this.scannedPlates.map(item => `
            <div class="scan-item">
                <div>
                    <div class="scan-plate">${item.plate}</div>
                    <div style="font-size: 12px; opacity: 0.8;">${item.time}</div>
                </div>
                <div class="scan-status ${item.status}">
                    ${item.status === 'paid' ? '✓ PAID' : 
                      item.status === 'expired' ? '⚠ EXPIRED' : '✗ UNPAID'}
                </div>
            </div>
        `).join('');
    }
    
    updateStats() {
        this.stats.scanned = this.scannedPlates.length;
        this.stats.paid = this.scannedPlates.filter(p => p.status === 'paid').length;
        this.stats.unpaid = this.scannedPlates.filter(p => p.status === 'unpaid' || p.status === 'expired').length;
        
        document.getElementById('totalScanned').textContent = this.stats.scanned;
        document.getElementById('totalPaid').textContent = this.stats.paid;
        document.getElementById('totalUnpaid').textContent = this.stats.unpaid;
    }
    
    clearScanList() {
        this.scannedPlates = [];
        this.updateScanList();
        this.updateStats();
        this.showStatus('Scan list cleared.', 'success');
    }
    
    
    showStatus(message, type) {
        const statusDiv = this.currentMode === 'customer' ? 
            document.getElementById('customerStatus') : 
            document.getElementById('attendantStatus');
        
        statusDiv.innerHTML = type === 'scanning' ? 
            `<div class="status ${type}"><span class="loading-spinner"></span>${message}</div>` :
            `<div class="status ${type}">${message}</div>`;
    }
    
    loadParkingDatabase() {
        const stored = localStorage.getItem('parkingDatabase');
        return stored ? JSON.parse(stored) : {};
    }
    
    saveParkingDatabase() {
        localStorage.setItem('parkingDatabase', JSON.stringify(this.parkingDatabase));
    }
}

// Global functions for mode selection
function selectMode(mode) {
    window.parkingScanner.selectMode(mode);
}

function goBack() {
    // Stop camera if running
    if (window.parkingScanner.currentStream) {
        window.parkingScanner.stopCamera();
    }
    
    // Hide all interfaces
    document.getElementById('customerInterface').classList.remove('active');
    document.getElementById('attendantInterface').classList.remove('active');
    
    // Show mode selector
    document.getElementById('modeSelector').style.display = 'block';
    
    // Reset current mode
    window.parkingScanner.currentMode = null;
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.parkingScanner = new ParkingScanner();
    
    // Check if device is mobile for better UX
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
        // Add mobile-specific optimizations
        document.body.style.userSelect = 'none';
        document.body.style.webkitUserSelect = 'none';
        document.body.style.webkitTouchCallout = 'none';
        
        console.log('Mobile device detected:', {
            isMobile: isMobile,
            isPixel: navigator.userAgent.includes('Pixel'),
            isFirefox: navigator.userAgent.includes('Firefox'),
            screenSize: `${screen.width}x${screen.height}`,
            viewportSize: `${window.innerWidth}x${window.innerHeight}`
        });
    }
});
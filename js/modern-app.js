class ModernParkingScanner {
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
        
        // Initialize license plate detector and image processor
        this.plateDetector = new LicensePlateDetector();
        this.imageProcessor = new ImageProcessor();
        
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
        // Payment options selection
        document.querySelectorAll('.payment-option').forEach(option => {
            option.addEventListener('click', () => this.selectPaymentOption(option));
        });
        
        // Pay button
        document.getElementById('payBtn').addEventListener('click', () => this.processPayment());
        
        // Manual input buttons
        document.getElementById('manualCustomerInput').addEventListener('click', () => this.showManualInput('customer'));
        document.getElementById('manualAttendantInput').addEventListener('click', () => this.showManualInput('attendant'));
        
        // Manual input modal events
        document.getElementById('confirmManualInput').addEventListener('click', () => this.confirmManualInput());
        document.getElementById('cancelManualInput').addEventListener('click', () => this.hideManualInput());
        
        // Auto-validate manual input
        document.getElementById('manualPlateInput').addEventListener('input', (e) => this.validateManualInput(e.target.value));
        
        // Enter key support for manual input
        document.getElementById('manualPlateInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !document.getElementById('confirmManualInput').disabled) {
                this.confirmManualInput();
            }
        });
    }
    
    selectPaymentOption(option) {
        // Remove previous selection
        document.querySelectorAll('.payment-option').forEach(opt => opt.classList.remove('selected'));
        
        // Select current
        option.classList.add('selected');
        this.selectedDuration = parseInt(option.dataset.hours);
        this.selectedCost = parseFloat(option.dataset.cost);
        
        const payBtn = document.getElementById('payBtn');
        payBtn.textContent = `Pay $${this.selectedCost} for ${this.selectedDuration === 8 ? 'All Day' : this.selectedDuration + ' hour' + (this.selectedDuration > 1 ? 's' : '')}`;
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
                document.querySelectorAll('.payment-option').forEach(opt => opt.classList.remove('selected'));
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
            
            // Enhanced camera constraints optimized for license plate scanning
            const constraintOptions = [
                // Option 1: High-quality back camera with focus optimization
                { 
                    video: { 
                        facingMode: 'environment',
                        width: { min: 640, ideal: 1280, max: 1920 },
                        height: { min: 480, ideal: 720, max: 1080 },
                        aspectRatio: { ideal: 16/9 },
                        focusMode: 'continuous',
                        exposureMode: 'continuous',
                        whiteBalanceMode: 'continuous'
                    } 
                },
                // Option 2: Medium quality with autofocus
                { 
                    video: { 
                        facingMode: { ideal: 'environment' },
                        width: { min: 480, ideal: 720, max: 1280 },
                        height: { min: 360, ideal: 540, max: 720 },
                        focusMode: 'auto'
                    } 
                },
                // Option 3: Basic back camera
                { video: { facingMode: 'environment' } },
                // Option 4: Any camera with good resolution
                { video: { width: { min: 640, ideal: 1280 }, height: { min: 480, ideal: 720 } } },
                // Option 5: Fallback
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
                
                startBtn.textContent = '■ Stop Camera';
                startBtn.onclick = () => this.stopCamera();
                scanBtn.disabled = false;
                
                // Add capture guidance overlay
                this.addCaptureGuidance();
                
                this.showStatus(`✅ Camera ready! ${this.currentVideo.videoWidth}x${this.currentVideo.videoHeight} - Position license plate in the center`, 'success');
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
        
        startBtn.textContent = '▶ Start Camera';
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
            
            // Get selected country
            const countrySelector = mode === 'customer' ? 
                document.getElementById('customerCountry') : 
                document.getElementById('attendantCountry');
            const selectedCountry = countrySelector.value;
            
            // Capture current frame
            const ctx = this.currentCanvas.getContext('2d');
            ctx.drawImage(this.currentVideo, 0, 0, this.currentCanvas.width, this.currentCanvas.height);
            
            // Show advanced processing status
            this.showAdvancedStatus('◐ Initializing advanced OCR...', 'scanning');
            
            // Use multiple OCR attempts with image preprocessing
            const results = await this.imageProcessor.performMultipleOCR(this.currentCanvas, selectedCountry);
            
            if (results.length > 0) {
                // Select best result
                const bestResult = this.imageProcessor.selectBestResult(results);
                
                this.showAdvancedStatus(`◉ Detected: ${bestResult.plate} (${bestResult.confidence}% confidence)`, 'success');
                
                if (mode === 'customer') {
                    this.handleCustomerScan(bestResult.plate);
                } else {
                    this.handleAttendantScan(bestResult.plate);
                }
                
                // Show processing details
                this.showOCRAttempts(results);
                
            } else {
                this.showAdvancedStatus('◯ No license plate detected in any attempt', 'error');
                this.showScanningTips(mode);
            }
            
        } catch (error) {
            console.error('OCR Error:', error);
            this.showStatus(`Error: ${error.message}. Try manual input instead.`, 'error');
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
                    ${item.status === 'paid' ? '◉ PAID' : 
                      item.status === 'expired' ? '◐ EXPIRED' : '◯ UNPAID'}
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
    
    // Manual input methods
    showManualInput(mode) {
        this.currentManualMode = mode;
        const modal = document.getElementById('manualInputModal');
        const input = document.getElementById('manualPlateInput');
        
        // Clear previous input
        input.value = '';
        input.classList.remove('valid', 'invalid');
        document.getElementById('confirmManualInput').disabled = true;
        
        // Show modal
        modal.style.display = 'flex';
        setTimeout(() => input.focus(), 100);
        
        // Update examples based on selected country
        const countrySelector = mode === 'customer' ? 
            document.getElementById('customerCountry') : 
            document.getElementById('attendantCountry');
        const country = countrySelector.value;
        
        this.updateFormatExamples(country);
    }
    
    hideManualInput() {
        document.getElementById('manualInputModal').style.display = 'none';
        this.currentManualMode = null;
    }
    
    validateManualInput(value) {
        const countrySelector = this.currentManualMode === 'customer' ? 
            document.getElementById('customerCountry') : 
            document.getElementById('attendantCountry');
        const country = countrySelector.value;
        
        const cleaned = value.trim().toUpperCase();
        const isValid = this.plateDetector.validatePlate(cleaned, country);
        
        const confirmBtn = document.getElementById('confirmManualInput');
        const input = document.getElementById('manualPlateInput');
        
        confirmBtn.disabled = !isValid || cleaned.length < 2;
        
        // Visual feedback
        if (cleaned.length > 0) {
            input.classList.toggle('valid', isValid);
            input.classList.toggle('invalid', !isValid);
        } else {
            input.classList.remove('valid', 'invalid');
        }
    }
    
    confirmManualInput() {
        const input = document.getElementById('manualPlateInput');
        const plateText = input.value.trim().toUpperCase();
        
        if (plateText) {
            if (this.currentManualMode === 'customer') {
                this.handleCustomerScan(plateText);
                this.showStatus(`◉ License plate entered: ${plateText}`, 'success');
            } else {
                this.handleAttendantScan(plateText);
                this.showStatus(`◉ Manual check completed: ${plateText}`, 'success');
            }
        }
        
        this.hideManualInput();
    }
    
    addCaptureGuidance() {
        // Remove existing guidance
        const existingGuidance = document.querySelector('.capture-guidance');
        if (existingGuidance) {
            existingGuidance.remove();
        }
        
        const cameraSection = document.querySelector(`#${this.currentMode}Interface .camera-section`);
        if (cameraSection) {
            const guidance = document.createElement('div');
            guidance.className = 'capture-guidance';
            guidance.innerHTML = '▢ Position license plate here';
            cameraSection.appendChild(guidance);
            
            // Auto-hide after 5 seconds
            setTimeout(() => {
                if (guidance.parentNode) {
                    guidance.style.opacity = '0.3';
                }
            }, 5000);
        }
    }
    
    updateFormatExamples(country) {
        const examples = this.plateDetector.getExamplePatterns(country);
        const container = document.querySelector('.examples-grid');
        
        if (container) {
            container.innerHTML = examples.slice(0, 4).map(format => 
                `<span class="format-example">${format}</span>`
            ).join('');
        }
    }
    
    // Enhanced status display methods
    showAdvancedStatus(message, type) {
        const statusDiv = this.currentMode === 'customer' ? 
            document.getElementById('customerStatus') : 
            document.getElementById('attendantStatus');
        
        const statusCard = document.createElement('div');
        statusCard.className = `status-card status-${type}`;
        
        const statusContent = document.createElement('div');
        statusContent.className = 'status-content';
        
        if (type === 'scanning') {
            const spinner = document.createElement('div');
            spinner.className = 'loading-spinner';
            statusContent.appendChild(spinner);
        }
        
        const messageSpan = document.createElement('span');
        messageSpan.textContent = message;
        statusContent.appendChild(messageSpan);
        
        statusCard.appendChild(statusContent);
        statusDiv.innerHTML = '';
        statusDiv.appendChild(statusCard);
    }
    
    showOCRAttempts(results) {
        const statusDiv = this.currentMode === 'customer' ? 
            document.getElementById('customerStatus') : 
            document.getElementById('attendantStatus');
        
        const attemptsCard = document.createElement('div');
        attemptsCard.className = 'status-card';
        attemptsCard.innerHTML = `
            <div class="status-content">
                <strong>OCR Attempts:</strong>
                ${results.map(result => {
                    const confidenceWidth = Math.max(10, result.confidence || 0);
                    return `
                        <div class="ocr-attempt">
                            <span>${result.attempt}: "${result.plate || 'No result'}"</span>
                            <div class="confidence-bar">
                                <div class="confidence-fill" style="width: ${confidenceWidth}%"></div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
        
        statusDiv.appendChild(attemptsCard);
    }
    
    showScanningTips(mode) {
        const statusDiv = this.currentMode === 'customer' ? 
            document.getElementById('customerStatus') : 
            document.getElementById('attendantStatus');
        
        const manualBtn = mode === 'customer' ? 'manualCustomerInput' : 'manualAttendantInput';
        
        const tipsCard = document.createElement('div');
        tipsCard.className = 'status-card';
        tipsCard.innerHTML = `
            <div class="status-content">
                <strong>◇ Scanning Tips:</strong>
                <div style="margin: 10px 0; font-size: 0.875rem;">
                    <div>◇ Ensure good lighting</div>
                    <div>◉ Get close to the license plate</div>
                    <div>□ Hold phone straight</div>
                    <div>◯ Avoid shadows and reflections</div>
                </div>
                <button onclick="document.getElementById('${manualBtn}').click()" 
                        class="btn btn-primary" style="margin-top: 10px;">
                    ◦ Enter Manually Instead
                </button>
            </div>
        `;
        
        statusDiv.appendChild(tipsCard);
    }

    showStatus(message, type) {
        this.showAdvancedStatus(message, type);
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
    window.modernParkingScanner.selectMode(mode);
}

function goBack() {
    // Stop camera if running
    if (window.modernParkingScanner.currentStream) {
        window.modernParkingScanner.stopCamera();
    }
    
    // Hide all interfaces
    document.getElementById('customerInterface').classList.remove('active');
    document.getElementById('attendantInterface').classList.remove('active');
    
    // Show mode selector
    document.getElementById('modeSelector').style.display = 'block';
    
    // Reset current mode
    window.modernParkingScanner.currentMode = null;
}

// Initialize the modern app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.modernParkingScanner = new ModernParkingScanner();
    
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
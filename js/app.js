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
        
        // Mock parking database
        this.parkingDatabase = this.loadParkingDatabase();
        
        this.initEventListeners();
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
        
        // Simulate payment processing
        this.showStatus('Processing payment...', 'scanning');
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Add to parking database
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
        
        // Reset for next customer
        setTimeout(() => {
            document.getElementById('customerResult').style.display = 'none';
            document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('selected'));
            document.getElementById('payBtn').disabled = true;
            document.getElementById('payBtn').textContent = 'Select Duration to Pay';
        }, 3000);
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
            
            // Capture current frame
            const ctx = this.currentCanvas.getContext('2d');
            ctx.drawImage(this.currentVideo, 0, 0, this.currentCanvas.width, this.currentCanvas.height);
            const imageData = this.currentCanvas.toDataURL('image/png');
            
            // Use Tesseract.js for OCR with UK-optimized settings
            const { data: { text } } = await Tesseract.recognize(
                imageData,
                'eng',
                {
                    logger: m => {
                        if (m.status === 'recognizing text') {
                            const progress = Math.round(m.progress * 100);
                            this.showStatus(`Processing: ${progress}%`, 'scanning');
                        }
                    },
                    tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ',
                    tessedit_pageseg_mode: Tesseract.PSM.SINGLE_LINE,
                    preserve_interword_spaces: '1'
                }
            );
            
            const plateText = this.extractLicensePlate(text);
            
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
    
    handleCustomerScan(plateText) {
        document.getElementById('customerPlateText').textContent = plateText;
        document.getElementById('customerResult').style.display = 'block';
        
        // Check if already paid
        const existing = this.parkingDatabase[plateText];
        if (existing && existing.paid && new Date(existing.expirationTime) > new Date()) {
            this.showStatus(`Already paid! Expires at ${new Date(existing.expirationTime).toLocaleTimeString()}`, 'success');
        }
    }
    
    handleAttendantScan(plateText) {
        const paymentStatus = this.checkPaymentStatus(plateText);
        
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
    
    extractLicensePlate(text) {
        const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        
        // UK-specific license plate patterns (prioritized)
        const ukPatterns = [
            // Current UK format: AB12 CDE (2001-present)
            /^[A-Z]{2}[0-9]{2}[A-Z]{3}$/,
            // Current UK with space: AB12 CDE
            /^[A-Z]{2}[0-9]{2}\s[A-Z]{3}$/,
            // Prefix format: A123 BCD (1983-2001)
            /^[A-Z][0-9]{3}[A-Z]{3}$/,
            // Prefix with space: A123 BCD  
            /^[A-Z][0-9]{3}\s[A-Z]{3}$/,
            // Suffix format: ABC 123D (1963-1983)
            /^[A-Z]{3}[0-9]{3}[A-Z]$/,
            // Suffix with space: ABC 123D
            /^[A-Z]{3}\s[0-9]{3}[A-Z]$/,
            // Old format: ABC 123 (pre-1963)
            /^[A-Z]{3}[0-9]{3}$/,
            /^[A-Z]{3}\s[0-9]{3}$/
        ];
        
        // US and other international patterns (lower priority)
        const otherPatterns = [
            /^[A-Z0-9]{2,3}[-\s]?[A-Z0-9]{3,4}$/,  // ABC-1234 or AB-1234
            /^[A-Z0-9]{6,8}$/,                      // ABC1234 (no separator)
            /^[0-9]{1,3}[-\s]?[A-Z]{3}$/,          // 123-ABC
            /^[A-Z]{3}[-\s]?[0-9]{3,4}$/           // ABC-123
        ];
        
        // Combine patterns with UK patterns first
        const allPatterns = [...ukPatterns, ...otherPatterns];
        
        for (const line of lines) {
            // Enhanced cleaning for UK plates
            let cleaned = line
                .replace(/[^\w\s-]/g, '') // Remove special chars except letters, numbers, spaces, hyphens
                .replace(/[Il1|]/g, '1')  // Common OCR mistakes: I,l,| -> 1
                .replace(/[O0oQ]/g, '0')  // Common OCR mistakes: O,o,Q -> 0
                .replace(/[S5$]/g, '5')   // Common OCR mistakes: S,$ -> 5
                .replace(/[Z2]/g, '2')    // Common OCR mistakes: Z -> 2
                .replace(/[B8]/g, '8')    // Common OCR mistakes: B -> 8
                .replace(/[G6]/g, '6')    // Common OCR mistakes: G -> 6
                .trim()
                .toUpperCase();
            
            // Try with original spacing first
            for (const pattern of allPatterns) {
                if (pattern.test(cleaned) && cleaned.length >= 5 && cleaned.length <= 8) {
                    return this.formatUKPlate(cleaned);
                }
            }
            
            // Try without spaces
            const noSpaces = cleaned.replace(/\s+/g, '');
            for (const pattern of allPatterns) {
                if (pattern.test(noSpaces) && noSpaces.length >= 5 && noSpaces.length <= 7) {
                    return this.formatUKPlate(noSpaces);
                }
            }
            
            // Try with single space in middle (common UK format)
            if (noSpaces.length === 7) {
                const withSpace = noSpaces.substring(0, 4) + ' ' + noSpaces.substring(4);
                for (const pattern of ukPatterns) {
                    if (pattern.test(withSpace)) {
                        return this.formatUKPlate(withSpace);
                    }
                }
            }
            
            // Fallback: check if it looks like a reasonable UK plate
            if (/^[A-Z0-9]+$/.test(noSpaces) && noSpaces.length >= 5 && noSpaces.length <= 7) {
                if (this.isLikelyUKPlate(noSpaces)) {
                    return this.formatUKPlate(noSpaces);
                }
            }
        }
        
        return null;
    }
    
    isLikelyUKPlate(plate) {
        // Check if it matches common UK patterns
        if (plate.length === 7) {
            // AB12CDE format
            return /^[A-Z]{2}[0-9]{2}[A-Z]{3}$/.test(plate);
        } else if (plate.length === 6) {
            // A123BCD format or ABC123 format
            return /^[A-Z][0-9]{3}[A-Z]{3}$/.test(plate) || /^[A-Z]{3}[0-9]{3}$/.test(plate);
        }
        return false;
    }
    
    formatUKPlate(plate) {
        // Remove existing spaces
        const clean = plate.replace(/\s+/g, '');
        
        // Format based on UK standards
        if (clean.length === 7 && /^[A-Z]{2}[0-9]{2}[A-Z]{3}$/.test(clean)) {
            // Current format: AB12 CDE
            return clean.substring(0, 4) + ' ' + clean.substring(4);
        } else if (clean.length === 7 && /^[A-Z][0-9]{3}[A-Z]{3}$/.test(clean)) {
            // Prefix format: A123 BCD
            return clean.substring(0, 4) + ' ' + clean.substring(4);
        } else if (clean.length === 7 && /^[A-Z]{3}[0-9]{3}[A-Z]$/.test(clean)) {
            // Suffix format: ABC 123D
            return clean.substring(0, 3) + ' ' + clean.substring(3);
        } else if (clean.length === 6 && /^[A-Z]{3}[0-9]{3}$/.test(clean)) {
            // Old format: ABC 123
            return clean.substring(0, 3) + ' ' + clean.substring(3);
        }
        
        // Return as-is if no specific formatting applies
        return clean;
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
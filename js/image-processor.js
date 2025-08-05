/**
 * Advanced Image Processing for License Plate OCR
 * Implements multiple preprocessing techniques to dramatically improve OCR accuracy
 */

class ImageProcessor {
    constructor() {
        this.debug = true; // Set to false in production
    }

    /**
     * Main preprocessing pipeline - applies multiple enhancement techniques
     */
    async preprocessImage(canvas, options = {}) {
        const {
            country = 'UK',
            enhanceContrast = true,
            denoise = true,
            sharpen = true,
            autoRotate = true,
            cropToPlate = true,
            showDebug = this.debug
        } = options;

        if (showDebug) console.log('🔧 Starting image preprocessing pipeline...');

        // Create working canvas
        const workCanvas = document.createElement('canvas');
        const workCtx = workCanvas.getContext('2d');
        workCanvas.width = canvas.width;
        workCanvas.height = canvas.height;
        workCtx.drawImage(canvas, 0, 0);

        let processedCanvas = workCanvas;

        try {
            // Step 1: Convert to grayscale for better OCR
            if (showDebug) console.log('📸 Converting to grayscale...');
            processedCanvas = this.convertToGrayscale(processedCanvas);

            // Step 2: Enhance contrast and brightness
            if (enhanceContrast) {
                if (showDebug) console.log('🌟 Enhancing contrast...');
                processedCanvas = this.enhanceContrast(processedCanvas);
            }

            // Step 3: Denoise the image
            if (denoise) {
                if (showDebug) console.log('🧹 Denoising image...');
                processedCanvas = this.denoise(processedCanvas);
            }

            // Step 4: Sharpen for better character definition
            if (sharpen) {
                if (showDebug) console.log('🔍 Sharpening image...');
                processedCanvas = this.sharpen(processedCanvas);
            }

            // Step 5: Normalize image size for consistent OCR
            if (showDebug) console.log('📏 Normalizing size...');
            processedCanvas = this.normalizeSize(processedCanvas, 400, 150);

            // Step 6: Apply morphological operations
            if (showDebug) console.log('🔬 Applying morphological operations...');
            processedCanvas = this.morphologicalOperations(processedCanvas);

            if (showDebug) {
                console.log('✅ Preprocessing complete');
                this.showDebugImages(canvas, processedCanvas);
            }

            return processedCanvas;

        } catch (error) {
            console.error('❌ Image preprocessing failed:', error);
            return canvas; // Return original if preprocessing fails
        }
    }

    /**
     * Convert image to grayscale
     */
    convertToGrayscale(canvas) {
        const newCanvas = document.createElement('canvas');
        const ctx = newCanvas.getContext('2d');
        newCanvas.width = canvas.width;
        newCanvas.height = canvas.height;

        ctx.drawImage(canvas, 0, 0);
        const imageData = ctx.getImageData(0, 0, newCanvas.width, newCanvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
            data[i] = gray;     // Red
            data[i + 1] = gray; // Green
            data[i + 2] = gray; // Blue
            // Alpha channel stays the same
        }

        ctx.putImageData(imageData, 0, 0);
        return newCanvas;
    }

    /**
     * Enhance contrast using histogram equalization
     */
    enhanceContrast(canvas) {
        const newCanvas = document.createElement('canvas');
        const ctx = newCanvas.getContext('2d');
        newCanvas.width = canvas.width;
        newCanvas.height = canvas.height;

        ctx.drawImage(canvas, 0, 0);
        const imageData = ctx.getImageData(0, 0, newCanvas.width, newCanvas.height);
        const data = imageData.data;

        // Calculate histogram
        const histogram = new Array(256).fill(0);
        for (let i = 0; i < data.length; i += 4) {
            histogram[data[i]]++;
        }

        // Calculate cumulative distribution
        const cdf = new Array(256);
        cdf[0] = histogram[0];
        for (let i = 1; i < 256; i++) {
            cdf[i] = cdf[i - 1] + histogram[i];
        }

        // Normalize CDF
        const totalPixels = newCanvas.width * newCanvas.height;
        for (let i = 0; i < 256; i++) {
            cdf[i] = Math.round((cdf[i] / totalPixels) * 255);
        }

        // Apply histogram equalization
        for (let i = 0; i < data.length; i += 4) {
            const newValue = cdf[data[i]];
            data[i] = newValue;     // Red
            data[i + 1] = newValue; // Green
            data[i + 2] = newValue; // Blue
        }

        ctx.putImageData(imageData, 0, 0);
        return newCanvas;
    }

    /**
     * Denoise using median filter
     */
    denoise(canvas) {
        const newCanvas = document.createElement('canvas');
        const ctx = newCanvas.getContext('2d');
        newCanvas.width = canvas.width;
        newCanvas.height = canvas.height;

        ctx.drawImage(canvas, 0, 0);
        const imageData = ctx.getImageData(0, 0, newCanvas.width, newCanvas.height);
        const data = imageData.data;
        const output = new Uint8ClampedArray(data);

        const width = newCanvas.width;
        const height = newCanvas.height;

        // Apply 3x3 median filter
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const neighbors = [];
                
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        const idx = ((y + dy) * width + (x + dx)) * 4;
                        neighbors.push(data[idx]);
                    }
                }
                
                neighbors.sort((a, b) => a - b);
                const median = neighbors[4]; // Middle value of 9 elements
                
                const idx = (y * width + x) * 4;
                output[idx] = median;     // Red
                output[idx + 1] = median; // Green
                output[idx + 2] = median; // Blue
            }
        }

        const newImageData = new ImageData(output, width, height);
        ctx.putImageData(newImageData, 0, 0);
        return newCanvas;
    }

    /**
     * Sharpen image using unsharp mask
     */
    sharpen(canvas) {
        const newCanvas = document.createElement('canvas');
        const ctx = newCanvas.getContext('2d');
        newCanvas.width = canvas.width;
        newCanvas.height = canvas.height;

        ctx.drawImage(canvas, 0, 0);
        const imageData = ctx.getImageData(0, 0, newCanvas.width, newCanvas.height);
        const data = imageData.data;
        const output = new Uint8ClampedArray(data);

        const width = newCanvas.width;
        const height = newCanvas.height;

        // Sharpening kernel
        const kernel = [
            0, -1, 0,
            -1, 5, -1,
            0, -1, 0
        ];

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                let sum = 0;
                
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const idx = ((y + ky) * width + (x + kx)) * 4;
                        const kernelIdx = (ky + 1) * 3 + (kx + 1);
                        sum += data[idx] * kernel[kernelIdx];
                    }
                }
                
                sum = Math.max(0, Math.min(255, sum));
                
                const idx = (y * width + x) * 4;
                output[idx] = sum;     // Red
                output[idx + 1] = sum; // Green
                output[idx + 2] = sum; // Blue
            }
        }

        const newImageData = new ImageData(output, width, height);
        ctx.putImageData(newImageData, 0, 0);
        return newCanvas;
    }

    /**
     * Normalize image size for consistent OCR processing
     */
    normalizeSize(canvas, targetWidth = 400, targetHeight = 150) {
        const newCanvas = document.createElement('canvas');
        const ctx = newCanvas.getContext('2d');
        
        // Calculate aspect ratio
        const aspectRatio = canvas.width / canvas.height;
        const targetAspectRatio = targetWidth / targetHeight;
        
        let drawWidth, drawHeight;
        
        if (aspectRatio > targetAspectRatio) {
            // Image is wider than target
            drawWidth = targetWidth;
            drawHeight = targetWidth / aspectRatio;
        } else {
            // Image is taller than target
            drawHeight = targetHeight;
            drawWidth = targetHeight * aspectRatio;
        }
        
        newCanvas.width = targetWidth;
        newCanvas.height = targetHeight;
        
        // Fill with white background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, targetWidth, targetHeight);
        
        // Center the image
        const offsetX = (targetWidth - drawWidth) / 2;
        const offsetY = (targetHeight - drawHeight) / 2;
        
        // Use high-quality image scaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(canvas, offsetX, offsetY, drawWidth, drawHeight);
        
        return newCanvas;
    }

    /**
     * Apply morphological operations to clean up the image
     */
    morphologicalOperations(canvas) {
        const newCanvas = document.createElement('canvas');
        const ctx = newCanvas.getContext('2d');
        newCanvas.width = canvas.width;
        newCanvas.height = canvas.height;

        ctx.drawImage(canvas, 0, 0);
        const imageData = ctx.getImageData(0, 0, newCanvas.width, newCanvas.height);
        const data = imageData.data;

        // Convert to binary (black and white only)
        const threshold = 128;
        for (let i = 0; i < data.length; i += 4) {
            const value = data[i] > threshold ? 255 : 0;
            data[i] = value;     // Red
            data[i + 1] = value; // Green
            data[i + 2] = value; // Blue
        }

        ctx.putImageData(imageData, 0, 0);
        return newCanvas;
    }

    /**
     * Multiple OCR attempts with different preprocessing combinations
     */
    async performMultipleOCR(originalCanvas, country = 'UK') {
        const attempts = [
            // Attempt 1: Full preprocessing
            {
                name: 'Full preprocessing',
                options: { enhanceContrast: true, denoise: true, sharpen: true }
            },
            // Attempt 2: Contrast + sharpen only
            {
                name: 'Contrast + sharpen',
                options: { enhanceContrast: true, denoise: false, sharpen: true }
            },
            // Attempt 3: Minimal processing
            {
                name: 'Minimal processing',
                options: { enhanceContrast: true, denoise: false, sharpen: false }
            },
            // Attempt 4: Original image
            {
                name: 'Original image',
                options: { enhanceContrast: false, denoise: false, sharpen: false }
            }
        ];

        const results = [];
        const plateDetector = window.plateDetector || new LicensePlateDetector();

        for (const attempt of attempts) {
            try {
                console.log(`🔄 OCR Attempt: ${attempt.name}`);
                
                let processedCanvas;
                if (attempt.name === 'Original image') {
                    processedCanvas = originalCanvas;
                } else {
                    processedCanvas = await this.preprocessImage(originalCanvas, {
                        ...attempt.options,
                        country,
                        showDebug: false
                    });
                }

                // Get OCR settings for the country
                const ocrSettings = plateDetector.getOCRSettings(country);

                // Perform OCR
                const { data: { text, confidence } } = await Tesseract.recognize(
                    processedCanvas,
                    'eng',
                    {
                        logger: () => {}, // Suppress logging for multiple attempts
                        ...ocrSettings
                    }
                );

                // Extract license plate
                const plateText = plateDetector.extractLicensePlate(text, country);
                
                if (plateText) {
                    results.push({
                        attempt: attempt.name,
                        plate: plateText,
                        confidence: confidence,
                        rawText: text.trim(),
                        canvas: processedCanvas
                    });
                    
                    console.log(`✅ ${attempt.name}: Found "${plateText}" (confidence: ${confidence}%)`);
                } else {
                    console.log(`❌ ${attempt.name}: No plate detected`);
                }

            } catch (error) {
                console.error(`❌ ${attempt.name} failed:`, error.message);
            }
        }

        return results;
    }

    /**
     * Select best result from multiple OCR attempts
     */
    selectBestResult(results) {
        if (results.length === 0) return null;

        // Sort by confidence and consistency
        results.sort((a, b) => {
            // Prefer higher confidence
            const confidenceDiff = b.confidence - a.confidence;
            if (Math.abs(confidenceDiff) > 10) return confidenceDiff;
            
            // Prefer results that appear multiple times
            const aCount = results.filter(r => r.plate === a.plate).length;
            const bCount = results.filter(r => r.plate === b.plate).length;
            
            return bCount - aCount;
        });

        const best = results[0];
        console.log(`🏆 Selected best result: "${best.plate}" from ${best.attempt} (confidence: ${best.confidence}%)`);
        
        return best;
    }

    /**
     * Show debug images for comparison
     */
    showDebugImages(original, processed) {
        if (!this.debug) return;

        // Create debug container if it doesn't exist
        let debugContainer = document.getElementById('debugImages');
        if (!debugContainer) {
            debugContainer = document.createElement('div');
            debugContainer.id = 'debugImages';
            debugContainer.style.cssText = `
                position: fixed;
                top: 10px;
                right: 10px;
                background: white;
                padding: 10px;
                border: 2px solid #333;
                border-radius: 8px;
                z-index: 10000;
                max-width: 300px;
            `;
            document.body.appendChild(debugContainer);
        }

        debugContainer.innerHTML = `
            <h4>Debug: Image Processing</h4>
            <div style="margin: 10px 0;">
                <strong>Original:</strong><br>
                <canvas style="max-width: 150px; border: 1px solid #ccc;"></canvas>
            </div>
            <div style="margin: 10px 0;">
                <strong>Processed:</strong><br>
                <canvas style="max-width: 150px; border: 1px solid #ccc;"></canvas>
            </div>
            <button onclick="document.getElementById('debugImages').remove()" 
                    style="padding: 5px 10px; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer;">
                Close
            </button>
        `;

        const canvases = debugContainer.querySelectorAll('canvas');
        
        // Draw original
        const originalCtx = canvases[0].getContext('2d');
        canvases[0].width = original.width;
        canvases[0].height = original.height;
        originalCtx.drawImage(original, 0, 0);
        
        // Draw processed
        const processedCtx = canvases[1].getContext('2d');
        canvases[1].width = processed.width;
        canvases[1].height = processed.height;
        processedCtx.drawImage(processed, 0, 0);
    }

    /**
     * Capture guidance overlay for better user photos
     */
    createCaptureGuidance() {
        return {
            title: "📸 Better License Plate Photos",
            tips: [
                "🔆 Ensure good lighting - avoid shadows",
                "📐 Hold phone straight - avoid angles",
                "🎯 Get close - fill the frame with the plate",
                "🚫 Avoid reflections and glare",
                "📱 Keep phone steady when capturing",
                "🔍 Make sure plate is in focus",
                "🌤️ Best results in daylight or good artificial light"
            ],
            overlay: {
                show: true,
                color: 'rgba(255, 255, 255, 0.8)',
                borderColor: '#00ff00',
                text: 'Position license plate here'
            }
        };
    }
}

// Export for use in other modules
window.ImageProcessor = ImageProcessor;
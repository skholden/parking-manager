/**
 * Advanced License Plate Detection System
 * Supports multiple countries with optimized OCR settings and patterns
 */

class LicensePlateDetector {
    constructor() {
        this.countryPatterns = this.initializeCountryPatterns();
        this.ocrSettings = this.initializeOCRSettings();
    }

    /**
     * Initialize country-specific license plate patterns
     */
    initializeCountryPatterns() {
        return {
            UK: {
                name: 'United Kingdom',
                patterns: [
                    // Current format (2001-present): AB12 CDE
                    { regex: /^[A-Z]{2}[0-9]{2}\s[A-Z]{3}$/, format: 'AB12 CDE', priority: 1 },
                    { regex: /^[A-Z]{2}[0-9]{2}[A-Z]{3}$/, format: 'AB12CDE', priority: 1 },
                    
                    // Prefix format (1983-2001): A123 BCD
                    { regex: /^[A-Z][0-9]{3}\s[A-Z]{3}$/, format: 'A123 BCD', priority: 2 },
                    { regex: /^[A-Z][0-9]{3}[A-Z]{3}$/, format: 'A123BCD', priority: 2 },
                    
                    // Suffix format (1963-1983): ABC 123D
                    { regex: /^[A-Z]{3}\s[0-9]{3}[A-Z]$/, format: 'ABC 123D', priority: 3 },
                    { regex: /^[A-Z]{3}[0-9]{3}[A-Z]$/, format: 'ABC123D', priority: 3 },
                    
                    // Older formats
                    { regex: /^[A-Z]{3}\s[0-9]{3}$/, format: 'ABC 123', priority: 4 },
                    { regex: /^[A-Z]{3}[0-9]{3}$/, format: 'ABC123', priority: 4 },
                    
                    // Northern Ireland format
                    { regex: /^[A-Z]{3}\s[0-9]{4}$/, format: 'ABC 1234', priority: 5 }
                ],
                characterWhitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ',
                commonMistakes: {
                    'O': '0', 'Q': '0', 'I': '1', 'l': '1', '|': '1',
                    'S': '5', '$': '5', 'Z': '2', 'B': '8', 'G': '6'
                },
                formatPlate: (plate) => this.formatUKPlate(plate)
            },
            
            US: {
                name: 'United States',
                patterns: [
                    { regex: /^[A-Z0-9]{2,3}[-\s][A-Z0-9]{3,4}$/, format: 'ABC-1234', priority: 1 },
                    { regex: /^[A-Z0-9]{6,7}$/, format: 'ABC1234', priority: 2 },
                    { regex: /^[0-9]{1,3}[-\s][A-Z]{3}$/, format: '123-ABC', priority: 3 }
                ],
                characterWhitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789- ',
                commonMistakes: {
                    'O': '0', 'I': '1', 'S': '5', 'Z': '2', 'B': '8'
                },
                formatPlate: (plate) => plate.toUpperCase().trim()
            },
            
            DE: {
                name: 'Germany',
                patterns: [
                    { regex: /^[A-Z]{1,3}[-\s][A-Z]{1,2}[-\s][0-9]{1,4}$/, format: 'B-MW 1234', priority: 1 },
                    { regex: /^[A-Z]{1,3}[A-Z]{1,2}[0-9]{1,4}$/, format: 'BMW1234', priority: 2 }
                ],
                characterWhitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789- ',
                commonMistakes: {
                    'O': '0', 'I': '1', 'S': '5'
                },
                formatPlate: (plate) => plate.toUpperCase().trim()
            },
            
            FR: {
                name: 'France',
                patterns: [
                    { regex: /^[A-Z]{2}[-\s][0-9]{3}[-\s][A-Z]{2}$/, format: 'AB-123-CD', priority: 1 },
                    { regex: /^[A-Z]{2}[0-9]{3}[A-Z]{2}$/, format: 'AB123CD', priority: 2 }
                ],
                characterWhitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789- ',
                commonMistakes: {
                    'O': '0', 'I': '1', 'S': '5'
                },
                formatPlate: (plate) => plate.toUpperCase().trim()
            },
            
            ES: {
                name: 'Spain',
                patterns: [
                    { regex: /^[0-9]{4}[-\s][A-Z]{3}$/, format: '1234-ABC', priority: 1 },
                    { regex: /^[0-9]{4}[A-Z]{3}$/, format: '1234ABC', priority: 2 }
                ],
                characterWhitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789- ',
                commonMistakes: {
                    'O': '0', 'I': '1', 'S': '5'
                },
                formatPlate: (plate) => plate.toUpperCase().trim()
            },
            
            IT: {
                name: 'Italy',
                patterns: [
                    { regex: /^[A-Z]{2}[-\s][0-9]{3}[-\s][A-Z]{2}$/, format: 'AB-123-CD', priority: 1 },
                    { regex: /^[A-Z]{2}[0-9]{3}[A-Z]{2}$/, format: 'AB123CD', priority: 2 }
                ],
                characterWhitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789- ',
                commonMistakes: {
                    'O': '0', 'I': '1', 'S': '5'
                },
                formatPlate: (plate) => plate.toUpperCase().trim()
            },
            
            NL: {
                name: 'Netherlands',
                patterns: [
                    { regex: /^[0-9]{2}[-\s][A-Z]{2}[-\s][0-9]{2}$/, format: '12-AB-34', priority: 1 },
                    { regex: /^[A-Z]{2}[-\s][0-9]{2}[-\s][A-Z]{2}$/, format: 'AB-12-CD', priority: 2 }
                ],
                characterWhitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789- ',
                commonMistakes: {
                    'O': '0', 'I': '1', 'S': '5'
                },
                formatPlate: (plate) => plate.toUpperCase().trim()
            },
            
            AU: {
                name: 'Australia',
                patterns: [
                    { regex: /^[A-Z]{3}[-\s][0-9]{3}$/, format: 'ABC-123', priority: 1 },
                    { regex: /^[A-Z]{3}[0-9]{3}$/, format: 'ABC123', priority: 2 },
                    { regex: /^[0-9]{3}[-\s][A-Z]{3}$/, format: '123-ABC', priority: 3 }
                ],
                characterWhitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789- ',
                commonMistakes: {
                    'O': '0', 'I': '1', 'S': '5'
                },
                formatPlate: (plate) => plate.toUpperCase().trim()
            },
            
            CA: {
                name: 'Canada',
                patterns: [
                    { regex: /^[A-Z]{4}[-\s][0-9]{3}$/, format: 'ABCD-123', priority: 1 },
                    { regex: /^[A-Z]{3}[-\s][0-9]{4}$/, format: 'ABC-1234', priority: 2 }
                ],
                characterWhitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789- ',
                commonMistakes: {
                    'O': '0', 'I': '1', 'S': '5'
                },
                formatPlate: (plate) => plate.toUpperCase().trim()
            },
            
            JP: {
                name: 'Japan',
                patterns: [
                    { regex: /^[0-9]{2,3}[-\s][0-9]{2}[-\s][0-9]{2}$/, format: '123-45-67', priority: 1 },
                    { regex: /^[0-9]{4,6}$/, format: '123456', priority: 2 }
                ],
                characterWhitelist: '0123456789- ',
                commonMistakes: {
                    'O': '0', 'I': '1', 'S': '5'
                },
                formatPlate: (plate) => plate.trim()
            }
        };
    }

    /**
     * Initialize OCR settings for different countries
     */
    initializeOCRSettings() {
        return {
            UK: {
                tessedit_pageseg_mode: Tesseract.PSM.SINGLE_LINE,
                tessedit_char_blacklist: '!@#$%^&*()+=[]{}\\|;:"\',.<>?/~`',
                preserve_interword_spaces: '1',
                tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY
            },
            US: {
                tessedit_pageseg_mode: Tesseract.PSM.SINGLE_LINE,
                tessedit_char_blacklist: '!@#$%^&*()+=[]{}\\|;:"\',.<>?/~`',
                preserve_interword_spaces: '1'
            },
            DE: {
                tessedit_pageseg_mode: Tesseract.PSM.SINGLE_LINE,
                tessedit_char_blacklist: '!@#$%^&*()+=[]{}\\|;:"\',.<>?/~`',
                preserve_interword_spaces: '1'
            },
            // Add more country-specific OCR settings as needed
            default: {
                tessedit_pageseg_mode: Tesseract.PSM.SINGLE_LINE,
                tessedit_char_blacklist: '!@#$%^&*()+=[]{}\\|;:"\',.<>?/~`',
                preserve_interword_spaces: '1'
            }
        };
    }

    /**
     * Extract license plate using country-specific logic
     */
    extractLicensePlate(text, country = 'UK') {
        const countryConfig = this.countryPatterns[country];
        if (!countryConfig) {
            console.warn(`Country ${country} not supported, using UK patterns`);
            return this.extractLicensePlate(text, 'UK');
        }

        const lines = text.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);

        // Sort patterns by priority (lower number = higher priority)
        const sortedPatterns = countryConfig.patterns.sort((a, b) => a.priority - b.priority);

        for (const line of lines) {
            const cleaned = this.cleanText(line, countryConfig);
            
            // Try patterns in priority order
            for (const pattern of sortedPatterns) {
                // Try with original spacing
                if (pattern.regex.test(cleaned)) {
                    return countryConfig.formatPlate(cleaned);
                }
                
                // Try without spaces
                const noSpaces = cleaned.replace(/\s+/g, '');
                if (pattern.regex.test(noSpaces)) {
                    return countryConfig.formatPlate(noSpaces);
                }
                
                // For UK, try adding space in typical position
                if (country === 'UK' && noSpaces.length === 7) {
                    const withSpace = noSpaces.substring(0, 4) + ' ' + noSpaces.substring(4);
                    if (pattern.regex.test(withSpace)) {
                        return countryConfig.formatPlate(withSpace);
                    }
                }
            }
        }

        return null;
    }

    /**
     * Clean text based on country-specific rules
     */
    cleanText(text, countryConfig) {
        let cleaned = text
            .replace(/[^\w\s-]/g, '') // Remove special chars except letters, numbers, spaces, hyphens
            .trim()
            .toUpperCase();

        // Apply country-specific character corrections
        for (const [wrong, correct] of Object.entries(countryConfig.commonMistakes)) {
            cleaned = cleaned.replace(new RegExp(wrong, 'g'), correct);
        }

        return cleaned;
    }

    /**
     * Format UK license plates properly
     */
    formatUKPlate(plate) {
        const clean = plate.replace(/\s+/g, '');
        
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
        
        return clean;
    }

    /**
     * Get OCR settings for a specific country
     */
    getOCRSettings(country = 'UK') {
        const countryConfig = this.countryPatterns[country];
        const ocrConfig = this.ocrSettings[country] || this.ocrSettings.default;
        
        return {
            ...ocrConfig,
            tessedit_char_whitelist: countryConfig?.characterWhitelist || 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 -'
        };
    }

    /**
     * Get supported countries list
     */
    getSupportedCountries() {
        return Object.entries(this.countryPatterns).map(([code, config]) => ({
            code,
            name: config.name,
            patterns: config.patterns.map(p => p.format)
        }));
    }

    /**
     * Validate a license plate against country patterns
     */
    validatePlate(plate, country = 'UK') {
        const countryConfig = this.countryPatterns[country];
        if (!countryConfig) return false;

        const cleaned = this.cleanText(plate, countryConfig);
        return countryConfig.patterns.some(pattern => pattern.regex.test(cleaned));
    }

    /**
     * Get example patterns for a country
     */
    getExamplePatterns(country = 'UK') {
        const countryConfig = this.countryPatterns[country];
        if (!countryConfig) return [];
        
        return countryConfig.patterns
            .sort((a, b) => a.priority - b.priority)
            .map(p => p.format);
    }
}

// Export for use in other modules
window.LicensePlateDetector = LicensePlateDetector;
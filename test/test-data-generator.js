/**
 * UK License Plate Test Data Generator
 * Creates realistic test cases for validating OCR and pattern matching
 */

class UKPlateTestGenerator {
    constructor() {
        this.areaCodes = [
            'AB', 'AC', 'AD', 'AE', 'AF', 'AG', 'AH', 'AJ', 'AK', 'AL', 'AM', 'AN', 'AO', 'AP', 'AR', 'AS', 'AT', 'AU', 'AV', 'AW', 'AX', 'AY',
            'BA', 'BB', 'BC', 'BD', 'BE', 'BF', 'BG', 'BH', 'BJ', 'BK', 'BL', 'BM', 'BN', 'BO', 'BP', 'BR', 'BS', 'BT', 'BU', 'BV', 'BW', 'BX', 'BY',
            'CA', 'CB', 'CC', 'CD', 'CE', 'CF', 'CG', 'CH', 'CJ', 'CK', 'CL', 'CM', 'CN', 'CO', 'CP', 'CR', 'CS', 'CT', 'CU', 'CV', 'CW', 'CX', 'CY',
            'DA', 'DB', 'DC', 'DD', 'DE', 'DF', 'DG', 'DH', 'DJ', 'DK', 'DL', 'DM', 'DN', 'DO', 'DP', 'DR', 'DS', 'DT', 'DU', 'DV', 'DW', 'DX', 'DY',
            'EA', 'EB', 'EC', 'ED', 'EE', 'EF', 'EG', 'EH', 'EJ', 'EK', 'EL', 'EM', 'EN', 'EO', 'EP', 'ER', 'ES', 'ET', 'EU', 'EV', 'EW', 'EX', 'EY'
        ];
        
        this.letters = 'ABCDEFGHJKLMNOPRSTUVWXYZ'; // Excludes I, Q, Z for modern plates
        this.prefixLetters = 'ABCDEFGHJKLMNOPQRSTUVWXYZ'; // Includes Q for older plates
        this.numbers = '0123456789';
        
        // Common OCR mistakes
        this.ocrMistakes = {
            '0': ['O', 'Q', 'D'],
            '1': ['I', 'l', '|'],
            '2': ['Z'],
            '5': ['S', '$'],
            '6': ['G'],
            '8': ['B'],
            'B': ['8', '3'],
            'D': ['0', 'O'],
            'G': ['6', 'C'],
            'O': ['0', 'Q'],
            'S': ['5', '$'],
            'Z': ['2']
        };
    }

    /**
     * Generate current format plates (AB12 CDE)
     */
    generateCurrentFormat(count = 20) {
        const plates = [];
        for (let i = 0; i < count; i++) {
            const area = this.getRandomAreaCode();
            const age = this.getRandomNumber(2);
            const random = this.getRandomLetters(3);
            
            const plate = `${area}${age} ${random}`;
            plates.push({
                plate,
                format: 'current',
                expected: plate,
                description: `Current format: ${plate}`
            });
        }
        return plates;
    }

    /**
     * Generate prefix format plates (A123 BCD)
     */
    generatePrefixFormat(count = 10) {
        const plates = [];
        for (let i = 0; i < count; i++) {
            const age = this.getRandomFromString(this.prefixLetters, 1);
            const area = this.getRandomNumber(3);
            const random = this.getRandomLetters(3);
            
            const plate = `${age}${area} ${random}`;
            plates.push({
                plate,
                format: 'prefix',
                expected: plate,
                description: `Prefix format: ${plate}`
            });
        }
        return plates;
    }

    /**
     * Generate suffix format plates (ABC 123D)
     */
    generateSuffixFormat(count = 10) {
        const plates = [];
        for (let i = 0; i < count; i++) {
            const area = this.getRandomLetters(3);
            const number = this.getRandomNumber(3);
            const age = this.getRandomFromString(this.prefixLetters, 1);
            
            const plate = `${area} ${number}${age}`;
            plates.push({
                plate,
                format: 'suffix',
                expected: plate,
                description: `Suffix format: ${plate}`
            });
        }
        return plates;
    }

    /**
     * Generate old format plates (ABC 123)
     */
    generateOldFormat(count = 10) {
        const plates = [];
        for (let i = 0; i < count; i++) {
            const area = this.getRandomLetters(3);
            const number = this.getRandomNumber(3);
            
            const plate = `${area} ${number}`;
            plates.push({
                plate,
                format: 'old',
                expected: plate,
                description: `Old format: ${plate}`
            });
        }
        return plates;
    }

    /**
     * Generate test cases with OCR errors
     */
    generateOCRErrorCases(basePlates, errorRate = 0.3) {
        const errorCases = [];
        
        basePlates.forEach(baseCase => {
            if (Math.random() < errorRate) {
                const corruptedPlate = this.introduceOCRErrors(baseCase.plate);
                errorCases.push({
                    plate: corruptedPlate,
                    format: baseCase.format,
                    expected: baseCase.expected,
                    description: `OCR errors: "${corruptedPlate}" should detect as "${baseCase.expected}"`
                });
            }
        });
        
        return errorCases;
    }

    /**
     * Generate test cases with various text noise
     */
    generateNoisyCases(basePlates) {
        const noisyPrefixes = [
            'Reg:', 'Registration:', 'License:', 'Plate:', 'Number:', 'Car:', 'Vehicle:',
            'UK Reg:', 'GB', 'DVLA', 'REG NO:', ''
        ];
        
        const noisySuffixes = [
            'End', 'UK', 'GB', 'DVLA', 'Valid', 'Expires', 'MOT', 'Tax', ''
        ];
        
        const noisyCases = [];
        
        basePlates.slice(0, 10).forEach(baseCase => {
            const prefix = noisyPrefixes[Math.floor(Math.random() * noisyPrefixes.length)];
            const suffix = noisySuffixes[Math.floor(Math.random() * noisySuffixes.length)];
            
            const noisyText = `${prefix} ${baseCase.plate} ${suffix}`.trim();
            
            noisyCases.push({
                plate: noisyText,
                format: baseCase.format,
                expected: baseCase.expected,
                description: `Text with noise: "${noisyText}" should extract "${baseCase.expected}"`
            });
        });
        
        return noisyCases;
    }

    /**
     * Generate spacing variation test cases
     */
    generateSpacingVariations(basePlates) {
        const spacingCases = [];
        
        basePlates.slice(0, 15).forEach(baseCase => {
            // Remove spaces
            const noSpaces = baseCase.plate.replace(/\s+/g, '');
            spacingCases.push({
                plate: noSpaces,
                format: baseCase.format,
                expected: baseCase.expected,
                description: `No spacing: "${noSpaces}" should format as "${baseCase.expected}"`
            });
            
            // Multiple spaces
            if (Math.random() < 0.5) {
                const multiSpaces = baseCase.plate.replace(/\s+/g, '   ');
                spacingCases.push({
                    plate: multiSpaces,
                    format: baseCase.format,
                    expected: baseCase.expected,
                    description: `Multiple spaces: "${multiSpaces}" should format as "${baseCase.expected}"`
                });
            }
        });
        
        return spacingCases;
    }

    /**
     * Generate invalid test cases (should return null)
     */
    generateInvalidCases() {
        return [
            { plate: '', expected: null, description: 'Empty string' },
            { plate: '12345', expected: null, description: 'Numbers only' },
            { plate: 'ABCDEF', expected: null, description: 'Letters only' },
            { plate: 'AB12 CDEF', expected: null, description: 'Too many letters' },
            { plate: 'A B12 CDE', expected: null, description: 'Invalid spacing' },
            { plate: 'AB123 CDE', expected: null, description: 'Too many numbers' },
            { plate: '123 ABCD', expected: null, description: 'Invalid pattern' },
            { plate: 'AB12 CQZ', expected: null, description: 'Contains forbidden letters (Q, Z)' },
            { plate: 'AB12 CI1', expected: null, description: 'Contains forbidden letters (I)' },
            { plate: 'AB1 CD', expected: null, description: 'Too short' },
        ];
    }

    /**
     * Generate comprehensive test suite
     */
    generateComprehensiveTestSuite() {
        console.log('🏭 Generating comprehensive UK license plate test suite...');
        
        // Generate base plates
        const currentPlates = this.generateCurrentFormat(20);
        const prefixPlates = this.generatePrefixFormat(10);
        const suffixPlates = this.generateSuffixFormat(10);
        const oldPlates = this.generateOldFormat(10);
        
        const allBasePlates = [...currentPlates, ...prefixPlates, ...suffixPlates, ...oldPlates];
        
        // Generate variations
        const ocrErrorCases = this.generateOCRErrorCases(allBasePlates, 0.4);
        const noisyCases = this.generateNoisyCases(allBasePlates);
        const spacingCases = this.generateSpacingVariations(allBasePlates);
        const invalidCases = this.generateInvalidCases();
        
        const testSuite = {
            baseTests: allBasePlates,
            ocrErrorTests: ocrErrorCases,
            noisyTextTests: noisyCases,
            spacingTests: spacingCases,
            invalidTests: invalidCases,
            totalTests: allBasePlates.length + ocrErrorCases.length + noisyCases.length + spacingCases.length + invalidCases.length
        };
        
        console.log(`✅ Generated ${testSuite.totalTests} test cases:`);
        console.log(`   📋 Base plates: ${allBasePlates.length}`);
        console.log(`   🔤 OCR error cases: ${ocrErrorCases.length}`);
        console.log(`   🔊 Noisy text cases: ${noisyCases.length}`);
        console.log(`   📏 Spacing variations: ${spacingCases.length}`);
        console.log(`   ❌ Invalid cases: ${invalidCases.length}`);
        
        return testSuite;
    }

    /**
     * Helper methods
     */
    getRandomAreaCode() {
        return this.areaCodes[Math.floor(Math.random() * this.areaCodes.length)];
    }

    getRandomLetters(count) {
        let result = '';
        for (let i = 0; i < count; i++) {
            result += this.letters[Math.floor(Math.random() * this.letters.length)];
        }
        return result;
    }

    getRandomNumber(maxDigits) {
        const digits = Math.floor(Math.random() * maxDigits) + 1;
        let result = '';
        for (let i = 0; i < digits; i++) {
            result += this.numbers[Math.floor(Math.random() * this.numbers.length)];
        }
        return result;
    }

    getRandomFromString(str, count) {
        let result = '';
        for (let i = 0; i < count; i++) {
            result += str[Math.floor(Math.random() * str.length)];
        }
        return result;
    }

    introduceOCRErrors(plate) {
        let corrupted = plate;
        
        // Introduce 1-2 OCR errors randomly
        const errorCount = Math.random() < 0.7 ? 1 : 2;
        
        for (let i = 0; i < errorCount; i++) {
            const chars = corrupted.split('');
            const randomIndex = Math.floor(Math.random() * chars.length);
            const char = chars[randomIndex];
            
            if (this.ocrMistakes[char] && Math.random() < 0.8) {
                const mistakes = this.ocrMistakes[char];
                chars[randomIndex] = mistakes[Math.floor(Math.random() * mistakes.length)];
                corrupted = chars.join('');
            }
        }
        
        return corrupted;
    }
}

// Export for use in testing
if (typeof window !== 'undefined') {
    window.UKPlateTestGenerator = UKPlateTestGenerator;
} else if (typeof module !== 'undefined') {
    module.exports = UKPlateTestGenerator;
}
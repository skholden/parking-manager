# UK License Plate Testing Guide

## Test Image Collection Strategy

### Recommended Sources for UK License Plate Images (50 Images)

#### 1. **Legal Image Sources** (40 images)
- **Wikipedia Commons**: Search "UK license plates" or "British number plates"
- **Government websites**: DVLA examples and documentation
- **Educational websites**: Driving test sites, automotive education
- **Stock photography**: Shutterstock, Getty Images (free samples)
- **Car dealer websites**: Legitimate car sales listings
- **Automotive blogs**: Vehicle reviews and guides

#### 2. **Generated Test Images** (10 images)
Create test images with various UK formats for controlled testing:

```
Current Format (2001-present):
- AB12 CDE
- PH07 AJN  
- BT15 XYZ
- WR09 ABC

Prefix Format (1983-2001):
- A123 BCD
- M876 NPQ
- R456 STU

Suffix Format (1963-1983):
- ABC 123D
- KNV 147P
- XYZ 999Z

Old Format (pre-1963):
- ABC 123
- DEF 456
```

## UK License Plate Format Reference

### 1. **Current Format (2001-present): AB12 CDE**
- **Area code**: First 2 letters (geographical identifier)
- **Age identifier**: 2 numbers (indicates 6-month period of registration)
- **Random letters**: 3 letters (avoid I, Q, Z to prevent confusion)

**Examples to test:**
- AB12 CDE, PH07 AJN, BT15 XYZ, WR09 ABC
- BD51 SMR, K7 AAA (invalid - too short)
- AB12 IQZ (invalid - contains forbidden letters)

### 2. **Prefix Format (1983-2001): A123 BCD**
- **Age identifier**: 1 letter at start
- **Area code**: 1-3 numbers 
- **Random letters**: 3 letters at end

**Examples to test:**
- A123 BCD, M876 NPQ, R456 STU, T42 ABC

### 3. **Suffix Format (1963-1983): ABC 123D**
- **Area code**: 3 letters at start
- **Sequential number**: 1-3 numbers
- **Age identifier**: 1 letter at end

**Examples to test:**
- ABC 123D, KNV 147P, XYZ 999Z, DEF 1A

### 4. **Old Format (pre-1963): ABC 123**
- **Area code**: 2-3 letters
- **Sequential number**: 1-4 numbers

**Examples to test:**
- ABC 123, DEF 456, GH 789, ABCD 1234

## Testing Scenarios

### A. **Image Quality Variations**
1. **High quality, clear images** (10 images)
2. **Medium quality with slight blur** (10 images)  
3. **Low quality/pixelated** (10 images)
4. **Various lighting conditions** (10 images)
5. **Angled/perspective shots** (10 images)

### B. **Background Variations**
- White plates on vehicles
- Yellow rear plates
- Plates with dirt/wear
- Plates with reflections
- Plates in shadows

### C. **OCR Challenge Cases**
- **Character confusion**: O vs 0, I vs 1, S vs 5, Z vs 2
- **Spacing issues**: Missing or extra spaces
- **Partial occlusion**: Parts of letters hidden
- **Font variations**: Different plate fonts

## Test Image Naming Convention

Use this naming pattern for organized testing:
```
uk-{format}-{quality}-{condition}-{number}.jpg

Examples:
uk-current-high-clean-001.jpg
uk-prefix-medium-dirty-002.jpg  
uk-suffix-low-angled-003.jpg
uk-old-high-shadow-004.jpg
```

## Expected Detection Results

### **High Success Rate (90%+)**
- Clear, straight-on images
- Good lighting
- Clean plates
- Standard fonts

### **Medium Success Rate (70-90%)**
- Slightly angled images
- Minor dirt or wear
- Varying lighting
- Some character confusion

### **Low Success Rate (40-70%)**
- Heavily angled shots
- Poor lighting/shadows
- Significant occlusion
- Very dirty plates

## Testing Checklist

### **Format Coverage**
- [ ] Current format (AB12 CDE): 20 images
- [ ] Prefix format (A123 BCD): 10 images  
- [ ] Suffix format (ABC 123D): 10 images
- [ ] Old format (ABC 123): 10 images

### **Quality Coverage**
- [ ] High quality: 15 images
- [ ] Medium quality: 20 images
- [ ] Low quality: 15 images

### **Condition Coverage**
- [ ] Clean plates: 20 images
- [ ] Dirty/worn plates: 15 images
- [ ] Reflective/glare: 10 images
- [ ] Shadowed: 5 images

### **Angle Coverage**
- [ ] Straight-on: 30 images
- [ ] Slight angle: 15 images
- [ ] Heavy angle: 5 images

## Running the Tests

1. **Open the test suite**: `test/plate-testing.html`
2. **Run automated format tests**: Click "Run UK Format Tests"
3. **Upload test images**: Drag and drop your 50 collected images
4. **Review results**: Check accuracy rates and failed cases
5. **Optimize settings**: Adjust OCR parameters based on results

## Success Metrics

### **Target Accuracy Rates**
- **Overall accuracy**: 85%+ across all test images
- **Current format**: 95%+ (most common format)
- **Clear images**: 98%+ (optimal conditions)
- **Challenging images**: 60%+ (poor conditions)

### **Performance Metrics**
- **Processing time**: <3 seconds per image
- **False positives**: <5% (detecting non-plates as plates)
- **False negatives**: <15% (missing valid plates)

## Improvement Strategies

Based on test results, consider:

1. **OCR Parameter Tuning**
   - Adjust whitelist characters
   - Modify page segmentation mode
   - Try different OCR engines

2. **Pre-processing**
   - Image enhancement (contrast, brightness)
   - Noise reduction
   - Geometric correction

3. **Post-processing**
   - Enhanced pattern matching
   - Character substitution rules
   - Confidence scoring

## Legal and Ethical Notes

- **Privacy**: Never use images showing personal information
- **Copyright**: Only use royalty-free or properly licensed images
- **Data protection**: Don't store or transmit personal license plate data
- **Testing only**: Use test data for development purposes only

## Sample Test Commands

```javascript
// Test individual formats
plateDetector.extractLicensePlate('AB12 CDE', 'UK');
plateDetector.extractLicensePlate('A123 BCD', 'UK');

// Validate plate format
plateDetector.validatePlate('AB12 CDE', 'UK');

// Get format examples
plateDetector.getExamplePatterns('UK');
```

This comprehensive testing approach will help achieve optimal license plate detection accuracy for UK vehicles.
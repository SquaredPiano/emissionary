import cv2
import numpy as np
import pytesseract
from PIL import Image, ImageEnhance, ImageFilter
import os

def load_and_preprocess_image(image_path):
    """Load and create multiple preprocessing versions of the image"""
    # Load image
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Could not load image: {image_path}")
    
    print(f"Original image shape: {img.shape}")
    
    # Create preprocessing versions
    versions = {}
    
    # 1. Original RGB
    versions['original_rgb'] = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    
    # 2. Grayscale
    versions['grayscale'] = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # 3. Adaptive threshold (Gaussian)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    versions['adaptive_gaussian'] = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2)
    
    # 4. Adaptive threshold (Mean)
    versions['adaptive_mean'] = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY, 11, 2)
    
    # 5. Otsu thresholding
    _, versions['otsu'] = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    
    # 6. Simple thresholding (various values)
    _, versions['thresh_127'] = cv2.threshold(gray, 127, 255, cv2.THRESH_BINARY)
    _, versions['thresh_100'] = cv2.threshold(gray, 100, 255, cv2.THRESH_BINARY)
    _, versions['thresh_150'] = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY)
    
    # 7. Enhanced contrast + sharpness
    pil_img = Image.fromarray(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
    enhancer = ImageEnhance.Contrast(pil_img)
    enhanced = enhancer.enhance(2.0)
    sharpened = enhanced.filter(ImageFilter.SHARPEN)
    enhanced_array = cv2.cvtColor(np.array(sharpened), cv2.COLOR_RGB2BGR)
    enhanced_gray = cv2.cvtColor(enhanced_array, cv2.COLOR_BGR2GRAY)
    _, versions['enhanced_otsu'] = cv2.threshold(enhanced_gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    
    # 8. Denoised
    denoised = cv2.fastNlMeansDenoising(gray)
    _, versions['denoised_otsu'] = cv2.threshold(denoised, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    
    # 9. Morphological operations
    kernel = np.ones((1, 1), np.uint8)
    versions['morph_close'] = cv2.morphologyEx(versions['adaptive_gaussian'], cv2.MORPH_CLOSE, kernel)
    versions['morph_open'] = cv2.morphologyEx(versions['adaptive_gaussian'], cv2.MORPH_OPEN, kernel)
    
    # 10. Inverted versions (sometimes helps)
    versions['adaptive_gaussian_inv'] = cv2.bitwise_not(versions['adaptive_gaussian'])
    versions['otsu_inv'] = cv2.bitwise_not(versions['otsu'])
    
    return versions

def test_tesseract_configs(image_versions):
    """Test different Tesseract configurations"""
    psm_modes = [3, 4, 6, 8, 11, 12, 13]
    oem_modes = [1, 3]
    
    results = {}
    
    for version_name, img in image_versions.items():
        print(f"\nTesting version: {version_name}")
        results[version_name] = {}
        
        for psm in psm_modes:
            for oem in oem_modes:
                try:
                    config = f'--psm {psm} --oem {oem}'
                    text = pytesseract.image_to_string(img, config=config)
                    
                    # Clean up text
                    text = text.strip()
                    
                    # Calculate a simple quality score
                    char_count = len(text)
                    word_count = len(text.split())
                    number_count = sum(1 for char in text if char.isdigit())
                    
                    # Save result
                    result_key = f"psm{psm}_oem{oem}"
                    results[version_name][result_key] = {
                        'text': text,
                        'char_count': char_count,
                        'word_count': word_count,
                        'number_count': number_count,
                        'config': config
                    }
                    
                    # Save to file for easy comparison
                    filename = f"results/{version_name}_{result_key}.txt"
                    os.makedirs("results", exist_ok=True)
                    with open(filename, 'w', encoding='utf-8') as f:
                        f.write(f"Config: {config}\n")
                        f.write(f"Version: {version_name}\n")
                        f.write(f"Char count: {char_count}\n")
                        f.write(f"Word count: {word_count}\n")
                        f.write(f"Number count: {number_count}\n")
                        f.write("-" * 50 + "\n")
                        f.write(text)
                    
                    print(f"  PSM {psm}, OEM {oem}: {char_count} chars, {word_count} words, {number_count} numbers")
                    
                except Exception as e:
                    print(f"  PSM {psm}, OEM {oem}: ERROR - {e}")
                    continue
    
    return results

def print_summary(results):
    """Print a summary of the best results"""
    print("\n" + "="*80)
    print("SUMMARY OF BEST RESULTS")
    print("="*80)
    
    for version_name, configs in results.items():
        print(f"\n{version_name.upper()}:")
        print("-" * 40)
        
        # Find best config for this version
        best_config = None
        best_score = 0
        
        for config_name, result in configs.items():
            # Simple scoring: more chars + more numbers = better
            score = result['char_count'] + result['number_count'] * 2
            
            if score > best_score:
                best_score = score
                best_config = config_name
        
        if best_config:
            best_result = configs[best_config]
            print(f"Best: {best_config}")
            print(f"  Config: {best_result['config']}")
            print(f"  Chars: {best_result['char_count']}")
            print(f"  Words: {best_result['word_count']}")
            print(f"  Numbers: {best_result['number_count']}")
            print(f"  Preview: {best_result['text'][:100]}...")

def main():
    # Test both images
    test_images = ['walmart_receipt.png', 'receipt.png']
    
    for image_file in test_images:
        if not os.path.exists(image_file):
            print(f"Image not found: {image_file}")
            continue
            
        print(f"\n{'='*80}")
        print(f"TESTING: {image_file}")
        print(f"{'='*80}")
        
        # Create preprocessing versions
        versions = load_and_preprocess_image(image_file)
        
        # Save debug images
        os.makedirs("debug_images", exist_ok=True)
        for name, img in versions.items():
            cv2.imwrite(f"debug_images/{name}.png", img)
        
        # Test Tesseract configurations
        results = test_tesseract_configs(versions)
        
        # Print summary
        print_summary(results)

if __name__ == "__main__":
    main() 
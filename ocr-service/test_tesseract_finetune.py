import cv2
import numpy as np
import pytesseract
from PIL import Image, ImageEnhance, ImageFilter
import os
import shutil

# Ensure results directory exists and is clean
RESULTS_DIR = "results_finetune"
if os.path.exists(RESULTS_DIR):
    shutil.rmtree(RESULTS_DIR)
os.makedirs(RESULTS_DIR)

# Load the image
IMG_PATH = "receipt.png"
img = cv2.imread(IMG_PATH)
if img is None:
    raise FileNotFoundError(f"Could not load {IMG_PATH}")

# Preprocessing methods
def preprocess_none(img):
    return img

def preprocess_grayscale(img):
    return cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

def preprocess_resize(img, width=1200):
    h, w = img.shape[:2]
    if w > width:
        scale = width / w
        return cv2.resize(img, (int(w * scale), int(h * scale)))
    return img

def preprocess_denoise(img):
    return cv2.fastNlMeansDenoisingColored(img, None, 10, 10, 7, 21)

def preprocess_adaptive_gaussian(img):
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    return cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2)

def preprocess_adaptive_mean(img):
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    return cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY, 11, 2)

def preprocess_otsu(img):
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    _, th = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    return th

def preprocess_contrast(img):
    pil_img = Image.fromarray(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
    enhancer = ImageEnhance.Contrast(pil_img)
    enhanced = enhancer.enhance(2.0)
    return cv2.cvtColor(np.array(enhanced), cv2.COLOR_RGB2BGR)

def preprocess_sharpen(img):
    pil_img = Image.fromarray(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
    sharpened = pil_img.filter(ImageFilter.SHARPEN)
    return cv2.cvtColor(np.array(sharpened), cv2.COLOR_RGB2BGR)

# List of preprocessing pipelines (name, function)
preprocess_pipelines = [
    ("none", preprocess_none),
    ("grayscale", preprocess_grayscale),
    ("resize", lambda img: preprocess_resize(img, 1200)),
    ("denoise", preprocess_denoise),
    ("adaptive_gaussian", preprocess_adaptive_gaussian),
    ("adaptive_mean", preprocess_adaptive_mean),
    ("otsu", preprocess_otsu),
    ("contrast", preprocess_contrast),
    ("sharpen", preprocess_sharpen),
]

# Tesseract configs to try
psm_modes = [3, 4, 6, 11, 12, 13]
oem_modes = [1, 3]

# Run grid search
results = []
for pname, pfunc in preprocess_pipelines:
    processed = pfunc(img)
    # Save debug image
    debug_img_path = os.path.join(RESULTS_DIR, f"debug_{pname}.png")
    if len(processed.shape) == 2:
        cv2.imwrite(debug_img_path, processed)
    else:
        cv2.imwrite(debug_img_path, cv2.cvtColor(processed, cv2.COLOR_BGR2RGB))
    for psm in psm_modes:
        for oem in oem_modes:
            config = f"--psm {psm} --oem {oem}"
            try:
                text = pytesseract.image_to_string(processed, config=config)
            except Exception as e:
                text = f"[ERROR: {e}]"
            # Save text output
            text_path = os.path.join(RESULTS_DIR, f"{pname}_psm{psm}_oem{oem}.txt")
            with open(text_path, "w") as f:
                f.write(text)
            # Analyze result
            lines = text.splitlines()
            num_lines = len(lines)
            num_words = sum(len(line.split()) for line in lines)
            num_chars = len(text)
            # Score: count of key receipt words
            keywords = ["total", "store", "walmart", "survey", "gift", "card", "amount", "price", "item", "kg", "$", "visa"]
            keyword_score = sum(text.lower().count(k) for k in keywords)
            # Save result
            results.append({
                "pipeline": pname,
                "psm": psm,
                "oem": oem,
                "num_lines": num_lines,
                "num_words": num_words,
                "num_chars": num_chars,
                "keyword_score": keyword_score,
                "preview": " ".join(lines[:5]),
                "text_path": text_path,
                "debug_img_path": debug_img_path,
            })

# Sort and print summary
results.sort(key=lambda r: (r["keyword_score"], r["num_words"]), reverse=True)
print("=== TOP 10 OCR RESULTS (by keyword score, then word count) ===")
for r in results[:10]:
    print(f"Pipeline: {r['pipeline']}, PSM: {r['psm']}, OEM: {r['oem']}, Words: {r['num_words']}, Keywords: {r['keyword_score']}")
    print(f"  Preview: {r['preview']}")
    print(f"  Text file: {r['text_path']}")
    print(f"  Debug image: {r['debug_img_path']}")
    print()
print(f"All results saved in: {RESULTS_DIR}/") 
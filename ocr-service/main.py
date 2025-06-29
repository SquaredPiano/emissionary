import argparse
import os
import cv2
import imutils
import numpy as np
import pytesseract
from imutils.perspective import four_point_transform

def perform_ocr(img):
    img_orig = cv2.imdecode(img, cv2.IMREAD_COLOR)
    image = img_orig.copy()
    image = imutils.resize(image, width=500)
    ratio = img_orig.shape[1] / float(image.shape[1])

    # convert the image to grayscale, blur it slightly, and then apply edge detection
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edged = cv2.Canny(blurred, 75, 200)

    # find contours in the edge map and sort them by size in descending order
    cnts = cv2.findContours(edged.copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    cnts = imutils.grab_contours(cnts)
    cnts = sorted(cnts, key=cv2.contourArea, reverse=True)

    # initialize a contour that corresponds to the receipt outline
    receiptCnt = None
    for c in cnts:
        peri = cv2.arcLength(c, True)
        approx = cv2.approxPolyDP(c, 0.02 * peri, True)
        if len(approx) == 4:
            receiptCnt = approx
            break

    if receiptCnt is None:
        raise Exception(
            "Could not find receipt outline. Try debugging your edge detection and contour steps."
        )

    # apply a four-point perspective transform to the *original* image to obtain a top-down bird's-eye view
    receipt = four_point_transform(img_orig, receiptCnt.reshape(4, 2) * ratio)

    # apply OCR to the receipt image
    options = "--psm 6"
    text = pytesseract.image_to_string(cv2.cvtColor(receipt, cv2.COLOR_BGR2RGB), config=options)
    return text

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("-i", "--image", type=str, required=True, help="path to input image")
    args = parser.parse_args()

    if not os.path.exists(args.image):
        raise Exception("The given image does not exist.")

    with open(args.image, "rb") as f:
        img_bytes = f.read()
    img_array = np.frombuffer(img_bytes, np.uint8)
    try:
        text = perform_ocr(img_array)
        print("[INFO] raw output:")
        print("==================")
        print(text)
        print("\n")
    except Exception as e:
        print("[ERROR] {}".format(e))

if __name__ == "__main__":
    main()
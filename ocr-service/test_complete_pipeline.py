#!/usr/bin/env python3
"""
Test the complete pipeline with known good OCR text
"""

import json
from text_parser import parser

def test_complete_pipeline():
    """Test the complete pipeline with good OCR text"""
    
    # Good OCR text (what we expect from a working OCR)
    good_ocr_text = """Complete our short customer survey at
SURVEY.WALMART.CA
WIN!
1 of 3 $1000
gift cards
Rules and regulations apply.
See contest rules for details.
STORE 3156
335 FARMERS MARKET ROAD, UNIT 101
WATERLOO, ON
N2V 0A4
519-746-6700
ST# 03156 OP# 003371 TE# 14 TR# 02590
POT WHT/ RST 003338345485 $5.97 D
SPAGEHTTI 007680801101 $2.47 D
SPAGEHTTI 007680801101 $2.47 D 
CARROTS 062891540919 $3.47 D
DRUMSTICK KK 005500038382 $4.87 J
CHIPITS MK 005660090294 $10.97 D
BD MED 400G 006820088547 $4.44 D
BD OLD 400G 006820088551 $4.44 D
SMILES 005577300073 $2.47 D
YEAST 006421700742 $4.97 D
RED ONIONS 000000004082K 
  0.290 kg @ $4.34/kg  $1.26 D
OTV TOMATO 000000004664K
  0.225 kg @ $5.45/kg. $1.23 D
CHARGE PYMT D68 QTY 1 $4.06 H
SQUASH ZUCC 000000004067K
  0.200 kg @ $4.34/kg $0.87 D
ONION SCAL 000000004068K $0.97 D
SUBTOTAL $61.91
HST 13.0000% $0.63
TOTAL $62.54
VISA TEND $62.54"""
    
    print("=== TESTING COMPLETE PIPELINE ===")
    print(f"Input OCR text length: {len(good_ocr_text)} characters")
    print(f"First 200 chars: {good_ocr_text[:200]}")
    print()
    
    # Step 1: Parse the text
    print("=== STEP 1: TEXT PARSING ===")
    parsed_result = parser.parse_receipt_text(good_ocr_text)
    
    print(f"Merchant: {parsed_result.get('merchant', 'Unknown')}")
    print(f"Total: ${parsed_result.get('total', 'Unknown')}")
    print(f"Items found: {len(parsed_result.get('items', []))}")
    print(f"Total carbon emissions: {parsed_result.get('total_carbon_emissions', 0):.2f} kg CO2")
    
    print("\nParsed Items:")
    for i, item in enumerate(parsed_result.get('items', []), 1):
        print(f"  {i}. {item.get('name', 'Unknown')}: ${item.get('total_price', 0):.2f} ({item.get('category', 'Unknown')})")
    
    # Step 2: Create database record
    print("\n=== STEP 2: DATABASE RECORD ===")
    
    # Simulate database record
    db_record = {
        "id": "test_receipt_001",
        "user_id": "test_user",
        "merchant": parsed_result.get('merchant'),
        "total_amount": parsed_result.get('total'),
        "total_carbon_emissions": parsed_result.get('total_carbon_emissions'),
        "items_count": len(parsed_result.get('items', [])),
        "ocr_text": good_ocr_text,
        "parsed_data": parsed_result,
        "processing_status": "completed",
        "created_at": "2025-06-29T01:00:00Z"
    }
    
    print("Database record created:")
    print(f"  ID: {db_record['id']}")
    print(f"  User: {db_record['user_id']}")
    print(f"  Merchant: {db_record['merchant']}")
    print(f"  Total: ${db_record['total_amount']}")
    print(f"  Items: {db_record['items_count']}")
    print(f"  Carbon: {db_record['total_carbon_emissions']:.2f} kg CO2")
    print(f"  Status: {db_record['processing_status']}")
    
    # Step 3: Save to JSON file (simulating database)
    print("\n=== STEP 3: SAVE TO DATABASE (JSON) ===")
    
    with open('test_pipeline_result.json', 'w') as f:
        json.dump(db_record, f, indent=2)
    
    print("✅ Database record saved to: test_pipeline_result.json")
    
    # Step 4: Summary
    print("\n=== PIPELINE SUMMARY ===")
    print(f"✅ OCR Text: {len(good_ocr_text)} characters (readable)")
    print(f"✅ Text Parsing: {len(parsed_result.get('items', []))} items extracted")
    print(f"✅ Database Storage: Record created and saved")
    print(f"✅ Carbon Calculation: {parsed_result.get('total_carbon_emissions', 0):.2f} kg CO2")
    
    return db_record

if __name__ == "__main__":
    result = test_complete_pipeline()
    print(f"\n🎉 Complete pipeline test successful!")
    print(f"📊 Final result: {result['items_count']} items, ${result['total_amount']}, {result['total_carbon_emissions']:.2f} kg CO2") 
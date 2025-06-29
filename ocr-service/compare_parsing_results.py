#!/usr/bin/env python3
"""
Script to compare Groq AI parsing results against actual receipt text.
This helps evaluate the accuracy of our OCR and AI parsing pipeline.
"""

import json
import re
import sys
from typing import Dict, List, Tuple, Set
from dataclasses import dataclass
from difflib import SequenceMatcher
from text_parser import parser

@dataclass
class ParsingComparison:
    """Stores comparison results between actual and parsed text"""
    actual_text: str
    parsed_text: str
    similarity_score: float
    missing_items: List[str]
    extra_items: List[str]
    price_matches: List[Tuple[str, str, str]]  # (item, actual_price, parsed_price)
    price_mismatches: List[Tuple[str, str, str]]  # (item, actual_price, parsed_price)

class ReceiptTextAnalyzer:
    """Analyzes receipt text and extracts structured data"""
    
    def __init__(self):
        self.price_pattern = r'\$(\d+\.\d{2})'
        self.item_price_pattern = r'([A-Z\s]+)\s+\d+\s+\$(\d+\.\d{2})'
        self.weight_pattern = r'(\d+\.\d{3})\s+kg\s+@\s+\$(\d+\.\d{2})/kg\s+\$(\d+\.\d{2})'
    
    def extract_items_and_prices(self, text: str) -> Dict[str, str]:
        """Extract items and their prices from receipt text"""
        items = {}
        
        # Split into lines and process each line
        lines = text.strip().split('\n')
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            # Skip header lines, totals, etc.
            if any(skip_word in line.upper() for skip_word in [
                'SURVEY', 'WIN', 'RULES', 'STORE', 'ST#', 'OP#', 'TE#', 'TR#',
                'SUBTOTAL', 'HST', 'TOTAL', 'VISA', 'CHARGE', 'POT WHT'
            ]):
                continue
            
            # Try to extract item and price
            price_match = re.search(self.price_pattern, line)
            if price_match:
                price = price_match.group(1)
                
                # Extract item name (everything before the price)
                item_part = line[:price_match.start()].strip()
                
                # Clean up item name
                if item_part:
                    # Remove SKU numbers and extra whitespace
                    item_clean = re.sub(r'\d{12}', '', item_part).strip()
                    item_clean = re.sub(r'\s+', ' ', item_clean).strip()
                    
                    if item_clean and len(item_clean) > 2:
                        items[item_clean] = price
        
        return items
    
    def extract_weighted_items(self, text: str) -> Dict[str, str]:
        """Extract weighted items and their total prices"""
        items = {}
        
        lines = text.strip().split('\n')
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # Look for weight pattern
            weight_match = re.search(self.weight_pattern, line)
            if weight_match:
                weight = weight_match.group(1)
                price_per_kg = weight_match.group(2)
                total_price = weight_match.group(3)
                
                # Extract item name (everything before the weight info)
                item_part = line[:weight_match.start()].strip()
                
                if item_part:
                    item_clean = re.sub(r'\s+', ' ', item_part).strip()
                    if item_clean and len(item_clean) > 2:
                        items[item_clean] = total_price
        
        return items

class ParsingComparator:
    """Compares actual receipt text with Groq AI parsing results"""
    
    def __init__(self):
        self.analyzer = ReceiptTextAnalyzer()
    
    def normalize_text(self, text: str) -> str:
        """Normalize text for comparison"""
        # Convert to lowercase and remove extra whitespace
        normalized = re.sub(r'\s+', ' ', text.lower().strip())
        # Remove punctuation for basic comparison
        normalized = re.sub(r'[^\w\s]', '', normalized)
        return normalized
    
    def calculate_similarity(self, text1: str, text2: str) -> float:
        """Calculate similarity between two texts"""
        norm1 = self.normalize_text(text1)
        norm2 = self.normalize_text(text2)
        
        if not norm1 or not norm2:
            return 0.0
        
        return SequenceMatcher(None, norm1, norm2).ratio()
    
    def compare_items(self, actual_items: Dict[str, str], parsed_items: Dict[str, str]) -> Tuple[List[str], List[str], List[Tuple[str, str, str]], List[Tuple[str, str, str]]]:
        """Compare actual items with parsed items"""
        missing_items = []
        extra_items = []
        price_matches = []
        price_mismatches = []
        
        # Find missing items
        for item, price in actual_items.items():
            if item not in parsed_items:
                missing_items.append(f"{item}: ${price}")
            else:
                parsed_price = parsed_items[item]
                if price == parsed_price:
                    price_matches.append((item, price, parsed_price))
                else:
                    price_mismatches.append((item, price, parsed_price))
        
        # Find extra items
        for item, price in parsed_items.items():
            if item not in actual_items:
                extra_items.append(f"{item}: ${price}")
        
        return missing_items, extra_items, price_matches, price_mismatches
    
    def compare_parsing(self, actual_text: str, parsed_text: str) -> ParsingComparison:
        """Compare actual receipt text with parsed text"""
        
        # Calculate overall similarity
        similarity = self.calculate_similarity(actual_text, parsed_text)
        
        # Extract items and prices from actual text
        actual_items = self.analyzer.extract_items_and_prices(actual_text)
        actual_weighted_items = self.analyzer.extract_weighted_items(actual_text)
        actual_items.update(actual_weighted_items)
        
        # Extract items and prices from parsed text
        parsed_items = self.analyzer.extract_items_and_prices(parsed_text)
        parsed_weighted_items = self.analyzer.extract_weighted_items(parsed_text)
        parsed_items.update(parsed_weighted_items)
        
        # Compare items
        missing_items, extra_items, price_matches, price_mismatches = self.compare_items(
            actual_items, parsed_items
        )
        
        return ParsingComparison(
            actual_text=actual_text,
            parsed_text=parsed_text,
            similarity_score=similarity,
            missing_items=missing_items,
            extra_items=extra_items,
            price_matches=price_matches,
            price_mismatches=price_mismatches
        )

def test_text_parser():
    """Test the text parser with the actual receipt text"""
    
    # Actual receipt text provided by user
    actual_receipt_text = """Complete our short customer survey at
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
SPAGEHTTI 007680801101 $2.47 D CARROTS 062891540919 $3.47 D
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
    
    # Test the text parser directly
    try:
        print("=== TEXT PARSER RESULT ===")
        parsed_result = parser.parse_receipt_text(actual_receipt_text)
        
        # Convert parsed result back to text format for comparison
        parsed_text_lines = []
        for item in parsed_result.get('items', []):
            name = item.get('name', '')
            price = item.get('total_price', 0)
            if name and price:
                parsed_text_lines.append(f"{name} ${price:.2f}")
        
        parsed_text = '\n'.join(parsed_text_lines)
        
        print("Parsed Items:")
        for item in parsed_result.get('items', []):
            print(f"  {item.get('name', 'Unknown')}: ${item.get('total_price', 0):.2f} ({item.get('category', 'Unknown')})")
        
        print(f"\nTotal Carbon Emissions: {parsed_result.get('total_carbon_emissions', 0):.2f} kg CO2")
        print(f"Merchant: {parsed_result.get('merchant', 'Unknown')}")
        print("\n" + "="*50 + "\n")
        
        # Compare results
        comparator = ParsingComparator()
        comparison = comparator.compare_parsing(actual_receipt_text, parsed_text)
        
        print("=== PARSING COMPARISON RESULTS ===")
        print(f"Overall Similarity Score: {comparison.similarity_score:.2%}")
        print(f"Total Items in Actual: {len(comparison.actual_text.split())}")
        print(f"Total Items in Parsed: {len(comparison.parsed_text.split())}")
        
        print(f"\n=== MISSING ITEMS ({len(comparison.missing_items)}) ===")
        for item in comparison.missing_items:
            print(f"❌ {item}")
        
        print(f"\n=== EXTRA ITEMS ({len(comparison.extra_items)}) ===")
        for item in comparison.extra_items:
            print(f"➕ {item}")
        
        print(f"\n=== PRICE MATCHES ({len(comparison.price_matches)}) ===")
        for item, actual_price, parsed_price in comparison.price_matches:
            print(f"✅ {item}: ${actual_price}")
        
        print(f"\n=== PRICE MISMATCHES ({len(comparison.price_mismatches)}) ===")
        for item, actual_price, parsed_price in comparison.price_mismatches:
            print(f"⚠️  {item}: Actual ${actual_price} vs Parsed ${parsed_price}")
        
        # Save detailed comparison to file
        with open('parsing_comparison_results.json', 'w') as f:
            json.dump({
                'similarity_score': comparison.similarity_score,
                'missing_items': comparison.missing_items,
                'extra_items': comparison.extra_items,
                'price_matches': [{'item': item, 'actual_price': actual_price, 'parsed_price': parsed_price} 
                                for item, actual_price, parsed_price in comparison.price_matches],
                'price_mismatches': [{'item': item, 'actual_price': actual_price, 'parsed_price': parsed_price} 
                                   for item, actual_price, parsed_price in comparison.price_mismatches],
                'actual_text': actual_receipt_text,
                'parsed_text': parsed_text,
                'parsed_result': parsed_result
            }, f, indent=2)
        
        print(f"\nDetailed results saved to: parsing_comparison_results.json")
        
    except Exception as e:
        print(f"Error testing text parser: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_text_parser() 
import re
import json
from typing import List, Dict, Any

class ReceiptTextParser:
    def __init__(self):
        # Food category keywords
        self.category_keywords = {
            'vegetables': ['carrot', 'lettuce', 'tomato', 'onion', 'potato', 'broccoli', 'spinach', 'cucumber', 'squash', 'zucc', 'scal'],
            'fruits': ['apple', 'banana', 'orange', 'grape', 'strawberry', 'blueberry', 'mango', 'pineapple'],
            'meat': ['chicken', 'beef', 'pork', 'turkey', 'lamb', 'drumstick', 'steak', 'bacon'],
            'dairy': ['milk', 'cheese', 'yogurt', 'cream', 'butter', 'margarine', 'marge'],
            'grains': ['bread', 'pasta', 'rice', 'spaghetti', 'spagehtti', 'flour', 'yeast'],
            'beverages': ['soda', 'juice', 'water', 'coffee', 'tea', 'beer', 'wine'],
            'sweets': ['chocolate', 'candy', 'cookie', 'cake', 'ice cream', 'sugar', 'smiles'],
            'processed': ['chip', 'snack', 'cereal', 'sauce', 'soup', 'can', 'jar', 'bd', 'chipits']
        }
        
        # Default emissions by category
        self.category_emissions = {
            'vegetables': 0.4,
            'fruits': 0.5,
            'meat': 15.0,
            'dairy': 3.0,
            'grains': 1.0,
            'beverages': 0.5,
            'sweets': 2.0,
            'processed': 2.0
        }

    def parse_receipt_text(self, text: str) -> Dict[str, Any]:
        """Parse OCR text and return structured JSON"""
        if not text or len(text.strip()) < 10:
            return self._create_empty_response()
        
        lines = text.strip().split('\n')
        items = []
        merchant = "Unknown Merchant"
        total = None
        
        # Extract merchant from the entire text
        merchant = self._extract_merchant(text)
        
        # Extract total from the text
        total = self._extract_total(text)
        
        # Parse each line for items
        for line in lines:
            line = line.strip()
            if not line or len(line) < 3:
                continue
                
            # Skip header lines, totals, taxes, payment info
            if self._should_skip_line(line):
                continue
                
            # Try to extract item and price
            item_data = self._parse_line(line)
            if item_data:
                items.append(item_data)
        
        # Calculate total emissions
        total_emissions = sum(item.get('carbon_emissions', 0) for item in items)
        
        return {
            "items": items,
            "merchant": merchant,
            "total": total,
            "date": None,
            "total_carbon_emissions": total_emissions,
            "llm_enhanced": False
        }

    def _extract_merchant(self, text: str) -> str:
        """Extract merchant name from receipt text"""
        text_lower = text.lower()
        
        # Look for common merchant names
        merchants = {
            'walmart': 'Walmart',
            'target': 'Target', 
            'kroger': 'Kroger',
            'safeway': 'Safeway',
            'costco': 'Costco',
            'whole foods': 'Whole Foods',
            'trader joe': 'Trader Joe\'s'
        }
        
        for merchant_key, merchant_name in merchants.items():
            if merchant_key in text_lower:
                return merchant_name
        
        # If no specific merchant found, look for store number pattern
        store_match = re.search(r'STORE\s+(\d+)', text, re.IGNORECASE)
        if store_match:
            return f"Store #{store_match.group(1)}"
        
        return "Unknown Merchant"

    def _extract_total(self, text: str) -> float | None:
        """Extract total amount from receipt text"""
        # Look for TOTAL pattern
        total_match = re.search(r'TOTAL\s+\$?(\d+\.\d{2})', text, re.IGNORECASE)
        if total_match:
            return float(total_match.group(1))
        
        return None

    def _should_skip_line(self, line: str) -> bool:
        """Determine if a line should be skipped (not an item)"""
        line_lower = line.lower()
        
        skip_words = [
            'total', 'subtotal', 'tax', 'hst', 'gst', 'pst', 'change', 'cash', 'card', 
            'payment', 'receipt', 'survey', 'win', 'rules', 'store', 'st#', 'op#', 'te#', 
            'tr#', 'visa', 'mastercard', 'debit', 'credit', 'charge', 'pot wht', 'complete',
            'gift', 'contest', 'regulations', 'details', 'road', 'unit', 'phone', 'address'
        ]
        
        return any(skip_word in line_lower for skip_word in skip_words)

    def _parse_line(self, line: str) -> Dict[str, Any] | None:
        """Parse a single line to extract item information"""
        # Handle weighted items first
        weighted_item = self._parse_weighted_item(line)
        if weighted_item:
            return weighted_item
        
        # Handle regular items
        regular_item = self._parse_regular_item(line)
        if regular_item:
            return regular_item
        
        return None

    def _parse_weighted_item(self, line: str) -> Dict[str, Any] | None:
        """Parse items sold by weight (e.g., produce)"""
        # Pattern for weighted items: ITEM_NAME WEIGHT kg @ $PRICE/kg $TOTAL_PRICE
        weight_pattern = r'(\d+\.\d{3})\s+kg\s+@\s+\$(\d+\.\d{2})/kg\s+\$(\d+\.\d{2})'
        weight_match = re.search(weight_pattern, line)
        
        if weight_match:
            weight = float(weight_match.group(1))
            price_per_kg = float(weight_match.group(2))
            total_price = float(weight_match.group(3))
            
            # Extract item name (everything before the weight info)
            item_part = line[:weight_match.start()].strip()
            
            if item_part:
                # Clean up item name
                item_clean = self._clean_item_name(item_part)
                
                if item_clean and len(item_clean) > 2:
                    category = self._categorize_item(item_clean)
                    emissions = self.category_emissions.get(category, 2.0)
                    
                    return {
                        "name": item_clean,
                        "quantity": weight,
                        "unit_price": price_per_kg,
                        "total_price": total_price,
                        "carbon_emissions": emissions * weight,  # Scale by weight
                        "category": category,
                        "confidence": 1.0
                    }
        
        return None

    def _parse_regular_item(self, line: str) -> Dict[str, Any] | None:
        """Parse regular items with fixed prices"""
        # Look for price pattern: $XX.XX at the end of the line
        price_pattern = r'\$(\d+\.\d{2})\s*[A-Z]?\s*$'
        price_match = re.search(price_pattern, line)
        
        if price_match:
            price = float(price_match.group(1))
            
            # Extract item name (everything before the price)
            item_part = line[:price_match.start()].strip()
            
            if item_part:
                # Clean up item name
                item_clean = self._clean_item_name(item_part)
                
                if item_clean and len(item_clean) > 2:
                    category = self._categorize_item(item_clean)
                    emissions = self.category_emissions.get(category, 2.0)
                    
                    return {
                        "name": item_clean,
                        "quantity": 1.0,
                        "unit_price": price,
                        "total_price": price,
                        "carbon_emissions": emissions,
                        "category": category,
                        "confidence": 1.0
                    }
        
        return None

    def _clean_item_name(self, item_name: str) -> str:
        """Clean up item name by removing SKUs, codes, and extra text"""
        # Remove SKU numbers (12-digit numbers)
        cleaned = re.sub(r'\d{12}', '', item_name)
        
        # Remove other common codes and patterns
        cleaned = re.sub(r'\d{6,}', '', cleaned)  # Remove other long numbers
        cleaned = re.sub(r'[A-Z]{1,3}\s*\d+', '', cleaned)  # Remove codes like "D68", "QTY 1"
        cleaned = re.sub(r'\d{1,3}G', '', cleaned)  # Remove weights like "400G"
        
        # Remove extra whitespace and clean up
        cleaned = re.sub(r'\s+', ' ', cleaned).strip()
        
        # Remove trailing letters that are likely codes
        cleaned = re.sub(r'\s+[A-Z]\s*$', '', cleaned)
        
        return cleaned

    def _categorize_item(self, item_name: str) -> str:
        """Categorize item based on keywords"""
        item_lower = item_name.lower()
        
        for category, keywords in self.category_keywords.items():
            for keyword in keywords:
                if keyword in item_lower:
                    return category
        
        return "processed"  # Default category

    def _create_empty_response(self) -> Dict[str, Any]:
        """Create empty response when parsing fails"""
        return {
            "items": [],
            "merchant": "Unknown Merchant",
            "total": None,
            "date": None,
            "total_carbon_emissions": 0,
            "llm_enhanced": False
        }

# Global parser instance
parser = ReceiptTextParser() 
"""
Enhanced Carbon Footprint Database with CSV Integration
Combines your existing database with the CSV data for better coverage
"""

import csv
import re
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)

@dataclass
class FoodItem:
    name: str
    category: str
    co2_per_kg: float
    typical_weight_kg: float
    keywords: List[str]
    subcategory: Optional[str] = None
    source: str = "Database"

class EnhancedEmissionsDatabase:
    def __init__(self, csv_file_path: Optional[str] = None):
        self.food_items = self._load_food_database()
        if csv_file_path:
            self._load_csv_data(csv_file_path)
        self.category_mappings = self._create_category_mappings()
    
    def _load_csv_data(self, csv_file_path: str):
        """Load additional data from CSV file"""
        try:
            with open(csv_file_path, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    name = row['canonical'].lower()
                    category = row['category'].lower()  
                    emissions = float(row['emissions_kg_per_kg'])
                    
                    # Check if item already exists
                    existing_item = None
                    for item in self.food_items:
                        if name in [kw.lower() for kw in item.keywords] or name == item.name:
                            existing_item = item
                            break
                    
                    if existing_item:
                        # Update existing item with CSV data if different
                        if abs(existing_item.co2_per_kg - emissions) > 0.1:
                            logger.info(f"Updating {name}: {existing_item.co2_per_kg} -> {emissions} kg CO2/kg")
                            existing_item.co2_per_kg = emissions
                            existing_item.source = "CSV_Updated"
                    else:
                        # Add new item from CSV
                        typical_weight = self._estimate_typical_weight(name, category)
                        keywords = self._generate_keywords(name)
                        
                        new_item = FoodItem(
                            name=name,
                            category=self._map_category(category),
                            co2_per_kg=emissions,
                            typical_weight_kg=typical_weight,
                            keywords=keywords,
                            subcategory=category,
                            source="CSV"
                        )
                        self.food_items.append(new_item)
                        logger.info(f"Added new item from CSV: {name}")
            
            logger.info(f"CSV integration complete. Total items: {len(self.food_items)}")
                        
        except Exception as e:
            logger.error(f"Failed to load CSV data: {e}")
    
    def _map_category(self, csv_category: str) -> str:
        """Map CSV categories to your existing categories"""
        category_map = {
            'produce': 'vegetables',
            'meat': 'meat', 
            'dairy': 'dairy',
            'grains': 'grains',
            'other': 'processed'
        }
        return category_map.get(csv_category.lower(), 'processed')
    
    def _estimate_typical_weight(self, name: str, category: str) -> float:
        """Estimate typical weight based on food type"""
        weight_map = {
            'produce': 0.15,  # Average fruit/vegetable
            'meat': 0.25,     # Typical meat portion
            'dairy': 0.5,     # Milk/yogurt container
            'grains': 0.5,    # Bread/pasta package
            'other': 0.3      # Default
        }
        return weight_map.get(category.lower(), 0.3)
    
    def _generate_keywords(self, name: str) -> List[str]:
        """Generate search keywords for an item"""
        keywords = [name.lower()]
        
        # Add plural/singular variants
        if name.endswith('s') and len(name) > 3:
            keywords.append(name[:-1])  # Remove 's'
        else:
            keywords.append(name + 's')  # Add 's'
        
        # Add common variations
        variations = {
            'potato': ['potatoes', 'spud', 'tater'],
            'tomato': ['tomatoes', 'cherry tomato', 'roma tomato'],
            'chicken': ['poultry', 'breast', 'thigh', 'drumstick'],
            'beef': ['steak', 'burger', 'ground beef'],
            'pasta': ['spaghetti', 'macaroni', 'penne'],
        }
        
        if name in variations:
            keywords.extend(variations[name])
            
        return keywords
    
    def _load_food_database(self) -> List[FoodItem]:
        """Load your comprehensive food emissions database"""
        return [
            # Meat & Poultry (highest emissions)
            FoodItem("beef", "meat", 27.0, 0.25, ["beef", "steak", "burger", "ground beef", "roast beef", "brisket", "ribeye", "sirloin", "tenderloin"], "red_meat", "FAO"),
            FoodItem("lamb", "meat", 13.3, 0.25, ["lamb", "mutton", "lamb chop", "lamb shoulder"], "red_meat", "FAO"),
            FoodItem("pork", "meat", 12.1, 0.25, ["pork", "bacon", "ham", "sausage", "hot dog", "pork chop", "prosciutto", "pancetta"], "red_meat", "FAO"),
            FoodItem("chicken", "meat", 6.9, 0.5, ["chicken", "turkey", "poultry", "breast", "thigh", "wing", "drumstick", "whole chicken", "drumsticks"], "poultry", "FAO"),
            FoodItem("duck", "meat", 5.8, 0.5, ["duck", "duck breast"], "poultry", "FAO"),
            FoodItem("fish", "seafood", 6.1, 0.15, ["fish", "cod", "salmon", "tuna"], "fish", "FAO"),
            
            # Dairy Products  
            FoodItem("milk", "dairy", 3.2, 1.0, ["milk", "skim milk", "whole milk", "2% milk", "1% milk"], "milk", "FAO"),
            FoodItem("cheese", "dairy", 13.5, 0.25, ["cheese", "cheddar", "mozzarella", "parmesan", "swiss", "brie", "gouda", "feta", "blue cheese"], "cheese", "FAO"),
            FoodItem("yogurt", "dairy", 2.2, 0.5, ["yogurt", "greek yogurt", "plain yogurt", "vanilla yogurt"], "yogurt", "FAO"),
            FoodItem("butter", "dairy", 12.1, 0.25, ["butter", "margarine", "spread"], "butter", "FAO"),
            FoodItem("eggs", "dairy", 4.8, 0.06, ["egg", "eggs", "egg white", "egg yolk", "dozen eggs"], "eggs", "FAO"),
            FoodItem("cream", "dairy", 2.9, 0.25, ["cream", "heavy cream", "whipping cream", "half and half"], "cream", "FAO"),
            
            # Grains & Cereals
            FoodItem("bread", "grains", 1.1, 0.5, ["bread", "white bread", "whole wheat", "sourdough", "bagel", "croissant", "bun"], "bread", "FAO"),
            FoodItem("rice", "grains", 2.7, 0.5, ["rice", "white rice", "brown rice", "basmati", "jasmine", "wild rice"], "rice", "FAO"),
            FoodItem("pasta", "grains", 1.8, 0.5, ["pasta", "spaghetti", "macaroni", "penne", "linguine", "fettuccine"], "pasta", "FAO"),
            FoodItem("oats", "grains", 1.0, 0.5, ["oat", "oats", "oatmeal", "granola", "cereal"], "cereal", "FAO"),
            FoodItem("corn", "grains", 0.9, 0.5, ["corn", "popcorn", "cornmeal", "tortilla", "corn chips"], "corn", "FAO"),
            FoodItem("wheat", "grains", 0.9, 0.5, ["wheat", "flour", "whole wheat flour"], "flour", "FAO"),
            FoodItem("cereal", "grains", 1.2, 0.5, ["cereal", "corn flakes", "cheerios", "frosted flakes"], "cereal", "FAO"),
            
            # Fruits & Vegetables
            FoodItem("apple", "vegetables", 0.4, 0.18, ["apple", "apples", "gala", "fuji", "granny smith", "red delicious"], "apples", "FAO"),
            FoodItem("banana", "vegetables", 0.6, 0.12, ["banana", "bananas"], "bananas", "FAO"),
            FoodItem("orange", "vegetables", 0.5, 0.15, ["orange", "oranges", "mandarin", "clementine", "tangerine"], "citrus", "FAO"),
            FoodItem("grapes", "vegetables", 0.6, 0.1, ["grape", "grapes", "raisin"], "grapes", "FAO"),
            FoodItem("tomato", "vegetables", 0.4, 0.12, ["tomato", "tomatoes", "cherry tomato", "roma tomato"], "tomatoes", "FAO"),
            FoodItem("potato", "vegetables", 0.2, 0.17, ["potato", "potatoes", "russet", "red potato", "sweet potato", "yam"], "potatoes", "FAO"),
            FoodItem("carrot", "vegetables", 0.3, 0.08, ["carrot", "carrots", "baby carrot"], "root_vegetables", "FAO"),
            FoodItem("lettuce", "vegetables", 0.2, 0.1, ["lettuce", "spinach", "kale", "greens", "arugula", "romaine", "iceberg"], "leafy_greens", "FAO"),
            FoodItem("onion", "vegetables", 0.5, 0.1, ["onion", "onions", "red onion", "white onion", "yellow onion", "red onions"], "onions", "FAO"),
            FoodItem("cucumber", "vegetables", 0.3, 0.15, ["cucumber", "cucumbers", "pickle", "pickles"], "cucumbers", "FAO"),
            FoodItem("zucchini", "vegetables", 0.4, 0.15, ["zucchini", "squash", "squash zucchini"], "squash", "FAO"),
            
            # Legumes
            FoodItem("beans", "vegetables", 0.8, 0.4, ["beans", "black beans", "kidney beans", "pinto beans"], "legumes", "FAO"),
            FoodItem("lentils", "vegetables", 0.9, 0.4, ["lentils", "red lentils", "green lentils"], "legumes", "FAO"),
            
            # Other
            FoodItem("sugar", "processed", 1.7, 0.5, ["sugar", "white sugar", "brown sugar"], "sweetener", "FAO"),
            FoodItem("salt", "processed", 0.1, 0.5, ["salt", "sea salt", "table salt"], "seasoning", "FAO"),
            FoodItem("oil", "oils", 3.3, 0.5, ["oil", "olive oil", "vegetable oil", "canola oil"], "oil", "FAO"),
            FoodItem("yeast", "processed", 1.2, 0.05, ["yeast", "baking yeast", "dry yeast"], "baking", "FAO"),
        ]
    
    def _create_category_mappings(self) -> Dict[str, Dict[str, Any]]:
        """Create keyword mappings for quick lookup"""
        mappings = {}
        
        for item in self.food_items:
            for keyword in item.keywords:
                mappings[keyword.lower()] = {
                    "category": item.category,
                    "subcategory": item.subcategory,
                    "co2_per_kg": item.co2_per_kg,
                    "typical_weight_kg": item.typical_weight_kg,
                    "source": item.source,
                    "confidence": 0.9
                }
        
        return mappings
    
    def find_food_item(self, item_name: str) -> Optional[Dict[str, Any]]:
        """Find food item by name with fuzzy matching"""
        normalized_name = item_name.lower().strip()
        
        # Try exact keyword match first
        if normalized_name in self.category_mappings:
            return self.category_mappings[normalized_name]
        
        # Try partial matches
        for keyword, mapping in self.category_mappings.items():
            if keyword in normalized_name or normalized_name in keyword:
                return mapping
        
        # Try word-by-word matching
        words = normalized_name.split()
        for word in words:
            if len(word) > 2 and word in self.category_mappings:
                return self.category_mappings[word]
        
        return None
    
    def calculate_emissions(self, item_name: str, quantity: float, price: float) -> Dict[str, Any]:
        """Calculate carbon emissions for an item"""
        food_item = self.find_food_item(item_name)
        
        if food_item:
            estimated_weight = self.estimate_weight_from_name(item_name, price)
            co2_emissions = food_item["co2_per_kg"] * estimated_weight * quantity
            
            return {
                "item_name": item_name,
                "category": food_item["category"],
                "subcategory": food_item["subcategory"],
                "co2_per_kg": food_item["co2_per_kg"],
                "estimated_weight_kg": estimated_weight,
                "quantity": quantity,
                "price": price,
                "co2_emissions_kg": co2_emissions,
                "confidence": food_item["confidence"],
                "source": food_item["source"]
            }
        else:
            # Default for unknown items
            estimated_weight = self.estimate_weight_from_name(item_name, price)
            default_co2_per_kg = 2.0  # Conservative default
            co2_emissions = default_co2_per_kg * estimated_weight * quantity
            
            return {
                "item_name": item_name,
                "category": "unknown",
                "subcategory": None,
                "co2_per_kg": default_co2_per_kg,
                "estimated_weight_kg": estimated_weight,
                "quantity": quantity,
                "price": price,
                "co2_emissions_kg": co2_emissions,
                "confidence": 0.3,
                "source": "Default estimate"
            }
    
    def estimate_weight_from_name(self, item_name: str, price: float) -> float:
        """Estimate weight based on item name and price"""
        normalized_name = item_name.lower()
        
        # Look for weight indicators in the name
        weight_patterns = [
            (r'(\d+(?:\.\d+)?)\s*(?:kg|kilo)', lambda x: float(x)),
            (r'(\d+(?:\.\d+)?)\s*(?:g|gram)', lambda x: float(x) / 1000),
            (r'(\d+(?:\.\d+)?)\s*(?:lb|pound)', lambda x: float(x) * 0.453592),
            (r'(\d+(?:\.\d+)?)\s*(?:oz|ounce)', lambda x: float(x) * 0.0283495),
        ]
        
        for pattern, converter in weight_patterns:
            match = re.search(pattern, normalized_name)
            if match:
                return converter(match.group(1))
        
        # Try to find the food item and use its typical weight
        food_item = self.find_food_item(item_name)
        if food_item:
            return food_item["typical_weight_kg"]
        
        # Estimate based on price (rough approximation)
        return max(0.1, price / 10.0)  # Assume $10/kg average

# Usage example
if __name__ == "__main__":
    # Initialize with CSV integration
    db = EnhancedEmissionsDatabase('food_dictionary.csv')
    
    # Test some lookups
    test_items = ['spaghetti', 'carrots', 'drumsticks', 'red onions', 'squash zucchini']
    
    for item in test_items:
        result = db.find_food_item(item)
        if result:
            print(f"{item}: {result['co2_per_kg']} kg CO2/kg ({result['source']})")
        else:
            print(f"{item}: Not found")
"""
Simple Carbon Footprint Database for Food Items
Provides comprehensive emissions data for grocery items
"""

import re
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass

@dataclass
class FoodItem:
    name: str
    category: str
    co2_per_kg: float
    typical_weight_kg: float
    keywords: List[str]
    subcategory: Optional[str] = None
    source: str = "Database"

class EmissionsDatabase:
    def __init__(self):
        self.food_items = self._load_food_database()
        self.category_mappings = self._create_category_mappings()
    
    def _load_food_database(self) -> List[FoodItem]:
        """Load comprehensive food emissions database"""
        return [
            # Meat & Poultry (highest emissions)
            FoodItem("beef", "meat", 13.3, 0.25, ["beef", "steak", "burger", "ground beef", "roast beef", "brisket", "ribeye", "sirloin", "tenderloin"], "red_meat", "FAO"),
            FoodItem("lamb", "meat", 13.3, 0.25, ["lamb", "mutton", "lamb chop", "lamb shoulder"], "red_meat", "FAO"),
            FoodItem("pork", "meat", 7.2, 0.25, ["pork", "bacon", "ham", "sausage", "hot dog", "pork chop", "prosciutto", "pancetta"], "red_meat", "FAO"),
            FoodItem("chicken", "meat", 6.9, 0.5, ["chicken", "turkey", "poultry", "breast", "thigh", "wing", "drumstick", "whole chicken"], "poultry", "FAO"),
            FoodItem("duck", "meat", 5.8, 0.5, ["duck", "duck breast"], "poultry", "FAO"),
            
            # Dairy Products
            FoodItem("milk", "dairy", 1.4, 1.0, ["milk", "skim milk", "whole milk", "2% milk", "1% milk", "almond milk", "soy milk"], "milk", "FAO"),
            FoodItem("cheese", "dairy", 13.5, 0.25, ["cheese", "cheddar", "mozzarella", "parmesan", "swiss", "brie", "gouda", "feta", "blue cheese"], "cheese", "FAO"),
            FoodItem("yogurt", "dairy", 1.2, 0.5, ["yogurt", "greek yogurt", "plain yogurt", "vanilla yogurt"], "yogurt", "FAO"),
            FoodItem("butter", "dairy", 12.1, 0.25, ["butter", "margarine", "spread"], "butter", "FAO"),
            FoodItem("eggs", "dairy", 4.8, 0.06, ["egg", "eggs", "egg white", "egg yolk", "dozen eggs"], "eggs", "FAO"),
            FoodItem("cream", "dairy", 2.9, 0.25, ["cream", "heavy cream", "whipping cream", "half and half"], "cream", "FAO"),
            
            # Seafood
            FoodItem("salmon", "seafood", 4.1, 0.15, ["salmon", "atlantic salmon", "wild salmon"], "fish", "FAO"),
            FoodItem("tuna", "seafood", 3.0, 0.15, ["tuna", "tuna fish", "albacore", "skipjack"], "fish", "FAO"),
            FoodItem("cod", "seafood", 3.0, 0.15, ["cod", "cod fish", "white fish"], "fish", "FAO"),
            FoodItem("shrimp", "seafood", 12.0, 0.1, ["shrimp", "prawn", "shrimp cocktail"], "shellfish", "FAO"),
            FoodItem("crab", "seafood", 12.0, 0.1, ["crab", "crab meat", "crab legs"], "shellfish", "FAO"),
            FoodItem("lobster", "seafood", 12.0, 0.5, ["lobster", "lobster tail"], "shellfish", "FAO"),
            
            # Grains & Cereals
            FoodItem("bread", "grains", 1.4, 0.5, ["bread", "white bread", "whole wheat", "sourdough", "bagel", "croissant", "bun"], "bread", "FAO"),
            FoodItem("rice", "grains", 2.7, 0.5, ["rice", "white rice", "brown rice", "basmati", "jasmine", "wild rice"], "rice", "FAO"),
            FoodItem("pasta", "grains", 1.4, 0.5, ["pasta", "spaghetti", "macaroni", "penne", "linguine", "fettuccine"], "pasta", "FAO"),
            FoodItem("oats", "grains", 0.9, 0.5, ["oat", "oats", "oatmeal", "granola", "cereal"], "cereal", "FAO"),
            FoodItem("corn", "grains", 0.9, 0.5, ["corn", "popcorn", "cornmeal", "tortilla", "corn chips"], "corn", "FAO"),
            FoodItem("wheat", "grains", 0.9, 0.5, ["wheat", "flour", "whole wheat flour"], "flour", "FAO"),
            
            # Fruits
            FoodItem("apple", "fruits", 0.4, 0.18, ["apple", "apples", "gala", "fuji", "granny smith", "red delicious"], "apples", "FAO"),
            FoodItem("banana", "fruits", 0.7, 0.12, ["banana", "bananas"], "bananas", "FAO"),
            FoodItem("orange", "fruits", 0.3, 0.15, ["orange", "oranges", "mandarin", "clementine", "tangerine"], "citrus", "FAO"),
            FoodItem("strawberry", "fruits", 0.4, 0.1, ["strawberry", "strawberries", "berry", "berries", "blueberry", "raspberry"], "berries", "FAO"),
            FoodItem("grape", "fruits", 0.3, 0.1, ["grape", "grapes", "raisin"], "grapes", "FAO"),
            FoodItem("peach", "fruits", 0.4, 0.15, ["peach", "peaches", "nectarine", "plum"], "stone_fruit", "FAO"),
            FoodItem("avocado", "fruits", 0.4, 0.2, ["avocado", "avocados", "guacamole"], "avocado", "FAO"),
            
            # Vegetables
            FoodItem("tomato", "vegetables", 0.3, 0.12, ["tomato", "tomatoes", "cherry tomato", "roma tomato"], "tomatoes", "FAO"),
            FoodItem("potato", "vegetables", 0.2, 0.17, ["potato", "potatoes", "russet", "red potato", "sweet potato", "yam"], "potatoes", "FAO"),
            FoodItem("carrot", "vegetables", 0.2, 0.08, ["carrot", "carrots", "baby carrot"], "root_vegetables", "FAO"),
            FoodItem("lettuce", "vegetables", 0.3, 0.1, ["lettuce", "spinach", "kale", "greens", "arugula", "romaine", "iceberg"], "leafy_greens", "FAO"),
            FoodItem("onion", "vegetables", 0.2, 0.1, ["onion", "onions", "red onion", "white onion", "yellow onion"], "onions", "FAO"),
            FoodItem("broccoli", "vegetables", 0.2, 0.15, ["broccoli", "cauliflower", "cabbage", "brussels sprouts"], "cruciferous", "FAO"),
            FoodItem("pepper", "vegetables", 0.3, 0.1, ["pepper", "peppers", "bell pepper", "jalapeno", "habanero"], "peppers", "FAO"),
            FoodItem("cucumber", "vegetables", 0.2, 0.15, ["cucumber", "cucumbers", "pickle", "pickles"], "cucumbers", "FAO"),
            FoodItem("mushroom", "vegetables", 0.2, 0.1, ["mushroom", "mushrooms", "portobello", "shiitake"], "mushrooms", "FAO"),
            
            # Nuts & Seeds
            FoodItem("almond", "nuts", 2.3, 0.1, ["almond", "almonds", "almond milk"], "almonds", "FAO"),
            FoodItem("walnut", "nuts", 0.3, 0.1, ["walnut", "walnuts"], "walnuts", "FAO"),
            FoodItem("peanut", "nuts", 2.5, 0.1, ["peanut", "peanuts", "peanut butter"], "peanuts", "FAO"),
            FoodItem("cashew", "nuts", 3.0, 0.1, ["cashew", "cashews"], "cashews", "FAO"),
            FoodItem("pistachio", "nuts", 2.3, 0.1, ["pistachio", "pistachios"], "pistachios", "FAO"),
            FoodItem("sunflower_seed", "nuts", 0.3, 0.05, ["sunflower seed", "sunflower seeds", "pumpkin seed"], "seeds", "FAO"),
            
            # Beverages
            FoodItem("coffee", "beverages", 28.0, 0.01, ["coffee", "espresso", "latte", "cappuccino", "coffee beans"], "coffee", "FAO"),
            FoodItem("tea", "beverages", 2.0, 0.01, ["tea", "green tea", "black tea", "herbal tea", "tea bags"], "tea", "FAO"),
            FoodItem("juice", "beverages", 0.3, 1.0, ["juice", "orange juice", "apple juice", "cranberry juice", "grape juice"], "juice", "FAO"),
            FoodItem("soda", "beverages", 0.3, 0.35, ["soda", "pop", "cola", "sprite", "pepsi", "coke"], "soda", "FAO"),
            FoodItem("beer", "beverages", 0.6, 0.35, ["beer", "ale", "lager", "stout"], "alcohol", "FAO"),
            FoodItem("wine", "beverages", 1.4, 0.75, ["wine", "red wine", "white wine", "champagne"], "alcohol", "FAO"),
            
            # Processed Foods
            FoodItem("chocolate", "processed", 19.0, 0.1, ["chocolate", "dark chocolate", "milk chocolate", "chocolate bar", "cocoa"], "chocolate", "FAO"),
            FoodItem("chips", "processed", 1.4, 0.15, ["chips", "potato chips", "tortilla chips", "corn chips", "doritos"], "snacks", "FAO"),
            FoodItem("cookies", "processed", 1.4, 0.1, ["cookie", "cookies", "biscuit", "biscuits", "oreo"], "baked_goods", "FAO"),
            FoodItem("cereal", "processed", 1.4, 0.5, ["cereal", "corn flakes", "cheerios", "frosted flakes", "rice krispies"], "cereal", "FAO"),
            FoodItem("candy", "processed", 1.4, 0.05, ["candy", "chocolate bar", "gum", "lollipop", "skittles"], "candy", "FAO"),
            
            # Condiments & Sauces
            FoodItem("ketchup", "condiments", 0.3, 0.5, ["ketchup", "catsup"], "sauces", "FAO"),
            FoodItem("mayonnaise", "condiments", 1.4, 0.5, ["mayonnaise", "mayo"], "sauces", "FAO"),
            FoodItem("mustard", "condiments", 0.3, 0.5, ["mustard", "dijon mustard", "yellow mustard"], "sauces", "FAO"),
            FoodItem("soy_sauce", "condiments", 0.3, 0.5, ["soy sauce", "teriyaki sauce"], "sauces", "FAO"),
            FoodItem("hot_sauce", "condiments", 0.3, 0.1, ["hot sauce", "sriracha", "tabasco"], "sauces", "FAO"),
            
            # Oils & Fats
            FoodItem("olive_oil", "oils", 6.0, 0.5, ["olive oil", "extra virgin olive oil"], "olive_oil", "FAO"),
            FoodItem("vegetable_oil", "oils", 3.8, 0.5, ["vegetable oil", "canola oil", "sunflower oil", "corn oil"], "vegetable_oil", "FAO"),
            FoodItem("coconut_oil", "oils", 3.2, 0.5, ["coconut oil", "coconut"], "coconut_oil", "FAO"),
            
            # Frozen Foods
            FoodItem("frozen_pizza", "frozen", 2.0, 0.5, ["frozen pizza", "pizza", "frozen food"], "pizza", "FAO"),
            FoodItem("ice_cream", "frozen", 2.0, 0.5, ["ice cream", "frozen yogurt", "gelato"], "dessert", "FAO"),
            FoodItem("frozen_vegetables", "frozen", 0.2, 0.5, ["frozen vegetables", "frozen peas", "frozen corn"], "vegetables", "FAO"),
            
            # Canned Foods
            FoodItem("canned_tomatoes", "canned", 0.3, 0.4, ["canned tomatoes", "tomato sauce", "tomato paste"], "vegetables", "FAO"),
            FoodItem("canned_beans", "canned", 0.5, 0.4, ["canned beans", "black beans", "kidney beans", "chickpeas"], "legumes", "FAO"),
            FoodItem("canned_tuna", "canned", 3.0, 0.15, ["canned tuna", "tuna fish"], "seafood", "FAO"),
            
            # Baby Food
            FoodItem("baby_food", "baby", 0.5, 0.1, ["baby food", "baby formula", "baby cereal"], "puree", "FAO"),
            FoodItem("diapers", "baby", 0.5, 0.1, ["diapers", "baby wipes", "diaper"], "diapers", "FAO"),
            
            # Pet Food
            FoodItem("dog_food", "pet", 1.0, 0.5, ["dog food", "puppy food", "dog treats"], "dog", "FAO"),
            FoodItem("cat_food", "pet", 1.0, 0.1, ["cat food", "kitten food", "cat treats"], "cat", "FAO"),
            
            # Household
            FoodItem("detergent", "household", 0.5, 1.0, ["detergent", "laundry detergent", "dish soap"], "cleaning", "FAO"),
            FoodItem("paper_towels", "household", 0.5, 0.1, ["paper towels", "toilet paper", "tissues"], "paper", "FAO"),
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
            default_co2_per_kg = 1.0  # Conservative default
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
    
    def get_database_stats(self) -> Dict[str, Any]:
        """Get statistics about the database"""
        categories = set(item.category for item in self.food_items)
        subcategories = set(item.subcategory for item in self.food_items if item.subcategory)
        
        return {
            "total_items": len(self.food_items),
            "categories": len(categories),
            "subcategories": len(subcategories),
            "avg_co2_per_kg": sum(item.co2_per_kg for item in self.food_items) / len(self.food_items),
            "min_co2_per_kg": min(item.co2_per_kg for item in self.food_items),
            "max_co2_per_kg": max(item.co2_per_kg for item in self.food_items),
            "category_list": list(categories)
        }

# Global instance
emissions_db = EmissionsDatabase()

# Convenience functions
def calculate_emissions(item_name: str, quantity: float, price: float) -> Dict[str, Any]:
    return emissions_db.calculate_emissions(item_name, quantity, price)

def find_food_item(item_name: str) -> Optional[Dict[str, Any]]:
    return emissions_db.find_food_item(item_name)

def get_database_stats() -> Dict[str, Any]:
    return emissions_db.get_database_stats() 
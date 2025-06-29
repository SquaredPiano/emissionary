import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import Fuse from 'fuse.js';

export interface FoodItem {
  food: string;
  category: string;
  emissions: number;
}

let foodItems: FoodItem[] = [];
let fuse: Fuse<FoodItem>;

export function loadFoodDataset() {
  const csvPath = path.join(process.cwd(), 'src/lib/data/Food_Production.csv');
  const csv = fs.readFileSync(csvPath, 'utf8');
  const parsed = Papa.parse(csv, { header: true });
  foodItems = parsed.data.map((row: any) => ({
    food: row['Food product'],
    category: row['Category'] || 'other',
    emissions: parseFloat(row['GHG emissions']),
  })).filter(item => item.food && !isNaN(item.emissions));
  fuse = new Fuse(foodItems, { keys: ['food'], threshold: 0.35 });
}

export function getAllFoods() {
  return foodItems;
}

export function searchFoodByName(name: string, limit = 3) {
  if (!fuse) loadFoodDataset();
  return fuse.search(name, { limit }).map(res => res.item);
}

export function getEmissionsByName(name: string): FoodItem | undefined {
  if (!fuse) loadFoodDataset();
  const result = fuse.search(name, { limit: 1 });
  return result.length > 0 ? result[0].item : undefined;
} 
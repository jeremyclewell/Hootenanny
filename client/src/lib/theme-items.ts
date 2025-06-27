export interface ThemeItem {
  name: string;
  category: string;
}

const themeItems: Record<string, ThemeItem[]> = {
  'pool-party': [
    // Main Dishes
    { name: 'Grilled Burgers (Pack of 8)', category: 'main-dishes' },
    { name: 'Hot Dogs (Pack of 12)', category: 'main-dishes' },
    { name: 'Grilled Chicken (2 lbs)', category: 'main-dishes' },
    { name: 'Veggie Burgers (Pack of 6)', category: 'main-dishes' },
    
    // Side Dishes
    { name: 'Coleslaw (Large Bowl)', category: 'sides' },
    { name: 'Potato Salad (Large Bowl)', category: 'sides' },
    { name: 'Corn on the Cob (12 ears)', category: 'sides' },
    { name: 'Baked Beans (Large Pot)', category: 'sides' },
    { name: 'Watermelon Slices (Half Watermelon)', category: 'sides' },
    { name: 'Caprese Salad (Large Platter)', category: 'sides' },
    
    // Appetizers
    { name: 'Cheese & Crackers Tray', category: 'appetizers' },
    { name: 'Vegetable Tray with Dip', category: 'appetizers' },
    { name: 'Deviled Eggs (2 Dozen)', category: 'appetizers' },
    { name: 'Chips & Guacamole', category: 'appetizers' },
    { name: 'Spinach & Artichoke Dip', category: 'appetizers' },
    
    // Desserts
    { name: 'Ice Cream Sandwiches (Box of 12)', category: 'desserts' },
    { name: 'Fresh Fruit Salad (Large Bowl)', category: 'desserts' },
    { name: 'Chocolate Chip Cookies (2 Dozen)', category: 'desserts' },
    
    // Beverages
    { name: 'Soft Drinks (Variety Pack - 24 cans)', category: 'beverages' },
    { name: 'Bottled Water (Case of 24)', category: 'beverages' },
  ],
  
  'bbq': [
    // Main Dishes
    { name: 'BBQ Ribs (2 racks)', category: 'main-dishes' },
    { name: 'Pulled Pork (3 lbs)', category: 'main-dishes' },
    { name: 'Grilled Chicken Wings (2 lbs)', category: 'main-dishes' },
    { name: 'Beef Brisket (2 lbs)', category: 'main-dishes' },
    
    // Side Dishes
    { name: 'Mac and Cheese (Large Pan)', category: 'sides' },
    { name: 'Coleslaw (Large Bowl)', category: 'sides' },
    { name: 'Baked Beans (Large Pot)', category: 'sides' },
    { name: 'Cornbread (2 pans)', category: 'sides' },
    { name: 'Potato Salad (Large Bowl)', category: 'sides' },
    
    // Appetizers
    { name: 'BBQ Meatballs', category: 'appetizers' },
    { name: 'Jalapeño Poppers (2 dozen)', category: 'appetizers' },
    { name: 'Chips & Salsa', category: 'appetizers' },
    
    // Desserts
    { name: 'Peach Cobbler', category: 'desserts' },
    { name: 'Chocolate Cake', category: 'desserts' },
    
    // Beverages
    { name: 'Sweet Tea (1 gallon)', category: 'beverages' },
    { name: 'Beer (Variety Pack)', category: 'beverages' },
  ],
  
  'kids-party': [
    // Main Dishes
    { name: 'Pizza (3 large)', category: 'main-dishes' },
    { name: 'Chicken Nuggets (Family Pack)', category: 'main-dishes' },
    { name: 'Mini Sandwiches (2 dozen)', category: 'main-dishes' },
    
    // Side Dishes
    { name: 'French Fries (Family Pack)', category: 'sides' },
    { name: 'Fruit Cups (Pack of 12)', category: 'sides' },
    { name: 'Veggie Sticks with Ranch', category: 'sides' },
    
    // Appetizers
    { name: 'Cheese Sticks (2 dozen)', category: 'appetizers' },
    { name: 'Goldfish Crackers (Family Pack)', category: 'appetizers' },
    
    // Desserts
    { name: 'Birthday Cake', category: 'desserts' },
    { name: 'Cupcakes (2 dozen)', category: 'desserts' },
    { name: 'Ice Cream (2 half gallons)', category: 'desserts' },
    
    // Beverages
    { name: 'Juice Boxes (Pack of 24)', category: 'beverages' },
    { name: 'Chocolate Milk (12 bottles)', category: 'beverages' },
  ],
  
  'thanksgiving': [
    // Main Dishes
    { name: 'Roasted Turkey (12-15 lbs)', category: 'main-dishes' },
    { name: 'Honey Glazed Ham (8-10 lbs)', category: 'main-dishes' },
    
    // Side Dishes
    { name: 'Mashed Potatoes (Large Bowl)', category: 'sides' },
    { name: 'Stuffing (Large Pan)', category: 'sides' },
    { name: 'Green Bean Casserole', category: 'sides' },
    { name: 'Sweet Potato Casserole', category: 'sides' },
    { name: 'Cranberry Sauce (2 cans)', category: 'sides' },
    { name: 'Dinner Rolls (2 dozen)', category: 'sides' },
    
    // Appetizers
    { name: 'Cheese & Crackers Board', category: 'appetizers' },
    { name: 'Deviled Eggs (2 dozen)', category: 'appetizers' },
    
    // Desserts
    { name: 'Pumpkin Pie (2 pies)', category: 'desserts' },
    { name: 'Apple Pie (2 pies)', category: 'desserts' },
    { name: 'Pecan Pie', category: 'desserts' },
    
    // Beverages
    { name: 'Apple Cider (1 gallon)', category: 'beverages' },
    { name: 'Wine (2 bottles)', category: 'beverages' },
  ],
  
  'general': [
    // Main Dishes
    { name: 'Lasagna (Large Pan)', category: 'main-dishes' },
    { name: 'Fried Chicken (Family Pack)', category: 'main-dishes' },
    { name: 'Pasta Salad (Large Bowl)', category: 'main-dishes' },
    
    // Side Dishes
    { name: 'Garden Salad (Large Bowl)', category: 'sides' },
    { name: 'Garlic Bread (2 loaves)', category: 'sides' },
    { name: 'Rice Pilaf (Large Pan)', category: 'sides' },
    
    // Appetizers
    { name: 'Vegetable Tray with Dip', category: 'appetizers' },
    { name: 'Cheese & Crackers Tray', category: 'appetizers' },
    { name: 'Chips & Dip', category: 'appetizers' },
    
    // Desserts
    { name: 'Chocolate Cake', category: 'desserts' },
    { name: 'Fresh Fruit Tray', category: 'desserts' },
    { name: 'Cookies (Assorted - 2 dozen)', category: 'desserts' },
    
    // Beverages
    { name: 'Soft Drinks (Variety Pack)', category: 'beverages' },
    { name: 'Bottled Water (Case)', category: 'beverages' },
  ],
};

export function getThemeItems(theme: string): ThemeItem[] {
  return themeItems[theme] || themeItems['general'];
}

export const themes = [
  { id: 'pool-party', name: 'Pool Party', icon: 'swimming-pool' },
  { id: 'bbq', name: 'BBQ', icon: 'fire' },
  { id: 'kids-party', name: 'Kids Party', icon: 'birthday-cake' },
  { id: 'thanksgiving', name: 'Thanksgiving', icon: 'drumstick-bite' },
  { id: 'general', name: 'General', icon: 'utensils' },
];

// Seeds The Sparkling: menu (from the printed menu), tables, inventory, staff users.
// Usage: npm --prefix server run seed   (needs MONGO_URI)
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();
const MenuItem = require('./models/MenuItem');
const Inventory = require('./models/Inventory');
const Table = require('./models/Table');
const User = require('./models/User');

const IMG = {
  bev: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=800&q=80',
  soup: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=800&q=80',
  salad: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
  starters: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&w=800&q=80',
  chinese: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=800&q=80',
  baked: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?auto=format&fit=crop&w=800&q=80',
  sizzler: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80',
  paneer: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=800&q=80',
  kaju: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=800&q=80',
  indian: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80',
  kofta: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=800&q=80',
  tandoor: 'https://images.unsplash.com/photo-1626074353765-517a681e40be?auto=format&fit=crop&w=800&q=80',
  rice: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=800&q=80',
  pizza: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=800&q=80',
  sandwich: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=800&q=80',
  shake: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=800&q=80',
  platter: 'https://images.unsplash.com/photo-1610057099431-d73a1c9d2f2f?auto=format&fit=crop&w=800&q=80'
};

// [category, portion, imageUrl, [[name, price, description?], ...]]
const MENU = [
 ['Beverages','', IMG.bev,[['Mineral Water (1 Ltr)',20],['Fresh Lemon Water (200ml)',55],['Fresh Lemon Soda (200ml)',65],['Jal Jira Soda (200ml)',65],['Lassi Sweet/Salted (250ml)',95],['Special Lassi (250ml)',119],['Milk Glass (200ml)',50],['Cold Drink (200ml)',20],['Blue Lagoon (200ml)',70],['Mojito Mint (200ml)',100],['Fruit Punch (200ml)',100],['Butter Milk (200ml)',40],['Sp. Butter Milk (200ml)',50]]],
 ['Soup','200ml',IMG.soup,[['Tomato Soup',120],['Palak Corn Soup',130],['Tomato Corn Cheese Soup',130],['Veg. Manchow Soup',125],['Veg. Hot & Sour Soup',120],['Sweet Corn Veg. Soup',120],['Veg. Noodles Soup',110],['Veg. Clear Soup',110],['Cream of Mushroom Soup',130],['Lemon Coriander Soup',130],['Minestrone Soup',130],['Cream of Veg. Soup',130]]],
 ['Salad & Raita','200g',IMG.salad,[['Green Salad / Kachumber Salad',80],['Veg. Raita / Boondi Raita',90],['Pineapple Raita',100],['Roasted Papad',30],['Fried Papad',35],['Masala Papad',38],['Cheese Masala Papad',45]]],
 ['Starters','8 pc',IMG.starters,[['Sp. Tandoori Platter',330],['Paneer Tikka Dry',250],['Paneer Pahadi Tikka Dry (Spicy)',280],['Veg. Fried Wonton',250],['Hara Bhara Kabab',240],['Veg. Spring Roll',240],['Crispy Vegetables',240],['Paneer 65',245],['Malai Tikka Dry',265],['Paneer Lasaniya Tikka Dry',265],['Raja Kabab',285],['Paneer Achari Tikka Dry',280],['Veg. Lollipop (6 pc)',230],['Crispy Honey Paneer',250],['Veg. Corn Cheese Roll',240],['Palak Paneer Silsila Dry',250]]],
 ['Chinese','300g',IMG.chinese,[['Paneer Chilly Dry / Gravy',240],['Veg. Manchurian Dry / Gravy',220],['Baby Corn / Mushroom Chilly Dry',240],['Paneer Manchurian',230],['Potato Chilly Dry',210],['Veg. Hakka Noodles',210],['Schezwan Noodles',210],['Chilly Garlic Noodle',210],['Manchurian Noodles',210],['Chinese Bhel',210],['Veg. American Chopsuey',200],['Chinese Chopsuey',200],['Veg. Fried Rice',170],['Schezwan Fried Rice',180],['Mushroom Fried Rice',180],['Manchurian Fried Rice',180],['Chinese Fried Rice',175]]],
 ['Baked Dishes','300g',IMG.baked,[['Sp. Sparkling Baked Spaghetti',260],['Baked Spaghetti Pineapple',255],['Baked Macaroni Pineapple',260],['Baked Veg.',255]]],
 ['Sizzler','700g',IMG.sizzler,[['Sparkling Sp. Sizzler',395],['Chinese Sizzler',385],['Veg. Grill Sizzler',385],['Paneer Stick Sizzler',385],['Sp. Dry Sizzler',430],['Rainbow Sizzler',380]]],
 ['Paneer Dish','280g',IMG.paneer,[['Paneer Tava',245],['Paneer Tikka Masala',240],['Paneer Butter Masala',240],['Paneer Lababdar (Sweet)',240],['Paneer Kadai',240],['Paneer Handi',235],['Paneer Balti',235],['Paneer Bhuraji',235],['Paneer Pasanda',235],['Paneer Patiyala',235],['Paneer Angara',240],['Paneer Garlic Masala',235],['Mutter Paneer',220],['Palak Paneer',220],['Paneer Chatpatta',250],['Paneer Matka',260],['Paneer Toofani',260],['Paneer Najakat',260]]],
 ['Kaju Dish','280g',IMG.kaju,[['Khoya Kaju (Sweet)',250],['Kaju Curry',250],['Kaju Kadai Masala',245],['Kaju Butter Masala',240],['Paneer Kaju Masala',245]]],
 ['Indian Dishes','280g',IMG.indian,[['Sp. Veg. Sparkling',250],['Veg. Makhanwala',235],['Veg. Kadai',235],['Veg. Jaipuri',235],['Veg. Kolhapuri',235],['Veg. Tawa',240],['Veg. Handi',240],['Veg. Balti',230],['Veg. Hariyali',225],['Veg. Darbari',225],['Veg. Navratan Korma (Sweet)',225],['Veg. Lasaniya',230],['Veg. Angara',240],['Cheese Butter Masala',240],['Cheese Corn Palak',245],['Malai Methi Mutter',235],['Mushroom Masala',240],['Mushroom Mutter Masala',240],['Baby Corn Butter Masala',240],['Baby Corn Hara Masala',235],['Corn Tomato Bharta',240],['Dam Aaloo',195],['Aaloo Kadai',190],['Aaloo Jeera',190],['Aaloo Gobi',190],['Aaloo Palak',190],['Chana Masala',190],['Mix Veg.',190],['Sev Tomato / Sev Masala',190],['Veg. Diwani Handi',240],['Veg. Toofani',240],['Veg. Aflatoon',240],['Dal Makhni Butter (300g)',180],['Dal Palak Butter (300g)',160],['Dal Fry / Dal Fry Butter (300g)',130],['Dal Tadka (300g)',140]]],
 ['Kofta','280g',IMG.kofta,[['Paneer Kofta',230],['Kaju Kofta',230],['Malai Kofta (Sweet)',210],['Nargis Kofta',215],['Kadai Kofta',225],['Kashmiri Kofta (Sweet)',225],['Cheese Kofta',225]]],
 ['Tandoor','per pc',IMG.tandoor,[['Chapati',20],['Tandoori Roti',22],['Butter Chapati',25],['Butter Tandoori Roti',28],['Parotha',40],['Butter Parotha',40],['Stuff Parotha',79],['Naan',49],['Butter Naan',50],['Stuff Naan',60],['Garlic Naan',80],['Cheese Naan',80],['Cheese Chilly Naan',80],['Cheese Chilly Garlic Naan',90],['Kashmiri Naan',85],['Missi Roti',80],['Butter Kulcha',50],['Aaloo Paratha',110],['Parotha (Tawa)',40],['Butter Parotha (Tawa)',45]]],
 ['Rice & Pulao','160g',IMG.rice,[['Veg. Pulao / Piece Pulao',140],['Kashmiri Pulao (Sweet)',150],['Cheese Pulao / Kaju Pulao',145],['Veg. Biriyani',150],['Handi Dum Biriyani',155],['Hydrabadi Biriyani',165],['Steam Rice',120],['Triple Fry Rice',230],['Sp. Sparkling Biriyani',230],['Sp. Mataka Dum Biriyani',220],['Plain Rice',120],['Jeera Rice',130]]],
 ['Pizza','per pc',IMG.pizza,[['Sp. Sparkling Pizza',295],['Italian Pizza',265],['Veg. Cheese Pizza',245],['Cheese Pizza',220],['Corn Pizza',260],['Margherita Pizza',245]]],
 ['Sandwich','per pc',IMG.sandwich,[['Veg. Sandwich',95],['Cheese Sandwich',100],['Aaloo Mutter Sandwich',110],['Cheese Jam Sandwich',95],['Jaam Sandwich',85],['Bread Butter',55],['Potato Chips',125],['Toast Butter',65],['Veg. Cheese Sandwich',95],['Veg. Club Sandwich',160],['Veg. Cheese Club Sandwich',180]]],
 ['Milk Shake','250ml',IMG.shake,[['Vanilla / Strawberry / Kesar Pista Shake',120],['Milk Shake with Ice Cream',125],['Cold Coffee',110],['Cold Coffee with Ice Cream',120]]],
 ['Platter & Fix Lunch','per dish',IMG.platter,[
   ['Dal Bati Platter',349,'Dal, Bati (4), chutney, salad, veg. pulao, butter milk, gud, curd.'],
   ['Super Deluxe Lunch',250,'Soup, paneer, veg., dal, jeera rice, papad, butter milk, salad, roti (3), sweet.'],
   ['Deluxe Lunch',230,'Paneer, veg., dal, jeera rice, papad, butter milk, salad, roti (3).'],
   ['Pack Lunch',230,'Paneer, veg., dal, jeera rice, papad, butter milk, salad, roti (3).']]],
];

const INVENTORY = [
 {name:'Paneer',quantity:40,unit:'kg',threshold:8},{name:'Cashew (Kaju)',quantity:10,unit:'kg',threshold:2},
 {name:'Basmati Rice',quantity:80,unit:'kg',threshold:15},{name:'Wheat Flour (Atta)',quantity:100,unit:'kg',threshold:20},
 {name:'Maida',quantity:40,unit:'kg',threshold:8},{name:'Butter',quantity:15,unit:'kg',threshold:3},
 {name:'Cheese',quantity:15,unit:'kg',threshold:3},{name:'Pizza Base',quantity:50,unit:'pcs',threshold:12},
 {name:'Bread',quantity:40,unit:'pcs',threshold:10},{name:'Fresh Milk',quantity:60,unit:'liters',threshold:12},
 {name:'Curd',quantity:30,unit:'kg',threshold:6},{name:'Cooking Oil',quantity:50,unit:'liters',threshold:10},
 {name:'Mixed Vegetables',quantity:60,unit:'kg',threshold:12},{name:'Potato',quantity:80,unit:'kg',threshold:15},
 {name:'Tomato',quantity:40,unit:'kg',threshold:8},{name:'Onion',quantity:60,unit:'kg',threshold:12},
];
// category -> [inventory name, qty per portion]  (drives auto stock deduction; edit freely in Admin)
const RECIPE = {
 'Paneer Dish':[['Paneer',0.12]],'Kaju Dish':[['Cashew (Kaju)',0.05]],'Kofta':[['Paneer',0.05]],
 'Tandoor':[['Wheat Flour (Atta)',0.06]],'Rice & Pulao':[['Basmati Rice',0.15]],
 'Pizza':[['Pizza Base',1],['Cheese',0.08]],'Sandwich':[['Bread',2]],
 'Indian Dishes':[['Mixed Vegetables',0.15]],
};

(async () => {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/sparkling');
  console.log('Mongo connected');
  for (const i of INVENTORY) await Inventory.findOneAndUpdate({name:i.name},{...i,lastRestocked:new Date()},{upsert:true});
  const inv = Object.fromEntries((await Inventory.find()).map(i=>[i.name,i._id]));
  await MenuItem.deleteMany({});
  let n=0, score=100;
  for (const [category,portion,imageUrl,items] of MENU) {
    for (const [name,price,desc] of items) {
      await MenuItem.create({
        name, category, price, imageUrl, isVeg:true, isAvailable:true, popularityScore: score--,
        description: desc || `Pure vegetarian ${category.toLowerCase()}${portion?` · ${portion}`:''}, freshly prepared at The Sparkling.`,
        ingredients: (RECIPE[category]||[]).filter(([k])=>inv[k]).map(([k,q])=>({ingredientId:inv[k],quantityRequired:q})),
      }); n++;
    }
  }
  console.log(`Menu items: ${n}`);
  for (let t=1;t<=12;t++) await Table.findOneAndUpdate({tableId:t},{tableId:t,capacity:t<=6?4:6,isActive:true},{upsert:true});
  console.log('Tables: 12');
  const staff = [
    ['Admin','admin@sparkling.com',process.env.SEED_ADMIN_PASSWORD||'admin123','admin'],
    ['Chef','chef@sparkling.com',process.env.SEED_CHEF_PASSWORD||'chef123','kitchen'],
    ['Waiter','waiter@sparkling.com',process.env.SEED_WAITER_PASSWORD||'waiter123','waiter'],
  ];
  for (const [name,email,password,role] of staff) {
    if (!(await User.findOne({email}))) await User.create({name,email,password,role});
  }
  console.log('Staff users ready. CHANGE the default passwords (or set SEED_*_PASSWORD) before going live.');
  await mongoose.disconnect();
})().catch(e=>{console.error(e);process.exit(1);});

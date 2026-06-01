import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import User from '@/models/User'
import Product from '@/models/Product'
import Review from '@/models/Review'
import Coupon from '@/models/Coupon'
import Category from '@/models/Category'
import Banner from '@/models/Banner'
import Order from '@/models/Order'

const CATEGORY_TREE = [
  {
    name: 'Electronics', slug: 'electronics', icon: '💻', commission: 8,
    children: [
      { name: 'Laptops', slug: 'laptops' },
      { name: 'Smartphones', slug: 'smartphones' },
      { name: 'Headphones', slug: 'headphones' },
      { name: 'Cameras', slug: 'cameras' },
      { name: 'TVs & Displays', slug: 'tvs' },
      { name: 'Gaming', slug: 'gaming' },
    ],
  },
  {
    name: 'Fashion', slug: 'fashion', icon: '👗', commission: 12,
    children: [
      { name: "Men's Clothing", slug: 'mens-clothing' },
      { name: "Women's Clothing", slug: 'womens-clothing' },
      { name: 'Shoes', slug: 'shoes' },
      { name: 'Accessories', slug: 'accessories' },
      { name: 'Jewelry', slug: 'jewelry' },
    ],
  },
  {
    name: 'Home & Garden', slug: 'home-garden', icon: '🏠', commission: 10,
    children: [
      { name: 'Furniture', slug: 'furniture' },
      { name: 'Kitchen', slug: 'kitchen' },
      { name: 'Bedding', slug: 'bedding' },
      { name: 'Tools', slug: 'tools' },
      { name: 'Garden', slug: 'garden' },
    ],
  },
  {
    name: 'Books', slug: 'books', icon: '📚', commission: 15,
    children: [
      { name: 'Fiction', slug: 'fiction' },
      { name: 'Non-Fiction', slug: 'non-fiction' },
      { name: 'Educational', slug: 'educational' },
      { name: 'Children', slug: 'children-books' },
    ],
  },
  {
    name: 'Sports & Outdoors', slug: 'sports', icon: '⚽', commission: 10,
    children: [
      { name: 'Fitness', slug: 'fitness' },
      { name: 'Outdoor', slug: 'outdoor' },
      { name: 'Team Sports', slug: 'team-sports' },
      { name: 'Cycling', slug: 'cycling' },
    ],
  },
  {
    name: 'Beauty & Health', slug: 'beauty', icon: '💄', commission: 14,
    children: [
      { name: 'Skincare', slug: 'skincare' },
      { name: 'Makeup', slug: 'makeup' },
      { name: 'Hair Care', slug: 'hair-care' },
      { name: 'Fragrance', slug: 'fragrance' },
    ],
  },
  {
    name: 'Toys & Games', slug: 'toys', icon: '🧸', commission: 12,
    children: [
      { name: 'Action Figures', slug: 'action-figures' },
      { name: 'Board Games', slug: 'board-games' },
      { name: 'Educational Toys', slug: 'educational-toys' },
      { name: 'Remote Control', slug: 'remote-control' },
    ],
  },
  {
    name: 'Automotive', slug: 'automotive', icon: '🚗', commission: 9,
    children: [
      { name: 'Car Parts', slug: 'car-parts' },
      { name: 'Car Accessories', slug: 'car-accessories' },
      { name: 'Car Electronics', slug: 'car-electronics' },
    ],
  },
]

const PRODUCT_TEMPLATES = [
  {
    title: 'Apple MacBook Pro 14" M3 Chip',
    description: 'The MacBook Pro 14-inch with M3 delivers exceptional performance. Features Liquid Retina XDR display, up to 22 hours battery life, and advanced connectivity. Perfect for professionals.',
    featureBullets: [
      'Apple M3 chip with 8-core CPU and 10-core GPU',
      'Liquid Retina XDR display — 3024×1964 resolution',
      'Up to 22 hours of battery life',
      'MagSafe 3, Thunderbolt 4, HDMI, SD card slot',
      'Available in Silver and Space Gray',
    ],
    price: 1999.99, discountPrice: 1799.99, discountPercent: 10,
    categorySlug: 'laptops', brand: 'Apple',
    images: ['https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800', 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=800'],
    stock: 45, rating: 4.8, reviewCount: 1243,
    isFeatured: true, isDealOfDay: false,
    hasVariants: true,
    variants: [
      { attributes: { Storage: '512GB', RAM: '16GB' }, price: 1999.99, discountPrice: 1799.99, stock: 25, images: [] },
      { attributes: { Storage: '1TB', RAM: '16GB' }, price: 2399.99, discountPrice: 2199.99, stock: 15, images: [] },
      { attributes: { Storage: '1TB', RAM: '24GB' }, price: 2799.99, stock: 5, images: [] },
    ],
    tags: ['laptop', 'apple', 'macbook', 'pro', 'm3'],
    specifications: { Processor: 'Apple M3', Display: '14.2" Liquid Retina XDR', Weight: '3.5 lbs', Ports: 'MagSafe 3 + 3x Thunderbolt 4 + HDMI + SD', OS: 'macOS Sonoma' },
    freeShipping: true, estimatedDeliveryDays: 3,
  },
  {
    title: 'Samsung Galaxy S24 Ultra 5G',
    description: 'Experience the pinnacle of Samsung innovation. Galaxy S24 Ultra features a 200MP camera system, built-in S Pen, and the fastest Snapdragon 8 Gen 3 mobile processor.',
    featureBullets: [
      '200MP pro-grade camera with nightography',
      'Built-in S Pen — draw, write, and note',
      'Snapdragon 8 Gen 3 processor',
      '6.8" Dynamic AMOLED 2X display, 120Hz',
      '5000mAh battery with 45W fast charging',
    ],
    price: 1299.99, discountPrice: 1099.99, discountPercent: 15,
    categorySlug: 'smartphones', brand: 'Samsung',
    images: ['https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=800'],
    stock: 120, rating: 4.7, reviewCount: 3421,
    isFeatured: true, isDealOfDay: true,
    hasVariants: true,
    variants: [
      { attributes: { Color: 'Titanium Black', Storage: '256GB' }, price: 1299.99, discountPrice: 1099.99, stock: 50, images: [] },
      { attributes: { Color: 'Titanium Gray', Storage: '256GB' }, price: 1299.99, discountPrice: 1099.99, stock: 40, images: [] },
      { attributes: { Color: 'Titanium Black', Storage: '512GB' }, price: 1419.99, discountPrice: 1199.99, stock: 30, images: [] },
    ],
    tags: ['samsung', 'galaxy', 'smartphone', 'android', 's24', '5g'],
    specifications: { Processor: 'Snapdragon 8 Gen 3', RAM: '12GB', Camera: '200MP + 12MP + 50MP + 10MP', Battery: '5000mAh', Display: '6.8" Dynamic AMOLED 2X 120Hz' },
    freeShipping: true, estimatedDeliveryDays: 2,
  },
  {
    title: 'Sony WH-1000XM5 Wireless Noise-Canceling Headphones',
    description: 'Industry-leading noise canceling with 8 microphones and 2 processors. Crystal clear hands-free calling. Up to 30-hour battery life with quick charge.',
    featureBullets: [
      'Industry-leading noise cancellation',
      '30 hours battery life, 3 hours charge in 3 minutes',
      'Multipoint connection — 2 devices simultaneously',
      'Adaptive Sound Control technology',
      'Premium sound with 30mm driver unit',
    ],
    price: 399.99, discountPrice: 279.99, discountPercent: 30,
    categorySlug: 'headphones', brand: 'Sony',
    images: ['https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=800', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800'],
    stock: 89, rating: 4.9, reviewCount: 5672,
    isFeatured: true, isDealOfDay: true,
    hasVariants: true,
    variants: [
      { attributes: { Color: 'Black' }, price: 399.99, discountPrice: 279.99, stock: 50, images: [] },
      { attributes: { Color: 'Platinum Silver' }, price: 399.99, discountPrice: 279.99, stock: 39, images: [] },
    ],
    tags: ['headphones', 'sony', 'wireless', 'noise-canceling', 'bluetooth'],
    specifications: { Battery: '30 hours', 'Noise Cancellation': 'AI-powered', Connectivity: 'Bluetooth 5.2', Weight: '250g', Warranty: '1 year' },
    freeShipping: true, estimatedDeliveryDays: 2,
  },
  {
    title: 'Nike Air Max 270 Running Shoes',
    description: 'The Nike Air Max 270 delivers a look inspired by legendary Air Max silhouettes. Its large Air unit offers amazing heel cushioning. Breathable mesh upper keeps you cool.',
    featureBullets: [
      'Max Air 270 unit for exceptional cushioning',
      'Breathable mesh upper for airflow',
      'Foam midsole for lightweight feel',
      'Rubber outsole for durability',
      'Available in multiple colorways',
    ],
    price: 150.00, discountPrice: 119.99, discountPercent: 20,
    categorySlug: 'shoes', brand: 'Nike',
    images: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800', 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=800'],
    stock: 234, rating: 4.5, reviewCount: 8934,
    isFeatured: true, isDealOfDay: false,
    hasVariants: true,
    variants: [
      { attributes: { Size: '8', Color: 'Black/White' }, price: 119.99, stock: 30, images: [] },
      { attributes: { Size: '9', Color: 'Black/White' }, price: 119.99, stock: 40, images: [] },
      { attributes: { Size: '10', Color: 'Black/White' }, price: 119.99, stock: 35, images: [] },
      { attributes: { Size: '11', Color: 'Black/White' }, price: 119.99, stock: 25, images: [] },
      { attributes: { Size: '9', Color: 'Royal Blue' }, price: 119.99, stock: 20, images: [] },
      { attributes: { Size: '10', Color: 'Royal Blue' }, price: 119.99, stock: 25, images: [] },
    ],
    tags: ['nike', 'shoes', 'running', 'air max', 'sneakers'],
    specifications: { Upper: 'Mesh', Sole: 'Rubber + Air Max unit', Closure: 'Lace-up', 'Available Sizes': '6–15', 'Style': 'Running / Lifestyle' },
    freeShipping: false, estimatedDeliveryDays: 5,
  },
  {
    title: 'Instant Pot Duo 7-in-1 Electric Pressure Cooker 6 Qt',
    description: "America's #1 multi-cooker. 7 appliances in 1. Cooks up to 70% faster than traditional cooking. Perfect for busy families.",
    featureBullets: [
      '7-in-1: pressure cooker, slow cooker, rice cooker, steamer, sauté, yogurt maker, warmer',
      'Up to 70% faster cooking time',
      '13 customizable smart programs',
      'Safety-certified with 10 proven safety mechanisms',
      'Easy-clean stainless steel inner pot',
    ],
    price: 99.99, discountPrice: 69.99, discountPercent: 30,
    categorySlug: 'kitchen', brand: 'Instant Pot',
    images: ['https://images.unsplash.com/photo-1585515320310-259814833e62?w=800'],
    stock: 312, rating: 4.7, reviewCount: 45231,
    isFeatured: false, isDealOfDay: false,
    hasVariants: false, variants: [],
    tags: ['instant pot', 'pressure cooker', 'kitchen', 'cooking', 'appliance'],
    specifications: { Capacity: '6 quart', Functions: '7-in-1', Material: 'Stainless Steel', Wattage: '1000W', Warranty: '1 year' },
    freeShipping: true, estimatedDeliveryDays: 3,
  },
  {
    title: 'Atomic Habits — James Clear',
    description: 'No matter your goals, Atomic Habits offers a proven framework for improving every day. One of the world\'s leading experts on habit formation reveals practical strategies to form good habits, break bad ones, and master tiny behaviors leading to remarkable results.',
    featureBullets: [
      'New York Times #1 bestseller',
      'Science-backed habit formation framework',
      'Practical 4-step model: cue, craving, response, reward',
      'Used by Olympic athletes, CEOs, and millions worldwide',
      '320 pages of actionable insights',
    ],
    price: 27.99, discountPrice: 14.99, discountPercent: 46,
    categorySlug: 'non-fiction', brand: 'Penguin Random House',
    images: ['https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800'],
    stock: 500, rating: 4.9, reviewCount: 89432,
    isFeatured: false, isDealOfDay: false,
    hasVariants: false, variants: [],
    tags: ['book', 'habits', 'self-help', 'productivity', 'james clear'],
    specifications: { Author: 'James Clear', Pages: '320', Language: 'English', Publisher: 'Avery', ISBN: '978-0735211292' },
    freeShipping: false, estimatedDeliveryDays: 5,
  },
  {
    title: 'LG 65" OLED evo C3 Series 4K Smart TV',
    description: 'Experience the world\'s best picture with LG OLED evo. Perfect blacks, brilliant highlights, over a billion colors. Powered by α9 AI Processor Gen6.',
    featureBullets: [
      'OLED evo panel with self-lit pixels',
      'α9 AI Processor Gen6 for smart optimization',
      'Dolby Vision IQ + Dolby Atmos support',
      'Game Optimizer with G-Sync, FreeSync Premium',
      'webOS 23 Smart TV platform with Magic Remote',
    ],
    price: 1799.99, discountPrice: 1299.99, discountPercent: 28,
    categorySlug: 'tvs', brand: 'LG',
    images: ['https://images.unsplash.com/photo-1593359677879-a4bb92f829e1?w=800'],
    stock: 23, rating: 4.8, reviewCount: 2341,
    isFeatured: true, isDealOfDay: false,
    hasVariants: false, variants: [],
    tags: ['lg', 'oled', 'tv', '4k', 'smart tv'],
    specifications: { 'Screen Size': '65 inches', Resolution: '4K UHD (3840×2160)', 'Panel Type': 'OLED evo', 'Refresh Rate': '120Hz', 'Smart TV': 'webOS 23' },
    freeShipping: true, estimatedDeliveryDays: 7,
  },
  {
    title: 'Dyson V15 Detect Absolute Cordless Vacuum',
    description: 'Intelligently reveals microscopic dust with its laser. Scientifically proves floor suitability with particle counting. 60 minutes runtime on hardwood.',
    featureBullets: [
      'Laser dust detection reveals hidden dust',
      'Particle-counting LCD screen proves suction power',
      'Up to 60 min runtime — powerful suction mode 60 min',
      'Full-machine HEPA filtration captures 99.97% particles',
      'Includes 9 accessories and 2 cleaner heads',
    ],
    price: 749.99, discountPrice: 599.99, discountPercent: 20,
    categorySlug: 'tools', brand: 'Dyson',
    images: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800'],
    stock: 67, rating: 4.7, reviewCount: 3421,
    isFeatured: false, isDealOfDay: true,
    hasVariants: false, variants: [],
    tags: ['dyson', 'vacuum', 'cordless', 'cleaning', 'v15'],
    specifications: { Battery: '60 min runtime', Weight: '6.8 lbs', Filtration: 'HEPA', 'Bin Capacity': '0.77 liters', Suction: '230 AW' },
    freeShipping: true, estimatedDeliveryDays: 3,
  },
  {
    title: 'La Mer Crème de la Mer Moisturizing Cream 1oz',
    description: 'The legendary moisturizer that started it all. Miracle Broth™, a potent seaweed elixir, is the heart of every La Mer formula. Transforms skin with concentrated marine energy.',
    featureBullets: [
      'Iconic Miracle Broth™ formula',
      'Hydrates and replenishes skin moisture barrier',
      'Visibly reduces redness and signs of irritation',
      'Rich, velvety texture for dry skin',
      'Dermatologist tested',
    ],
    price: 395.00, discountPrice: 316.00, discountPercent: 20,
    categorySlug: 'skincare', brand: 'La Mer',
    images: ['https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=800'],
    stock: 78, rating: 4.5, reviewCount: 6789,
    isFeatured: false, isDealOfDay: false,
    hasVariants: false, variants: [],
    tags: ['la mer', 'moisturizer', 'skincare', 'luxury', 'anti-aging'],
    specifications: { Size: '1 fl oz / 30mL', 'Skin Type': 'All skin types', 'Key Ingredient': 'Miracle Broth™', 'Cruelty Free': 'No', 'Paraben Free': 'Yes' },
    freeShipping: true, estimatedDeliveryDays: 2,
  },
  {
    title: 'LEGO Technic Bugatti Bolide 42151',
    description: 'Capture every detail of the Bugatti Bolide with this LEGO Technic set. Features working 8-speed gearbox, V16 engine with moving pistons, and authentic aerodynamic styling.',
    featureBullets: [
      '905 LEGO Technic pieces',
      'Working 8-speed sequential gearbox',
      'V16 engine with moving pistons',
      'Authentic Bugatti Bolide design elements',
      'Collectable display model',
    ],
    price: 119.99, discountPrice: 95.99, discountPercent: 20,
    categorySlug: 'remote-control', brand: 'LEGO',
    images: ['https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=800'],
    stock: 156, rating: 4.8, reviewCount: 2134,
    isFeatured: false, isDealOfDay: false,
    hasVariants: false, variants: [],
    tags: ['lego', 'technic', 'bugatti', 'toy', 'building'],
    specifications: { Pieces: '905', 'Recommended Age': '10+', Height: '5 in', Width: '15 in', Gearbox: '8-speed sequential' },
    freeShipping: false, estimatedDeliveryDays: 5,
  },
  {
    title: 'The North Face Thermoball Eco Jacket 2.0',
    description: 'The ultimate lightweight insulated jacket. Uses 100% recycled PrimaLoft Thermoball Eco insulation that keeps you warm even when wet. Packable into its own pocket.',
    featureBullets: [
      '100% recycled PrimaLoft Thermoball Eco insulation',
      'Warm even when wet',
      'Packs into its own left chest pocket',
      'DWR (durable water repellent) finish',
      'Available in Men\'s and Women\'s cuts',
    ],
    price: 220.00, discountPrice: 154.00, discountPercent: 30,
    categorySlug: 'mens-clothing', brand: 'The North Face',
    images: ['https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800'],
    stock: 89, rating: 4.6, reviewCount: 4532,
    isFeatured: false, isDealOfDay: false,
    hasVariants: true,
    variants: [
      { attributes: { Size: 'S', Color: 'TNF Black' }, price: 154.00, stock: 15, images: [] },
      { attributes: { Size: 'M', Color: 'TNF Black' }, price: 154.00, stock: 25, images: [] },
      { attributes: { Size: 'L', Color: 'TNF Black' }, price: 154.00, stock: 30, images: [] },
      { attributes: { Size: 'XL', Color: 'TNF Black' }, price: 154.00, stock: 10, images: [] },
      { attributes: { Size: 'M', Color: 'Summit Navy' }, price: 154.00, stock: 9, images: [] },
    ],
    tags: ['north face', 'jacket', 'outdoor', 'winter', 'insulated'],
    specifications: { Insulation: 'PrimaLoft Thermoball Eco (recycled)', Shell: '100% recycled nylon', Fit: 'Standard', Pockets: '3 exterior + 1 interior', 'Machine Washable': 'Yes' },
    freeShipping: false, estimatedDeliveryDays: 5,
  },
  {
    title: 'Peloton Bike+ Indoor Exercise Bike',
    description: 'A world-class cycling experience in your home. 24" HD touchscreen with auto-follow resistance, Apple GymKit, live and on-demand classes.',
    featureBullets: [
      '24" HD rotating touchscreen display',
      'Auto-follow resistance automatically adjusts',
      'Apple GymKit integration',
      'Access to thousands of live and on-demand classes',
      'Silent magnetic resistance system',
    ],
    price: 2495.00, discountPrice: 1995.00, discountPercent: 20,
    categorySlug: 'fitness', brand: 'Peloton',
    images: ['https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800'],
    stock: 15, rating: 4.6, reviewCount: 1876,
    isFeatured: true, isDealOfDay: false,
    hasVariants: false, variants: [],
    tags: ['peloton', 'exercise bike', 'fitness', 'indoor cycling', 'cardio'],
    specifications: { Display: '24" HD Touchscreen', Resistance: 'Magnetic, 100 levels', Weight: '140 lbs', 'Max User Weight': '297 lbs', Connectivity: 'WiFi, Bluetooth 4.0, ANT+' },
    freeShipping: true, estimatedDeliveryDays: 10,
  },
]

const REVIEWS_TEMPLATES = [
  { rating: 5, title: 'Absolutely amazing!', comment: 'Best purchase I\'ve made this year. Exceeded all expectations. Highly recommend!' },
  { rating: 5, title: 'Perfect product', comment: 'Exactly as described. Fast shipping, great packaging. Five stars without hesitation.' },
  { rating: 4, title: 'Great value for money', comment: 'Very happy with this purchase. Minor imperfections but overall a solid product.' },
  { rating: 4, title: 'Really impressed', comment: 'I was skeptical but this product delivers. Great build quality and performance.' },
  { rating: 3, title: 'Decent product', comment: 'Does what it\'s supposed to do but nothing extraordinary. Shipping was fast.' },
  { rating: 5, title: 'Love it!', comment: 'Third time buying this. Never disappoints. Highly recommend to everyone.' },
  { rating: 5, title: 'Game changer', comment: 'Changed my daily routine completely. Worth every penny!' },
  { rating: 4, title: 'Solid buy', comment: 'Good product, minor things could be improved but overall satisfied.' },
]

export async function GET() { return POST() }

export async function POST() {
  try {
    await connectDB()

    await Promise.all([
      User.deleteMany({}),
      Product.deleteMany({}),
      Review.deleteMany({}),
      Coupon.deleteMany({}),
      Category.deleteMany({}),
      Banner.deleteMany({}),
    ])

    // Create admin
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@primebazaar.com',
      password: 'admin123',
      role: 'admin',
    })

    // Create sellers
    const sellers = await User.create([
      { name: 'TechWorld Store', email: 'tech@seller.com', password: 'seller123', role: 'seller' },
      { name: 'Fashion Hub', email: 'fashion@seller.com', password: 'seller123', role: 'seller' },
      { name: 'HomeGoods Pro', email: 'home@seller.com', password: 'seller123', role: 'seller' },
    ])

    // Create customers
    const customers = await User.create([
      { name: 'Alice Johnson', email: 'alice@customer.com', password: 'customer123', role: 'customer', savedAddresses: [{ label: 'Home', isDefault: true, name: 'Alice Johnson', street: '123 Maple St', city: 'New York', state: 'NY', zipCode: '10001', country: 'US', phone: '+1-555-0100' }] },
      { name: 'Bob Smith', email: 'bob@customer.com', password: 'customer123', role: 'customer' },
      { name: 'Carol White', email: 'carol@customer.com', password: 'customer123', role: 'customer' },
      { name: 'David Brown', email: 'david@customer.com', password: 'customer123', role: 'customer' },
    ])

    // Create categories
    const categoryMap: Record<string, string> = {}
    for (let i = 0; i < CATEGORY_TREE.length; i++) {
      const cat = CATEGORY_TREE[i]
      const parent = await Category.create({ name: cat.name, slug: cat.slug, icon: cat.icon, commission: cat.commission, level: 0, order: i, isActive: true })
      categoryMap[cat.slug] = parent._id.toString()

      for (let j = 0; j < (cat.children || []).length; j++) {
        const child = cat.children[j]
        const childCat = await Category.create({ name: child.name, slug: child.slug, parent: parent._id, level: 1, order: j, commission: cat.commission, isActive: true })
        categoryMap[child.slug] = childCat._id.toString()
      }
    }

    // Create products
    const products = []
    for (let i = 0; i < PRODUCT_TEMPLATES.length; i++) {
      const tmpl = PRODUCT_TEMPLATES[i]
      const catId = categoryMap[tmpl.categorySlug] || Object.values(categoryMap)[0]
      const prod = await Product.create({
        title: tmpl.title,
        description: tmpl.description,
        featureBullets: tmpl.featureBullets,
        price: tmpl.price,
        discountPrice: tmpl.discountPrice,
        discountPercent: tmpl.discountPercent,
        category: catId,
        brand: tmpl.brand,
        images: tmpl.images,
        stock: tmpl.stock,
        hasVariants: tmpl.hasVariants,
        variants: tmpl.variants || [],
        // First 8 products belong to tech@seller.com so the demo seller hub is populated
        // Last 4 are split between fashion and home sellers
        seller: i < 8 ? sellers[0]._id : sellers[(i % 2) + 1]._id,
        rating: tmpl.rating,
        reviewCount: tmpl.reviewCount,
        isApproved: true,
        isFeatured: tmpl.isFeatured,
        isDealOfDay: tmpl.isDealOfDay,
        dealEndTime: tmpl.isDealOfDay ? new Date(Date.now() + 24 * 60 * 60 * 1000) : undefined,
        tags: tmpl.tags,
        specifications: new Map(Object.entries(tmpl.specifications)),
        freeShipping: tmpl.freeShipping,
        estimatedDeliveryDays: tmpl.estimatedDeliveryDays,
        salesCount: Math.floor(Math.random() * 500) + 50,
      })
      products.push(prod)
    }

    // Create reviews
    for (const product of products) {
      const numReviews = Math.floor(Math.random() * 4) + 2
      for (let i = 0; i < Math.min(numReviews, customers.length); i++) {
        const template = REVIEWS_TEMPLATES[Math.floor(Math.random() * REVIEWS_TEMPLATES.length)]
        await Review.create({
          user: customers[i]._id,
          product: product._id,
          ...template,
          verified: Math.random() > 0.3,
        })
      }
    }

    // Create coupons
    await Coupon.create([
      { code: 'SAVE10', discountType: 'percentage', discountValue: 10, minPurchase: 50, maxDiscount: 50, validFrom: new Date(), validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), usageLimit: 1000, createdBy: admin._id },
      { code: 'FLAT20', discountType: 'fixed', discountValue: 20, minPurchase: 100, validFrom: new Date(), validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), usageLimit: 500, createdBy: admin._id },
      { code: 'NEWUSER', discountType: 'percentage', discountValue: 15, minPurchase: 0, maxDiscount: 30, validFrom: new Date(), validTo: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), usageLimit: 10000, createdBy: admin._id },
      { code: 'PRIME25', discountType: 'percentage', discountValue: 25, minPurchase: 200, maxDiscount: 100, validFrom: new Date(), validTo: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), usageLimit: 100, createdBy: admin._id },
    ])

    // Create banners
    await Banner.create([
      { title: 'Biggest Tech Sale of the Year', subtitle: 'Up to 40% off on laptops, phones & more', image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=1200', link: '/products?category=Electronics', buttonText: 'Shop Electronics', position: 'hero', order: 0, isActive: true, createdBy: admin._id },
      { title: "Fashion That Defines You", subtitle: 'New arrivals in clothing, shoes & accessories', image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200', link: '/products?category=Fashion', buttonText: 'Explore Fashion', position: 'hero', order: 1, isActive: true, createdBy: admin._id },
      { title: "Today's Lightning Deals ⚡", subtitle: 'Limited time — grab them before they\'re gone!', image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200', link: '/products?dealOfDay=true', buttonText: 'See All Deals', position: 'hero', order: 2, isActive: true, createdBy: admin._id },
    ])

    // ── Seed demo orders for Seller Hub testing ────────────────────────────
    // Creates orders in various statuses so sellers see a realistic dashboard
    await Order.deleteMany({})

    const ADDRESS_SAMPLES = [
      { name: 'Alice Johnson', street: '123 Maple St', city: 'New York', state: 'NY', zipCode: '10001', country: 'US', phone: '+1-555-0100' },
      { name: 'Bob Smith', street: '456 Oak Ave', city: 'Los Angeles', state: 'CA', zipCode: '90001', country: 'US', phone: '+1-555-0200' },
      { name: 'Carol White', street: '789 Pine Rd', city: 'Chicago', state: 'IL', zipCode: '60601', country: 'US', phone: '+1-555-0300' },
      { name: 'Hari Sharma', street: 'Thamel-12', city: 'Kathmandu', state: 'Bagmati', zipCode: '44600', country: 'NP', phone: '+977-9801234567' },
    ]

    let oSeq = 0
    const makeON = () => `AMZ-DEMO-${Date.now().toString(36).toUpperCase()}-${(++oSeq).toString(36).padStart(3,'0').toUpperCase()}`
    const makeIN = () => `INV-DEMO-${Date.now().toString(36).toUpperCase()}-${oSeq.toString(36).toUpperCase()}`

    const orderStatuses = ['confirmed', 'confirmed', 'confirmed', 'processing', 'processing', 'packed', 'shipped', 'delivered', 'delivered', 'cancelled']
    const seedOrders = []

    for (let i = 0; i < orderStatuses.length; i++) {
      const status = orderStatuses[i]
      const product = products[i % products.length]
      const customer = customers[i % customers.length]
      const price = product.discountPrice || product.price
      const qty = Math.floor(Math.random() * 2) + 1
      const subtotal = price * qty
      const addr = ADDRESS_SAMPLES[i % ADDRESS_SAMPLES.length]

      seedOrders.push({
        orderNumber: makeON(),
        invoiceNumber: makeIN(),
        user: customer._id,
        items: [{
          product: product._id,
          title: product.title,
          image: product.images[0] || '',
          price,
          originalPrice: product.price,
          quantity: qty,
          // Use the product's actual seller so hub filtering works correctly
          seller: product.seller || sellers[0]._id,
          sku: `SKU-${product._id.toString().slice(-6).toUpperCase()}`,
        }],
        shippingAddress: addr,
        paymentMethod: ['card', 'esewa', 'khalti', 'cod'][i % 4],
        paymentStatus: status === 'cancelled' ? 'refunded' : 'paid',
        status,
        subtotal,
        shippingCost: subtotal > 50 ? 0 : 5.99,
        tax: 0,
        discount: 0,
        totalAmount: subtotal + (subtotal > 50 ? 0 : 5.99),
        giftOptions: { isGift: false, giftWrap: false },
        trackingNumber: ['shipped', 'delivered'].includes(status) ? `TRACK${Date.now().toString(36).toUpperCase()}` : undefined,
        acceptedAt: ['processing', 'packed', 'shipped', 'delivered'].includes(status) ? new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) : undefined,
        packedAt: ['packed', 'shipped', 'delivered'].includes(status) ? new Date(Date.now() - 1.5 * 24 * 60 * 60 * 1000) : undefined,
        shippedAt: ['shipped', 'delivered'].includes(status) ? new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) : undefined,
        deliveredAt: status === 'delivered' ? new Date(Date.now() - 4 * 60 * 60 * 1000) : undefined,
        rejectedAt: status === 'cancelled' ? new Date(Date.now() - 3 * 60 * 60 * 1000) : undefined,
        rejectionReason: status === 'cancelled' ? 'Item out of stock at warehouse' : undefined,
        rejectionCategory: status === 'cancelled' ? 'out_of_stock' : undefined,
      })
    }

    await Order.insertMany(seedOrders)

    return NextResponse.json({
      success: true,
      message: 'Database seeded successfully!',
      data: {
        admin: { email: 'admin@primebazaar.com', password: 'admin123' },
        sellers: [{ email: 'tech@seller.com', password: 'seller123' }],
        customers: [{ email: 'alice@customer.com', password: 'customer123' }],
        coupons: ['SAVE10', 'FLAT20', 'NEWUSER', 'PRIME25'],
        categoriesCreated: Object.keys(categoryMap).length,
        productsCreated: products.length,
        bannersCreated: 3,
        ordersSeeded: seedOrders.length,
        newOrdersForSeller: orderStatuses.filter(s => s === 'confirmed').length,
      },
    })
  } catch (err) {
    console.error('Seed error:', err)
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}

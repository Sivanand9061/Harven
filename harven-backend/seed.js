const Product = require('./models/Product');

// Seed data - Initial products
const seedProducts = [
    {
        name: "Basmati Rice Premium",
        category: "grains",
        image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=800",
        origin: "India",
        packaging: "25kg, 50kg bags",
        moq: 1000,
        price: 2.50,
        description: "Premium aged Basmati rice with extra-long grains and aromatic fragrance. Our Basmati rice is carefully sourced from the finest farms in India, aged to perfection for superior texture and taste. Ideal for biryanis, pulaos, and everyday meals. Each grain is meticulously selected to ensure consistent quality and authentic aroma.",
        inStock: true
    },
    {
        name: "Jasmine Rice",
        category: "grains",
        image: "https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?w=800",
        origin: "Thailand",
        packaging: "25kg, 50kg bags",
        moq: 1000,
        price: 2.30,
        description: "Fragrant Thai jasmine rice, perfect for Asian cuisine. Known for its soft texture and subtle floral aroma, this premium grade jasmine rice is ideal for restaurants and food service providers.",
        inStock: true
    },
    {
        name: "Tender Coconuts",
        category: "produce",
        image: "https://images.unsplash.com/photo-1615485500704-8e990f9900f7?w=800",
        origin: "India, Sri Lanka",
        packaging: "Per piece, bulk crates",
        moq: 500,
        price: 1.20,
        description: "Fresh tender coconuts, rich in natural electrolytes. Harvested at peak freshness and delivered with care. Perfect for direct consumption or coconut water extraction.",
        inStock: true
    },
    {
        name: "Premium Cashews",
        category: "nuts",
        image: "https://images.unsplash.com/photo-1599599810769-bcde5a160d32?w=800",
        origin: "Vietnam, India",
        packaging: "10kg, 25kg cartons",
        moq: 100,
        price: 12.50,
        description: "Grade A whole cashews, naturally processed. Carefully selected and quality-checked for uniform size and color. Perfect for snacking, cooking, or processing.",
        inStock: true
    },
    {
        name: "California Almonds",
        category: "nuts",
        image: "https://images.unsplash.com/photo-1508747703725-719777637510?w=800",
        origin: "USA",
        packaging: "10kg, 25kg bags",
        moq: 100,
        price: 15.00,
        description: "Premium California almonds, rich in nutrients. Non-GMO verified, packed with protein, fiber, and healthy fats. Available in raw or roasted varieties.",
        inStock: true
    },
    {
        name: "Black Pepper Whole",
        category: "spices",
        image: "https://images.unsplash.com/photo-1596040033229-a0b3b83cbf1c?w=800",
        origin: "Vietnam, India",
        packaging: "25kg bags",
        moq: 500,
        price: 8.50,
        description: "Bold and aromatic whole black peppercorns. Premium quality with high piperine content for maximum flavor. Ideal for spice blending and food manufacturing.",
        inStock: true
    },
    {
        name: "Green Cardamom",
        category: "spices",
        image: "https://images.unsplash.com/photo-1598016815563-36f0bb7c65c7?w=800",
        origin: "India, Guatemala",
        packaging: "5kg, 10kg cartons",
        moq: 50,
        price: 45.00,
        description: "Premium green cardamom pods with intense aroma. Hand-picked and carefully dried to preserve essential oils. Perfect for both sweet and savory applications.",
        inStock: true
    }
];

// ============================================
// Seed Database
// ============================================
async function seedDatabase() {
    try {
        // Check if products already exist
        const existingProducts = await Product.countDocuments();

        if (existingProducts > 0) {
            console.log(`✅ Database already seeded with ${existingProducts} products`);
            return;
        }

        // Insert seed data
        const insertedProducts = await Product.insertMany(seedProducts);
        console.log(`✅ Database seeded successfully with ${insertedProducts.length} products`);
        
    } catch (error) {
        console.error('❌ Error seeding database:', error);
        // Don't throw - let the server continue even if seeding fails
    }
}

module.exports = seedDatabase;

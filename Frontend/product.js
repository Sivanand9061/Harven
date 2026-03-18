// DOM Elements
const productsGrid = document.getElementById('productsGrid');
const searchInput = document.getElementById('searchInput');
const filterButtons = document.querySelectorAll('.filter-btn');
const noResults = document.getElementById('noResults');

let currentCategory = 'all';
let searchTerm = '';

// Render Products
function renderProducts(products) {
    if (products.length === 0) {
        productsGrid.innerHTML = '';
        noResults.style.display = 'block';
        return;
    }
    
    noResults.style.display = 'none';
    
    productsGrid.innerHTML = products.map(product => `
        <div class="product-card-catalog">
            <div class="product-image-catalog" style="background-image: url('${product.image}');">
                <div class="product-badge">${product.category.toUpperCase()}</div>
            </div>
            <div class="product-info-catalog">
                <h3 class="product-name">${product.name}</h3>
                <div class="product-meta">
                    <span class="meta-item">📍 ${product.origin}</span>
                    <span class="meta-item">📦 MOQ: ${product.moq}</span>
                </div>
                <p class="product-desc">${product.description}</p>
                <div class="product-actions">
                    <a href="product-detail.html?id=${product.id}" class="btn-view-details">View Details</a>
                    <button class="btn-request-quote" onclick="requestQuote('${product.name}')">Request Quote</button>
                </div>
            </div>
        </div>
    `).join('');
}

// Filter Products
function filterProducts() {
    let filtered = productsData;
    
    // Filter by category
    if (currentCategory !== 'all') {
        filtered = filtered.filter(p => p.category === currentCategory);
    }
    
    // Filter by search term
    if (searchTerm) {
        filtered = filtered.filter(p => 
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.origin.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }
    
    renderProducts(filtered);
}

// Category Filter Click
filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentCategory = btn.dataset.category;
        filterProducts();
    });
});

// Search Input
searchInput.addEventListener('input', (e) => {
    searchTerm = e.target.value;
    filterProducts();
});

// Request Quote Function
function requestQuote(productName) {
    alert(`Quote request for: ${productName}\n\nWe'll add a proper form modal next!`);
}

// Initial Render
renderProducts(productsData);
/**
 * Marketplace catalog and product details script (marketplace.js)
 */

document.addEventListener("DOMContentLoaded", () => {
    // Check if we are on the Products List Page
    if (document.getElementById("productsContainer")) {
        loadCategories();
        loadProducts();
        
        // Wire up filters
        const filterForm = document.getElementById("filterForm");
        if (filterForm) {
            filterForm.addEventListener("submit", (e) => {
                e.preventDefault();
                loadProducts();
            });
        }
        
        // Wire up search bar in catalog if present
        const searchForm = document.getElementById("searchFormCatalog");
        if (searchForm) {
            searchForm.addEventListener("submit", (e) => {
                e.preventDefault();
                loadSearch();
            });
        }
    }
    
    // Check if we are on the Product Details Page
    const detailsContainer = document.getElementById("productDetailsContainer");
    if (detailsContainer) {
        const productId = detailsContainer.dataset.productId;
        loadProductDetails(productId);
    }
});

// ----------------------------------------------------
// PRODUCT LIST PAGE FUNCTIONS
// ----------------------------------------------------

async function loadCategories() {
    try {
        const res = await fetch("/api/categories");
        if (res.status === 200) {
            const data = await res.json();
            const container = document.getElementById("categoriesContainer");
            if (!container) return;
            
            let html = `<a href="#" class="category-pill active" data-category="">All Categories</a>`;
            data.categories.forEach(cat => {
                html += `<a href="#" class="category-pill" data-category="${cat.categoryName}">${cat.categoryName}</a>`;
            });
            container.innerHTML = html;
            
            // Add click listeners to category pills
            const pills = container.querySelectorAll(".category-pill");
            pills.forEach(pill => {
                pill.addEventListener("click", (e) => {
                    e.preventDefault();
                    pills.forEach(p => p.classList.remove("active"));
                    pill.classList.add("active");
                    
                    // Trigger product load
                    loadProducts(pill.dataset.category);
                });
            });
        }
    } catch (err) {
        console.error("Error loading categories:", err);
    }
}

async function loadProducts(selectedCategory = "") {
    const container = document.getElementById("productsContainer");
    if (!container) return;
    
    container.innerHTML = `
        <div class="col-12 text-center my-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        </div>
    `;
    
    // Get filter inputs
    const minPrice = document.getElementById("minPrice") ? document.getElementById("minPrice").value : "";
    const maxPrice = document.getElementById("maxPrice") ? document.getElementById("maxPrice").value : "";
    const inStock = document.getElementById("inStock") ? document.getElementById("inStock").checked : false;
    
    // Determine Category: check if pill is active
    let category = selectedCategory;
    if (!category) {
        const activePill = document.querySelector(".category-pill.active");
        category = activePill ? activePill.dataset.category : "";
    }
    
    // Construct URL with filters
    let url = "/api/filter?";
    const params = new URLSearchParams();
    if (category) params.append("category", category);
    if (minPrice) params.append("minPrice", minPrice);
    if (maxPrice) params.append("maxPrice", maxPrice);
    if (inStock) params.append("inStock", "true");
    
    url += params.toString();
    
    try {
        const res = await fetch(url);
        if (res.status === 200) {
            const data = await res.json();
            renderProductCards(data.results, container);
        } else {
            container.innerHTML = `<div class="col-12 alert alert-danger">Failed to load products.</div>`;
        }
    } catch (err) {
        console.error("Error loading products:", err);
        container.innerHTML = `<div class="col-12 alert alert-danger">Error loading products.</div>`;
    }
}

async function loadSearch() {
    const container = document.getElementById("productsContainer");
    const searchVal = document.getElementById("searchInputCatalog").value.trim();
    if (!searchVal) {
        loadProducts();
        return;
    }
    
    container.innerHTML = `
        <div class="col-12 text-center my-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Searching...</span>
            </div>
        </div>
    `;
    
    try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchVal)}`);
        if (res.status === 200) {
            const data = await res.json();
            renderProductCards(data.results, container);
        } else {
            container.innerHTML = `<div class="col-12 alert alert-danger">Failed to complete search query.</div>`;
        }
    } catch (err) {
        container.innerHTML = `<div class="col-12 alert alert-danger">Error loading search.</div>`;
    }
}

function renderProductCards(products, container) {
    if (!products || products.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center my-5">
                <i class="bi bi-emoji-frown text-muted" style="font-size: 3rem;"></i>
                <p class="text-muted mt-3">No products found matching the criteria.</p>
            </div>
        `;
        return;
    }
    
    let html = "";
    products.forEach(prod => {
        const imgUrl = prod.image || "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=600";
        const stockBadge = prod.isAvailable 
            ? `<span class="badge bg-success-subtle text-success product-stock">In Stock (${prod.stock})</span>`
            : `<span class="badge bg-danger-subtle text-danger product-stock">Out of Stock</span>`;
            
        html += `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="custom-card">
                    <div class="card-img-wrapper">
                        <span class="card-tag">${prod.category}</span>
                        <img src="${imgUrl}" class="card-img-top" alt="${prod.productName}">
                    </div>
                    <div class="custom-card-body">
                        <a href="/product/${prod.id}" class="product-title">${prod.productName}</a>
                        <p class="product-desc">${prod.description}</p>
                        <div class="mt-auto">
                            <div class="d-flex justify-content-between align-items-center mb-3">
                                <span class="product-price">${formatCurrency(prod.price)}</span>
                                ${stockBadge}
                            </div>
                            <div class="d-grid">
                                <a href="/product/${prod.id}" class="btn btn-outline-primary btn-sm">
                                    <i class="bi bi-eye me-1"></i> View Details
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

// ----------------------------------------------------
// PRODUCT DETAIL PAGE FUNCTIONS
// ----------------------------------------------------

async function loadProductDetails(productId) {
    const container = document.getElementById("productDetailsContainer");
    if (!container) return;
    
    try {
        const res = await fetch(`/api/product/${productId}`);
        if (res.status === 200) {
            const data = await res.json();
            const prod = data.product;
            
            // Build carousel images (generate 2 additional placeholder variations for rich experience)
            const mainImg = prod.image || "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800";
            const img2 = "https://images.unsplash.com/photo-1506084868230-bb9d95c24759?auto=format&fit=crop&q=80&w=800";
            const img3 = "https://images.unsplash.com/photo-1488459718432-36fa55702a7b?auto=format&fit=crop&q=80&w=800";
            
            const carouselHtml = `
                <div id="productCarousel" class="carousel slide border-0 shadow-sm rounded-4 overflow-hidden" data-bs-ride="carousel">
                    <div class="carousel-indicators">
                        <button type="button" data-bs-target="#productCarousel" data-bs-slide-to="0" class="active" aria-current="true" aria-label="Slide 1"></button>
                        <button type="button" data-bs-target="#productCarousel" data-bs-slide-to="1" aria-label="Slide 2"></button>
                        <button type="button" data-bs-target="#productCarousel" data-bs-slide-to="2" aria-label="Slide 3"></button>
                    </div>
                    <div class="carousel-inner">
                        <div class="carousel-item active" style="padding-top: 75%; position: relative;">
                            <img src="${mainImg}" class="d-block w-100 position-absolute top-0 start-0 h-100 style-img" alt="Main product image">
                        </div>
                        <div class="carousel-item" style="padding-top: 75%; position: relative;">
                            <img src="${img2}" class="d-block w-100 position-absolute top-0 start-0 h-100 style-img" alt="Alternate image 1">
                        </div>
                        <div class="carousel-item" style="padding-top: 75%; position: relative;">
                            <img src="${img3}" class="d-block w-100 position-absolute top-0 start-0 h-100 style-img" alt="Alternate image 2">
                        </div>
                    </div>
                    <button class="carousel-control-prev" type="button" data-bs-target="#productCarousel" data-bs-slide="prev">
                        <span class="carousel-control-prev-icon" aria-hidden="true"></span>
                        <span class="visually-hidden">Previous</span>
                    </button>
                    <button class="carousel-control-next" type="button" data-bs-target="#productCarousel" data-bs-slide="next">
                        <span class="carousel-control-next-icon" aria-hidden="true"></span>
                        <span class="visually-hidden">Next</span>
                    </button>
                </div>
            `;
            
            const stockBadge = prod.isAvailable 
                ? `<span class="badge bg-success-subtle text-success py-2 px-3 fs-6 rounded-pill">In Stock (${prod.stock})</span>`
                : `<span class="badge bg-danger-subtle text-danger py-2 px-3 fs-6 rounded-pill">Out of Stock</span>`;
                
            const addControlsHtml = prod.isAvailable
                ? `
                    <div class="d-flex align-items-center gap-3 mb-4">
                        <div class="input-group" style="width: 130px;">
                            <button class="btn btn-outline-secondary" type="button" onclick="decrementDetailsQty()">-</button>
                            <input type="number" id="detailsQuantity" class="form-control text-center" value="1" min="1" max="${prod.stock}" readonly>
                            <button class="btn btn-outline-secondary" type="button" onclick="incrementDetailsQty(${prod.stock})">+</button>
                        </div>
                        <button class="btn btn-primary flex-grow-1" id="addToCartBtn">
                            <i class="bi bi-cart-plus me-2"></i> Add to Cart
                        </button>
                    </div>
                `
                : `
                    <div class="alert alert-warning mb-4">
                        <i class="bi bi-exclamation-triangle me-2"></i> This product is currently unavailable.
                    </div>
                `;
                
            // Render Review aggregates
            const reviewsCount = prod.reviews ? prod.reviews.length : 0;
            const avgRating = reviewsCount > 0 
                ? (prod.reviews.reduce((sum, r) => sum + r.rating, 0) / reviewsCount).toFixed(1) 
                : "No reviews";
            const starsHtml = renderStars(avgRating);
            
            // Render Reviews list
            let reviewsListHtml = "";
            if (reviewsCount > 0) {
                prod.reviews.forEach(rev => {
                    const revStars = renderStars(rev.rating);
                    reviewsListHtml += `
                        <div class="border-bottom pb-3 mb-3">
                            <div class="d-flex justify-content-between align-items-center mb-1">
                                <span class="fw-bold">${revStars}</span>
                                <small class="text-muted">${new Date(rev.createdAt).toLocaleDateString()}</small>
                            </div>
                            <p class="text-muted mb-0">${rev.review}</p>
                        </div>
                    `;
                });
            } else {
                reviewsListHtml = `<p class="text-muted">No reviews listed for this product yet.</p>`;
            }
            
            const detailHtml = `
                <div class="row">
                    <div class="col-lg-6 mb-4">
                        ${carouselHtml}
                    </div>
                    <div class="col-lg-6">
                        <nav aria-label="breadcrumb">
                            <ol class="breadcrumb">
                                <li class="breadcrumb-item"><a href="/">Home</a></li>
                                <li class="breadcrumb-item"><a href="/products">Products</a></li>
                                <li class="breadcrumb-item active" aria-current="page">${prod.category}</li>
                            </ol>
                        </nav>
                        <h1 class="display-6 fw-bold mb-2">${prod.productName}</h1>
                        <div class="d-flex align-items-center gap-3 mb-3">
                            <span class="fs-4 text-primary fw-bold">${formatCurrency(prod.price)}</span>
                            ${stockBadge}
                        </div>
                        <div class="d-flex align-items-center gap-2 mb-4">
                            <span class="text-warning">${starsHtml}</span>
                            <span class="text-muted">(${reviewsCount} reviews)</span>
                        </div>
                        <hr class="text-slate-200">
                        <p class="text-muted mb-4">${prod.description}</p>
                        
                        ${addControlsHtml}
                        
                        <div class="card bg-slate-100 border-0 rounded-3 mb-4">
                            <div class="card-body py-3 px-4">
                                <div class="d-flex align-items-center justify-content-between">
                                    <div class="d-flex align-items-center gap-2">
                                        <i class="bi bi-shop text-primary fs-5"></i>
                                        <span class="text-muted">Vendor ID:</span>
                                    </div>
                                    <span class="fw-semibold text-truncate ms-2" style="max-width: 150px;">${prod.vendorId}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="row mt-5">
                    <div class="col-lg-8">
                        <div class="card border-0 shadow-sm rounded-4 p-4 mb-4">
                            <h3 class="fw-bold mb-4">Customer Reviews</h3>
                            ${reviewsListHtml}
                        </div>
                        
                        <!-- Review form -->
                        <div class="card border-0 shadow-sm rounded-4 p-4">
                            <h4 class="fw-bold mb-3">Write a Review</h4>
                            <form id="reviewForm">
                                <div class="mb-3">
                                    <label class="form-label">Rating</label>
                                    <select class="form-select" id="reviewRating" required>
                                        <option value="5">5 Stars</option>
                                        <option value="4">4 Stars</option>
                                        <option value="3">3 Stars</option>
                                        <option value="2">2 Stars</option>
                                        <option value="1">1 Star</option>
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Review text</label>
                                    <textarea class="form-control" id="reviewText" rows="3" placeholder="Share your experience..." required></textarea>
                                </div>
                                <button type="submit" class="btn btn-outline-primary">Submit Review</button>
                            </form>
                        </div>
                    </div>
                </div>
            `;
            
            container.innerHTML = detailHtml;
            
            // Wire up add to cart listener
            const btnAdd = document.getElementById("addToCartBtn");
            if (btnAdd) {
                btnAdd.addEventListener("click", async () => {
                    const quantity = parseInt(document.getElementById("detailsQuantity").value);
                    await addToCart(productId, quantity);
                });
            }
            
            // Wire up review form submit
            const reviewForm = document.getElementById("reviewForm");
            if (reviewForm) {
                reviewForm.addEventListener("submit", async (e) => {
                    e.preventDefault();
                    await submitReview(productId);
                });
            }
        } else {
            container.innerHTML = `<div class="alert alert-danger">Product details failed to load.</div>`;
        }
    } catch (err) {
        console.error("Error loading product detail info:", err);
        container.innerHTML = `<div class="alert alert-danger">Error loading product details.</div>`;
    }
}

// Helpers for detail qty modifications
window.incrementDetailsQty = function(maxStock) {
    const input = document.getElementById("detailsQuantity");
    if (!input) return;
    let val = parseInt(input.value);
    if (val < maxStock) {
        input.value = val + 1;
    }
};

window.decrementDetailsQty = function() {
    const input = document.getElementById("detailsQuantity");
    if (!input) return;
    let val = parseInt(input.value);
    if (val > 1) {
        input.value = val - 1;
    }
};

function renderStars(ratingVal) {
    let rating = parseFloat(ratingVal);
    if (isNaN(rating)) return "No reviews";
    
    let html = "";
    for (let i = 1; i <= 5; i++) {
        if (rating >= i) {
            html += `<i class="bi bi-star-fill text-warning"></i>`;
        } else if (rating >= i - 0.5) {
            html += `<i class="bi bi-star-half text-warning"></i>`;
        } else {
            html += `<i class="bi bi-star text-warning"></i>`;
        }
    }
    return html;
}

// Add item to cart API call
async function addToCart(productId, quantity) {
    try {
        const res = await fetch(`/api/cart/add/${productId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ quantity })
        });
        
        const data = await res.json();
        if (res.status === 200) {
            showToast("Added to Cart successfully!", "success");
            updateNavbar();
        } else {
            showToast(data.error || "Must login to manage cart.", "warning");
        }
    } catch (err) {
        console.error("Error adding to cart:", err);
        showToast("Error adding product to cart.", "danger");
    }
}

// Submit a review
async function submitReview(productId) {
    const rating = parseInt(document.getElementById("reviewRating").value);
    const review = document.getElementById("reviewText").value.trim();
    
    try {
        const res = await fetch(`/api/product/${productId}/review`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rating, review })
        });
        
        const data = await res.json();
        if (res.status === 201) {
            showToast("Review submitted successfully!", "success");
            loadProductDetails(productId); // Reload details
        } else {
            showToast(data.error || "Must be logged in to leave a review.", "warning");
        }
    } catch (err) {
        console.error("Error writing review:", err);
        showToast("Error submitting review.", "danger");
    }
}

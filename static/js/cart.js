/**
 * Cart management, checkout, and order history script (cart.js)
 */

document.addEventListener("DOMContentLoaded", () => {
    // 1. Cart Page
    const cartContainer = document.getElementById("cartContainer");
    if (cartContainer && cartContainer.dataset.ssr !== "true") {
        loadCartDetails();
    }
    
    // 2. Checkout Page
    const checkoutSummary = document.getElementById("checkoutSummary");
    if (checkoutSummary && checkoutSummary.dataset.ssr !== "true") {
        loadCheckoutSummary();
    }
    
    const checkoutForm = document.getElementById("checkoutForm");
    if (checkoutForm) {
        checkoutForm.addEventListener("submit", handleCheckoutSubmit);
    }
    
    // 3. Orders Page
    const ordersContainer = document.getElementById("ordersContainer");
    if (ordersContainer && ordersContainer.dataset.ssr !== "true") {
        loadOrderHistory();
    }
    
    // 4. Profile Page
    const profileContainer = document.getElementById("profileContainer");
    if (profileContainer && profileContainer.dataset.ssr !== "true") {
        loadUserProfile();
    }
});

// ----------------------------------------------------
// CART MANAGEMENT PAGE
// ----------------------------------------------------

async function loadCartDetails() {
    const container = document.getElementById("cartContainer");
    if (!container) return;
    
    try {
        const res = await fetch("/api/cart");
        if (res.status === 200) {
            const data = await res.json();
            const items = data.cart.items;
            
            if (!items || items.length === 0) {
                renderEmptyCart(container);
                return;
            }
            
            let html = `
                <div class="row">
                    <div class="col-lg-8 mb-4">
                        <div class="card border-0 shadow-sm rounded-4 p-4">
                            <h3 class="fw-bold mb-4">Your Shopping Cart</h3>
                            <div class="table-responsive">
                                <table class="table align-middle">
                                    <thead>
                                        <tr class="text-muted">
                                            <th scope="col">Product</th>
                                            <th scope="col" class="text-center">Price</th>
                                            <th scope="col" class="text-center">Quantity</th>
                                            <th scope="col" class="text-end">Subtotal</th>
                                            <th scope="col"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
            `;
            
            items.forEach(item => {
                const img = item.image || "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=100";
                html += `
                    <tr>
                        <td>
                            <div class="d-flex align-items-center gap-3">
                                <img src="${img}" alt="${item.productName}" class="rounded-3" style="width: 60px; height: 60px; object-fit: cover;">
                                <div>
                                    <h6 class="mb-0 fw-semibold"><a href="/product/${item.productId}" class="text-dark text-decoration-none">${item.productName}</a></h6>
                                    <small class="text-muted">${item.isAvailable ? "In Stock" : "Unavailable"}</small>
                                </div>
                            </div>
                        </td>
                        <td class="text-center fw-semibold">${formatCurrency(item.price)}</td>
                        <td class="text-center">
                            <div class="input-group input-group-sm mx-auto" style="width: 100px;">
                                <button class="btn btn-outline-secondary" type="button" onclick="changeQuantity('${item.productId}', ${item.quantity - 1})">-</button>
                                <input type="text" class="form-control text-center bg-white" value="${item.quantity}" readonly>
                                <button class="btn btn-outline-secondary" type="button" onclick="changeQuantity('${item.productId}', ${item.quantity + 1}, ${item.stockAvailable})">+</button>
                            </div>
                        </td>
                        <td class="text-end fw-bold text-primary">${formatCurrency(item.subtotal)}</td>
                        <td class="text-end">
                            <button class="btn btn-link text-danger p-0" onclick="removeCartItem('${item.productId}')">
                                <i class="bi bi-trash fs-5"></i>
                            </button>
                        </td>
                    </tr>
                `;
            });
            
            html += `
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-lg-4">
                        <div class="card border-0 shadow-sm rounded-4 p-4">
                            <h4 class="fw-bold mb-4">Summary</h4>
                            <div class="d-flex justify-content-between mb-3 text-muted">
                                <span>Items Subtotal</span>
                                <span>${formatCurrency(data.cart.totalPrice)}</span>
                            </div>
                            <div class="d-flex justify-content-between mb-3 text-muted">
                                <span>Estimated Shipping</span>
                                <span class="text-success">Calculated next</span>
                            </div>
                            <hr class="text-slate-200">
                            <div class="d-flex justify-content-between align-items-center mb-4">
                                <span class="fw-bold fs-5">Total Price</span>
                                <span class="fw-bold fs-4 text-primary">${formatCurrency(data.cart.totalPrice)}</span>
                            </div>
                            <div class="d-grid">
                                <a href="/checkout" class="btn btn-primary py-3 rounded-3 fw-semibold">
                                    Proceed to Checkout
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            container.innerHTML = html;
        } else {
            container.innerHTML = `<div class="alert alert-danger">Must login to view shopping cart.</div>`;
        }
    } catch (err) {
        console.error("Error fetching cart details:", err);
    }
}

function renderEmptyCart(container) {
    container.innerHTML = `
        <div class="text-center py-5 my-5">
            <i class="bi bi-cart-x text-muted" style="font-size: 4rem;"></i>
            <h3 class="fw-bold mt-4">Your Cart is Empty</h3>
            <p class="text-muted mb-4">Looks like you haven't added anything to your cart yet.</p>
            <a href="/products" class="btn btn-primary px-4 py-2">Start Shopping</a>
        </div>
    `;
}

window.changeQuantity = async function(productId, quantity, maxStock = 9999) {
    if (quantity < 0) return;
    if (quantity > maxStock) {
        showToast(`Cannot set. Exceeds available stock (${maxStock}).`, "warning");
        return;
    }
    
    try {
        const res = await fetch("/api/cart/update", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productId, quantity })
        });
        
        if (res.status === 200) {
            loadCartDetails();
            updateNavbar();
        } else {
            const data = await res.json();
            showToast(data.error || "Failed to update quantity.", "danger");
        }
    } catch (err) {
        console.error("Error updating cart quantity:", err);
    }
};

window.removeCartItem = async function(productId) {
    try {
        const res = await fetch(`/api/cart/remove/${productId}`, {
            method: "DELETE"
        });
        
        if (res.status === 200) {
            showToast("Item removed from cart.", "success");
            loadCartDetails();
            updateNavbar();
        } else {
            showToast("Failed to remove item.", "danger");
        }
    } catch (err) {
        console.error("Error deleting cart item:", err);
    }
};

// ----------------------------------------------------
// CHECKOUT PAGE FUNCTIONS
// ----------------------------------------------------

async function loadCheckoutSummary() {
    const summaryContainer = document.getElementById("checkoutSummary");
    if (!summaryContainer) return;
    
    try {
        const res = await fetch("/api/cart");
        if (res.status === 200) {
            const data = await res.json();
            const items = data.cart.items;
            
            if (!items || items.length === 0) {
                window.location.href = "/cart";
                return;
            }
            
            // Build item list
            let html = `<ul class="list-group list-group-flush mb-4">`;
            items.forEach(item => {
                html += `
                    <li class="list-group-item d-flex justify-content-between align-items-center bg-transparent py-3 border-0 px-0">
                        <div>
                            <h6 class="mb-0 fw-semibold">${item.productName}</h6>
                            <small class="text-muted">Quantity: ${item.quantity}</small>
                        </div>
                        <span class="fw-bold">${formatCurrency(item.subtotal)}</span>
                    </li>
                `;
            });
            
            // Flat flat flat fee
            const shippingVal = 5.00;
            const finalTotal = data.cart.totalPrice + shippingVal;
            
            html += `
                </ul>
                <div class="d-flex justify-content-between mb-2 text-muted px-0">
                    <span>Subtotal</span>
                    <span class="fw-semibold">${formatCurrency(data.cart.totalPrice)}</span>
                </div>
                <div class="d-flex justify-content-between mb-2 text-muted px-0">
                    <span>Shipping fee</span>
                    <span class="fw-semibold text-success">${formatCurrency(shippingVal)}</span>
                </div>
                <hr class="text-slate-200">
                <div class="d-flex justify-content-between align-items-center mb-0 px-0">
                    <span class="fw-bold fs-5">Final Total</span>
                    <span class="fw-bold fs-4 text-primary">${formatCurrency(finalTotal)}</span>
                </div>
            `;
            
            summaryContainer.innerHTML = html;
            
            // Fill shipping address by default if profile is available
            const profileRes = await fetch("/api/profile");
            if (profileRes.status === 200) {
                const profileData = await profileRes.json();
                const addrInput = document.getElementById("shippingAddress");
                if (addrInput && profileData.user.address) {
                    addrInput.value = profileData.user.address;
                }
            }
        }
    } catch (err) {
        console.error("Error loading checkout details:", err);
    }
}

async function handleCheckoutSubmit(e) {
    e.preventDefault();
    
    const shippingAddress = document.getElementById("shippingAddress").value.trim();
    const paymentMethod = document.getElementById("paymentMethod").value;
    
    if (!shippingAddress) {
        showToast("Shipping address is required.", "warning");
        return;
    }
    
    try {
        const res = await fetch("/api/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ shippingAddress, paymentMethod })
        });
        
        const data = await res.json();
        if (res.status === 201) {
            showToast("Order placed successfully!", "success");
            updateNavbar();
            setTimeout(() => {
                window.location.href = "/orders";
            }, 1200);
        } else {
            showToast(data.error || "Checkout failed.", "danger");
        }
    } catch (err) {
        console.error("Checkout process Error:", err);
        showToast("Error during checkout. Please try again.", "danger");
    }
}

// ----------------------------------------------------
// ORDER HISTORY FUNCTIONS
// ----------------------------------------------------

async function loadOrderHistory() {
    const container = document.getElementById("ordersContainer");
    if (!container) return;
    
    try {
        const res = await fetch("/api/orders");
        if (res.status === 200) {
            const data = await res.json();
            const orders = data.orders;
            
            if (!orders || orders.length === 0) {
                container.innerHTML = `
                    <div class="text-center py-5">
                        <i class="bi bi-bag-x text-muted" style="font-size: 3.5rem;"></i>
                        <h4 class="fw-bold mt-3">No orders found</h4>
                        <p class="text-muted">You haven't placed any orders yet.</p>
                        <a href="/products" class="btn btn-outline-primary mt-2">Go Browse Catalog</a>
                    </div>
                `;
                return;
            }
            
            let html = "";
            orders.forEach(order => {
                let badgeClass = "badge-pending";
                const status = order.orderStatus;
                
                if (status === "Confirmed") badgeClass = "badge-confirmed";
                if (status === "Packed") badgeClass = "badge-packed";
                if (status === "Out For Delivery") badgeClass = "badge-delivering";
                if (status === "Delivered") badgeClass = "badge-delivered";
                if (status === "Cancelled") badgeClass = "badge-cancelled";
                
                let itemsList = "";
                order.items.forEach(item => {
                    itemsList += `
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <span>${item.productName} (x${item.quantity})</span>
                            <span class="text-muted">${formatCurrency(item.price * item.quantity)}</span>
                        </div>
                    `;
                });
                
                html += `
                    <div class="card border-0 shadow-sm rounded-4 p-4 mb-4">
                        <div class="d-flex flex-wrap justify-content-between align-items-center border-bottom pb-3 mb-3 gap-2">
                            <div>
                                <span class="fw-bold text-dark fs-5">${order.orderNumber}</span>
                                <div class="text-muted fs-7 mt-1">${new Date(order.createdAt).toLocaleDateString()}</div>
                            </div>
                            <span class="badge-order ${badgeClass}">${order.orderStatus}</span>
                        </div>
                        
                        <div class="py-2 border-bottom mb-3">
                            ${itemsList}
                        </div>
                        
                        <div class="row pt-2 text-muted fs-7">
                            <div class="col-md-6 mb-2 mb-md-0">
                                <strong>Payment Method:</strong> ${order.paymentMethod} (${order.paymentStatus})<br>
                                <strong>Shipping Address:</strong> ${order.shippingAddress}
                            </div>
                            <div class="col-md-6 text-md-end">
                                <div class="fs-6 text-dark mb-1">Subtotal: ${formatCurrency(order.subtotal)}</div>
                                <div class="fs-7 text-muted mb-2">Delivery charge: ${formatCurrency(order.deliveryCharge)}</div>
                                <div class="fs-5 fw-bold text-primary">Total Paid: ${formatCurrency(order.totalAmount)}</div>
                            </div>
                        </div>
                    </div>
                `;
            });
            container.innerHTML = html;
        } else {
            container.innerHTML = `<div class="alert alert-danger">Login to access order history.</div>`;
        }
    } catch (err) {
        console.error("Error loading order list:", err);
    }
}

// ----------------------------------------------------
// USER PROFILE PAGE FUNCTIONS
// ----------------------------------------------------

async function loadUserProfile() {
    const container = document.getElementById("profileContainer");
    if (!container) return;
    
    try {
        const res = await fetch("/api/profile");
        if (res.status === 200) {
            const data = await res.json();
            const user = data.user;
            
            const html = `
                <div class="row justify-content-center">
                    <div class="col-md-8">
                        <div class="card border-0 shadow-sm rounded-4 p-4 p-md-5">
                            <div class="text-center mb-5">
                                <div class="bg-primary text-white d-inline-flex align-items-center justify-content-center rounded-circle mb-3" style="width: 90px; height: 90px;">
                                    <span class="fs-1 fw-bold">${user.fullName.charAt(0).toUpperCase()}</span>
                                </div>
                                <h3 class="fw-bold mb-1">${user.fullName}</h3>
                                <span class="badge bg-primary-subtle text-primary py-2 px-3 rounded-pill">${user.role.toUpperCase()}</span>
                            </div>
                            
                            <div class="row g-4 text-start">
                                <div class="col-sm-6">
                                    <label class="text-muted d-block fs-7 mb-1">Email Address</label>
                                    <div class="fw-semibold border-bottom pb-2">${user.email}</div>
                                </div>
                                <div class="col-sm-6">
                                    <label class="text-muted d-block fs-7 mb-1">Phone Number</label>
                                    <div class="fw-semibold border-bottom pb-2">${user.phone}</div>
                                </div>
                                <div class="col-12 mt-4">
                                    <label class="text-muted d-block fs-7 mb-1">Registered Address</label>
                                    <div class="fw-semibold border-bottom pb-2">${user.address}</div>
                                </div>
                                <div class="col-12 mt-4">
                                    <label class="text-muted d-block fs-7 mb-1">Account Status</label>
                                    <div class="fw-semibold text-success"><i class="bi bi-check-circle-fill me-1"></i> Active</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            container.innerHTML = html;
        } else {
            container.innerHTML = `<div class="alert alert-danger">Login to access profile details.</div>`;
        }
    } catch (err) {
        console.error("Error loading user profile detail:", err);
    }
}

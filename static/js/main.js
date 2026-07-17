/**
 * Global main.js file
 * Handles session verification, toast alerts, and header updates.
 */

// Global state
let currentUser = null;

// Programmatically show toast notifications
function showToast(message, type = "primary") {
    const container = document.getElementById("toastContainer");
    if (!container) return;

    // Determine colors
    let bgClass = "bg-primary";
    if (type === "success") bgClass = "bg-success";
    if (type === "danger" || type === "error") bgClass = "bg-danger";
    if (type === "warning") bgClass = "bg-warning";

    const toastId = "toast_" + Date.now();
    const toastHtml = `
        <div id="${toastId}" class="toast custom-toast border-0 align-items-center ${bgClass} text-white" role="alert" aria-live="assertive" aria-atomic="true" data-bs-delay="4000">
            <div class="d-flex">
                <div class="toast-body">
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        </div>
    `;

    container.insertAdjacentHTML("beforeend", toastHtml);
    const toastEl = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastEl);
    toast.show();

    // Clean up from DOM when hidden
    toastEl.addEventListener("hidden.bs.toast", () => {
        toastEl.remove();
    });
}

// Format prices nicely
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR'
    }).format(amount);
}

// Fetch user profile and update navbar
async function updateNavbar() {
    try {
        const res = await fetch("/api/profile");
        const navAuthSection = document.getElementById("navAuthSection");
        const cartBadge = document.getElementById("cartBadge");

        if (res.status === 200) {
            const data = await res.get_json ? await res.get_json() : await res.json();
            currentUser = data.user;

            if (navAuthSection) {
                navAuthSection.innerHTML = `
                    <li class="nav-item dropdown">
                        <a class="nav-link dropdown-toggle d-flex align-items-center gap-1" href="#" id="profileDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                            <i class="bi bi-person-circle"></i>
                            <span>${currentUser.fullName}</span>
                        </a>
                        <ul class="dropdown-menu dropdown-menu-end border-0 shadow" aria-labelledby="profileDropdown">
                            <li><a class="dropdown-item" href="/profile"><i class="bi bi-person me-2"></i>Profile</a></li>
                            <li><a class="dropdown-item" href="/orders"><i class="bi bi-bag me-2"></i>My Orders</a></li>
                            <li><hr class="dropdown-divider"></li>
                            <li><a class="dropdown-item text-danger" href="#" id="logoutBtn"><i class="bi bi-box-arrow-right me-2"></i>Logout</a></li>
                        </ul>
                    </li>
                `;
                
                // Add logout click listener
                document.getElementById("logoutBtn").addEventListener("click", async (e) => {
                    e.preventDefault();
                    await logoutUser();
                });
            }

            // If customer, fetch cart item counts
            if (currentUser.role === "customer" && cartBadge) {
                const cartRes = await fetch("/api/cart");
                if (cartRes.status === 200) {
                    const cartData = await cartRes.json();
                    const count = cartData.cart.items.reduce((sum, item) => sum + item.quantity, 0);
                    if (count > 0) {
                        cartBadge.textContent = count;
                        cartBadge.classList.remove("d-none");
                    } else {
                        cartBadge.classList.add("d-none");
                    }
                }
            }
        } else {
            currentUser = null;
            if (navAuthSection) {
                navAuthSection.innerHTML = `
                    <li class="nav-item">
                        <a class="nav-link" href="/login">Login</a>
                    </li>
                    <li class="nav-item">
                        <a class="btn btn-primary ms-2" href="/register">Register</a>
                    </li>
                `;
            }
            if (cartBadge) cartBadge.classList.add("d-none");
        }
    } catch (err) {
        console.error("Error loading navbar state:", err);
    }
}

// Perform logout
async function logoutUser() {
    try {
        const res = await fetch("/api/logout", { method: "POST" });
        if (res.status === 200) {
            showToast("Logged out successfully.", "success");
            setTimeout(() => {
                window.location.href = "/";
            }, 1000);
        } else {
            showToast("Logout failed.", "danger");
        }
    } catch (err) {
        showToast("Error during logout.", "danger");
    }
}

// Initialize on page load
document.addEventListener("DOMContentLoaded", () => {
    updateNavbar();
});

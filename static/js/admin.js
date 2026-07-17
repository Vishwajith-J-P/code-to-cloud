/**
 * Hyperlocal Marketplace Admin Dashboard Javascript Control Script (admin.js)
 */

// Global State
let allCategories = [];
let charts = {};

// Helper: Show custom toasts
function showToast(message, type = "success") {
    const container = document.getElementById("toastContainer");
    if (!container) return;
    const bgClass = type === "success" ? "bg-success" : (type === "warning" ? "bg-warning" : "bg-danger");
    const toastId = "toast_" + Date.now();
    const html = `
        <div id="${toastId}" class="toast align-items-center ${bgClass} text-white border-0" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        </div>
    `;
    container.insertAdjacentHTML("beforeend", html);
    const el = document.getElementById(toastId);
    const toast = new bootstrap.Toast(el, { delay: 3000 });
    toast.show();
    el.addEventListener("hidden.bs.toast", () => el.remove());
}

// Helper: Format Currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR'
    }).format(amount);
}

// Helper: Format Date
function formatDate(dateStr) {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// Load General Dashboard Metrics and Charts
async function loadAdminDashboard(options = { limit: 5 }) {
    try {
        const res = await fetch("/admin/analytics");
        if (res.status !== 200) return;
        const data = await res.json();
        const dbStats = data.dashboard;

        // Populate Summary Cards
        const el = (id) => document.getElementById(id);
        if (el("statCustomers")) el("statCustomers").textContent = dbStats.totalCustomers;
        if (el("statVendors"))   el("statVendors").textContent   = dbStats.totalVendors;
        if (el("statProducts")) el("statProducts").textContent  = dbStats.totalProducts;
        if (el("statOrders"))   el("statOrders").textContent    = dbStats.totalOrders;
        if (el("statRevenue"))  el("statRevenue").textContent   = formatCurrency(dbStats.revenue);

        // Render Charts
        renderMonthlyRevenueChart(dbStats.monthlyRevenue || []);
        renderProductCategoriesChart(dbStats.productCategories || []);
        renderDailyOrdersChart(dbStats.dailyOrders || []);
        renderUserGrowthChart(dbStats.userGrowth || []);
        renderAdminOrderStatusChart(dbStats.orderStatus || []);

        // Load recent tables on dashboard if not pre-rendered
        const dbTable = document.getElementById("dashboardUsersTable");
        if (!dbTable || dbTable.dataset.ssr !== "true") {
            loadDashboardTables(options.limit);
        }
        
        // Sync button listener
        const syncBtn = document.getElementById("refreshStatsBtn");
        if (syncBtn) {
            syncBtn.onclick = () => {
                showToast("Synchronizing dashboard details...", "success");
                loadAdminDashboard(options);
            };
        }
    } catch (err) {
        console.error("Dashboard statistics loading failed:", err);
    }
}

// Render Monthly Revenue Chart (Bar/Line Chart)
function renderMonthlyRevenueChart(data) {
    const ctx = document.getElementById("monthlyRevenueChart");
    if (!ctx) return;
    
    if (charts.monthly) charts.monthly.destroy();
    
    // Sort chronological or keep backend sort
    const labels = data.map(d => d.label);
    const values = data.map(d => d.value);
    
    charts.monthly = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels.length ? labels : ["No Data"],
            datasets: [{
                label: 'Revenue ($)',
                data: values.length ? values : [0],
                backgroundColor: 'rgba(79, 70, 229, 0.85)',
                borderColor: '#4f46e5',
                borderWidth: 1,
                borderRadius: 8,
                barThickness: 28
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: '#f1f5f9' },
                    ticks: { callback: value => '$' + value }
                },
                x: { grid: { display: false } }
            }
        }
    });
}

// Render Product Categories Chart (Doughnut Chart)
function renderProductCategoriesChart(data) {
    const ctx = document.getElementById("productCategoriesChart");
    if (!ctx) return;
    
    if (charts.categories) charts.categories.destroy();
    
    const labels = data.map(d => d.category);
    const values = data.map(d => d.count);
    
    const colorPalette = ['#4f46e5', '#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#06b6d4', '#6366f1'];
    
    charts.categories = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels.length ? labels : ["Empty"],
            datasets: [{
                data: values.length ? values : [1],
                backgroundColor: colorPalette.slice(0, Math.max(labels.length, 1)),
                hoverOffset: 4,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { boxWidth: 12, font: { family: 'Plus Jakarta Sans', size: 11 } } }
            },
            cutout: '65%'
        }
    });
}

// Render Daily Orders Chart (Line Chart)
function renderDailyOrdersChart(data) {
    const ctx = document.getElementById("dailyOrdersChart");
    if (!ctx) return;
    
    if (charts.daily) charts.daily.destroy();
    
    const labels = data.map(d => formatDate(d.date));
    const values = data.map(d => d.count);
    
    charts.daily = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels.length ? labels : ["No Transactions"],
            datasets: [{
                label: 'Receipt Volume',
                data: values.length ? values : [0],
                fill: true,
                backgroundColor: 'rgba(79, 70, 229, 0.05)',
                borderColor: '#4f46e5',
                borderWidth: 2.5,
                tension: 0.3,
                pointBackgroundColor: '#4f46e5',
                pointRadius: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: '#f1f5f9' },
                    ticks: { stepSize: 1 }
                },
                x: { grid: { display: false } }
            }
        }
    });
}

// Render User Growth Chart (Line Chart - monthly registered users)
function renderUserGrowthChart(data) {
    const ctx = document.getElementById("userGrowthChart");
    if (!ctx) return;

    if (charts.userGrowth) charts.userGrowth.destroy();

    const labels = data.map(d => d.label);
    const values = data.map(d => d.value);

    charts.userGrowth = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels.length ? labels : ["No Data"],
            datasets: [{
                label: 'New Users',
                data: values.length ? values : [0],
                fill: true,
                backgroundColor: 'rgba(16, 185, 129, 0.08)',
                borderColor: '#10b981',
                borderWidth: 2.5,
                tension: 0.4,
                pointBackgroundColor: '#10b981',
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: ctx => `${ctx.parsed.y} new users`
                    }
                }
            },
            scales: {
                y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { stepSize: 1 } },
                x: { grid: { display: false } }
            }
        }
    });
}

// Render Admin Order Status Distribution (Doughnut)
function renderAdminOrderStatusChart(data) {
    const ctx = document.getElementById("adminOrderStatusChart");
    if (!ctx) return;

    if (charts.adminOrderStatus) charts.adminOrderStatus.destroy();

    const labels = data.map(d => d.status);
    const values = data.map(d => d.count);
    const statusColors = {
        'Pending':          '#f59e0b',
        'Confirmed':        '#3b82f6',
        'Packed':           '#8b5cf6',
        'Out For Delivery': '#06b6d4',
        'Delivered':        '#10b981',
        'Cancelled':        '#ef4444'
    };
    const bgColors = labels.map(l => statusColors[l] || '#94a3b8');

    charts.adminOrderStatus = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels.length ? labels : ["No Orders"],
            datasets: [{
                data: values.length ? values : [1],
                backgroundColor: bgColors,
                hoverOffset: 4,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } }
            },
            cutout: '60%'
        }
    });
}

// Load Tables on main dashboard (limit: 5)
async function loadDashboardTables(limit = 5) {
    try {
        // 1. Load users
        const uRes = await fetch("/api/admin/users");
        if (uRes.status === 200) {
            const uData = await uRes.json();
            renderUserRows(uData.customers.slice(0, limit), "dashboardUsersTable tbody");
        }
        
        // 2. Load vendors
        const vRes = await fetch("/api/admin/vendors");
        if (vRes.status === 200) {
            const vData = await vRes.json();
            renderVendorRows(vData.vendors.slice(0, limit), "dashboardVendorsTable tbody");
        }

        // 3. Load products
        const pRes = await fetch("/api/admin/products");
        if (pRes.status === 200) {
            const pData = await pRes.json();
            renderProductRows(pData.products.slice(0, limit), "dashboardProductsTable tbody");
        }

        // 4. Load orders
        const oRes = await fetch("/api/admin/orders");
        if (oRes.status === 200) {
            const oData = await oRes.json();
            renderOrderRows(oData.orders.slice(0, limit), "dashboardOrdersTable tbody");
        }
    } catch (err) {
        console.error("Dashboard sample lists rendering failed:", err);
    }
}

// ----------------------------------------------------
// USER/CUSTOMER RENDER & ACTIONS
// ----------------------------------------------------
function renderUserRows(users, containerId) {
    const tbody = document.querySelector("#" + containerId);
    if (!tbody) return;
    
    if (!users.length) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">No customers found.</td></tr>`;
        return;
    }
    
    tbody.innerHTML = users.map(user => {
        const badgeClass = user.isActive ? "bg-success-subtle text-success" : "bg-danger-subtle text-danger";
        return `
            <tr>
                <td>
                    <div class="fw-semibold">${user.fullName}</div>
                </td>
                <td>${user.email}</td>
                <td>
                    <span class="badge ${badgeClass}">${user.isActive ? 'Active' : 'Deactivated'}</span>
                </td>
                <td>
                    <div class="d-flex gap-2">
                        <button class="btn btn-sm btn-outline-secondary" onclick="viewCustomer('${user.id}')"><i class="bi bi-eye"></i></button>
                        <button class="btn btn-sm btn-outline-primary" onclick="editCustomer('${user.id}')"><i class="bi bi-pencil"></i></button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteCustomer('${user.id}')"><i class="bi bi-trash"></i></button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");
}

async function viewCustomer(id) {
    try {
        const res = await fetch("/api/admin/users");
        const data = await res.json();
        const cust = data.customers.find(u => u.id === id);
        if (!cust) return;
        
        document.getElementById("customerViewBody").innerHTML = `
            <div class="text-center mb-3">
                <div class="bg-primary text-white rounded-circle d-inline-flex align-items-center justify-content-center fw-bold fs-3" style="width: 60px; height: 60px;">
                    ${cust.fullName[0].toUpperCase()}
                </div>
            </div>
            <table class="table table-sm table-borderless">
                <tr><th>Full Name:</th><td>${cust.fullName}</td></tr>
                <tr><th>Email:</th><td>${cust.email}</td></tr>
                <tr><th>Phone:</th><td>${cust.phone || 'N/A'}</td></tr>
                <tr><th>Address:</th><td>${cust.address || 'N/A'}</td></tr>
                <tr><th>Joined:</th><td>${formatDate(cust.createdAt)}</td></tr>
                <tr><th>Status:</th><td><span class="badge ${cust.isActive ? 'bg-success' : 'bg-danger'}">${cust.isActive ? 'Active' : 'Deactivated'}</span></td></tr>
            </table>
        `;
        const modal = new bootstrap.Modal(document.getElementById("customerViewModal"));
        modal.show();
    } catch (err) {
        showToast("Could not load customer information.", "danger");
    }
}

async function editCustomer(id) {
    try {
        const res = await fetch("/api/admin/users");
        const data = await res.json();
        const cust = data.customers.find(u => u.id === id);
        if (!cust) return;
        
        document.getElementById("editCustId").value = cust.id;
        document.getElementById("editCustName").value = cust.fullName;
        document.getElementById("editCustEmail").value = cust.email;
        document.getElementById("editCustPhone").value = cust.phone || "";
        document.getElementById("editCustAddress").value = cust.address || "";
        document.getElementById("editCustActive").checked = cust.isActive;
        
        const modal = new bootstrap.Modal(document.getElementById("customerEditModal"));
        modal.show();
    } catch (err) {
        showToast("Could not pre-populate customer edit form.", "danger");
    }
}

// Setup Customer Edit Form Handler
const custForm = document.getElementById("customerEditForm");
if (custForm) {
    custForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const id = document.getElementById("editCustId").value;
        const fullName = document.getElementById("editCustName").value.trim();
        const email = document.getElementById("editCustEmail").value.trim();
        const phone = document.getElementById("editCustPhone").value.trim();
        const address = document.getElementById("editCustAddress").value.trim();
        const isActive = document.getElementById("editCustActive").checked;
        
        try {
            const res = await fetch(`/api/admin/user/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fullName, email, phone, address, isActive })
            });
            const data = await res.json();
            if (res.status === 200) {
                showToast("Customer profile updated successfully.", "success");
                bootstrap.Modal.getInstance(document.getElementById("customerEditModal")).hide();
                // Reload tables/lists
                if (document.getElementById("customersPageTable")) {
                    loadCustomersPage();
                } else {
                    loadDashboardTables(5);
                }
            } else {
                showToast(data.error || "Update failed.", "danger");
            }
        } catch (err) {
            showToast("Network error. Please try again.", "danger");
        }
    });
}

function deleteCustomer(id) {
    if (!confirm("Are you sure you want to permanently delete this customer account? This will also delete their active shopping carts.")) return;
    
    fetch(`/api/admin/user/${id}`, { method: "DELETE" })
        .then(res => res.json().then(data => ({ status: res.status, data })))
        .then(({ status, data }) => {
            if (status === 200) {
                showToast("Customer deleted successfully.", "success");
                if (document.getElementById("customersPageTable")) {
                    loadCustomersPage();
                } else {
                    loadDashboardTables(5);
                }
            } else {
                showToast(data.error || "Deletion failed.", "danger");
            }
        })
        .catch(() => showToast("Error during deletion.", "danger"));
}

async function loadCustomersPage() {
    const table = document.getElementById("customersPageTable");
    if (table) {
        if (table.dataset.loaded === "true") {
            window.location.reload();
        } else {
            table.dataset.loaded = "true";
        }
        return;
    }
    try {
        const res = await fetch("/api/admin/users");
        if (res.status !== 200) return;
        const data = await res.json();
        
        let users = data.customers;
        
        // Setup Search Listener
        const searchInput = document.getElementById("customerSearchInput");
        if (searchInput) {
            searchInput.oninput = (e) => {
                const query = e.target.value.toLowerCase().trim();
                const filtered = users.filter(u => u.fullName.toLowerCase().includes(query) || u.email.toLowerCase().includes(query));
                renderCustomersPageRows(filtered);
            };
        }
        
        renderCustomersPageRows(users);
    } catch (err) {
        console.error("Customers list loading failed:", err);
    }
}

function renderCustomersPageRows(users) {
    const tbody = document.querySelector("#customersPageTable tbody");
    if (!tbody) return;
    if (!users.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">No customers registered yet.</td></tr>`;
        return;
    }
    
    tbody.innerHTML = users.map(user => {
        const badgeClass = user.isActive ? "bg-success-subtle text-success" : "bg-danger-subtle text-danger";
        return `
            <tr>
                <td><div class="fw-semibold">${user.fullName}</div></td>
                <td>${user.email}</td>
                <td>${user.phone || 'N/A'}</td>
                <td>${formatDate(user.createdAt)}</td>
                <td><span class="badge ${badgeClass}">${user.isActive ? 'Active' : 'Deactivated'}</span></td>
                <td class="text-end">
                    <button class="btn btn-sm btn-outline-secondary me-1" onclick="viewCustomer('${user.id}')"><i class="bi bi-eye"></i> View</button>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="editCustomer('${user.id}')"><i class="bi bi-pencil"></i> Edit</button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteCustomer('${user.id}')"><i class="bi bi-trash"></i> Delete</button>
                </td>
            </tr>
        `;
    }).join("");
}

// ----------------------------------------------------
// VENDOR RENDER & ACTIONS
// ----------------------------------------------------
function renderVendorRows(vendors, containerId) {
    const tbody = document.querySelector("#" + containerId);
    if (!tbody) return;
    
    if (!vendors.length) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">No vendors registered.</td></tr>`;
        return;
    }
    
    tbody.innerHTML = vendors.map(vendor => {
        const badgeClass = vendor.isActive ? "bg-success-subtle text-success" : "bg-danger-subtle text-danger";
        return `
            <tr>
                <td><div class="fw-semibold">${vendor.fullName}</div></td>
                <td>${vendor.email}</td>
                <td><span class="badge ${badgeClass}">${vendor.isActive ? 'Active' : 'Deactivated'}</span></td>
                <td>
                    <div class="d-flex gap-2">
                        <button class="btn btn-sm btn-outline-secondary" onclick="viewVendor('${vendor.id}')"><i class="bi bi-eye"></i></button>
                        <button class="btn btn-sm btn-outline-primary" onclick="editVendor('${vendor.id}')"><i class="bi bi-pencil"></i></button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteVendor('${vendor.id}')"><i class="bi bi-trash"></i></button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");
}

async function viewVendor(id) {
    try {
        const res = await fetch("/api/admin/vendors");
        const data = await res.json();
        const vendor = data.vendors.find(v => v.id === id);
        if (!vendor) return;
        
        document.getElementById("vendorViewBody").innerHTML = `
            <div class="text-center mb-3">
                <div class="bg-success text-white rounded-circle d-inline-flex align-items-center justify-content-center fw-bold fs-3" style="width: 60px; height: 60px;">
                    ${vendor.fullName[0].toUpperCase()}
                </div>
            </div>
            <table class="table table-sm table-borderless">
                <tr><th>Store/Vendor:</th><td>${vendor.fullName}</td></tr>
                <tr><th>Email:</th><td>${vendor.email}</td></tr>
                <tr><th>Phone:</th><td>${vendor.phone || 'N/A'}</td></tr>
                <tr><th>Address:</th><td>${vendor.address || 'N/A'}</td></tr>
                <tr><th>Onboarded:</th><td>${formatDate(vendor.createdAt)}</td></tr>
                <tr><th>Status:</th><td><span class="badge ${vendor.isActive ? 'bg-success' : 'bg-danger'}">${vendor.isActive ? 'Active' : 'Deactivated'}</span></td></tr>
            </table>
        `;
        const modal = new bootstrap.Modal(document.getElementById("vendorViewModal"));
        modal.show();
    } catch (err) {
        showToast("Could not load vendor information.", "danger");
    }
}

async function editVendor(id) {
    try {
        const res = await fetch("/api/admin/vendors");
        const data = await res.json();
        const vendor = data.vendors.find(v => v.id === id);
        if (!vendor) return;
        
        document.getElementById("editVendorId").value = vendor.id;
        document.getElementById("editVendorName").value = vendor.fullName;
        document.getElementById("editVendorEmail").value = vendor.email;
        document.getElementById("editVendorPhone").value = vendor.phone || "";
        document.getElementById("editVendorAddress").value = vendor.address || "";
        document.getElementById("editVendorActive").checked = vendor.isActive;
        
        const modal = new bootstrap.Modal(document.getElementById("vendorEditModal"));
        modal.show();
    } catch (err) {
        showToast("Could not populate vendor edit form.", "danger");
    }
}

// Setup Vendor Edit Form Handler
const vendorForm = document.getElementById("vendorEditForm");
if (vendorForm) {
    vendorForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const id = document.getElementById("editVendorId").value;
        const fullName = document.getElementById("editVendorName").value.trim();
        const email = document.getElementById("editVendorEmail").value.trim();
        const phone = document.getElementById("editVendorPhone").value.trim();
        const address = document.getElementById("editVendorAddress").value.trim();
        const isActive = document.getElementById("editVendorActive").checked;
        
        try {
            const res = await fetch(`/api/admin/vendor/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fullName, email, phone, address, isActive })
            });
            const data = await res.json();
            if (res.status === 200) {
                showToast("Vendor profile updated successfully.", "success");
                bootstrap.Modal.getInstance(document.getElementById("vendorEditModal")).hide();
                if (document.getElementById("vendorsPageTable")) {
                    loadVendorsPage();
                } else {
                    loadDashboardTables(5);
                }
            } else {
                showToast(data.error || "Update failed.", "danger");
            }
        } catch (err) {
            showToast("Network error. Please try again.", "danger");
        }
    });
}

function deleteVendor(id) {
    if (!confirm("Are you sure you want to permanently delete this vendor? WARNING: This will cascade and delete all products listed by this store!")) return;
    
    fetch(`/api/admin/vendor/${id}`, { method: "DELETE" })
        .then(res => res.json().then(data => ({ status: res.status, data })))
        .then(({ status, data }) => {
            if (status === 200) {
                showToast("Vendor and catalog deleted successfully.", "success");
                if (document.getElementById("vendorsPageTable")) {
                    loadVendorsPage();
                } else {
                    loadDashboardTables(5);
                }
            } else {
                showToast(data.error || "Deletion failed.", "danger");
            }
        })
        .catch(() => showToast("Error during deletion.", "danger"));
}

async function loadVendorsPage() {
    const table = document.getElementById("vendorsPageTable");
    if (table) {
        if (table.dataset.loaded === "true") {
            window.location.reload();
        } else {
            table.dataset.loaded = "true";
        }
        return;
    }
    try {
        const res = await fetch("/api/admin/vendors");
        if (res.status !== 200) return;
        const data = await res.json();
        
        let vendors = data.vendors;
        
        // Setup Search Listener
        const searchInput = document.getElementById("vendorSearchInput");
        if (searchInput) {
            searchInput.oninput = (e) => {
                const query = e.target.value.toLowerCase().trim();
                const filtered = vendors.filter(v => v.fullName.toLowerCase().includes(query) || v.email.toLowerCase().includes(query));
                renderVendorsPageRows(filtered);
            };
        }
        
        renderVendorsPageRows(vendors);
    } catch (err) {
        console.error("Vendors directory listing failed:", err);
    }
}

function renderVendorsPageRows(vendors) {
    const tbody = document.querySelector("#vendorsPageTable tbody");
    if (!tbody) return;
    if (!vendors.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">No vendors registered yet.</td></tr>`;
        return;
    }
    
    tbody.innerHTML = vendors.map(vendor => {
        const badgeClass = vendor.isActive ? "bg-success-subtle text-success" : "bg-danger-subtle text-danger";
        return `
            <tr>
                <td><div class="fw-semibold">${vendor.fullName}</div></td>
                <td>${vendor.email}</td>
                <td>${vendor.phone || 'N/A'}</td>
                <td>${formatDate(vendor.createdAt)}</td>
                <td><span class="badge ${badgeClass}">${vendor.isActive ? 'Active' : 'Deactivated'}</span></td>
                <td class="text-end">
                    <button class="btn btn-sm btn-outline-secondary me-1" onclick="viewVendor('${vendor.id}')"><i class="bi bi-eye"></i> View</button>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="editVendor('${vendor.id}')"><i class="bi bi-pencil"></i> Edit</button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteVendor('${vendor.id}')"><i class="bi bi-trash"></i> Delete</button>
                </td>
            </tr>
        `;
    }).join("");
}

// ----------------------------------------------------
// PRODUCT RENDER & ACTIONS
// ----------------------------------------------------
function renderProductRows(products, containerId) {
    const tbody = document.querySelector("#" + containerId);
    if (!tbody) return;
    
    if (!products.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">No products listed.</td></tr>`;
        return;
    }
    
    tbody.innerHTML = products.map(product => {
        const badgeClass = product.isAvailable && product.stock > 0 ? "bg-success-subtle text-success" : "bg-danger-subtle text-danger";
        return `
            <tr>
                <td>
                    <div class="d-flex align-items-center gap-2">
                        <img src="${product.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=80'}" class="rounded-3 object-fit-cover" style="width: 40px; height: 40px; border: 1px solid #f1f5f9;">
                        <div class="fw-semibold">${product.productName}</div>
                    </div>
                </td>
                <td>${product.category}</td>
                <td class="fw-semibold">${formatCurrency(product.price)}</td>
                <td>${product.stock}</td>
                <td>
                    <span class="badge ${badgeClass}">${product.isAvailable && product.stock > 0 ? 'In Stock' : 'Out of Stock'}</span>
                </td>
                <td>
                    <div class="d-flex gap-2">
                        <button class="btn btn-sm btn-outline-secondary" onclick="viewProduct('${product.id}')"><i class="bi bi-eye"></i></button>
                        <button class="btn btn-sm btn-outline-primary" onclick="editProduct('${product.id}')"><i class="bi bi-pencil"></i></button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteProduct('${product.id}')"><i class="bi bi-trash"></i></button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");
}

async function viewProduct(id) {
    try {
        const res = await fetch("/api/admin/products");
        const data = await res.json();
        const product = data.products.find(p => p.id === id);
        if (!product) return;
        
        document.getElementById("productViewBody").innerHTML = `
            <div class="text-center mb-3">
                <img src="${product.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=300'}" class="img-fluid rounded-4 shadow-sm mb-2" style="max-height: 180px; object-fit: cover;">
                <h4 class="fw-bold mb-0">${product.productName}</h4>
                <p class="text-muted fs-8">Catalog ID: ${product.id}</p>
            </div>
            <table class="table table-sm table-borderless">
                <tr><th>Category:</th><td>${product.category}</td></tr>
                <tr><th>Price:</th><td class="fw-semibold text-primary">${formatCurrency(product.price)}</td></tr>
                <tr><th>Current Stock:</th><td>${product.stock} units</td></tr>
                <tr><th>Listed By:</th><td>${product.vendorId}</td></tr>
                <tr><th>Status:</th><td><span class="badge ${product.isAvailable && product.stock > 0 ? 'bg-success' : 'bg-danger'}">${product.isAvailable && product.stock > 0 ? 'In Stock' : 'Out of Stock'}</span></td></tr>
                <tr><th>Description:</th><td><small class="text-muted d-block" style="white-space: pre-wrap;">${product.description || 'No description provided.'}</small></td></tr>
            </table>
        `;
        const modal = new bootstrap.Modal(document.getElementById("productViewModal"));
        modal.show();
    } catch (err) {
        showToast("Could not load product information.", "danger");
    }
}

async function editProduct(id) {
    try {
        const res = await fetch("/api/admin/products");
        const data = await res.json();
        const product = data.products.find(p => p.id === id);
        if (!product) return;
        
        document.getElementById("editProdId").value = product.id;
        document.getElementById("editProdName").value = product.productName;
        document.getElementById("editProdDesc").value = product.description || "";
        document.getElementById("editProdPrice").value = product.price;
        document.getElementById("editProdStock").value = product.stock;
        document.getElementById("editProdImage").value = product.image || "";
        document.getElementById("editProdAvailable").checked = product.isAvailable;
        
        // Populate category dropdown in edit modal
        const catSelect = document.getElementById("editProdCategory");
        if (catSelect) {
            try {
                const catRes = await fetch("/api/admin/categories");
                const catData = await catRes.json();
                if (catData.categories) {
                    catSelect.innerHTML = catData.categories.map(c => `
                        <option value="${c.categoryName}" ${c.categoryName === product.category ? 'selected' : ''}>${c.categoryName}</option>
                    `).join("");
                }
            } catch (err) {
                console.error("Could not fetch categories:", err);
            }
        }
        
        const modal = new bootstrap.Modal(document.getElementById("productEditModal"));
        modal.show();
    } catch (err) {
        showToast("Could not populate product edit form.", "danger");
    }
}

// Setup Product Edit Form Handler
const productForm = document.getElementById("productEditForm");
if (productForm) {
    productForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const id = document.getElementById("editProdId").value;
        const productName = document.getElementById("editProdName").value.trim();
        const description = document.getElementById("editProdDesc").value.trim();
        const category = document.getElementById("editProdCategory").value;
        const price = parseFloat(document.getElementById("editProdPrice").value);
        const stock = parseInt(document.getElementById("editProdStock").value);
        const image = document.getElementById("editProdImage").value.trim();
        const isAvailable = document.getElementById("editProdAvailable").checked;
        
        try {
            const res = await fetch(`/api/admin/product/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ productName, description, category, price, stock, image, isAvailable })
            });
            const data = await res.json();
            if (res.status === 200) {
                showToast("Product listing updated successfully.", "success");
                bootstrap.Modal.getInstance(document.getElementById("productEditModal")).hide();
                if (document.getElementById("productsPageTable")) {
                    loadProductsPage();
                } else {
                    loadDashboardTables(5);
                }
            } else {
                showToast(data.error || "Update failed.", "danger");
            }
        } catch (err) {
            showToast("Network error. Please try again.", "danger");
        }
    });
}

function deleteProduct(id) {
    if (!confirm("Are you sure you want to permanently delete this product from the platform?")) return;
    
    fetch(`/api/admin/product/${id}`, { method: "DELETE" })
        .then(res => res.json().then(data => ({ status: res.status, data })))
        .then(({ status, data }) => {
            if (status === 200) {
                showToast("Product deleted successfully.", "success");
                if (document.getElementById("productsPageTable")) {
                    loadProductsPage();
                } else {
                    loadDashboardTables(5);
                }
            } else {
                showToast(data.error || "Deletion failed.", "danger");
            }
        })
        .catch(() => showToast("Error during deletion.", "danger"));
}

async function loadProductsPage() {
    const table = document.getElementById("productsPageTable");
    if (table) {
        if (table.dataset.loaded === "true") {
            window.location.reload();
        } else {
            table.dataset.loaded = "true";
        }
        return;
    }
    try {
        // Fetch categories first to populate filter
        const cRes = await fetch("/api/categories");
        if (cRes.status === 200) {
            const cData = await cRes.json();
            allCategories = cData.categories;
            const filterEl = document.getElementById("productCategoryFilter");
            if (filterEl) {
                filterEl.innerHTML = `<option value="">All Categories</option>` + allCategories.map(c => `
                    <option value="${c.categoryName}">${c.categoryName}</option>
                `).join("");
            }
        }

        const res = await fetch("/api/admin/products");
        if (res.status !== 200) return;
        const data = await res.json();
        
        let products = data.products;
        
        // Filter elements
        const searchInput = document.getElementById("productSearchInput");
        const categoryFilter = document.getElementById("productCategoryFilter");
        
        const filterFn = () => {
            const query = searchInput ? searchInput.value.toLowerCase().trim() : "";
            const cat = categoryFilter ? categoryFilter.value : "";
            
            const filtered = products.filter(p => {
                const matchesSearch = p.productName.toLowerCase().includes(query);
                const matchesCat = cat === "" || p.category === cat;
                return matchesSearch && matchesCat;
            });
            renderProductsPageRows(filtered);
        };
        
        if (searchInput) searchInput.oninput = filterFn;
        if (categoryFilter) categoryFilter.onchange = filterFn;
        
        renderProductsPageRows(products);
    } catch (err) {
        console.error("Products catalogue loading failed:", err);
    }
}

function renderProductsPageRows(products) {
    const tbody = document.querySelector("#productsPageTable tbody");
    if (!tbody) return;
    if (!products.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">No products listed in catalog.</td></tr>`;
        return;
    }
    
    tbody.innerHTML = products.map(product => {
        const badgeClass = product.isAvailable && product.stock > 0 ? "bg-success-subtle text-success" : "bg-danger-subtle text-danger";
        return `
            <tr>
                <td>
                    <div class="d-flex align-items-center gap-3">
                        <img src="${product.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=80'}" class="rounded-3 object-fit-cover" style="width: 48px; height: 48px; border: 1px solid #f1f5f9;">
                        <div>
                            <div class="fw-semibold text-dark">${product.productName}</div>
                            <small class="text-muted fs-8">ID: ${product.id}</small>
                        </div>
                    </div>
                </td>
                <td><span class="badge bg-light text-secondary border">${product.category}</span></td>
                <td class="fw-semibold text-indigo">${formatCurrency(product.price)}</td>
                <td class="fw-medium">${product.stock}</td>
                <td><span class="badge ${badgeClass}">${product.isAvailable && product.stock > 0 ? 'In Stock' : 'Out of Stock'}</span></td>
                <td class="text-end">
                    <button class="btn btn-sm btn-outline-secondary me-1" onclick="viewProduct('${product.id}')"><i class="bi bi-eye"></i> View</button>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="editProduct('${product.id}')"><i class="bi bi-pencil"></i> Edit</button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteProduct('${product.id}')"><i class="bi bi-trash"></i> Delete</button>
                </td>
            </tr>
        `;
    }).join("");
}

// ----------------------------------------------------
// ORDER RENDER & ACTIONS
// ----------------------------------------------------
function renderOrderRows(orders, containerId) {
    const tbody = document.querySelector("#" + containerId);
    if (!tbody) return;
    
    if (!orders.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">No orders placed yet.</td></tr>`;
        return;
    }
    
    tbody.innerHTML = orders.map(order => {
        const orderStatusClass = getOrderStatusBadge(order.orderStatus);
        const paymentStatusClass = order.paymentStatus === "Completed" ? "bg-success-subtle text-success" : (order.paymentStatus === "Failed" ? "bg-danger-subtle text-danger" : "bg-warning-subtle text-warning");
        
        return `
            <tr>
                <td><div class="fw-semibold text-primary">${order.orderNumber}</div></td>
                <td>
                    <div style="font-size: 0.8rem;" class="text-muted">
                        ${order.items.map(it => `${it.productName} (x${it.quantity})`).join(", ")}
                    </div>
                </td>
                <td class="fw-bold">${formatCurrency(order.totalAmount)}</td>
                <td><span class="badge ${orderStatusClass}">${order.orderStatus}</span></td>
                <td><span class="badge ${paymentStatusClass}">${order.paymentStatus}</span></td>
                <td>
                    <div class="d-flex gap-2">
                        <button class="btn btn-sm btn-outline-secondary" onclick="viewOrder('${order.id}')"><i class="bi bi-eye"></i></button>
                        <button class="btn btn-sm btn-outline-primary" onclick="editOrder('${order.id}')"><i class="bi bi-pencil"></i></button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");
}

function getOrderStatusBadge(status) {
    switch (status) {
        case "Pending": return "bg-warning-subtle text-warning";
        case "Confirmed": return "bg-primary-subtle text-primary";
        case "Packed": return "bg-info-subtle text-info";
        case "Out For Delivery": return "bg-cyan-subtle text-cyan";
        case "Delivered": return "bg-success-subtle text-success";
        case "Cancelled": return "bg-danger-subtle text-danger";
        default: return "bg-secondary-subtle text-secondary";
    }
}

async function viewOrder(id) {
    try {
        const res = await fetch("/api/admin/orders");
        const data = await res.json();
        const order = data.orders.find(o => o.id === id);
        if (!order) return;
        
        const itemsHtml = order.items.map(item => `
            <tr>
                <td>${item.productName}</td>
                <td>${formatCurrency(item.price)}</td>
                <td>${item.quantity}</td>
                <td class="fw-semibold text-end">${formatCurrency(item.price * item.quantity)}</td>
            </tr>
        `).join("");
        
        document.getElementById("orderViewBody").innerHTML = `
            <div class="row g-3 mb-4">
                <div class="col-md-6">
                    <h6 class="text-muted mb-1 fs-8">ORDER NUMBER</h6>
                    <h5 class="fw-bold text-primary mb-0">${order.orderNumber}</h5>
                </div>
                <div class="col-md-6 text-md-end">
                    <h6 class="text-muted mb-1 fs-8">DATE PLACED</h6>
                    <h5 class="fw-bold mb-0">${formatDate(order.createdAt)}</h5>
                </div>
            </div>
            
            <div class="row g-3 mb-4">
                <div class="col-md-6">
                    <h6 class="text-muted mb-1 fs-8">SHIPPING ADDRESS</h6>
                    <p class="mb-0 fw-medium">${order.shippingAddress || 'N/A'}</p>
                </div>
                <div class="col-md-3">
                    <h6 class="text-muted mb-1 fs-8">ORDER STATUS</h6>
                    <span class="badge ${getOrderStatusBadge(order.orderStatus)}">${order.orderStatus}</span>
                </div>
                <div class="col-md-3">
                    <h6 class="text-muted mb-1 fs-8">PAYMENT STATUS</h6>
                    <span class="badge ${order.paymentStatus === 'Completed' ? 'bg-success' : 'bg-warning'}">${order.paymentStatus} (${order.paymentMethod})</span>
                </div>
            </div>
            
            <h6 class="fw-bold mb-2">Order Items</h6>
            <div class="table-responsive mb-3">
                <table class="table table-sm table-bordered align-middle">
                    <thead class="table-light">
                        <tr>
                            <th>Product Name</th>
                            <th>Unit Price</th>
                            <th>Qty</th>
                            <th class="text-end">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                        <tr>
                            <td colspan="3" class="text-end fw-semibold">Subtotal:</td>
                            <td class="text-end fw-semibold">${formatCurrency(order.subtotal)}</td>
                        </tr>
                        <tr>
                            <td colspan="3" class="text-end text-muted">Delivery Charge:</td>
                            <td class="text-end text-muted">${formatCurrency(order.deliveryCharge)}</td>
                        </tr>
                        <tr class="table-primary-subtle border-primary-subtle">
                            <td colspan="3" class="text-end fw-bold">Total Amount:</td>
                            <td class="text-end fw-bold text-primary fs-5">${formatCurrency(order.totalAmount)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
        const modal = new bootstrap.Modal(document.getElementById("orderViewModal"));
        modal.show();
    } catch (err) {
        showToast("Could not load order details.", "danger");
    }
}

async function editOrder(id) {
    try {
        const res = await fetch("/api/admin/orders");
        const data = await res.json();
        const order = data.orders.find(o => o.id === id);
        if (!order) return;
        
        document.getElementById("editOrderId").value = order.id;
        document.getElementById("editOrderStatus").value = order.orderStatus;
        document.getElementById("editOrderPayment").value = order.paymentStatus;
        
        const modal = new bootstrap.Modal(document.getElementById("orderEditModal"));
        modal.show();
    } catch (err) {
        showToast("Could not populate order status form.", "danger");
    }
}

// Setup Order Edit Form Handler
const orderForm = document.getElementById("orderEditForm");
if (orderForm) {
    orderForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const id = document.getElementById("editOrderId").value;
        const orderStatus = document.getElementById("editOrderStatus").value;
        const paymentStatus = document.getElementById("editOrderPayment").value;
        
        try {
            const res = await fetch(`/api/admin/order/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderStatus, paymentStatus })
            });
            const data = await res.json();
            if (res.status === 200) {
                showToast("Order status updated successfully.", "success");
                bootstrap.Modal.getInstance(document.getElementById("orderEditModal")).hide();
                if (document.getElementById("ordersPageTable")) {
                    loadOrdersPage();
                } else {
                    loadDashboardTables(5);
                }
            } else {
                showToast(data.error || "Update failed.", "danger");
            }
        } catch (err) {
            showToast("Network error. Please try again.", "danger");
        }
    });
}

async function loadOrdersPage() {
    const table = document.getElementById("ordersPageTable");
    if (table) {
        if (table.dataset.loaded === "true") {
            window.location.reload();
        } else {
            table.dataset.loaded = "true";
        }
        return;
    }
    try {
        const res = await fetch("/api/admin/orders");
        if (res.status !== 200) return;
        const data = await res.json();
        
        let orders = data.orders;
        
        // Filter triggers
        const searchInput = document.getElementById("orderSearchInput");
        const statusFilter = document.getElementById("orderStatusFilter");
        
        const filterFn = () => {
            const query = searchInput ? searchInput.value.toLowerCase().trim() : "";
            const status = statusFilter ? statusFilter.value : "";
            
            const filtered = orders.filter(o => {
                const matchesSearch = o.orderNumber.toLowerCase().includes(query);
                const matchesStatus = status === "" || o.orderStatus === status;
                return matchesSearch && matchesStatus;
            });
            renderOrdersPageRows(filtered);
        };
        
        if (searchInput) searchInput.oninput = filterFn;
        if (statusFilter) statusFilter.onchange = filterFn;
        
        renderOrdersPageRows(orders);
    } catch (err) {
        console.error("Order transaction lists loading failed:", err);
    }
}

function renderOrdersPageRows(orders) {
    const tbody = document.querySelector("#ordersPageTable tbody");
    if (!tbody) return;
    if (!orders.length) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">No order transactions found.</td></tr>`;
        return;
    }
    
    tbody.innerHTML = orders.map(order => {
        const orderStatusClass = getOrderStatusBadge(order.orderStatus);
        const paymentStatusClass = order.paymentStatus === "Completed" ? "bg-success-subtle text-success" : (order.paymentStatus === "Failed" ? "bg-danger-subtle text-danger" : "bg-warning-subtle text-warning");
        
        return `
            <tr>
                <td><div class="fw-semibold text-primary">${order.orderNumber}</div></td>
                <td>
                    <div class="fw-medium">User: ${order.userId}</div>
                    <small class="text-muted d-block text-truncate" style="max-width: 250px;">
                        ${order.items.map(it => `${it.productName} (x${it.quantity})`).join(", ")}
                    </small>
                </td>
                <td class="fw-semibold text-dark">${formatCurrency(order.totalAmount)}</td>
                <td><span class="badge ${orderStatusClass}">${order.orderStatus}</span></td>
                <td><span class="badge ${paymentStatusClass}">${order.paymentStatus}</span></td>
                <td>${formatDate(order.createdAt)}</td>
                <td class="text-end">
                    <button class="btn btn-sm btn-outline-secondary me-1" onclick="viewOrder('${order.id}')"><i class="bi bi-eye"></i> View</button>
                    <button class="btn btn-sm btn-outline-primary" onclick="editOrder('${order.id}')"><i class="bi bi-pencil"></i> Status</button>
                </td>
            </tr>
        `;
    }).join("");
}

// ----------------------------------------------------
// CATEGORY RENDER & ACTIONS
// ----------------------------------------------------
async function loadCategoriesPage() {
    const table = document.getElementById("categoriesPageTable");
    if (table) {
        if (table.dataset.loaded === "true") {
            window.location.reload();
        } else {
            table.dataset.loaded = "true";
        }
        return;
    }
    try {
        const res = await fetch("/api/admin/categories");
        if (res.status !== 200) return;
        const data = await res.json();
        
        renderCategoriesPageRows(data.categories);
    } catch (err) {
        console.error("Categories catalog loading failed:", err);
    }
}

function renderCategoriesPageRows(categories) {
    const tbody = document.querySelector("#categoriesPageTable tbody");
    if (!tbody) return;
    if (!categories.length) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-4">No categories created yet.</td></tr>`;
        return;
    }
    
    tbody.innerHTML = categories.map(cat => `
        <tr>
            <td>
                <img src="${cat.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=80'}" class="rounded-3 object-fit-cover" style="width: 48px; height: 48px; border: 1px solid #f1f5f9;">
            </td>
            <td><div class="fw-bold text-dark fs-6">${cat.categoryName}</div></td>
            <td><span class="badge bg-primary-subtle text-primary fw-bold" style="font-size: 0.85rem;">${cat.productCount} Products</span></td>
            <td class="text-end">
                <button class="btn btn-sm btn-outline-secondary me-1" onclick="viewCategory('${cat.id}')"><i class="bi bi-eye"></i> View</button>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="editCategory('${cat.id}')"><i class="bi bi-pencil"></i> Edit</button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteCategory('${cat.id}')"><i class="bi bi-trash"></i> Delete</button>
            </td>
        </tr>
    `).join("");
}

async function viewCategory(id) {
    try {
        const res = await fetch("/api/admin/categories");
        const data = await res.json();
        const cat = data.categories.find(c => c.id === id);
        if (!cat) return;
        
        document.getElementById("categoryViewBody").innerHTML = `
            <img src="${cat.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=300'}" class="img-fluid rounded-4 shadow-sm mb-3" style="max-height: 180px; width: 100%; object-fit: cover;">
            <h3 class="fw-bold mb-1">${cat.categoryName}</h3>
            <p class="badge bg-primary-subtle text-primary px-3 py-2 fs-7 mb-0">${cat.productCount} Associated Products</p>
        `;
        const modal = new bootstrap.Modal(document.getElementById("categoryViewModal"));
        modal.show();
    } catch (err) {
        showToast("Could not load category information.", "danger");
    }
}

async function editCategory(id) {
    try {
        const res = await fetch("/api/admin/categories");
        const data = await res.json();
        const cat = data.categories.find(c => c.id === id);
        if (!cat) return;
        
        document.getElementById("editCatId").value = cat.id;
        document.getElementById("editCatName").value = cat.categoryName;
        document.getElementById("editCatImage").value = cat.image || "";
        
        const modal = new bootstrap.Modal(document.getElementById("categoryEditModal"));
        modal.show();
    } catch (err) {
        showToast("Could not populate category edit form.", "danger");
    }
}

// Setup Category Create Form Handler
const catCreateForm = document.getElementById("categoryCreateForm");
if (catCreateForm) {
    catCreateForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const categoryName = document.getElementById("createCatName").value.trim();
        const image = document.getElementById("createCatImage").value.trim();
        
        try {
            const res = await fetch("/api/admin/categories", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ categoryName, image })
            });
            const data = await res.json();
            if (res.status === 201) {
                showToast("Category created successfully.", "success");
                bootstrap.Modal.getInstance(document.getElementById("categoryCreateModal")).hide();
                catCreateForm.reset();
                loadCategoriesPage();
            } else {
                showToast(data.error || "Creation failed.", "danger");
            }
        } catch (err) {
            showToast("Network error. Please try again.", "danger");
        }
    });
}

// Setup Category Edit Form Handler
const catEditForm = document.getElementById("categoryEditForm");
if (catEditForm) {
    catEditForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const id = document.getElementById("editCatId").value;
        const categoryName = document.getElementById("editCatName").value.trim();
        const image = document.getElementById("editCatImage").value.trim();
        
        try {
            const res = await fetch(`/api/admin/category/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ categoryName, image })
            });
            const data = await res.json();
            if (res.status === 200) {
                showToast("Category updated successfully.", "success");
                bootstrap.Modal.getInstance(document.getElementById("categoryEditModal")).hide();
                loadCategoriesPage();
            } else {
                showToast(data.error || "Update failed.", "danger");
            }
        } catch (err) {
            showToast("Network error. Please try again.", "danger");
        }
    });
}

function deleteCategory(id) {
    if (!confirm("Are you sure you want to delete this category? Products linked to it will not be deleted but will belong to an un-categorized list.")) return;
    
    fetch(`/api/admin/category/${id}`, { method: "DELETE" })
        .then(res => res.json().then(data => ({ status: res.status, data })))
        .then(({ status, data }) => {
            if (status === 200) {
                showToast("Category deleted successfully.", "success");
                loadCategoriesPage();
            } else {
                showToast(data.error || "Deletion failed.", "danger");
            }
        })
        .catch(() => showToast("Error during deletion.", "danger"));
}

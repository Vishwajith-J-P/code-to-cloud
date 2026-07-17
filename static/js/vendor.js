/**
 * Vendor Dashboard JavaScript - Dynamic Analytics
 * All charts load real data from /vendor/analytics (MongoDB)
 */

let vendorCharts = {};

document.addEventListener('DOMContentLoaded', function () {
    // Menu Toggle Logic
    const toggleBtn = document.getElementById('menu-toggle');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', function (e) {
            e.preventDefault();
            document.getElementById('wrapper').classList.toggle('toggled');
        });
    }

    // Load vendor analytics from backend
    if (document.getElementById('monthlySalesChart') || document.getElementById('topProductsChart')) {
        loadVendorAnalytics();
    }
});

// Helper: format currency
function formatVendorCurrency(amount) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
}

// Main analytics loader
async function loadVendorAnalytics() {
    try {
        const res = await fetch('/vendor/analytics');
        if (!res.ok) {
            console.error('Vendor analytics fetch failed:', res.status);
            return;
        }
        const data = await res.json();
        const stats = data.dashboard;

        // Update stat cards if present
        const set = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };
        set('vendorStatProducts',  stats.totalProducts);
        set('vendorStatOrders',    stats.totalOrders);
        set('vendorStatPending',   stats.pendingOrders);
        set('vendorStatCompleted', stats.completedOrders);
        set('vendorStatRevenue',   formatVendorCurrency(stats.revenue));

        // Render all charts
        if (typeof Chart !== 'undefined') {
            Chart.defaults.font.family = "'Inter', 'Plus Jakarta Sans', sans-serif";
            Chart.defaults.color = '#6c757d';
        }

        renderMonthlySalesChart(stats.monthlySales || []);
        renderTopProductsChart(stats.topProducts || []);
        renderVendorOrderStatusChart(stats.orderStatus || []);

    } catch (err) {
        console.error('Error loading vendor analytics:', err);
    }
}

// 1. Monthly Sales Overview - Line Chart
function renderMonthlySalesChart(data) {
    const salesCtx = document.getElementById('monthlySalesChart');
    if (!salesCtx) return;

    if (vendorCharts.monthlySales) vendorCharts.monthlySales.destroy();

    const labels = data.map(d => d.label);
    const values = data.map(d => d.value);

    vendorCharts.monthlySales = new Chart(salesCtx, {
        type: 'line',
        data: {
            labels: labels.length ? labels : ['No Data'],
            datasets: [{
                label: 'Revenue (₹)',
                data: values.length ? values : [0],
                borderColor: '#0d6efd',
                backgroundColor: 'rgba(13, 110, 253, 0.08)',
                borderWidth: 2.5,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#ffffff',
                pointBorderColor: '#0d6efd',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#1e1e2f',
                    titleColor: '#fff',
                    bodyColor: '#cbd5e1',
                    padding: 12,
                    displayColors: false,
                    callbacks: {
                        label: function (context) {
                            return formatVendorCurrency(context.parsed.y);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { borderDash: [4, 4], color: 'rgba(0,0,0,0.05)', drawBorder: false },
                    ticks: { callback: v => '₹' + v }
                },
                x: { grid: { display: false, drawBorder: false } }
            }
        }
    });
}

// 2. Top Selling Products - Horizontal Bar Chart
function renderTopProductsChart(data) {
    const prodCtx = document.getElementById('topProductsChart');
    if (!prodCtx) return;

    if (vendorCharts.topProducts) vendorCharts.topProducts.destroy();

    const labels = data.map(d => d.name);
    const values = data.map(d => d.qty);
    const palette = ['#0d6efd', '#198754', '#ffc107', '#0dcaf0', '#6f42c1'];

    vendorCharts.topProducts = new Chart(prodCtx, {
        type: 'bar',
        data: {
            labels: labels.length ? labels : ['No Sales Yet'],
            datasets: [{
                label: 'Units Sold',
                data: values.length ? values : [0],
                backgroundColor: palette.slice(0, Math.max(labels.length, 1)),
                borderRadius: 6,
                borderWidth: 0
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: ctx => `${ctx.parsed.x} units sold`
                    }
                }
            },
            scales: {
                x: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { stepSize: 1 } },
                y: { grid: { display: false } }
            }
        }
    });
}

// 3. Order Status Distribution - Doughnut Chart
function renderVendorOrderStatusChart(data) {
    const statusCtx = document.getElementById('vendorOrderStatusChart');
    if (!statusCtx) return;

    if (vendorCharts.orderStatus) vendorCharts.orderStatus.destroy();

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

    vendorCharts.orderStatus = new Chart(statusCtx, {
        type: 'doughnut',
        data: {
            labels: labels.length ? labels : ['No Orders'],
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
            cutout: '68%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { usePointStyle: true, padding: 16, font: { size: 11 } }
                }
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    
    let currentUser = null;
    const todayStr = new Date().toISOString().split('T')[0];

    // Core DOM Elements
    const elements = {
        greeting: document.getElementById('greeting'),
        dateDisplay: document.getElementById('currentDate'),
        avatar: document.getElementById('userAvatar'),
        logoutBtn: document.getElementById('logoutBtn'),
        
        // Master KPIs
        kpiRevenue: document.getElementById('kpi-revenue'),
        kpiExpenses: document.getElementById('kpi-expenses'),
        kpiProfit: document.getElementById('kpi-profit'),
        kpiDeliveries: document.getElementById('kpi-deliveries'),
        kpiKhata: document.getElementById('kpi-khata'), // NEW
        kpiAlerts: document.getElementById('kpi-alerts'), // NEW
        headerAlertDot: document.getElementById('headerAlertDot'), // NEW
        
        tableBody: document.getElementById('recentTransactionsTable'),
        mobileMenuBtn: document.getElementById('mobileMenuBtn'),
        closeSidebarBtn: document.getElementById('closeSidebarBtn'),
        sidebar: document.getElementById('sidebar'),
        sidebarOverlay: document.getElementById('sidebarOverlay')
    };

    let salesChartInstance = null;
    let expenseChartInstance = null;

    initDashboard();

    async function initDashboard() {
        const isAuthenticated = await checkAuth();
        if (!isAuthenticated) return; 
        
        setDateTime();

        // High-Performance Parallel Fetching
        try {
            await Promise.all([
                loadFinancialKPIs(),
                loadDistributionData(), // Khata & Drops
                loadInventoryAlerts(),  // Stock Radar
                loadWeeklyChart(),
                loadExpenseChart(),
                loadRecentTransactions()
            ]);
        } catch (error) {
            console.error("Dashboard Aggregation Error:", error);
        }
    }

    // --- Authentication & Mobile Nav ---
    async function checkAuth() {
        try {
            const res = await fetch('/api/auth/status');
            if (!res.ok) {
                window.location.href = '/login';
                return false;
            }
            const data = await res.json();
            currentUser = data.user;
            
            elements.greeting.innerText = `Welcome back, ${currentUser}`;
            elements.avatar.innerText = currentUser.charAt(0).toUpperCase();
            return true;
        } catch (err) {
            window.location.href = '/login';
            return false;
        }
    }

    elements.logoutBtn.addEventListener('click', async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/login';
    });

    // Mobile Sidebar Logic
    function toggleSidebar() {
        const isClosed = elements.sidebar.classList.contains('-translate-x-full');
        if (isClosed) {
            elements.sidebar.classList.remove('-translate-x-full');
            elements.sidebarOverlay.classList.remove('hidden');
        } else {
            elements.sidebar.classList.add('-translate-x-full');
            elements.sidebarOverlay.classList.add('hidden');
        }
    }

    elements.mobileMenuBtn.addEventListener('click', toggleSidebar);
    elements.closeSidebarBtn.addEventListener('click', toggleSidebar);
    elements.sidebarOverlay.addEventListener('click', toggleSidebar);

    // --- Core Data Fetching ---

    function formatINR(number) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency', currency: 'INR', maximumFractionDigits: 0
        }).format(number);
    }

    function setDateTime() {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        elements.dateDisplay.innerText = new Date().toLocaleDateString('en-IN', options);
    }

    // 1. Finance (Revenue vs Expenses)
    async function loadFinancialKPIs() {
        const salesRes = await fetch(`/api/reports/entries?date=${todayStr}`);
        const salesData = await salesRes.json();
        
        const expRes = await fetch('/api/expenses/today');
        const expData = await expRes.json();

        const totalRevenue = salesData.reduce((sum, item) => sum + item.grand_total, 0);
        const totalExpenses = expData.reduce((sum, item) => sum + item.total_amount, 0);
        const netProfit = totalRevenue - totalExpenses;

        elements.kpiRevenue.innerHTML = formatINR(totalRevenue);
        elements.kpiExpenses.innerHTML = formatINR(totalExpenses);
        
        elements.kpiProfit.innerHTML = formatINR(netProfit);
        if (netProfit < 0) {
            elements.kpiProfit.classList.replace('text-blue-500/50', 'text-red-500/50'); // Keep glass effect intact
        }
    }

    // 2. Distribution (Drops & Outstanding Khata)
    async function loadDistributionData() {
        try {
            const res = await fetch('/api/distribution/customers');
            const customers = await res.json();
            
            // Calculate Pending Drops
            const pendingCount = customers.filter(c => c.status === 'Pending').length;
            if (pendingCount === 0 && customers.length > 0) {
                elements.kpiDeliveries.innerHTML = `<span class="text-green-500 text-xl font-bold">All Done!</span>`;
            } else {
                elements.kpiDeliveries.innerHTML = pendingCount;
            }

            // NEW: Calculate Total Outstanding Khata (Only sum positive balances where they owe money)
            const totalKhata = customers.reduce((sum, c) => c.balance > 0 ? sum + c.balance : sum, 0);
            elements.kpiKhata.innerHTML = formatINR(totalKhata);

        } catch (error) {
            elements.kpiDeliveries.innerHTML = '--';
            elements.kpiKhata.innerHTML = '₹0';
        }
    }

    // 3. Inventory Radar (Low Stock Alerts)
    async function loadInventoryAlerts() {
        try {
            const res = await fetch('/api/inventory/');
            const inventory = await res.json();
            
            // Count items with less than 10 units
            const lowStockItems = inventory.filter(item => item.available_quantity < 10).length;
            
            if (lowStockItems > 0) {
                elements.kpiAlerts.innerHTML = lowStockItems;
                elements.headerAlertDot.classList.remove('hidden'); // Ping notification in header
            } else {
                elements.kpiAlerts.innerHTML = `<span class="text-green-500 text-xl font-bold">Secure</span>`;
                elements.kpiAlerts.parentElement.parentElement.classList.replace('hover:border-orange-200', 'hover:border-green-200');
                elements.headerAlertDot.classList.add('hidden');
            }
        } catch (error) {
            elements.kpiAlerts.innerHTML = '--';
        }
    }

    // --- Charts & Tables ---

    async function loadWeeklyChart() {
        const res = await fetch('/api/reports/weekly');
        const weeklyData = await res.json();
        
        const labels = weeklyData.map(day => new Date(day._id).toLocaleDateString('en-US', { weekday: 'short' }));
        const revenues = weeklyData.map(day => day.total_revenue);

        const ctx = document.getElementById('weeklySalesChart').getContext('2d');
        const gradient = ctx.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, 'rgba(37, 99, 235, 0.3)');
        gradient.addColorStop(1, 'rgba(37, 99, 235, 0.0)');

        salesChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Gross Sales (₹)',
                    data: revenues,
                    borderColor: '#2563eb',
                    backgroundColor: gradient,
                    borderWidth: 3,
                    pointBackgroundColor: '#ffffff',
                    pointBorderColor: '#2563eb',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    fill: true,
                    tension: 0.3 
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#1e293b',
                        padding: 12,
                        callbacks: { label: function(context) { return '₹ ' + context.parsed.y.toLocaleString('en-IN'); } }
                    }
                },
                scales: {
                    y: { beginAtZero: true, grid: { borderDash: [4, 4], color: '#f1f5f9' } },
                    x: { grid: { display: false } }
                }
            }
        });
    }

    async function loadExpenseChart() {
        const res = await fetch('/api/expenses/today');
        const expData = await res.json();
        
        const labels = expData.map(exp => exp._id); 
        const amounts = expData.map(exp => exp.total_amount);
        
        if(amounts.length === 0) {
            labels.push('No Expenses');
            amounts.push(1); 
        }

        const colors = ['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#10b981'];
        const ctx = document.getElementById('expensesChart').getContext('2d');
        
        expenseChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: amounts,
                    backgroundColor: amounts.length === 0 ? ['#f8fafc'] : colors,
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: { legend: { display: false } }
            }
        });

        if(amounts.length > 0) {
            const legendContainer = document.getElementById('expenseLegend');
            legendContainer.innerHTML = '';
            labels.forEach((label, i) => {
                legendContainer.innerHTML += `
                    <div class="flex items-center text-xs font-bold text-gray-700 bg-gray-100 px-3 py-1.5 rounded-full">
                        <span class="w-2.5 h-2.5 rounded-full mr-2 shadow-sm" style="background-color: ${colors[i % colors.length]}"></span>
                        ${label}
                    </div>
                `;
            });
        }
    }

    async function loadRecentTransactions() {
        const res = await fetch(`/api/reports/entries?date=${todayStr}`);
        const entries = await res.json();
        
        elements.tableBody.innerHTML = ''; 
        
        if (entries.length === 0) {
            elements.tableBody.innerHTML = `<tr><td colspan="4" class="px-6 py-12 text-center text-gray-400 font-bold italic">No transactions processed today.</td></tr>`;
            return;
        }

        const recentEntries = entries.slice(0, 6); // Show top 6

        recentEntries.forEach(entry => {
            const timeStr = new Date(entry.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            
            // Differentiate Route Deliveries from Retail POS
            let badgeStyle = '';
            if (entry.payment_mode === 'UPI') badgeStyle = 'bg-purple-100 text-purple-700 border-purple-200';
            else if (entry.payment_mode === 'Cash') badgeStyle = 'bg-green-100 text-green-700 border-green-200';
            else badgeStyle = 'bg-indigo-100 text-indigo-700 border-indigo-200'; // For Route Delivery

            // Show Customer Name if it's a route delivery, else just item count
            const detailText = entry.customer_name 
                ? `<span class="text-indigo-600 font-bold">${entry.customer_name}</span> <span class="text-xs text-gray-400">(${entry.total_items} items)</span>` 
                : `<span class="text-gray-800 font-semibold">Retail Sale</span> <span class="text-xs text-gray-400">(${entry.total_items} items)</span>`;

            const tr = document.createElement('tr');
            tr.className = "hover:bg-blue-50/40 transition-colors border-b border-gray-50/50 cursor-pointer";
            tr.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-gray-400 font-bold text-xs tracking-wider">${timeStr}</td>
                <td class="px-6 py-4">${detailText}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-3 py-1 inline-flex text-[10px] uppercase tracking-wider font-black rounded border ${badgeStyle}">
                        ${entry.payment_mode}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right font-black text-gray-900 text-base">
                    ${formatINR(entry.grand_total)}
                </td>
            `;
            elements.tableBody.appendChild(tr);
        });
    }
});
// static/js/reports.js

document.addEventListener('DOMContentLoaded', async () => {
    
    // --- State & DOM Elements ---
    const datePicker = document.getElementById('reportDate');
    const tableBody = document.getElementById('reportsTableBody');
    const exportCsvBtn = document.getElementById('exportCsvBtn');
    
    // KPI Elements
    const kpiTotal = document.getElementById('selectedDailyTotal');
    const kpiCount = document.getElementById('selectedDailyCount');
    const kpiAvg = document.getElementById('selectedDailyAvg');

    let weeklyChartInstance = null;

    // --- Initialization ---
    // Set date picker to today in local timezone format (YYYY-MM-DD)
    const today = new Date();
    const todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
    datePicker.value = todayStr;

    initReports();

    async function initReports() {
        // Run both fetches simultaneously for speed
        await Promise.all([
            loadDailyEntries(todayStr),
            loadWeeklyChart()
        ]);
    }

    // --- Event Listeners ---
    // Trigger new fetch when date is changed
    datePicker.addEventListener('change', (e) => {
        loadDailyEntries(e.target.value);
    });

    // CSV Export Logic
    exportCsvBtn.addEventListener('click', () => {
        const selectedDate = datePicker.value;
        exportTableToCSV(`SundarMilk_Ledger_${selectedDate}.csv`);
    });

    // --- Core Functions ---

    // 1. Load One-by-One Entries
    async function loadDailyEntries(dateString) {
        // UI Loading State
        tableBody.innerHTML = `<tr><td colspan="4" class="px-6 py-8 text-center text-blue-500 font-bold"><span class="animate-pulse">Fetching ledger...</span></td></tr>`;
        kpiTotal.innerHTML = `<span class="animate-pulse bg-blue-100 text-transparent rounded">000</span>`;
        kpiCount.innerHTML = `<span class="animate-pulse bg-gray-200 text-transparent rounded">000</span>`;
        kpiAvg.innerHTML = `<span class="animate-pulse bg-gray-200 text-transparent rounded">000</span>`;

        try {
            const res = await fetch(`/api/reports/entries?date=${dateString}`);
            if (!res.ok) throw new Error("Failed to fetch entries");
            const entries = await res.json();
            
            renderLedger(entries);
            calculateKPIs(entries);

        } catch (error) {
            console.error(error);
            tableBody.innerHTML = `<tr><td colspan="4" class="px-6 py-8 text-center text-red-500 font-bold">Error loading database records.</td></tr>`;
        }
    }

    function renderLedger(entries) {
        tableBody.innerHTML = '';

        if (entries.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="4" class="px-6 py-10 text-center text-gray-400 font-medium">No sales recorded for this date.</td></tr>`;
            return;
        }

        entries.forEach(entry => {
            const timeObj = new Date(entry.timestamp);
            const timeStr = timeObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            
            // Build item list string
            const itemsList = entry.items.map(i => `${i.qty}x ${i.product_name}`).join(', ');

            const badgeColor = entry.payment_mode === 'UPI' ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-green-100 text-green-700 border-green-200';

            const tr = document.createElement('tr');
            tr.className = "hover:bg-blue-50/40 transition-colors border-b border-gray-50";
            tr.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-gray-500 font-mono text-xs">${timeStr}</td>
                <td class="px-6 py-4">
                    <div class="text-gray-800 font-semibold">${entry.total_items} total units</div>
                    <div class="text-xs text-gray-400 mt-1 truncate w-48" title="${itemsList}">${itemsList}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-md border ${badgeColor}">
                        ${entry.payment_mode}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right font-black text-gray-800 text-base">
                    ${formatINR(entry.grand_total)}
                </td>
            `;
            tableBody.appendChild(tr);
        });
    }

    function calculateKPIs(entries) {
        if (entries.length === 0) {
            kpiTotal.innerText = '₹0';
            kpiCount.innerText = '0';
            kpiAvg.innerText = '₹0';
            return;
        }

        const totalRevenue = entries.reduce((sum, item) => sum + item.grand_total, 0);
        const transactionCount = entries.length;
        const avgTicket = totalRevenue / transactionCount;

        kpiTotal.innerText = formatINR(totalRevenue);
        kpiCount.innerText = transactionCount.toLocaleString('en-IN');
        kpiAvg.innerText = formatINR(avgTicket);
    }

    // 2. Load Weekly Aggregation Chart
    async function loadWeeklyChart() {
        try {
            const res = await fetch('/api/reports/weekly');
            const weeklyData = await res.json();
            
            const labels = weeklyData.map(day => day._id); // YYYY-MM-DD
            const revenues = weeklyData.map(day => day.total_revenue);

            const ctx = document.getElementById('weeklyReportChart').getContext('2d');
            
            weeklyChartInstance = new Chart(ctx, {
                type: 'bar', // Using Bar chart for distinct daily visual comparison
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Daily Revenue',
                        data: revenues,
                        backgroundColor: '#3b82f6', // blue-500
                        borderRadius: 6,
                        hoverBackgroundColor: '#1d4ed8' // blue-700
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: '#1e293b',
                            titleFont: { size: 14 },
                            bodyFont: { size: 14, weight: 'bold' },
                            callbacks: {
                                label: function(context) { return ' ₹ ' + context.parsed.y.toLocaleString('en-IN'); }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: { borderDash: [4, 4], color: '#f1f5f9' },
                            ticks: { color: '#64748b', font: { weight: 'bold' } }
                        },
                        x: {
                            grid: { display: false },
                            ticks: { color: '#64748b', font: { weight: 'bold' } }
                        }
                    }
                }
            });
        } catch (error) {
            console.error("Chart load error:", error);
        }
    }

    // --- Utilities ---
    function formatINR(number) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 2
        }).format(number);
    }

    function exportTableToCSV(filename) {
        let csv = [];
        let rows = document.querySelectorAll("#reportsTable tr");
        
        for (let i = 0; i < rows.length; i++) {
            let row = [];
            let cols = rows[i].querySelectorAll("td, th");
            
            for (let j = 0; j < cols.length; j++) {
                // Clean up text (remove newlines and excess spaces, escape quotes)
                let text = cols[j].innerText.replace(/(\r\n|\n|\r)/gm, " ").trim();
                row.push('"' + text + '"'); 
            }
            csv.push(row.join(","));
        }

        downloadCSV(csv.join("\n"), filename);
    }

    function downloadCSV(csv, filename) {
        let csvFile = new Blob([csv], { type: "text/csv" });
        let downloadLink = document.createElement("a");
        downloadLink.download = filename;
        downloadLink.href = window.URL.createObjectURL(csvFile);
        downloadLink.style.display = "none";
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    }
});
document.addEventListener('DOMContentLoaded', () => {
    
    // Core Elements
    const tableBody = document.getElementById('inventoryTableBody');
    const addStockForm = document.getElementById('addStockForm');
    const submitBtn = document.getElementById('submitStockBtn');
    const searchInput = document.getElementById('searchInput');
    const toastContainer = document.getElementById('toastContainer');
    
    // KPIs
    const kpiAlerts = document.getElementById('lowStockAlert');
    const kpiValue = document.getElementById('kpi-value');
    const kpiItems = document.getElementById('kpi-items');

    // Sidebar
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const closeSidebarBtn = document.getElementById('closeSidebarBtn');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    // Form Moding
    const formTitle = document.getElementById('formTitle');
    const formHeaderBox = document.getElementById('formHeaderBox');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    const formMode = document.getElementById('form_mode');
    const editOrigName = document.getElementById('edit_original_name');
    const editOrigUnit = document.getElementById('edit_original_unit');
    const qtyLabel = document.getElementById('qtyLabel');

    // Hybrid UI Elements
    const prodSelect = document.getElementById('product_name_select');
    const prodCustomDiv = document.getElementById('product_name_custom_div');
    const prodInput = document.getElementById('product_name_input');
    const cancelProdBtn = document.getElementById('cancel_custom_product');

    const unitSelect = document.getElementById('unit_type_select');
    const unitCustomDiv = document.getElementById('unit_type_custom_div');
    const unitInput = document.getElementById('unit_type_input');
    const cancelUnitBtn = document.getElementById('cancel_custom_unit');

    let globalInventory = []; 

    fetchInventory();

    // --- 1. Navigation Logic ---
    function toggleSidebar() {
        if (sidebar.classList.contains('-translate-x-full')) {
            sidebar.classList.remove('-translate-x-full');
            sidebarOverlay.classList.remove('hidden');
        } else {
            sidebar.classList.add('-translate-x-full');
            sidebarOverlay.classList.add('hidden');
        }
    }
    mobileMenuBtn.addEventListener('click', toggleSidebar);
    closeSidebarBtn.addEventListener('click', toggleSidebar);
    sidebarOverlay.addEventListener('click', toggleSidebar);

    // --- 2. Hybrid Input Toggles ---
    prodSelect.addEventListener('change', (e) => {
        if (e.target.value === 'custom') {
            prodSelect.classList.add('hidden'); prodSelect.removeAttribute('required');
            prodCustomDiv.classList.remove('hidden'); prodCustomDiv.classList.add('flex');
            prodInput.setAttribute('required', 'true'); prodInput.focus();
        }
    });

    cancelProdBtn.addEventListener('click', () => {
        prodCustomDiv.classList.add('hidden'); prodCustomDiv.classList.remove('flex');
        prodInput.removeAttribute('required'); prodInput.value = '';
        prodSelect.classList.remove('hidden'); prodSelect.setAttribute('required', 'true');
        prodSelect.value = ''; 
    });

    unitSelect.addEventListener('change', (e) => {
        if (e.target.value === 'custom') {
            unitSelect.classList.add('hidden'); unitSelect.removeAttribute('required');
            unitCustomDiv.classList.remove('hidden'); unitCustomDiv.classList.add('flex');
            unitInput.setAttribute('required', 'true'); unitInput.focus();
        }
    });

    cancelUnitBtn.addEventListener('click', () => {
        unitCustomDiv.classList.add('hidden'); unitCustomDiv.classList.remove('flex');
        unitInput.removeAttribute('required'); unitInput.value = '';
        unitSelect.classList.remove('hidden'); unitSelect.setAttribute('required', 'true');
        unitSelect.value = 'Packet'; 
    });

    function populateDropdown() {
        const uniqueProducts = [...new Set(globalInventory.map(i => i.product_name))];
        
        Array.from(prodSelect.options).forEach(opt => {
            if (opt.value && opt.value !== 'custom') opt.remove();
        });

        uniqueProducts.forEach(name => {
            const opt = document.createElement('option');
            opt.value = name; opt.textContent = name;
            prodSelect.insertBefore(opt, prodSelect.options[1]); 
        });
    }

    // --- 3. Data Fetching & Calculation ---
    async function fetchInventory() {
        try {
            const response = await fetch('/api/inventory/');
            if (!response.ok) throw new Error("Failed to fetch");
            
            globalInventory = await response.json();
            
            renderTable(globalInventory);
            calculateKPIs(globalInventory);
            populateDropdown();

        } catch (error) {
            console.error(error); // Logs exact error to console for debugging
            tableBody.innerHTML = `<tr><td colspan="4" class="px-6 py-10 text-center text-red-500 font-bold">Database connection lost.</td></tr>`;
        }
    }

    function calculateKPIs(data) {
        const lowStockItems = data.filter(item => item.available_quantity < 15).length;
        const totalValue = data.reduce((sum, item) => sum + (item.available_quantity * (item.cost_price || 0)), 0);
        const totalItems = data.length;

        kpiAlerts.innerText = lowStockItems;
        kpiItems.innerText = totalItems;
        kpiValue.innerText = `₹${totalValue.toLocaleString('en-IN', {maximumFractionDigits:0})}`;

        const lowStockCard = document.getElementById('lowStockCard');

        // THE FIX: Properly target parent elements to avoid null crashes
        if (lowStockItems === 0) {
            lowStockCard.classList.replace('from-red-50', 'from-green-50');
            lowStockCard.classList.replace('border-red-100', 'border-green-100');
            
            kpiAlerts.classList.replace('text-red-600', 'text-green-600');
            kpiAlerts.previousElementSibling.classList.replace('text-red-400', 'text-green-500');
            kpiAlerts.previousElementSibling.querySelector('span').classList.replace('bg-red-500', 'bg-green-500');
            
            kpiAlerts.parentElement.nextElementSibling.classList.replace('bg-red-100', 'bg-green-100');
            kpiAlerts.parentElement.nextElementSibling.classList.replace('text-red-600', 'text-green-600');
        } else {
            lowStockCard.classList.replace('from-green-50', 'from-red-50');
            lowStockCard.classList.replace('border-green-100', 'border-red-100');
            
            kpiAlerts.classList.replace('text-green-600', 'text-red-600');
            kpiAlerts.previousElementSibling.classList.replace('text-green-500', 'text-red-400');
            kpiAlerts.previousElementSibling.querySelector('span').classList.replace('bg-green-500', 'bg-red-500');
            
            kpiAlerts.parentElement.nextElementSibling.classList.replace('bg-green-100', 'bg-red-100');
            kpiAlerts.parentElement.nextElementSibling.classList.replace('text-green-600', 'text-red-600');
        }
    }

    function renderTable(data) {
        tableBody.innerHTML = '';

        if (data.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="4" class="px-6 py-10 text-center text-gray-500 font-medium">Warehouse is empty.</td></tr>`;
            return;
        }

        data.forEach((item, index) => {
            const isLowStock = item.available_quantity < 15;
            const stockBadgeClass = isLowStock ? 'bg-red-100 text-red-700 border-red-200 animate-pulse' : 'bg-green-100 text-green-700 border-green-200';
            
            // THE FIX: Safe margin calculation to prevent divide-by-zero Infinity crashes
            const margin = item.selling_price > 0 ? (((item.selling_price - item.cost_price) / item.selling_price) * 100).toFixed(1) : 0;

            const tr = document.createElement('tr');
            tr.className = `hover:bg-blue-50/40 transition-colors ${isLowStock ? 'bg-red-50/10' : ''}`;
            tr.innerHTML = `
                <td class="px-4 lg:px-6 py-4">
                    <div class="font-bold text-gray-900 text-base leading-tight">${item.product_name}</div>
                    <div class="text-[10px] font-black text-gray-400 mt-1 uppercase tracking-wider bg-gray-100 inline-block px-1.5 rounded">${item.unit_type}</div>
                </td>
                <td class="px-4 lg:px-6 py-4 text-right">
                    <div class="text-xs">
                        <span class="text-gray-400">Buy: </span><span class="font-semibold text-gray-600">₹${(item.cost_price || 0).toFixed(2)}</span>
                    </div>
                    <div class="text-sm mt-0.5">
                        <span class="text-gray-400">Sell: </span><span class="font-black text-blue-600">₹${(item.selling_price || 0).toFixed(2)}</span>
                    </div>
                </td>
                <td class="px-4 lg:px-6 py-4 text-center">
                    <span class="px-3 py-1 inline-flex text-sm font-black rounded-lg border shadow-sm ${stockBadgeClass}">
                        ${item.available_quantity}
                    </span>
                </td>
                <td class="px-4 lg:px-6 py-4">
                    <div class="flex items-center justify-center gap-2">
                        <button onclick="triggerEdit(${index})" class="p-1.5 text-blue-500 hover:bg-blue-100 rounded-lg transition" title="Edit Item">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                        </button>
                        <button onclick="triggerSpoilage('${item.product_name}', '${item.unit_type}')" class="p-1.5 text-orange-500 hover:bg-orange-100 rounded-lg transition" title="Log Spoilage/Leakage">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                        </button>
                        <button onclick="triggerDelete('${item.product_name}', '${item.unit_type}')" class="p-1.5 text-red-500 hover:bg-red-100 rounded-lg transition" title="Delete Product">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                    </div>
                </td>
            `;
            tableBody.appendChild(tr);
        });
    }

    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = globalInventory.filter(item => 
            item.product_name.toLowerCase().includes(term) || item.unit_type.toLowerCase().includes(term)
        );
        renderTable(filtered);
    });

    // --- 4. C.R.U.D Operations ---

    // EDIT MODE TOGGLE
    window.triggerEdit = function(index) {
        const item = globalInventory[index];
        
        formMode.value = 'edit';
        editOrigName.value = item.product_name;
        editOrigUnit.value = item.unit_type;

        prodSelect.value = 'custom';
        prodSelect.dispatchEvent(new Event('change'));
        prodInput.value = item.product_name;

        unitSelect.value = 'custom';
        unitSelect.dispatchEvent(new Event('change'));
        unitInput.value = item.unit_type;

        document.getElementById('quantity').value = item.available_quantity;
        document.getElementById('cost_price').value = item.cost_price;
        document.getElementById('selling_price').value = item.selling_price;

        formHeaderBox.classList.replace('bg-slate-900', 'bg-blue-600');
        formTitle.innerHTML = `<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg> Edit Mode: Override Data`;
        submitBtn.innerHTML = 'UPDATE DATABASE';
        submitBtn.classList.replace('bg-slate-900', 'bg-blue-600');
        submitBtn.classList.replace('hover:bg-slate-800', 'hover:bg-blue-700');
        qtyLabel.innerText = "Exact Total Stock (Override)";
        cancelEditBtn.classList.remove('hidden');
        
        document.getElementById('addStockForm').scrollIntoView({ behavior: 'smooth' });
    };

    cancelEditBtn.addEventListener('click', resetFormMode);

    function resetFormMode() {
        addStockForm.reset();
        formMode.value = 'add';
        cancelProdBtn.click(); cancelUnitBtn.click();
        
        formHeaderBox.classList.replace('bg-blue-600', 'bg-slate-900');
        formTitle.innerHTML = `<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg> Receive Shipment`;
        submitBtn.innerHTML = '+ ADD TO WAREHOUSE';
        submitBtn.classList.replace('bg-blue-600', 'bg-slate-900');
        submitBtn.classList.replace('hover:bg-blue-700', 'hover:bg-slate-800');
        qtyLabel.innerText = "Qty to Add";
        cancelEditBtn.classList.add('hidden');
    }

    // FORM SUBMIT
    addStockForm.addEventListener('submit', async (e) => {
        e.preventDefault(); 
        
        const isEdit = formMode.value === 'edit';
        const endpoint = isEdit ? '/api/inventory/edit' : '/api/inventory/add';

        submitBtn.innerHTML = '<span class="animate-pulse">PROCESSING...</span>';
        submitBtn.disabled = true;

        const finalProductName = prodSelect.value === 'custom' ? prodInput.value.trim() : prodSelect.value;
        const finalUnitType = unitSelect.value === 'custom' ? unitInput.value.trim() : unitSelect.value;

        const payload = {
            product_name: finalProductName,
            unit_type: finalUnitType,
            quantity: parseInt(document.getElementById('quantity').value),
            cost_price: parseFloat(document.getElementById('cost_price').value),
            selling_price: parseFloat(document.getElementById('selling_price').value)
        };

        if (isEdit) {
            payload.original_name = editOrigName.value;
            payload.original_unit = editOrigUnit.value;
        }

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                showToast(isEdit ? 'Product updated successfully!' : 'Stock added successfully!', 'success');
                resetFormMode();
                await fetchInventory(); 
            } else {
                showToast('Server error. Try again.', 'error');
            }
        } catch (error) {
            showToast('Database connection failed.', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = isEdit ? 'UPDATE DATABASE' : '+ ADD TO WAREHOUSE';
        }
    });

    // SPOILAGE LOGGING
    window.triggerSpoilage = async function(name, unit) {
        const qtyStr = prompt(`How many units of ${name} (${unit}) were damaged/leaked?\nThis will deduct stock and log a financial expense.`);
        if (!qtyStr) return;
        
        const qty = parseInt(qtyStr);
        if (isNaN(qty) || qty <= 0) {
            alert("Invalid quantity."); return;
        }

        try {
            const response = await fetch('/api/inventory/spoilage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ product_name: name, unit_type: unit, qty: qty })
            });

            const result = await response.json();
            if (response.ok) {
                showToast(result.message, 'success');
                await fetchInventory();
            } else {
                showToast(result.error, 'error');
            }
        } catch (error) {
            showToast('Network error logging spoilage.', 'error');
        }
    };

    // DELETE PRODUCT
    window.triggerDelete = async function(name, unit) {
        if (!confirm(`CRITICAL WARNING\nAre you absolutely sure you want to permanently delete ${name} (${unit}) from the database?`)) return;

        try {
            const response = await fetch('/api/inventory/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ product_name: name, unit_type: unit })
            });

            if (response.ok) {
                showToast(`${name} deleted.`, 'success');
                await fetchInventory();
            } else {
                showToast('Error deleting product.', 'error');
            }
        } catch (error) {
            showToast('Network error.', 'error');
        }
    };

    // --- 5. UI Utilities ---
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        const bgColor = type === 'error' ? 'bg-red-600' : (type === 'success' ? 'bg-green-600' : 'bg-slate-900');
        const icon = type === 'error' ? 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' : 'M5 13l4 4L19 7';

        toast.className = `toast-enter flex items-center p-4 text-white rounded-xl shadow-2xl pointer-events-auto ${bgColor}`;
        toast.innerHTML = `
            <svg class="w-6 h-6 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${icon}"></path></svg>
            <div class="font-bold text-sm tracking-wide">${message}</div>
        `;
        toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.style.animation = 'slideInRight 0.3s cubic-bezier(0.4, 0, 0.2, 1) reverse forwards';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
});
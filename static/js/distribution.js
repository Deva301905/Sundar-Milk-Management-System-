document.addEventListener('DOMContentLoaded', () => {
    
    // Core Elements
    const manifestList = document.getElementById('manifestList');
    const customerSelect = document.getElementById('drop_customer');
    const productSelect = document.getElementById('drop_product');
    
    // Tab Elements
    const tabDrop = document.getElementById('tabDrop');
    const tabRegister = document.getElementById('tabRegister');
    const viewDrop = document.getElementById('viewDrop');
    const viewRegister = document.getElementById('viewRegister');

    // Drop Cart Elements
    const dropQtyInput = document.getElementById('drop_qty');
    const dropCashInput = document.getElementById('drop_cash');
    const addItemBtn = document.getElementById('addItemBtn');
    const dropCartList = document.getElementById('dropCartList');
    const dropTotalBill = document.getElementById('drop_total_bill');
    const dispatchBtn = document.getElementById('dispatchBtn');

    // Registration Elements
    const addCustomerForm = document.getElementById('addCustomerForm');
    const formStatus = document.getElementById('formStatus');
    const submitRegBtn = document.getElementById('submitRegBtn');

    // State
    let customers = [];
    let inventory = [];
    let dropCart = [];
    let currentDropTotal = 0;

    // Initialization
    fetchCustomers();
    fetchInventory();

    // --- 1. Tab Navigation Logic ---
    tabDrop.addEventListener('click', () => {
        viewDrop.classList.remove('hidden');
        viewRegister.classList.add('hidden');
        tabDrop.classList.add('font-black', 'text-indigo-700', 'border-b-2', 'border-indigo-600', 'bg-white');
        tabDrop.classList.remove('font-bold', 'text-gray-500', 'bg-gray-50');
        tabRegister.classList.add('font-bold', 'text-gray-500');
        tabRegister.classList.remove('font-black', 'text-indigo-700', 'border-b-2', 'border-indigo-600', 'bg-white');
    });

    tabRegister.addEventListener('click', () => {
        viewRegister.classList.remove('hidden');
        viewDrop.classList.add('hidden');
        tabRegister.classList.add('font-black', 'text-indigo-700', 'border-b-2', 'border-indigo-600', 'bg-white');
        tabRegister.classList.remove('font-bold', 'text-gray-500', 'bg-gray-50');
        tabDrop.classList.add('font-bold', 'text-gray-500');
        tabDrop.classList.remove('font-black', 'text-indigo-700', 'border-b-2', 'border-indigo-600', 'bg-white');
    });


    // --- 2. Data Fetching ---
    async function fetchInventory() {
        try {
            const response = await fetch('/api/inventory/');
            inventory = await response.json();
            
            productSelect.innerHTML = '<option value="" disabled selected>-- Select Product --</option>';
            inventory.forEach(item => {
                const option = document.createElement('option');
                // Store serialized data in value for easy retrieval
                option.value = JSON.stringify({
                    name: item.product_name,
                    unit: item.unit_type,
                    price: item.selling_price
                });
                option.textContent = `${item.product_name} (${item.unit_type}) - ₹${item.selling_price}`;
                productSelect.appendChild(option);
            });
        } catch (error) {
            productSelect.innerHTML = '<option value="" disabled>Error loading inventory</option>';
        }
    }

    async function fetchCustomers() {
        try {
            const response = await fetch('/api/distribution/customers');
            customers = await response.json();
            
            // Populate Dropdown
            customerSelect.innerHTML = '<option value="" disabled selected>-- Select Shop / Home --</option>';
            customers.forEach(c => {
                const option = document.createElement('option');
                option.value = c.name;
                option.textContent = `${c.name} (${c.type})`;
                customerSelect.appendChild(option);
            });

            renderManifest(customers);
            calculateRouteKPIs(customers);

        } catch (error) {
            manifestList.innerHTML = `<div class="col-span-full text-center py-10 text-red-500 font-bold">Failed to load ledger.</div>`;
        }
    }


    // --- 3. Dynamic Drop Cart Logic ---
    addItemBtn.addEventListener('click', () => {
        const productDataStr = productSelect.value;
        const qty = parseInt(dropQtyInput.value);

        if (!productDataStr || isNaN(qty) || qty <= 0) {
            alert("Please select a product and valid quantity.");
            return;
        }

        const product = JSON.parse(productDataStr);
        const itemTotal = product.price * qty;

        // Check if item already exists in cart, update qty if it does
        const existingItem = dropCart.find(i => i.product_name === product.name && i.unit_type === product.unit);
        if (existingItem) {
            existingItem.qty += qty;
            existingItem.price += itemTotal;
        } else {
            dropCart.push({
                product_name: product.name,
                unit_type: product.unit,
                qty: qty,
                unit_price: product.price,
                price: itemTotal
            });
        }

        updateDropCartUI();
        dropQtyInput.value = '';
        productSelect.value = '';
    });

    function updateDropCartUI() {
        dropCartList.innerHTML = '';
        currentDropTotal = 0;

        if (dropCart.length === 0) {
            dropCartList.innerHTML = '<li class="text-gray-400 text-center font-medium italic py-2">Cart is empty</li>';
            dispatchBtn.disabled = true;
        } else {
            dispatchBtn.disabled = false;
        }

        dropCart.forEach((item, index) => {
            currentDropTotal += item.price;
            const li = document.createElement('li');
            li.className = "flex justify-between items-center bg-white p-2 rounded-lg border border-gray-100 shadow-sm";
            li.innerHTML = `
                <div class="flex-1">
                    <span class="font-bold text-gray-800">${item.qty}x</span> <span class="text-gray-600">${item.product_name} <span class="text-[10px] uppercase bg-gray-100 px-1 rounded">${item.unit_type}</span></span>
                </div>
                <div class="flex items-center gap-3">
                    <span class="font-black text-gray-800">₹${item.price.toFixed(2)}</span>
                    <button onclick="removeCartItem(${index})" class="text-red-400 hover:text-red-600 font-bold px-2 bg-red-50 rounded">✕</button>
                </div>
            `;
            dropCartList.appendChild(li);
        });

        dropTotalBill.innerText = `₹${currentDropTotal.toFixed(2)}`;
        
        // Auto-suggest full payment in the cash input for speed
        if (dropCart.length > 0 && !dropCashInput.value) {
            dropCashInput.value = currentDropTotal;
        } else if (dropCart.length === 0) {
            dropCashInput.value = '';
        }
    }

    window.removeCartItem = function(index) {
        dropCart.splice(index, 1);
        updateDropCartUI();
    };

    // --- 4. Submit Drop (Dispatch) ---
    dispatchBtn.addEventListener('click', async () => {
        const customerName = customerSelect.value;
        const cashReceived = dropCashInput.value || 0;

        if (!customerName) {
            alert("Please select a customer for this drop.");
            return;
        }

        dispatchBtn.innerHTML = '<span class="animate-pulse">PROCESSING...</span>';
        dispatchBtn.disabled = true;

        try {
            const response = await fetch('/api/distribution/deliver', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    name: customerName, 
                    items: dropCart,
                    cash_received: cashReceived
                })
            });

            if (response.ok) {
                // Reset Drop Cart Interface
                dropCart = [];
                updateDropCartUI();
                customerSelect.value = '';
                dropCashInput.value = '';
                
                await fetchCustomers(); // Updates Ledger UI
                await fetchInventory(); // Refresh stock
            } else {
                alert("Database error processing drop.");
            }
        } catch (err) {
            console.error(err);
        } finally {
            dispatchBtn.innerHTML = 'MARK DELIVERED';
        }
    });

    // --- 5. Registration ---
    addCustomerForm.addEventListener('submit', async (e) => {
        e.preventDefault(); 
        
        submitRegBtn.innerHTML = '<span class="animate-pulse">REGISTERING...</span>';
        submitRegBtn.disabled = true;

        const payload = {
            name: document.getElementById('customer_name').value.trim(),
            type: document.getElementById('customer_type').value,
            address: document.getElementById('customer_address').value.trim()
        };

        try {
            const response = await fetch('/api/distribution/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                document.getElementById('customer_name').value = '';
                document.getElementById('customer_address').value = '';
                
                // Show Success
                formStatus.textContent = 'Account created! Switch to Drop tab to bill them.';
                formStatus.className = 'p-3 rounded-lg text-sm font-bold text-center bg-green-100 text-green-800 border border-green-200 mb-4 block';
                
                await fetchCustomers(); 
            } else {
                const resData = await response.json();
                formStatus.textContent = resData.error || 'Registration failed.';
                formStatus.className = 'p-3 rounded-lg text-sm font-bold text-center bg-red-100 text-red-800 border border-red-200 mb-4 block';
            }
        } catch (error) {
            alert("Network Error.");
        } finally {
            submitRegBtn.innerHTML = 'REGISTER ACCOUNT';
            submitRegBtn.disabled = false;
            setTimeout(() => { formStatus.classList.add('hidden'); }, 4000);
        }
    });


    // --- 6. Render UI & Ledger Badges ---
    function renderManifest(data) {
        manifestList.innerHTML = '';

        if (data.length === 0) {
            manifestList.innerHTML = `<div class="col-span-full text-center py-10 text-gray-400 font-medium">No customers registered yet.</div>`;
            return;
        }

        data.forEach(c => {
            const isDelivered = c.status === 'Delivered';
            const badgeIcon = c.type === 'Store' ? '🏪 Store' : '🏠 Home';
            
            // Khata Balance Logic
            let balanceClass = 'bg-gray-100 text-gray-600 border-gray-200';
            let balanceText = 'Settled (₹0)';
            
            if (c.balance > 0) {
                balanceClass = 'bg-red-50 text-red-600 border-red-200 shadow-sm';
                balanceText = `Owes: ₹${c.balance.toFixed(2)}`;
            } else if (c.balance < 0) {
                balanceClass = 'bg-green-50 text-green-600 border-green-200 shadow-sm';
                balanceText = `Advance: ₹${Math.abs(c.balance).toFixed(2)}`;
            }

            const card = document.createElement('div');
            card.className = `p-5 rounded-2xl border transition-all bg-white ${isDelivered ? 'border-indigo-300 shadow-md ring-1 ring-indigo-100' : 'border-gray-200 hover:shadow-md'}`;
            
            card.innerHTML = `
                <div class="flex justify-between items-start mb-3">
                    <div class="flex items-center gap-2">
                        <span class="text-xl">${badgeIcon.split(' ')[0]}</span>
                        <h3 class="text-lg font-black text-gray-800 leading-tight">${c.name}</h3>
                    </div>
                    ${isDelivered ? `<span class="bg-indigo-600 text-white text-[10px] font-black uppercase px-2 py-1 rounded shadow-sm">Dropped Today</span>` : ''}
                </div>
                
                <p class="text-xs text-gray-500 font-medium mb-4 truncate" title="${c.address}">${c.address}</p>
                
                <div class="border-t border-gray-100 pt-3 flex justify-between items-center">
                    <span class="text-[10px] font-bold text-gray-400 uppercase">Khata Balance</span>
                    <span class="px-3 py-1 font-black text-sm rounded-lg border ${balanceClass}">
                        ${balanceText}
                    </span>
                </div>
            `;
            manifestList.appendChild(card);
        });
    }

    // --- 7. Calculate Top KPIs ---
    // Note: To make this robust, we would ideally fetch today's exact route sales from the /api/reports/entries logic.
    // For this UI, we can leave the KPI static or build a fetch route in the future. 
    function calculateRouteKPIs(data) {
        // Placeholder implementation - will be expanded if needed.
        // In a true environment, we'd query the sales_collection for today's "Route Delivery" payments.
        document.getElementById('kpi_route_sales').innerText = "Live in Dashboard";
        document.getElementById('kpi_route_cash').innerText = "Live in Dashboard";
    }
});
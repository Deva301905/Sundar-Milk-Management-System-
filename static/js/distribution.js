document.addEventListener('DOMContentLoaded', () => {
    
    // Core Elements
    const manifestList = document.getElementById('manifestList');
    const customerSelect = document.getElementById('drop_customer');
    const productSelect = document.getElementById('drop_product');
    const searchInput = document.getElementById('searchCustomer');
    const toastContainer = document.getElementById('toastContainer');
    
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

    // Registration/Edit Elements
    const addCustomerForm = document.getElementById('addCustomerForm');
    const formMode = document.getElementById('form_mode');
    const editOrigName = document.getElementById('edit_original_name');
    const formStatus = document.getElementById('formStatus');
    const submitRegBtn = document.getElementById('submitRegBtn');
    const cancelEditBtn = document.getElementById('cancelEditBtn');

    // 360 Modal Elements
    const customerModal = document.getElementById('customerModal');
    const customerBackdrop = document.getElementById('customerBackdrop');
    const customerPanel = document.getElementById('customerPanel');
    const closeCustomerBtn = document.getElementById('closeCustomerBtn');
    
    const modalCustName = document.getElementById('modalCustName');
    const modalCustAddress = document.getElementById('modalCustAddress');
    const modalBalance = document.getElementById('modalBalance');
    const modalHistoryList = document.getElementById('modalHistoryList');
    const settleForm = document.getElementById('settleForm');
    const settleAmount = document.getElementById('settleAmount');
    
    const editCustBtn = document.getElementById('editCustBtn');
    const deleteCustBtn = document.getElementById('deleteCustBtn');

    // State
    let customers = [];
    let inventory = [];
    let dropCart = [];
    let currentDropTotal = 0;
    let activeModalCustomer = null;

    // Initialization
    fetchCustomers();
    fetchInventory();

    // --- 1. Tab Navigation Logic ---
    function openDropTab() {
        viewDrop.classList.remove('hidden'); viewRegister.classList.add('hidden');
        tabDrop.classList.add('font-black', 'text-indigo-700', 'border-b-2', 'border-indigo-600', 'bg-white', 'dark:text-indigo-400', 'dark:border-indigo-500', 'dark:bg-slate-800');
        tabDrop.classList.remove('font-bold', 'text-gray-500', 'bg-gray-50', 'dark:bg-slate-900');
        tabRegister.classList.add('font-bold', 'text-gray-500');
        tabRegister.classList.remove('font-black', 'text-indigo-700', 'border-b-2', 'border-indigo-600', 'bg-white', 'dark:text-indigo-400', 'dark:border-indigo-500', 'dark:bg-slate-800');
    }

    function openRegisterTab(isEdit = false) {
        viewRegister.classList.remove('hidden'); viewDrop.classList.add('hidden');
        tabRegister.classList.add('font-black', 'text-indigo-700', 'border-b-2', 'border-indigo-600', 'bg-white', 'dark:text-indigo-400', 'dark:border-indigo-500', 'dark:bg-slate-800');
        tabRegister.classList.remove('font-bold', 'text-gray-500', 'bg-gray-50', 'dark:bg-slate-900');
        tabDrop.classList.add('font-bold', 'text-gray-500');
        tabDrop.classList.remove('font-black', 'text-indigo-700', 'border-b-2', 'border-indigo-600', 'bg-white', 'dark:text-indigo-400', 'dark:border-indigo-500', 'dark:bg-slate-800');
        if(!isEdit) resetRegForm();
    }

    tabDrop.addEventListener('click', openDropTab);
    tabRegister.addEventListener('click', () => openRegisterTab(false));

    // --- 2. Data Fetching ---
    async function fetchInventory() {
        try {
            const response = await fetch('/api/inventory/');
            inventory = await response.json();
            
            productSelect.innerHTML = '<option value="" disabled selected>-- Select Product --</option>';
            inventory.forEach(item => {
                const option = document.createElement('option');
                option.value = JSON.stringify({ name: item.product_name, unit: item.unit_type, price: item.selling_price });
                option.textContent = `${item.product_name} (${item.unit_type}) - ₹${item.selling_price}`;
                productSelect.appendChild(option);
            });
        } catch (error) { productSelect.innerHTML = '<option value="" disabled>Error loading inventory</option>'; }
    }

    async function fetchCustomers() {
        try {
            const response = await fetch('/api/distribution/customers');
            customers = await response.json();
            
            customerSelect.innerHTML = '<option value="" disabled selected>-- Select Shop / Home --</option>';
            customers.forEach(c => {
                const option = document.createElement('option');
                option.value = c.name; option.textContent = `${c.name} (${c.type})`;
                customerSelect.appendChild(option);
            });

            renderManifest(customers);
        } catch (error) { manifestList.innerHTML = `<div class="col-span-full text-center py-10 text-red-500 font-bold">Failed to load ledger.</div>`; }
    }

    // --- 3. Dynamic Drop Cart Logic ---
    addItemBtn.addEventListener('click', () => {
        const productDataStr = productSelect.value;
        const qty = parseInt(dropQtyInput.value);

        if (!productDataStr || isNaN(qty) || qty <= 0) { showToast("Select product & valid quantity.", "error"); return; }

        const product = JSON.parse(productDataStr);
        const itemTotal = product.price * qty;

        const existingItem = dropCart.find(i => i.product_name === product.name && i.unit_type === product.unit);
        if (existingItem) { existingItem.qty += qty; existingItem.price += itemTotal; } 
        else { dropCart.push({ product_name: product.name, unit_type: product.unit, qty: qty, unit_price: product.price, price: itemTotal }); }

        updateDropCartUI();
        dropQtyInput.value = ''; productSelect.value = '';
    });

    function updateDropCartUI() {
        dropCartList.innerHTML = ''; currentDropTotal = 0;
        if (dropCart.length === 0) {
            dropCartList.innerHTML = '<li class="text-gray-400 dark:text-gray-500 text-center font-medium italic py-2">Cart is empty</li>';
            dispatchBtn.disabled = true;
        } else { dispatchBtn.disabled = false; }

        dropCart.forEach((item, index) => {
            currentDropTotal += item.price;
            const li = document.createElement('li');
            li.className = "flex justify-between items-center bg-white dark:bg-slate-800 p-2 rounded-lg border border-gray-100 dark:border-slate-700 shadow-sm";
            li.innerHTML = `
                <div class="flex-1">
                    <span class="font-bold text-gray-800 dark:text-white">${item.qty}x</span> <span class="text-gray-600 dark:text-gray-300">${item.product_name} <span class="text-[10px] uppercase bg-gray-100 dark:bg-slate-700 px-1 rounded">${item.unit_type}</span></span>
                </div>
                <div class="flex items-center gap-3">
                    <span class="font-black text-gray-800 dark:text-white">₹${item.price.toFixed(2)}</span>
                    <button onclick="removeCartItem(${index})" class="text-red-400 hover:text-red-600 font-bold px-2 bg-red-50 dark:bg-red-900/30 rounded">✕</button>
                </div>
            `;
            dropCartList.appendChild(li);
        });

        dropTotalBill.innerText = `₹${currentDropTotal.toFixed(2)}`;
        if (dropCart.length > 0 && !dropCashInput.value) dropCashInput.value = currentDropTotal;
        else if (dropCart.length === 0) dropCashInput.value = '';
    }

    window.removeCartItem = function(index) { dropCart.splice(index, 1); updateDropCartUI(); };

    dispatchBtn.addEventListener('click', async () => {
        const customerName = customerSelect.value;
        const cashReceived = dropCashInput.value || 0;

        if (!customerName) { showToast("Select a customer.", "error"); return; }

        dispatchBtn.innerHTML = '<span class="animate-pulse">PROCESSING...</span>';
        dispatchBtn.disabled = true;

        try {
            const response = await fetch('/api/distribution/deliver', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: customerName, items: dropCart, cash_received: cashReceived })
            });

            if (response.ok) {
                dropCart = []; updateDropCartUI();
                customerSelect.value = ''; dropCashInput.value = '';
                await fetchCustomers(); await fetchInventory(); 
                showToast("Drop completed and Khata updated!", "success");
            } else { showToast("Error processing drop.", "error"); }
        } catch (err) { showToast("Network error.", "error"); } 
        finally { dispatchBtn.innerHTML = 'MARK DELIVERED'; dispatchBtn.disabled = false;}
    });

    // --- 4. Render Manifest & Search ---
    function renderManifest(data) {
        manifestList.innerHTML = '';
        if (data.length === 0) {
            manifestList.innerHTML = `<div class="col-span-full text-center py-10 text-gray-400 font-medium">No customers found.</div>`;
            return;
        }

        data.forEach(c => {
            const isDelivered = c.status === 'Delivered';
            const badgeIcon = c.type === 'Store' ? '🏪 Store' : '🏠 Home';
            
            let balanceClass = 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-slate-700 dark:text-gray-300 dark:border-slate-600';
            let balanceText = 'Balance: ₹0';
            
            if (c.balance > 0) {
                balanceClass = 'bg-red-50 text-red-600 border-red-200 shadow-sm dark:bg-red-900/30 dark:text-red-400 dark:border-red-800';
                balanceText = `Balance: ₹${c.balance.toFixed(2)}`;
            } else if (c.balance < 0) {
                balanceClass = 'bg-green-50 text-green-600 border-green-200 shadow-sm dark:bg-green-900/30 dark:text-green-400 dark:border-green-800';
                balanceText = `Advance: ₹${Math.abs(c.balance).toFixed(2)}`;
            }

            const card = document.createElement('div');
            card.className = `p-5 rounded-2xl border transition-all bg-white dark:bg-slate-800 cursor-pointer ${isDelivered ? 'border-indigo-300 shadow-md ring-1 ring-indigo-100 dark:ring-indigo-900/50' : 'border-gray-200 dark:border-slate-700 hover:shadow-md'}`;
            card.onclick = () => openCustomer360(c);
            
            card.innerHTML = `
                <div class="flex justify-between items-start mb-3">
                    <div class="flex items-center gap-2">
                        <span class="text-xl">${badgeIcon.split(' ')[0]}</span>
                        <h3 class="text-lg font-black text-gray-800 dark:text-white leading-tight">${c.name}</h3>
                    </div>
                    ${isDelivered ? `<span class="bg-indigo-600 text-white text-[10px] font-black uppercase px-2 py-1 rounded shadow-sm">Dropped</span>` : ''}
                </div>
                <p class="text-xs text-gray-500 font-medium mb-4 truncate" title="${c.address}">${c.address}</p>
                <div class="border-t border-gray-100 dark:border-slate-700 pt-3 flex justify-between items-center">
                    <span class="text-[10px] font-bold text-gray-400 uppercase">Khata</span>
                    <span class="px-3 py-1 font-black text-sm rounded-lg border ${balanceClass}">${balanceText}</span>
                </div>
            `;
            manifestList.appendChild(card);
        });
    }

    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = customers.filter(c => c.name.toLowerCase().includes(term) || c.address.toLowerCase().includes(term));
        renderManifest(filtered);
    });

    // --- 5. Customer 360° View & Settlement ---
    function openCustomer360(customer) {
        activeModalCustomer = customer;
        modalCustName.innerHTML = `${customer.type === 'Store' ? '🏪' : '🏠'} ${customer.name}`;
        modalCustAddress.innerText = customer.address;
        
        if(customer.balance > 0) modalBalance.innerHTML = `<span class="text-red-500">₹${customer.balance.toFixed(2)}</span>`;
        else if (customer.balance < 0) modalBalance.innerHTML = `<span class="text-green-500">Advance: ₹${Math.abs(customer.balance).toFixed(2)}</span>`;
        else modalBalance.innerHTML = `<span class="text-gray-500">₹0.00</span>`;
        
        settleAmount.value = '';
        fetchCustomerHistory(customer.name);

        customerModal.classList.remove('hidden');
        setTimeout(() => {
            customerBackdrop.classList.remove('opacity-0');
            customerPanel.classList.remove('translate-x-full');
        }, 10);
    }

    function closeCustomer360() {
        customerBackdrop.classList.add('opacity-0');
        customerPanel.classList.add('translate-x-full');
        setTimeout(() => { customerModal.classList.add('hidden'); }, 300);
        activeModalCustomer = null;
    }
    closeCustomerBtn.addEventListener('click', closeCustomer360);
    customerBackdrop.addEventListener('click', closeCustomer360);

    async function fetchCustomerHistory(name) {
        modalHistoryList.innerHTML = '<li class="p-4 text-center text-gray-400 text-sm animate-pulse">Loading records...</li>';
        try {
            const res = await fetch(`/api/distribution/history/${encodeURIComponent(name)}`);
            const history = await res.json();
            
            modalHistoryList.innerHTML = '';
            if(history.length === 0) {
                modalHistoryList.innerHTML = '<li class="p-4 text-center text-gray-400 text-sm">No activity in last 30 days.</li>';
                return;
            }

            history.forEach(entry => {
                const dateStr = new Date(entry.timestamp).toLocaleDateString('en-IN', {month:'short', day:'numeric'});
                const isSettlement = entry.payment_mode === 'Khata Settlement';
                
                const li = document.createElement('li');
                li.className = "p-3 flex justify-between items-center text-sm";
                
                if (isSettlement) {
                    li.innerHTML = `
                        <div>
                            <p class="font-bold text-green-600">Payment Received</p>
                            <p class="text-[10px] text-gray-400 uppercase">${dateStr}</p>
                        </div>
                        <div class="text-right">
                            <p class="font-black text-green-600">+ ₹${entry.cash_collected}</p>
                        </div>
                    `;
                } else {
                    li.innerHTML = `
                        <div>
                            <p class="font-bold text-gray-800 dark:text-gray-200">Milk Drop (${entry.total_items} items)</p>
                            <p class="text-[10px] text-gray-400 uppercase">${dateStr} • Paid: ₹${entry.cash_collected}</p>
                        </div>
                        <div class="text-right">
                            <p class="font-black text-gray-800 dark:text-gray-200">Bill: ₹${entry.grand_total}</p>
                        </div>
                    `;
                }
                modalHistoryList.appendChild(li);
            });
        } catch (err) { modalHistoryList.innerHTML = '<li class="p-4 text-center text-red-400 text-sm">Error loading history.</li>'; }
    }

    settleForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const amt = parseFloat(settleAmount.value);
        if(!activeModalCustomer || isNaN(amt) || amt <= 0) return;

        const btn = settleForm.querySelector('button');
        btn.innerHTML = '...'; btn.disabled = true;

        try {
            const res = await fetch('/api/distribution/settle', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: activeModalCustomer.name, amount: amt })
            });
            if(res.ok) {
                showToast(`Settled ₹${amt}`, 'success');
                await fetchCustomers(); // Refresh background data
                openCustomer360(customers.find(c => c.name === activeModalCustomer.name)); // Refresh modal
            } else { showToast("Settlement failed.", "error"); }
        } catch(err) { showToast("Network error.", "error"); }
        finally { btn.innerHTML = 'Settle'; btn.disabled = false; }
    });

    // --- 6. CRUD: Register, Edit, Delete ---
    function resetRegForm() {
        addCustomerForm.reset();
        formMode.value = 'add'; editOrigName.value = '';
        submitRegBtn.innerHTML = 'REGISTER ACCOUNT';
        cancelEditBtn.classList.add('hidden');
    }

    cancelEditBtn.addEventListener('click', resetRegForm);

    editCustBtn.addEventListener('click', () => {
        if(!activeModalCustomer) return;
        closeCustomer360();
        openRegisterTab(true);
        
        formMode.value = 'edit';
        editOrigName.value = activeModalCustomer.name;
        document.getElementById('customer_name').value = activeModalCustomer.name;
        document.getElementById('customer_type').value = activeModalCustomer.type;
        document.getElementById('customer_address').value = activeModalCustomer.address;
        
        submitRegBtn.innerHTML = 'UPDATE DETAILS';
        cancelEditBtn.classList.remove('hidden');
    });

    deleteCustBtn.addEventListener('click', async () => {
        if(!activeModalCustomer) return;
        if(activeModalCustomer.balance > 0) {
            alert(`Cannot delete. ${activeModalCustomer.name} still owes ₹${activeModalCustomer.balance}`);
            return;
        }
        if(!confirm(`Delete ${activeModalCustomer.name} permanently?`)) return;

        try {
            const res = await fetch(`/api/distribution/delete/${encodeURIComponent(activeModalCustomer.name)}`, { method: 'DELETE' });
            if(res.ok) {
                showToast('Customer deleted.', 'success');
                closeCustomer360(); await fetchCustomers();
            } else { showToast('Error deleting customer.', 'error'); }
        } catch(err) { showToast('Network error.', 'error'); }
    });

    addCustomerForm.addEventListener('submit', async (e) => {
        e.preventDefault(); 
        submitRegBtn.innerHTML = '<span class="animate-pulse">PROCESSING...</span>';
        submitRegBtn.disabled = true;

        const isEdit = formMode.value === 'edit';
        const endpoint = isEdit ? '/api/distribution/update' : '/api/distribution/add';

        const payload = {
            name: document.getElementById('customer_name').value.trim(),
            type: document.getElementById('customer_type').value,
            address: document.getElementById('customer_address').value.trim()
        };
        if(isEdit) payload.original_name = editOrigName.value;

        try {
            const response = await fetch(endpoint, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                showToast(isEdit ? 'Details updated!' : 'Account created!', 'success');
                resetRegForm();
                if(!isEdit) openDropTab(); // If new, switch to drop tab to use it
                await fetchCustomers(); 
            } else {
                const resData = await response.json();
                showToast(resData.error || 'Operation failed.', 'error');
            }
        } catch (error) { showToast("Network Error.", "error"); } 
        finally { submitRegBtn.innerHTML = isEdit ? 'UPDATE DETAILS' : 'REGISTER ACCOUNT'; submitRegBtn.disabled = false; }
    });

    // --- 7. Utilities ---
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        const bgColor = type === 'error' ? 'bg-red-600' : (type === 'success' ? 'bg-green-600' : 'bg-slate-900');
        toast.className = `toast-enter flex items-center p-4 text-white rounded-xl shadow-2xl pointer-events-auto ${bgColor}`;
        toast.innerHTML = `<div class="font-bold text-sm tracking-wide">${message}</div>`;
        toastContainer.appendChild(toast);
        setTimeout(() => { toast.style.animation = 'slideInRight 0.3s cubic-bezier(0.4, 0, 0.2, 1) reverse forwards'; setTimeout(() => toast.remove(), 300); }, 3000);
    }
});
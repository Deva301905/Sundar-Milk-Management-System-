// static/js/pos.js

document.addEventListener('DOMContentLoaded', () => {
    
    // --- Enterprise State Management ---
    let inventory = [];
    let cart = [];
    let selectedPaymentMode = 'Cash';

    // --- Core DOM Elements ---
    const elements = {
        productGrid: document.getElementById('productGrid'),
        cartBody: document.getElementById('cartBody'),
        totalValue: document.getElementById('totalValue'),
        subtotalValue: document.getElementById('subtotalValue'),
        checkoutBtn: document.getElementById('checkoutBtn'),
        paymentBtns: document.querySelectorAll('.payment-btn'),
        searchInput: document.getElementById('productSearch'),
        clearSearchBtn: document.getElementById('clearSearchBtn'),
        clearCartBtn: document.getElementById('clearCartBtn'),
        cartCountBadge: document.getElementById('cartCountBadge'),
        toastContainer: document.getElementById('toastContainer')
    };

    // --- Initialization ---
    startClock();
    fetchInventory();
    setupEventListeners();

    // --- 1. Database Connectivity ---
    async function fetchInventory() {
        try {
            const response = await fetch('/api/inventory/');
            if (!response.ok) throw new Error("Failed to fetch");
            inventory = await response.json();
            renderProducts(inventory);
        } catch (error) {
            elements.productGrid.innerHTML = `
                <div class="col-span-full flex flex-col items-center justify-center py-20">
                    <svg class="w-12 h-12 text-red-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                    <p class="text-red-500 font-bold text-lg">Database Connection Lost</p>
                    <p class="text-gray-500 text-sm mt-1">Please ensure the backend is running.</p>
                </div>
            `;
            showToast('Error loading inventory from server', 'error');
        }
    }

    // --- 2. Dynamic Grouped UI Rendering ---
    function renderProducts(products) {
        elements.productGrid.innerHTML = '';
        
        if (products.length === 0) {
            elements.productGrid.innerHTML = `<div class="col-span-full text-center py-10 text-gray-400 font-bold">No products found matching your search.</div>`;
            return;
        }

        // STEP A: Group all flat inventory items by their Brand Name
        const groupedProducts = {};
        products.forEach(p => {
            if (!groupedProducts[p.product_name]) groupedProducts[p.product_name] = [];
            groupedProducts[p.product_name].push(p);
        });

        // STEP B: Render a Master Card for each Brand
        for (const [brandName, variants] of Object.entries(groupedProducts)) {
            
            // Sort variants by price so they appear in order from smallest to largest size
            variants.sort((a, b) => a.selling_price - b.selling_price);

            // Calculate aggregate total stock for this entire brand
            const totalStock = variants.reduce((sum, v) => sum + v.available_quantity, 0);

            const card = document.createElement('div');
            // h-max prevents the grid from stretching weirdly when one accordion opens
            card.className = `rounded-2xl border-2 border-gray-200 bg-white overflow-hidden transition-all shadow-sm h-max`;
            
            // 1. The Clickable Card Header
            const header = document.createElement('div');
            header.className = `p-5 cursor-pointer flex justify-between items-center hover:bg-blue-50 transition-colors group`;
            header.innerHTML = `
                <div>
                    <h3 class="font-black text-gray-900 text-lg leading-tight group-hover:text-blue-700 transition-colors">${brandName}</h3>
                    <p class="text-[11px] font-bold text-gray-400 uppercase mt-1 tracking-wider">${variants.length} Sizes • Total Stock: ${totalStock}</p>
                </div>
                <div class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 transition-transform duration-300 group-hover:bg-blue-200 group-hover:text-blue-700" id="arrow-${brandName.replace(/\s+/g, '-')}">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7"></path></svg>
                </div>
            `;

            // 2. The Hidden Variants Container (The Accordion Dropdown)
            const variantsContainer = document.createElement('div');
            // 'hidden' by default
            variantsContainer.className = `hidden px-4 pb-4 grid grid-cols-1 gap-2 border-t border-gray-100 pt-3 bg-slate-50`;
            variantsContainer.id = `variants-${brandName.replace(/\s+/g, '-')}`;

            // 3. Inject Variant Buttons into the container
            variants.forEach(variant => {
                const isOutOfStock = variant.available_quantity <= 0;
                
                // Style the button based on stock
                const btnClass = isOutOfStock
                    ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed opacity-70'
                    : 'bg-white border-blue-200 text-blue-700 hover:bg-blue-600 hover:text-white hover:border-blue-600 active:scale-[0.98] shadow-sm cursor-pointer';

                const variantBtn = document.createElement('button');
                variantBtn.className = `w-full flex justify-between items-center p-3 rounded-xl border-2 transition-all ${btnClass}`;
                variantBtn.disabled = isOutOfStock;

                variantBtn.innerHTML = `
                    <div class="flex items-center gap-2">
                        <span class="text-sm font-black">${variant.unit_type}</span>
                        ${isOutOfStock 
                            ? '<span class="text-[9px] text-red-500 font-black bg-red-100 px-1.5 py-0.5 rounded">EMPTY</span>' 
                            : `<span class="text-[10px] font-bold opacity-70">Stock: ${variant.available_quantity}</span>`
                        }
                    </div>
                    <span class="font-black text-lg">₹${variant.selling_price}</span>
                `;

                // Add to cart on click (Only if in stock)
                if (!isOutOfStock) {
                    variantBtn.onclick = (e) => {
                        e.stopPropagation(); // Prevents the accordion from closing when adding to cart
                        addToCart(variant);
                    };
                }

                variantsContainer.appendChild(variantBtn);
            });

            // 4. Accordion Toggle Logic
            header.onclick = () => {
                const isHidden = variantsContainer.classList.contains('hidden');
                const arrowIcon = document.getElementById(`arrow-${brandName.replace(/\s+/g, '-')}`);

                // Automatically close all other open accordions so the screen stays clean
                document.querySelectorAll('[id^="variants-"]').forEach(el => el.classList.add('hidden'));
                document.querySelectorAll('[id^="arrow-"]').forEach(el => el.classList.remove('rotate-180', 'bg-blue-200', 'text-blue-700'));

                // Open the one we just clicked (if it was hidden)
                if (isHidden) {
                    variantsContainer.classList.remove('hidden');
                    arrowIcon.classList.add('rotate-180', 'bg-blue-200', 'text-blue-700');
                }
            };

            // Assemble and inject
            card.appendChild(header);
            card.appendChild(variantsContainer);
            elements.productGrid.appendChild(card);
        }
    }

    // --- 3. Smart Cart Logic ---
    function addToCart(product) {
        // Crucial Fix: Identify items by BOTH Name AND Unit Type
        const cartKey = `${product.product_name}-${product.unit_type}`;
        const existingItem = cart.find(item => item.cartKey === cartKey);
        
        // Prevent over-selling
        const currentQtyInCart = existingItem ? existingItem.qty : 0;
        if (currentQtyInCart >= product.available_quantity) {
            showToast(`Cannot add more. Only ${product.available_quantity} left in stock!`, 'error');
            return;
        }

        if (existingItem) {
            existingItem.qty += 1;
            existingItem.price = existingItem.qty * product.selling_price;
        } else {
            cart.push({
                cartKey: cartKey,
                product_name: product.product_name,
                unit_type: product.unit_type,
                unit_price: product.selling_price,
                qty: 1,
                price: product.selling_price
            });
        }
        
        playBeep();
        updateCartUI();
    }

    function updateCartUI() {
        elements.cartBody.innerHTML = '';
        let grandTotal = 0;
        let totalItemsCount = 0;

        if (cart.length === 0) {
            elements.cartBody.innerHTML = `
                <tr>
                    <td colspan="3" class="px-6 py-24 text-center">
                        <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-50 mb-4 border border-dashed border-gray-300">
                            <svg class="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 0a2 2 0 100 4 2 2 0 000-4z"></path></svg>
                        </div>
                        <p class="text-gray-400 font-bold text-sm">Scan items to begin sale</p>
                    </td>
                </tr>
            `;
            elements.checkoutBtn.disabled = true;
            elements.cartCountBadge.classList.add('hidden');
        } else {
            elements.checkoutBtn.disabled = false;
            elements.cartCountBadge.classList.remove('hidden');
        }

        cart.forEach((item, index) => {
            grandTotal += item.price;
            totalItemsCount += item.qty;
            
            const tr = document.createElement('tr');
            tr.className = "border-b border-gray-50 hover:bg-blue-50/30 transition-colors group";
            tr.innerHTML = `
                <td class="px-6 py-4">
                    <div class="font-bold text-gray-800 text-sm leading-tight">${item.product_name}</div>
                    <div class="text-[10px] font-bold text-gray-400 uppercase mt-0.5">${item.unit_type} • ₹${item.unit_price}/ea</div>
                </td>
                <td class="px-2 py-4 text-center align-middle">
                    <div class="inline-flex items-center justify-center space-x-1 bg-white border border-gray-200 rounded-lg p-0.5 shadow-sm">
                        <button class="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-red-500 hover:bg-red-50 rounded font-black transition-colors" onclick="changeQty(${index}, -1)">-</button>
                        <span class="font-black text-sm w-6 text-gray-800">${item.qty}</span>
                        <button class="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-green-500 hover:bg-green-50 rounded font-black transition-colors" onclick="changeQty(${index}, 1)">+</button>
                    </div>
                </td>
                <td class="px-6 py-4 font-black text-right text-gray-800 text-base">₹${item.price.toFixed(2)}</td>
            `;
            elements.cartBody.appendChild(tr);
        });

        elements.cartCountBadge.innerText = totalItemsCount;
        elements.totalValue.innerText = `₹${grandTotal.toFixed(2)}`;
        elements.subtotalValue.innerText = `₹${grandTotal.toFixed(2)}`;
    }

    // Expose explicitly for inline HTML onclick handlers
    window.changeQty = function(index, delta) {
        cart[index].qty += delta;
        
        if (delta > 0) {
            const dbProduct = inventory.find(p => p.product_name === cart[index].product_name && p.unit_type === cart[index].unit_type);
            if (dbProduct && cart[index].qty > dbProduct.available_quantity) {
                cart[index].qty -= 1; 
                showToast(`Max stock reached for this item!`, 'error');
                return;
            }
        }

        if (cart[index].qty <= 0) {
            cart.splice(index, 1); 
        } else {
            cart[index].price = cart[index].qty * cart[index].unit_price;
        }
        updateCartUI();
    };

    // --- 4. Event Listeners & Hardware Input ---
    function setupEventListeners() {
        
        // Payment Toggle
        elements.paymentBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetBtn = e.currentTarget; 
                
                elements.paymentBtns.forEach(b => {
                    b.classList.remove('bg-blue-50', 'border-blue-500', 'text-blue-700', 'shadow-inner');
                    b.classList.remove('bg-purple-50', 'border-purple-500', 'text-purple-700');
                    b.classList.add('bg-white', 'border-gray-200', 'text-gray-500');
                });
                
                targetBtn.classList.remove('bg-white', 'border-gray-200', 'text-gray-500');
                const method = targetBtn.dataset.method;
                
                if (method === 'UPI') {
                    targetBtn.classList.add('bg-purple-50', 'border-purple-500', 'text-purple-700', 'shadow-inner');
                } else {
                    targetBtn.classList.add('bg-blue-50', 'border-blue-500', 'text-blue-700', 'shadow-inner');
                }
                
                selectedPaymentMode = method;
            });
        });

        // Smart Search Filter Engine
        elements.searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase().trim();
            if (term.length > 0) {
                elements.clearSearchBtn.classList.remove('hidden');
            } else {
                elements.clearSearchBtn.classList.add('hidden');
            }

            // Filter logic matches Product Name OR Unit Type 
            // If they type "500", it groups and shows all brands that have a 500ml option!
            const filtered = inventory.filter(p => 
                p.product_name.toLowerCase().includes(term) || 
                p.unit_type.toLowerCase().includes(term)
            );
            
            renderProducts(filtered);
            
            // Automatically open accordions if user is searching for something specific
            if (term.length > 0) {
                document.querySelectorAll('[id^="variants-"]').forEach(el => el.classList.remove('hidden'));
                document.querySelectorAll('[id^="arrow-"]').forEach(el => el.classList.add('rotate-180', 'bg-blue-200', 'text-blue-700'));
            }
        });

        // Clear Search
        elements.clearSearchBtn.addEventListener('click', () => {
            elements.searchInput.value = '';
            elements.clearSearchBtn.classList.add('hidden');
            renderProducts(inventory);
            elements.searchInput.focus();
        });

        // Clear Cart
        elements.clearCartBtn.addEventListener('click', () => {
            if (cart.length > 0) {
                if(confirm("Are you sure you want to clear the entire cart?")) {
                    cart = [];
                    updateCartUI();
                    showToast("Cart cleared.");
                }
            }
        });

        // The Checkout API Call
        elements.checkoutBtn.addEventListener('click', executeCheckout);

        // Advanced Keyboard Shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'F2') { e.preventDefault(); elements.paymentBtns[0].click(); showToast("Payment set to Cash"); }
            if (e.key === 'F3') { e.preventDefault(); elements.paymentBtns[1].click(); showToast("Payment set to UPI"); }
            if (e.key === 'Enter') {
                e.preventDefault();
                if (cart.length > 0 && document.activeElement !== elements.searchInput) {
                    executeCheckout();
                }
            }
            if (e.key.length === 1 && document.activeElement !== elements.searchInput && !e.ctrlKey && !e.altKey) {
                elements.searchInput.focus();
            }
        });
    }

    async function executeCheckout() {
        if (cart.length === 0) return;

        const originalBtnText = elements.checkoutBtn.innerHTML;
        elements.checkoutBtn.innerHTML = '<span class="animate-pulse flex items-center"><svg class="w-5 h-5 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg> Processing...</span>';
        elements.checkoutBtn.disabled = true;

        try {
            // Map our new unit_type cart structure to the backend API expectation
            const backendCart = cart.map(item => ({
                product_name: `${item.product_name} (${item.unit_type})`,
                qty: item.qty,
                price: item.price
            }));

            const response = await fetch('/api/sales/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: backendCart,
                    payment_mode: selectedPaymentMode
                })
            });

            if (response.ok) {
                cart = [];
                updateCartUI();
                await fetchInventory(); 
                
                showToast('Sale Completed Successfully!', 'success');
                
                elements.checkoutBtn.classList.replace('bg-slate-900', 'bg-green-500');
                elements.checkoutBtn.innerHTML = 'SUCCESS!';
                
                setTimeout(() => {
                    elements.checkoutBtn.classList.replace('bg-green-500', 'bg-slate-900');
                    elements.checkoutBtn.innerHTML = originalBtnText;
                    elements.paymentBtns[0].click(); 
                }, 1500);
            } else {
                throw new Error("Server rejected checkout");
            }
        } catch (error) {
            console.error('Checkout failed', error);
            showToast("Database Error during checkout!", 'error');
            elements.checkoutBtn.innerHTML = originalBtnText;
            elements.checkoutBtn.disabled = false;
        }
    }

    // --- 5. Utilities ---
    
    function startClock() {
        setInterval(() => {
            document.getElementById('clock').innerText = new Date().toLocaleTimeString('en-US', { hour12: false });
        }, 1000);
    }

    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        const bgColor = type === 'error' ? 'bg-red-600' : (type === 'success' ? 'bg-green-600' : 'bg-slate-900');
        const icon = type === 'error' ? 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' : 'M5 13l4 4L19 7';

        toast.className = `toast-enter flex items-center p-4 mb-4 text-white rounded-xl shadow-2xl pointer-events-auto ${bgColor}`;
        toast.innerHTML = `
            <svg class="w-6 h-6 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${icon}"></path></svg>
            <div class="font-bold text-sm tracking-wide">${message}</div>
        `;
        
        elements.toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideInRight 0.3s cubic-bezier(0.4, 0, 0.2, 1) reverse forwards';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    function playBeep() {
        try {
            const context = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = context.createOscillator();
            const gainNode = context.createGain();
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(800, context.currentTime); 
            gainNode.gain.setValueAtTime(0.05, context.currentTime); 
            oscillator.connect(gainNode);
            gainNode.connect(context.destination);
            oscillator.start();
            oscillator.stop(context.currentTime + 0.05); 
        } catch(e) {}
    }
});
let productsData = [];
let cart = JSON.parse(localStorage.getItem('shopMasterCart')) || [];
let currentProduct = null;

document.addEventListener("DOMContentLoaded", () => {
    fetchProducts();
    updateCartUI();

    document.getElementById("checkoutForm").addEventListener("submit", processCheckout);
});

// Consumir FakeStoreAPI
async function fetchProducts() {
    try {
        const response = await fetch('https://fakestoreapi.com/products');
        productsData = await response.json();
        renderProducts(productsData);
    } catch (error) {
        console.error("Error al cargar productos:", error);
        document.getElementById("productContainer").innerHTML = `<div class="text-center text-danger">Error al conectar con la API de productos.</div>`;
    }
}

// Renderizar tarjetas de productos
function renderProducts(products) {
    const container = document.getElementById("productContainer");
    container.innerHTML = products.map(product => `
        <div class="col-md-3 col-sm-6">
            <div class="card h-100 shadow-sm rounded-3">
                <img src="${product.image}" class="card-img-top" alt="${product.title}">
                <div class="card-body d-flex flex-column">
                    <h5 class="card-title fs-6 text-truncate">${product.title}</h5>
                    <p class="card-text fw-bold text-success fs-5 mb-3">$${product.price.toFixed(2)}</p>
                    <button class="btn btn-outline-primary mt-auto btn-sm fw-bold" onclick="openProductModal(${product.id})">
                        Ver más 🔍
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// Abrir modal con detalles
function openProductModal(id) {
    currentProduct = productsData.find(p => p.id === id);
    if (!currentProduct) return;

    document.getElementById("modalTitle").textContent = currentProduct.title;
    document.getElementById("modalImage").src = currentProduct.image;
    document.getElementById("modalCategory").textContent = `Categoría: ${currentProduct.category}`;
    document.getElementById("modalDescription").textContent = currentProduct.description;
    document.getElementById("modalPrice").textContent = `$${currentProduct.price.toFixed(2)}`;
    document.getElementById("modalQuantity").value = 1;

    const modalBtn = document.getElementById("addToCartBtn");
    modalBtn.onclick = () => {
        const qty = parseInt(document.getElementById("modalQuantity").value) || 1;
        addToCart(currentProduct, qty);
        bootstrap.Modal.getInstance(document.getElementById('productModal')).hide();
    };

    const modal = new bootstrap.Modal(document.getElementById('productModal'));
    modal.show();
}

// Añadir al carrito
function addToCart(product, quantity) {
    const existingIndex = cart.findIndex(item => item.id === product.id);
    if (existingIndex > -1) {
        cart[existingIndex].quantity += quantity;
    } else {
        cart.push({...product, quantity });
    }
    saveCart();
    updateCartUI();
    alert(`✅ ¡${quantity} unidad(es) de "${product.title.substring(0, 20)}..." añadidas al carrito! 🛒`);
}

// Guardar en LocalStorage
function saveCart() {
    localStorage.setItem('shopMasterCart', JSON.stringify(cart));
}

// Actualizar interfaz del carrito
function updateCartUI() {
    const cartCount = document.getElementById("cartCount");
    const cartItemsList = document.getElementById("cartItemsList");
    const cartTotalPrice = document.getElementById("cartTotalPrice");

    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalItems;

    if (cart.length === 0) {
        cartItemsList.innerHTML = `<p class="text-center text-muted my-3">Tu carrito está vacío 🛍️</p>`;
        cartTotalPrice.textContent = "0.00";
        return;
    }

    let totalSum = 0;
    cartItemsList.innerHTML = `
        <table class="table align-middle">
            <thead>
                <tr>
                    <th>Producto</th>
                    <th>Precio</th>
                    <th style="width: 120px;">Cantidad</th>
                    <th>Subtotal</th>
                    <th>Acción</th>
                </tr>
            </thead>
            <tbody>
                ${cart.map((item, index) => {
                    const subtotal = item.price * item.quantity;
                    totalSum += subtotal;
                    return `
                        <tr>
                            <td class="text-truncate" style="max-width: 200px;">${item.title}</td>
                            <td>$${item.price.toFixed(2)}</td>
                            <td>
                                <input type="number" class="form-control form-control-sm text-center" value="${item.quantity}" min="1" onchange="updateQuantity(${index}, this.value)">
                            </td>
                            <td>$${subtotal.toFixed(2)}</td>
                            <td>
                                <button class="btn btn-sm btn-danger" onclick="removeFromCart(${index})"><i class="fa-solid fa-trash"></i></button>
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
    cartTotalPrice.textContent = totalSum.toFixed(2);
}

// Modificar cantidad desde carrito
function updateQuantity(index, newQty) {
    const qty = parseInt(newQty);
    if (qty > 0) {
        cart[index].quantity = qty;
        saveCart();
        updateCartUI();
    }
}

// Eliminar producto del carrito
function removeFromCart(index) {
    cart.splice(index, 1);
    saveCart();
    updateCartUI();
}

// Procesar Pago y Generar Ticket Térmico PDF con jsPDF
function processCheckout(e) {
    e.preventDefault();

    if (cart.length === 0) {
        alert("⚠️ El carrito está vacío.");
        return;
    }

    const clientName = document.getElementById("payName").value;
    const now = new Date();
    const dateStr = now.toLocaleDateString();
    const timeStr = now.toLocaleTimeString();

    // Configuración de jsPDF para recibo térmico pequeño (58mm de ancho -> aprox 58mm x altura variable)
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        unit: 'mm',
        format: [58, 150] // Ancho térmico estándar de 58 mm
    });

    doc.setFont("courier", "normal"); // Fuente monoespaciada tipo ticket
    doc.setFontSize(9);

    let y = 8;
    const lineHeight = 4;

    // Encabezado del ticket
    doc.text("--------------------------------", 4, y);
    y += lineHeight;
    doc.text("          SHOPMASTER          ", 4, y);
    y += lineHeight;
    doc.text("      TIENDA VIRTUAL S.A.     ", 4, y);
    y += lineHeight;
    doc.text("    RNC: 1-30-88888-9         ", 4, y);
    y += lineHeight;
    doc.text("--------------------------------", 4, y);
    y += lineHeight;

    // Datos del cliente y fecha
    doc.text(`Fecha: ${dateStr} ${timeStr}`, 4, y);
    y += lineHeight;
    doc.text(`Cliente: ${clientName}`, 4, y);
    y += lineHeight;
    doc.text("--------------------------------", 4, y);
    y += lineHeight;

    // Productos
    doc.text("CANT  DESCRIPCION       PRECIO", 4, y);
    y += lineHeight;
    doc.text("--------------------------------", 4, y);
    y += lineHeight;

    let totalFinal = 0;
    cart.forEach(item => {
        const subtotal = item.price * item.quantity;
        totalFinal += subtotal;
        
        // Recortar título para que encaje en el ancho térmico
        const titleLine = item.title.substring(0, 16).padEnd(16, ' ');
        const lineText = `${String(item.quantity).padEx ? '' : item.quantity}     ${titleLine} $${subtotal.toFixed(2)}`;
        
        doc.text(`${item.quantity}x  ${titleLine.trim()} $${subtotal.toFixed(2)}`, 4, y);
        y += lineHeight;
    });

    doc.text("--------------------------------", 4, y);
    y += lineHeight;
    doc.text(`TOTAL A PAGAR: $${totalFinal.toFixed(2)}`, 4, y);
    y += lineHeight;
    doc.text("--------------------------------", 4, y);
    y += lineHeight;
    doc.text("     ¡GRACIAS POR SU COMPRA!    ", 4, y);
    y += lineHeight;
    doc.text("      CONSERVE SU TICKET        ", 4, y);

    // Descargar PDF
    doc.save("ticket_compra_shopmaster.pdf");

    // Limpiar carrito y cerrar modal
    alert("✅ ¡Pago procesado con éxito! Su ticket térmico ha sido descargado en PDF.");
    cart = [];
    saveCart();
    updateCartUI();

    const cartModalEl = document.getElementById('cartModal');
    const modalInstance = bootstrap.Modal.getInstance(cartModalEl);
    modalInstance.hide();
    document.getElementById("checkoutForm").reset();
}
document.addEventListener("DOMContentLoaded", () => {
  // Cargar datos del usuario
  loadUserInfo()

  // Configurar navegación del sidebar
  setupSidebarNavigation()

  // Configurar cierre de sesión
  setupLogout()

  // Cargar datos iniciales para despachos
  loadInitialData()

  // Setup forms
  setupPurchaseGuideForm() // Now for supplier purchase orders
  setupAddUserForm()
  setupUserModal() // Setup user modal
  setupPurchaseOrderDetailsModal() // Setup the client purchase order details modal
  startHeartbeat() // Start heartbeat for online status

  // NEW: Load pending material requests table if the alerts page is active
  if (document.getElementById("alerts-material-requests").classList.contains("active")) {
    loadPendingMaterialRequestsTable()
  }
  // Removed initial load for purchase-orders-list as it's no longer the default

  // Initial load for dispatch preview
})

// --- INICIO DE FUNCIONES DE AYUDA (COPIADAS DE dashboard_registro.js) ---

// Helper function to parse various date string formats into a Date object
function parseDateString(dateString) {
  if (!dateString) return null

  // Attempt 1: Try parsing directly. This handles ISO 8601 (YYYY-MM-DDTHH:mm:ss.sssZ)
  let date = new Date(dateString)
  if (!isNaN(date.getTime())) {
    return date
  }

  // Attempt 2: Try YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    date = new Date(dateString + "T00:00:00")
    if (!isNaN(date.getTime())) {
      return date
    }
  }

  // Attempt 3: Try DD/MM/YYYY (Formato que envía el backend)
  const parts = dateString.split("/")
  if (parts.length === 3) {
    const day = Number.parseInt(parts[0], 10)
    const month = Number.parseInt(parts[1], 10) - 1 // El mes es 0-indexado
    const year = Number.parseInt(parts[2], 10)
    date = new Date(year, month, day)
    if (!isNaN(date.getTime())) {
      return date
    }
  }

  // If all attempts fail, return null
  return null
}

// Helper function to format date for display (versión robusta)
function formatDate(dateString) {
  const date = parseDateString(dateString)
  if (!date) return "Invalid Date" // Devuelve "Invalid Date" si no se puede parsear
  return date.toLocaleDateString("es-ES", { year: "numeric", month: "2-digit", day: "2-digit" })
}

// --- FIN DE FUNCIONES DE AYUDA ---

// Cargar información del usuario
function loadUserInfo() {
  const userName = document.getElementById("user-name")
  const userPhoto = document.getElementById("user-photo") // Get the image element

  // Usar los datos del usuario pasados desde el backend
  if (window.userInfo && window.userInfo.nombreCompleto) {
    if (userName.textContent === "Cargando...") {
      userName.textContent = window.userInfo.nombreCompleto
    }

    sessionStorage.setItem("userName", window.userInfo.nombreCompleto)
    sessionStorage.setItem("userId", window.userInfo.id)
    sessionStorage.setItem("userRole", window.userInfo.rol)

    // Set user photo and log the path
    if (userPhoto) {
      userPhoto.src = window.userInfo.foto
      console.log("User photo path:", window.userInfo.foto) // Log the path
    }
  } else {
    userName.textContent = sessionStorage.getItem("userName") || "Usuario Administrador"
  }
}

// Configurar navegación del sidebar
function setupSidebarNavigation() {
  const menuLinks = document.querySelectorAll(".sidebar ul li a:not(#logout-btn)")

  menuLinks.forEach((link) => {
    link.addEventListener("click", function (e) {
      e.preventDefault()

      menuLinks.forEach((item) => item.classList.remove("active"))
      this.classList.add("active")

      const pageId = this.getAttribute("data-page")
      showPage(pageId)

      // Load specific tables when their pages are active
      if (pageId === "manage-users") {
        loadUsersTable()
      } else if (pageId === "purchase-orders-list") {
        loadPurchaseOrdersTable() // This is for client purchase orders
      } else if (pageId === "material-requests-admin") {
        // NEW
        loadAdminMaterialRequestsTable()
      } else if (pageId === "alerts-material-requests") {
        loadPendingMaterialRequestsTable()
      }
    })
  })
}

// Mostrar página específica
function showPage(pageId) {
  const pages = document.querySelectorAll(".page")

  pages.forEach((page) => {
    page.classList.remove("active")
  })

  const activePage = document.getElementById(pageId)
  if (activePage) {
    activePage.classList.add("active")
    // NEW: If navigating to despachos page, set today's date
    if (pageId === "material-requests-admin") {
      // NEW
      loadAdminMaterialRequestsTable()
    }
    if (pageId === "alerts-material-requests") {
      loadPendingMaterialRequestsTable()
    }
  }

  // Special handling for purchase-guide page visibility (now for supplier POs)
  if (pageId === "purchase-guide") {
    document.getElementById("purchase-guide-form").style.display = "block"
    document.getElementById("purchase-guide-preview").style.display = "block"
    document.getElementById("download-purchase-pdf").style.display = "none"
    document.getElementById("print-purchase-order").style.display = "none" // NEW: Hide print button
    // Reset form and items when navigating to "Generar Guía de Compra"
    const form = document.getElementById("purchase-guide-form")
    const itemsContainer = document.getElementById("po_items_container")
    if (form) form.reset()
    if (itemsContainer) {
      itemsContainer.innerHTML = ""
      addItemRow() // Add one empty row back
    }
    calculateTotals() // Recalculate and clear totals
    updatePreview() // Clear preview content
    loadSuppliersForPurchaseGuide() // NEW: Load suppliers for the form
  }
  if (pageId === "costo-diseno") {
    loadCostoDiseno()
  }
}

// Configurar cierre de sesión
function setupLogout() {
  const logoutBtn = document.getElementById("logout-btn")

  logoutBtn.addEventListener("click", (e) => {
    e.preventDefault()

    fetch("/api/logout", {
      method: "POST",
      credentials: "same-origin",
    })
      .then(() => {
        window.location.href = "/"
      })
      .catch((error) => {
        console.error("Error al cerrar sesión:", error)
        window.location.href = "/"
      })
  })
}

// Cargar datos iniciales
function loadInitialData() {
  // loadDespachosTable() // This table is now part of 'registro-guias-despacho'
}

// Setup Purchase Guide Form (now for Supplier Purchase Orders)
function setupPurchaseGuideForm() {
  const form = document.getElementById("purchase-guide-form")
  const previewBox = document.getElementById("purchase-guide-preview")
  const downloadPdfBtn = document.getElementById("download-purchase-pdf")
  const printBtn = document.getElementById("print-purchase-order") // NEW
  const itemsContainer = document.getElementById("po_items_container")
  const addItemBtn = document.getElementById("add-item-btn")
  const supplierSelect = document.getElementById("po_supplier_id")
  const orderDateHiddenInput = document.getElementById("po_order_date_hidden")

  if (!form) return

  // Set today's date for the hidden order date input
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, "0")
  const day = String(today.getDate()).padStart(2, "0")
  const formattedDate = `${year}-${month}-${day}`
  orderDateHiddenInput.value = formattedDate

  // Ensure preview and download/print buttons are hidden initially
  previewBox.style.display = "none"
  downloadPdfBtn.style.display = "none"
  printBtn.style.display = "none"

  // Function to add a new item row
  function addItemRow(item = {}) {
    const itemRow = document.createElement("div")
    itemRow.classList.add("po-item-row")
    itemRow.innerHTML = `
        <select class="po-item-material-select" style="width: 40%;" required>
            <option value="">Seleccione material</option>
        </select>
        <input type="number" class="po-item-quantity" placeholder="Cantidad" value="${item.quantity || ""}" min="0.01" step="0.01" style="width: 15%;" required>
        <span class="po-item-unit-price-display" style="width: 20%; text-align: right;">P. Unitario: ${formatCurrency(item.unitPrice || 0)}</span>
        <span class="po-item-unit-display" style="width: 10%; text-align: left;">${item.unit || "Unidad"}</span>
        <span class="po-item-total" style="width: 10%; text-align: right;">${formatCurrency(item.itemTotal || 0)}</span>
        <button type="button" class="remove-item-btn" style="background: none; border: none; color: red; cursor: pointer; font-size: 1.2em;">&times;</button>
    `
    itemsContainer.appendChild(itemRow)

    const materialSelect = itemRow.querySelector(".po-item-material-select")
    const selectedSupplierId = supplierSelect.value
    if (selectedSupplierId && allSupplierMaterials[selectedSupplierId]) {
      allSupplierMaterials[selectedSupplierId].forEach((material) => {
        const option = document.createElement("option")
        option.value = material.id
        option.textContent = material.nombre_material
        materialSelect.appendChild(option)
      })
    }

    // Set selected material if provided
    if (item.materialId) {
      materialSelect.value = item.materialId
    }

    // Add event listeners for new row
    materialSelect.addEventListener("change", (e) => {
      const selectedMaterialId = e.target.value
      const selectedSupplierId = supplierSelect.value
      const selectedMaterial = allSupplierMaterials[selectedSupplierId]?.find((m) => m.id == selectedMaterialId)
      if (selectedMaterial) {
        itemRow.querySelector(".po-item-unit-price-display").textContent =
          `P. Unitario: ${formatCurrency(selectedMaterial.precio)}`
        itemRow.querySelector(".po-item-unit-display").textContent = selectedMaterial.unidad_medida
      } else {
        itemRow.querySelector(".po-item-unit-price-display").textContent = "P. Unitario: 0.00"
        itemRow.querySelector(".po-item-unit-display").textContent = "Unidad"
      }
      calculateTotals()
    })
    itemRow.querySelector(".po-item-quantity").addEventListener("input", calculateTotals)
    itemRow.querySelector(".remove-item-btn").addEventListener("click", () => {
      itemRow.remove()
      calculateTotals()
    })

    // Trigger change to set initial price/unit if material is pre-selected
    if (item.materialId) {
      materialSelect.dispatchEvent(new Event("change"))
    }
  }

  // Add initial item row if none exists
  if (itemsContainer.children.length === 0) {
    addItemRow()
  }

  addItemBtn.addEventListener("click", () => addItemRow())

  // Calculate totals (now only total)
  function calculateTotals() {
    let totalToPay = 0

    const itemRows = itemsContainer.querySelectorAll(".po-item-row")
    itemRows.forEach((row) => {
      const materialSelect = row.querySelector(".po-item-material-select")
      const selectedMaterialId = materialSelect.value
      const selectedSupplierId = supplierSelect.value
      const selectedMaterial = allSupplierMaterials[selectedSupplierId]?.find((m) => m.id == selectedMaterialId)

      const quantity = parseNumericInput(row.querySelector(".po-item-quantity").value)
      const unitPrice = selectedMaterial ? selectedMaterial.precio : 0

      const itemTotal = quantity * unitPrice
      row.querySelector(".po-item-total").textContent = formatCurrency(itemTotal)
      totalToPay += itemTotal
    })

    document.getElementById("po_total_to_pay").textContent = formatCurrency(totalToPay)
    document.getElementById("preview_total_to_pay").textContent = formatCurrency(totalToPay)
    document.getElementById("preview_total_words").textContent = convertNumberToWords(totalToPay)

    updatePreview()
  }

  // Add event listeners for inputs
  supplierSelect.addEventListener("change", () => {
    // Clear existing items and re-add one empty row
    itemsContainer.innerHTML = ""
    addItemRow()
    calculateTotals() // Recalculate and update preview
    updateSupplierDetailsInPreview() // Update supplier details
  })
  // Removed orderDateInput.addEventListener("input", updatePreview) as it's now hidden
  itemsContainer.addEventListener("input", calculateTotals) // Listen for input on items container

  // Initial calculation and preview update
  calculateTotals()
  updatePreview()

  form.addEventListener("submit", (e) => {
    e.preventDefault()

    const supplierId = supplierSelect.value
    const orderDate = orderDateHiddenInput.value // Get date from hidden input
    const items = []

    const itemRows = itemsContainer.querySelectorAll(".po-item-row")
    itemRows.forEach((row) => {
      const materialSelect = row.querySelector(".po-item-material-select")
      const quantityInput = row.querySelector(".po-item-quantity")

      const selectedMaterialId = materialSelect.value
      const quantity = parseNumericInput(quantityInput.value)

      const selectedSupplier = allSuppliers.find((s) => s.id == supplierId)
      const selectedMaterial = selectedSupplier?.materiales.find((m) => m.id == selectedMaterialId)

      if (selectedMaterialId && quantity > 0 && selectedMaterial) {
        items.push({
          material_id: selectedMaterialId,
          cantidad: quantity,
          precio_unitario: selectedMaterial.precio,
          subtotal_item: quantity * selectedMaterial.precio,
        })
      }
    })

    if (!supplierId || !orderDate || items.length === 0) {
      displayFlashMessage("Por favor, complete todos los campos y añada al menos un material.", "error")
      return
    }

    const total = items.reduce((sum, item) => sum + item.subtotal_item, 0)

    const purchaseOrderData = {
      proveedor_id: supplierId,
      fecha: orderDate,
      items: items,
      total: total,
      status: "pending", // Default status for new orders
    }

    fetch("/api/ordenes_compra_proveedor", {
      // Changed from "/api/ordenes_compra_proveedor/add"
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(purchaseOrderData),
    })
      .then(async (response) => {
        const responseText = await response.text()
        let data
        try {
          data = JSON.parse(responseText)
        } catch (e) {
          data = { success: response.ok, message: responseText || `Error HTTP: ${response.status}` }
        }
        if (response.ok) return data
        else throw new Error(data.message || `Error HTTP: ${response.status}`)
      })
      .then((data) => {
        displayFlashMessage(data.message, "success")
        form.reset()
        itemsContainer.innerHTML = ""
        addItemRow() // Add one empty row back
        calculateTotals() // Reset totals and preview
        loadPurchaseOrdersTable() // Reload the table to show the new order
      })
      .catch((error) => {
        console.error("Error al guardar la orden de compra:", error)
        displayFlashMessage(`Error al guardar la orden de compra: ${error.message}`, "error")
      })
  })

  function updateSupplierDetailsInPreview() {
    const selectedSupplierId = supplierSelect.value
    const selectedSupplier = allSuppliers.find((s) => s.id == selectedSupplierId)

    if (selectedSupplier) {
      document.getElementById("preview_supplier_name").textContent = selectedSupplier.nombre
      document.getElementById("preview_supplier_rif").textContent = selectedSupplier.rif
      document.getElementById("preview_supplier_address").textContent = selectedSupplier.direccion
      document.getElementById("preview_supplier_contact").textContent = selectedSupplier.nombre_contacto || "N/A"
      document.getElementById("preview_supplier_phone").textContent =
        selectedSupplier.telefono_contacto || selectedSupplier.telefono || "N/A"
    } else {
      document.getElementById("preview_supplier_name").textContent = ""
      document.getElementById("preview_supplier_rif").textContent = ""
      document.getElementById("preview_supplier_address").textContent = ""
      document.getElementById("preview_supplier_contact").textContent = ""
      document.getElementById("preview_supplier_phone").textContent = ""
    }
  }

  function updatePreview() {
    const orderDate = document.getElementById("po_order_date_hidden").value
    document.getElementById("preview_po_date").textContent = formatDate(orderDate)

    updateSupplierDetailsInPreview()

    const itemsTbody = document.getElementById("preview-items-tbody")
    itemsTbody.innerHTML = ""
    const itemRows = itemsContainer.querySelectorAll(".po-item-row")
    itemRows.forEach((row) => {
      const materialSelect = row.querySelector(".po-item-material-select")
      const selectedMaterialId = materialSelect.value
      const selectedSupplierId = supplierSelect.value
      const selectedMaterial = allSupplierMaterials[selectedSupplierId]?.find((m) => m.id == selectedMaterialId)

      const materialName = selectedMaterial ? selectedMaterial.nombre_material : ""
      const quantity = parseNumericInput(row.querySelector(".po-item-quantity").value)
      const unitPrice = selectedMaterial ? selectedMaterial.precio : 0
      const unit = selectedMaterial ? selectedMaterial.unidad_medida : ""
      const itemTotal = quantity * unitPrice

      if (materialName && quantity > 0 && unitPrice > 0) {
        const tr = document.createElement("tr")
        tr.innerHTML = `
                <td style="border: 1px solid #ddd; padding: 8px;">${materialName}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${quantity.toLocaleString("es-ES")}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: left;">${unit}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${formatCurrency(unitPrice)}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${formatCurrency(itemTotal)}</td>
            `
        itemsTbody.appendChild(tr)
      }
    })
  }
}

// NEW: Load Purchase Orders Table (for supplier POs)
function loadPurchaseOrdersTable() {
  const table = document.getElementById("purchase-orders-table")
  if (!table) return

  const tbody = table.querySelector("tbody")

  fetch("/api/ordenes_compra_proveedor/list")
    .then((response) => response.json())
    .then((data) => {
      tbody.innerHTML = ""
      data.forEach((order) => {
        const row = document.createElement("tr")
        let actionsHtml = ""
        // Conditional rendering based on status
        if (order.status === "approved") {
          actionsHtml = `
          <button class="action-btn view-po" data-id="${order.id}" title="Ver"><i class="fas fa-eye"></i></button>
          <button class="action-btn print-po" data-id="${order.id}" title="Imprimir"><i class="fas fa-print"></i></button>
        `
        } else {
          actionsHtml = `<button class="action-btn view-po" data-id="${order.id}" title="Ver"><i class="fas fa-eye"></i></button>`
        }

        row.innerHTML = `
        <td>${order.po_number}</td>
        <td>${formatDate(order.fecha)}</td>
        <td>${order.proveedor_nombre}</td>
        <td>${formatCurrency(order.total)}</td>
        <td>${order.status}</td>
        <td>
            ${actionsHtml}
        </td>
    `
        tbody.appendChild(row)
      })
      setupPurchaseOrderActions()
    })
    .catch((error) => console.error("Error al cargar guías de compra:", error))
}

// NEW: Setup Purchase Order Actions (View/Delete for supplier POs)
function setupPurchaseOrderActions() {
  const viewButtons = document.querySelectorAll("#purchase-orders-table .action-btn.view-po")
  viewButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const orderId = this.getAttribute("data-id")
      // Llama a la función global desde GuiaDeCompra.js
      viewSupplierPurchaseOrder(orderId)
    })
  })

  // Removed download-po-pdf button listener as per new requirements

  const printButtons = document.querySelectorAll("#purchase-orders-table .action-btn.print-po")
  printButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const orderId = this.getAttribute("data-id")
      fetch(`/api/ordenes_compra_proveedor/${orderId}`)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`)
          }
          return response.json()
        })
        .then((data) => {
          // Llama a la función global desde GuiaDeCompra.js
          printSupplierPurchaseOrderContent(data, data.items)
        })
        .catch((error) => {
          console.error("Error al cargar la guía de compra para imprimir:", error)
          displayFlashMessage(`Error al cargar la guía de compra para imprimir: ${error.message}`, "error")
        })
    })
  })
}

// REEMPLAZAR esta función en dashboard_admin.js

function viewSupplierPurchaseOrder(orderId) {
  const modal = document.getElementById("purchase-order-details-modal")
  const modalPoNumber = document.getElementById("modal_preview_po_number")
  const modalPoDate = document.getElementById("modal_preview_po_date")
  const modalSupplierName = document.getElementById("modal_preview_client_name") // Using existing ID for supplier name
  const modalSupplierAddress = document.getElementById("modal_preview_client_address") // Using existing ID for supplier address
  const modalSupplierRif = document.getElementById("modal_preview_client_rif") // Using existing ID for supplier RIF
  const modalSupplierContact = document.getElementById("modal_preview_client_contact") // Using existing ID for supplier contact
  const modalSupplierPhone = document.getElementById("modal_preview_client_phone") // Using existing ID for supplier phone
  const modalItemsTbody = document.getElementById("modal-preview-items-tbody")
  const modalTotalToPay = document.getElementById("modal_preview_total_to_pay")
  const modalTotalWords = document.getElementById("modal_preview_total_words")
  const modalDownloadPdfBtn = document.getElementById("modal-download-purchase-pdf")
  const modalPrintBtn = document.getElementById("modal-print-purchase-order")

  fetch(`/api/ordenes_compra_proveedor/${orderId}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`)
      }
      return response.json()
    })
    .then((data) => {
      // Populate the modal preview section with fetched data
      modalPoNumber.textContent = data.po_number
      // 1. CAMBIO: Usar la fecha directamente sin la función formatDate
      modalPoDate.textContent = data.fecha
      modalSupplierName.textContent = data.proveedor_nombre
      modalSupplierAddress.textContent = data.proveedor_direccion
      modalSupplierRif.textContent = data.proveedor_rif
      modalSupplierContact.textContent = data.proveedor_contacto
      modalSupplierPhone.textContent = data.proveedor_telefono

      modalItemsTbody.innerHTML = ""
      data.items.forEach((item) => {
        const tr = document.createElement("tr")
        // 2. y 3. CAMBIO: Corregir los nombres de las propiedades de los items
        tr.innerHTML = `
                <td style="border: 1px solid #ddd; padding: 8px;">${item.nombre_material}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${item.cantidad.toLocaleString("es-ES")}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${formatCurrency(item.precio_unitario)}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${formatCurrency(item.subtotal_item)}</td>
            `
        modalItemsTbody.appendChild(tr)
      })

      modalTotalToPay.textContent = formatCurrency(data.total)
      modalTotalWords.textContent = convertNumberToWords(data.total)

      // Set data-id for PDF/Print buttons in the modal
      modalDownloadPdfBtn.setAttribute("data-order-id", orderId)
      modalPrintBtn.setAttribute("data-order-id", orderId)

      // Hide download PDF button in modal as per new requirements
      modalDownloadPdfBtn.style.display = "none"
      // Show print button if status is approved, otherwise hide it
      if (data.status === "approved") {
        modalPrintBtn.style.display = "inline-block"
      } else {
        modalPrintBtn.style.display = "none"
      }

      // Show the modal
      modal.style.display = "flex" // Use flex to center content
    })
    .catch((error) => {
      console.error("Error al cargar la guía de compra:", error)
      displayFlashMessage(`Error al cargar la guía de compra: ${error.message}`, "error")
    })
}

// NEW: Delete Purchase Order (for client POs)
function deletePurchaseOrder(orderId) {
  if (confirm("¿Está seguro que desea eliminar esta guía de compra?")) {
    fetch(`/api/purchase_orders/delete/${orderId}`, {
      method: "POST",
    })
      .then(async (response) => {
        const responseText = await response.text()
        let data
        try {
          data = JSON.parse(responseText)
        } catch (e) {
          data = { success: response.ok, message: responseText || `Error HTTP: ${response.status}` }
        }

        if (response.ok) {
          return data
        } else {
          throw new Error(data.message || `Error HTTP: ${response.status}`)
        }
      })
      .then((data) => {
        if (data.success) {
          displayFlashMessage(data.message, "success")
          loadPurchaseOrdersTable() // Reload the table
        } else {
          displayFlashMessage(data.message, "error")
        }
      })
      .catch((error) => {
        console.error("Error:", error)
        displayFlashMessage(`Error al eliminar la guía de compra: ${error.message}`, "error")
      })
  }
}

// Setup Add User Form
function setupAddUserForm() {
  const form = document.getElementById("add-user-form")
  if (!form) return

  form.addEventListener("submit", (e) => {
    e.preventDefault()

    const formData = new FormData(form)

    console.log("Attempting to add user...")
    for (const pair of formData.entries()) {
      console.log(pair[0] + ": " + pair[1])
    }

    fetch(form.action, {
      method: "POST",
      body: formData,
    })
      .then(async (response) => {
        const responseText = await response.text() // Read body ONCE as text
        console.log("Server response status:", response.status)
        console.log("Server response raw text:", responseText)

        let data
        try {
          data = JSON.parse(responseText) // Try to parse as JSON
        } catch (e) {
          // If parsing fails, it's not JSON, use raw text as message
          data = { success: response.ok, message: responseText || `Error HTTP: ${response.status}` }
        }

        if (response.ok) {
          return data // Return the parsed data (or constructed data if not JSON)
        } else {
          // If response is not OK, throw an.error with the message from data
          throw new Error(data.message || `Error HTTP: ${response.status}`)
        }
      })
      .then((data) => {
        // Handle successful response
        if (data.success) {
          displayFlashMessage(data.message, "success")
          form.reset()
          loadUsersTable() // Reload the users table to show the new user
        } else {
          // This block might be hit if the server returns success: false with a 200 status
          displayFlashMessage(data.message, "error")
        }
      })
      .catch((error) => {
        console.error("Error:", error)
        displayFlashMessage(`Error al agregar usuario: ${error.message}`, "error")
      })
  })
}

// Load Users Table
function loadUsersTable() {
  const table = document.getElementById("users-table")
  if (!table) return

  const tbody = table.querySelector("tbody")

  fetch("/api/admin/users/list")
    .then((response) => response.json())
    .then((data) => {
      tbody.innerHTML = ""
      data.forEach((user) => {
        const row = document.createElement("tr")
        const statusClass = user.status === "Online" ? "status-online" : "status-offline"
        row.innerHTML = `
        <td>${user.nombre}</td>
        <td>${user.apellido}</td>
        <td>${user.correo}</td>
        <td>${user.rol}</td>
        <td><span class="status-badge ${statusClass}">${user.status}</span></td>
        <td>${user.last_active_display}</td>
    `
        tbody.appendChild(row)
      })
      setupUserActions()
    })
    .catch((error) => console.error("Error al cargar usuarios:", error))
}

// Setup User Actions (Edit/Delete)
function setupUserActions() {
  const editButtons = document.querySelectorAll("#users-table .action-btn.edit")
  editButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const userId = this.getAttribute("data-id")
      editUser(userId)
    })
  })

  const deleteButtons = document.querySelectorAll("#users-table .action-btn.delete")
  deleteButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const userId = this.getAttribute("data-id")
      deleteUser(userId)
    })
  })
}

// Edit User
function editUser(userId) {
  fetch(`/api/admin/users/${userId}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`)
      }
      return response.json()
    })
    .then((data) => {
      const user = data
      document.getElementById("user_id_edit").value = user.id
      document.getElementById("nombre_user_edit").value = user.nombre || ""
      document.getElementById("apellido_user_edit").value = user.apellido || ""
      document.getElementById("cedula_user_edit").value = user.cedula || ""
      document.getElementById("correo_user_edit").value = user.correo || ""
      document.getElementById("rol_user_edit").value = user.rol || ""

      // Set current photo in modal
      const currentPhotoPreview = document.getElementById("current_user_photo_preview")
      const userPhotoInput = document.getElementById("foto_user_edit")

      if (user.foto) {
        currentPhotoPreview.src = user.foto
        currentPhotoPreview.style.display = "block"
      } else {
        currentPhotoPreview.src = "/static/img/user.png" // Default placeholder
        currentPhotoPreview.style.display = "block"
      }
      userPhotoInput.value = "" // Clear file input

      document.getElementById("form-title-user").textContent = "Editar Usuario"
      document.getElementById("user-form").action = `/api/admin/users/${user.id}`
      document.getElementById("user-form-modal").style.display = "block"
    })
    .catch((error) => {
      console.error("Error al cargar la información del usuario:", error)
      displayFlashMessage(`Error al cargar la información del usuario: ${error.message}`, "error")
    })
}

// Delete User
function deleteUser(userId) {
  if (confirm("¿Está seguro que desea eliminar este usuario?")) {
    fetch(`/api/admin/users/delete/${userId}`, {
      method: "POST",
    })
      .then(async (response) => {
        const responseText = await response.text() // Read body ONCE as text
        let data
        try {
          data = JSON.parse(responseText) // Try to parse as JSON
        } catch (e) {
          data = { success: response.ok, message: responseText || `Error HTTP: ${response.status}` }
        }

        if (response.ok) {
          return data
        } else {
          throw new Error(data.message || `Error HTTP: ${response.status}`)
        }
      })
      .then((data) => {
        if (data.success) {
          displayFlashMessage(data.message, "success")
          loadUsersTable() // Reload the users table
        } else {
          displayFlashMessage(data.message, "error")
        }
      })
      .catch((error) => {
        console.error("Error:", error)
        displayFlashMessage(`Error al eliminar el usuario: ${error.message}`, "error")
      })
  }
}

// Setup User Modal
function setupUserModal() {
  const userModal = document.getElementById("user-form-modal")
  if (userModal) {
    const closeBtnUser = userModal.querySelector(".close")
    if (closeBtnUser) {
      closeBtnUser.addEventListener("click", () => {
        userModal.style.display = "none"
      })
    }

    // Handle form submission for user edit
    const form = document.getElementById("user-form")
    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault()

        const formData = new FormData(form)
        const userId = document.getElementById("user_id_edit").value // Get the user ID from the hidden input

        fetch(`/api/admin/users/${userId}`, {
          // Use the correct endpoint for update
          method: "POST",
          body: formData,
        })
          .then(async (response) => {
            const responseText = await response.text() // Read body ONCE as text
            let data
            try {
              data = JSON.parse(responseText) // Try to parse as JSON
            } catch (e) {
              data = { success: response.ok, message: responseText || `Error HTTP: ${response.status}` }
            }

            if (response.ok) {
              return data
            } else {
              throw new Error(data.message || `Error HTTP: ${response.status}`)
            }
          })
          .then((data) => {
            if (data.success) {
              displayFlashMessage(data.message, "success")
              userModal.style.display = "none" // Close modal on success
              loadUsersTable() // Reload the users table
            } else {
              displayFlashMessage(data.message, "error")
            }
          })
          .catch((error) => {
            console.error("Error:", error)
            displayFlashMessage(`Error al guardar el usuario: ${error.message}`, "error")
          })
      })
    }

    // Close modal when clicking outside
    window.addEventListener("click", (event) => {
      if (userModal && event.target === userModal) {
        userModal.style.display = "none"
      }
    })
  }
}

// NEW: Setup Purchase Order Details Modal (for client POs)
function setupPurchaseOrderDetailsModal() {
  const modal = document.getElementById("purchase-order-details-modal")
  if (!modal) return

  const closeBtn = modal.querySelector(".close-po-details-modal")
  closeBtn.addEventListener("click", () => {
    modal.style.display = "none"
  })

  // Close modal when clicking outside
  window.addEventListener("click", (event) => {
    if (event.target === modal) {
      modal.style.display = "none"
    }
  })

  // Setup PDF and Print buttons within the modal
  const modalDownloadPdfBtn = document.getElementById("modal-download-purchase-pdf")
  const modalPrintBtn = document.getElementById("modal-print-purchase-order")

  modalDownloadPdfBtn.addEventListener("click", function () {
    const orderId = this.getAttribute("data-order-id")
    if (orderId) {
      fetch(`/api/ordenes_compra_proveedor/${orderId}`) // Changed to supplier PO endpoint
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`)
          }
          return response.json()
        })
        .then((data) => {
          // Llama a la función global desde GuiaDeCompra.js
          createSupplierPurchaseOrderPdf(data, data.items)
        })
        .catch((error) => {
          console.error("Error al cargar la guía de compra para PDF:", error)
          displayFlashMessage(`Error al cargar la guía de compra para PDF: ${error.message}`, "error")
        })
    }
  })

  modalPrintBtn.addEventListener("click", function () {
    const orderId = this.getAttribute("data-order-id")
    if (orderId) {
      fetch(`/api/ordenes_compra_proveedor/${orderId}`) // Changed to supplier PO endpoint
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`)
          }
          return response.json()
        })
        .then((data) => {
          // Llama a la función global desde GuiaDeCompra.js
          printSupplierPurchaseOrderContent(data, data.items)
        })
        .catch((error) => {
          console.error("Error al cargar la guía de compra para imprimir:", error)
          displayFlashMessage(`Error al cargar la guía de compra para imprimir: ${error.message}`, "error")
        })
    }
  })
}

// Function to view dispatch details in the modal (reused from Gerencia)

// Change `loadAdminMaterialRequestsTable()` function to handle Spanish status and hide buttons
function loadAdminMaterialRequestsTable() {
  const table = document.getElementById("admin-material-requests-table")
  if (!table) return

  const tbody = table.querySelector("tbody")

  fetch("/api/material_requests/list")
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return response.json()
    })
    .then((data) => {
      tbody.innerHTML = ""
      if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" style="text-align: center;">No hay solicitudes de material.</td></tr>'
        return
      }
      data.forEach((request) => {
        const row = document.createElement("tr")
        let statusText = ""
        let statusClass = ""
        let actionsHtml = ""

        // Map English status to Spanish text and set actionsHtml based on status
        if (request.status === "pending") {
          statusText = "Pendiente";
          statusClass = "status-pending";
          actionsHtml = `
            <button class="action-btn approve-material-request" data-id="${request.id}" title="Aprobar"><i class="fas fa-check"></i></button>
            <button class="action-btn deny-material-request" data-id="${request.id}" title="Denegar"><i class="fas fa-times"></i></button>
          `;
        } else if (request.status === "approved") {
          statusText = "Aprobado";
          statusClass = "status-approved";
          actionsHtml = ""; // Empty string for approved status
        } else if (request.status === "denied") {
          statusText = "Denegado";
          statusClass = "status-denied";
          actionsHtml = ""; // Empty string for denied status
        }

        row.innerHTML = `
          <td>${formatDate(request.request_date)}</td>
          <td>${request.requester_full_name || "N/A"}</td>
          <td>${request.material_name}</td>
          <td>${request.quantity_requested}</td>
          <td>${request.unit}</td>
          <td>${request.reason || "N/A"}</td>
          <td><span class="status-badge ${statusClass}">${statusText}</span></td>
          <td>${request.responder_full_name || "N/A"}</td>
          <td>${actionsHtml}</td>
        `;
        tbody.appendChild(row)
      })
      setupAdminMaterialRequestActions()
    })
    .catch((error) => {
      console.error("Error al cargar solicitudes de material para admin:", error)
      tbody.innerHTML = `<tr><td colspan="10" class="error-message">Error al cargar solicitudes de material: ${error.message}</td></tr>`
    })
}

// NEW: Setup actions for material requests in Admin table
function setupAdminMaterialRequestActions() {
  document.querySelectorAll(".approve-material-request").forEach((button) => {
    button.addEventListener("click", function () {
      const requestId = this.getAttribute("data-id")
      if (confirm("¿Está seguro que desea APROBAR esta solicitud de material?")) {
        fetch(`/api/material_requests/approve/${requestId}`, {
          method: "POST",
        })
          .then(async (response) => {
            const responseText = await response.text()
            let data
            try {
              data = JSON.parse(responseText)
            } catch (e) {
              data = { success: response.ok, message: responseText || `Error HTTP: ${response.status}` }
            }
            if (response.ok) return data
            else throw new Error(data.message || `Error HTTP: ${response.status}`)
          })
          .then((data) => {
            displayFlashMessage(data.message, "success")
            loadAdminMaterialRequestsTable() // Reload table
            loadPendingMaterialRequestsTable() // Reload pending table as well
          })
          .catch((error) => {
            console.error("Error al aprobar solicitud:", error)
            displayFlashMessage(`Error al aprobar solicitud: ${error.message}`, "error")
          })
      }
    })
  })

  document.querySelectorAll(".deny-material-request").forEach((button) => {
    button.addEventListener("click", function () {
      const requestId = this.getAttribute("data-id")
      if (confirm("¿Está seguro que desea DENEGAR esta solicitud de material?")) {
        fetch(`/api/material_requests/deny/${requestId}`, {
          method: "POST",
        })
          .then(async (response) => {
            const responseText = await response.text()
            let data
            try {
              data = JSON.parse(responseText)
            } catch (e) {
              data = { success: response.ok, message: responseText || `Error HTTP: ${response.status}` }
            }
            if (response.ok) return data
            else throw new Error(data.message || `Error HTTP: ${response.status}`)
          })
          .then((data) => {
            displayFlashMessage(data.message, "success")
            loadAdminMaterialRequestsTable() // Reload table
            loadPendingMaterialRequestsTable() // Reload pending table as well
          })
          .catch((error) => {
            console.error("Error al denegar solicitud:", error)
            displayFlashMessage(`Error al denegar solicitud: ${error.message}`, "error")
          })
      }
    })
  })
}

// Heartbeat function to keep user status online
function startHeartbeat() {
  // Send a heartbeat every 30 seconds (30,000 ms)
  setInterval(() => {
    fetch("/api/user/heartbeat", {
      method: "POST",
      credentials: "same-origin",
    })
      .then((response) => {
        if (!response.ok) {
          console.warn("Heartbeat failed, user might be logged out or session expired.")
        }
      })
      .catch((error) => {
        console.error("Error sending heartbeat:", error)
      })
  }, 30000) // 30 seconds
}

// Utility functions
// ** LA FUNCIÓN formatDate SE REEMPLAZA ARRIBA **

function formatCurrency(value) {
  return new Intl.NumberFormat("es-VE", {
    style: "currency",
    currency: "VES",
  }).format(value)
}

function displayFlashMessage(message, category) {
  const flashMessagesDiv = document.getElementById("flash-messages")
  if (flashMessagesDiv) {
    flashMessagesDiv.innerHTML = `<div class="alert alert-${category}">${message}</div>`
    setTimeout(() => {
      flashMessagesDiv.innerHTML = ""
    }, 5000)
  }
}

// NEW: Function to parse numeric input from text fields, handling Venezuelan/Spanish format
function parseNumericInput(inputString) {
  if (typeof inputString !== "string") {
    return Number.parseFloat(inputString) || 0 // Handle already numeric values or non-strings
  }
  // Remove all non-digit, non-comma, non-dot characters (e.g., "Bs.S ")
  let cleanedString = inputString.replace(/[^\d.,]/g, "")
  // Replace the thousands separator (dot) with nothing
  cleanedString = cleanedString.replace(/\./g, "")
  // Replace the decimal separator (comma) with a dot
  cleanedString = cleanedString.replace(/,/g, ".")
  // Parse to float
  return Number.parseFloat(cleanedString) || 0
}

// Function to convert number to words (for "Son:" field in PDF)
function convertNumberToWords(num) {
  const units = ["", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve"]
  const teens = [
    "diez",
    "once",
    "doce",
    "trece",
    "catorce",
    "quince",
    "dieciséis",
    "diecisiete",
    "dieciocho",
    "diecinueve",
  ]
  const tens = ["", "", "veinte", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"]
  const hundreds = [
    "",
    "ciento",
    "doscientos",
    "trescientos",
    "cuatrocientos",
    "quinientos",
    "seiscientos",
    "setecientos",
    "ochocientos",
    "novecientos",
  ]

  function convertGroup(n) {
    let s = ""
    const h = Math.floor(n / 100)
    const t = Math.floor((n % 100) / 10)
    const u = n % 10

    if (h > 0) {
      s += hundreds[h] + " "
    }
    if (t === 1) {
      s += teens[u]
    } else if (t > 1) {
      s += tens[t]
      if (u > 0) s += " y " + units[u]
    } else if (u > 0) {
      s += units[u]
    }
    return s.trim()
  }

  if (num === 0) return "cero"

  let integerPart = Math.floor(num)
  const decimalPart = Math.round((num - integerPart) * 100)

  let words = ""

  if (integerPart >= 1000000000) {
    words += convertGroup(Math.floor(integerPart / 1000000000)) + " mil millones "
    integerPart %= 1000000000
  }
  if (integerPart >= 1000000) {
    const millions = Math.floor(integerPart / 1000000)
    if (millions === 1) {
      words += "un millón "
    } else {
      words += convertGroup(millions) + " millones "
    }
    integerPart %= 1000000
  }
  if (integerPart >= 1000) {
    const thousands = Math.floor(integerPart / 1000)
    if (thousands === 1) {
      words += "mil "
    } else {
      words += convertGroup(thousands) + " mil "
    }
    integerPart %= 1000
  }
  if (integerPart > 0) {
    words += convertGroup(integerPart)
  }

  words = words.trim()

  if (decimalPart > 0) {
    words += ` con ${decimalPart.toString().padStart(2, "0")}/100`
  } else {
    words += ` con 00/100`
  }

  return words.toUpperCase() + " BOLÍVARES"
}

// Function to add a new item row (for client POs, kept for existing functionality)
function addItemRow(item = {}) {
  const itemsContainer = document.getElementById("po_items_container")
  const itemRow = document.createElement("div")
  itemRow.classList.add("po-item-row")
  itemRow.innerHTML = `
  <select class="po-item-material-select" style="width: 40%;" required>
      <option value="">Seleccione material</option>
  </select>
  <input type="number" class="po-item-quantity" placeholder="Cantidad" value="${item.quantity || ""}" min="0.01" step="0.01" style="width: 15%;" required>
  <span class="po-item-unit-price-display" style="width: 20%; text-align: right;">P. Unitario: ${formatCurrency(item.unitPrice || 0)}</span>
  <span class="po-item-unit-display" style="width: 10%; text-align: left;">${item.unit || "Unidad"}</span>
  <span class="po-item-total" style="width: 10%; text-align: right;">${formatCurrency(item.itemTotal || 0)}</span>
  <button type="button" class="remove-item-btn" style="background: none; border: none; color: red; cursor: pointer; font-size: 1.2em;">&times;</button>
`
  itemsContainer.appendChild(itemRow)

  const materialSelect = itemRow.querySelector(".po-item-material-select")
  const selectedSupplierId = document.getElementById("po_supplier_id").value
  if (selectedSupplierId && allSupplierMaterials[selectedSupplierId]) {
    allSupplierMaterials[selectedSupplierId].forEach((material) => {
      const option = document.createElement("option")
      option.value = material.id
      option.textContent = material.nombre_material
      materialSelect.appendChild(option)
    })
  }

  // Set selected material if provided
  if (item.materialId) {
    materialSelect.value = item.materialId
  }

  // Add event listeners for new row
  materialSelect.addEventListener("change", (e) => {
    const selectedMaterialId = e.target.value
    const selectedMaterial = allSupplierMaterials[selectedSupplierId]?.find((m) => m.id == selectedMaterialId)
    if (selectedMaterial) {
      itemRow.querySelector(".po-item-unit-price-display").textContent =
        `P. Unitario: ${formatCurrency(selectedMaterial.precio)}`
      itemRow.querySelector(".po-item-unit-display").textContent = selectedMaterial.unidad_medida
    } else {
      itemRow.querySelector(".po-item-unit-price-display").textContent = "P. Unitario: 0.00"
      itemRow.querySelector(".po-item-unit-display").textContent = "Unidad"
    }
    calculateTotals()
  })
  itemRow.querySelector(".po-item-quantity").addEventListener("input", calculateTotals)
  itemRow.querySelector(".remove-item-btn").addEventListener("click", () => {
    itemRow.remove()
    calculateTotals()
  })

  // Trigger change to set initial price/unit if material is pre-selected
  if (item.materialId) {
    materialSelect.dispatchEvent(new Event("change"))
  }
}

// Calculate totals (for client POs, kept for existing functionality)
function calculateTotals() {
  const itemsContainer = document.getElementById("po_items_container")
  let totalToPay = 0

  const itemRows = itemsContainer.querySelectorAll(".po-item-row")
  itemRows.forEach((row) => {
    const materialSelect = row.querySelector(".po-item-material-select")
    const selectedMaterialId = materialSelect.value
    const selectedSupplierId = document.getElementById("po_supplier_id").value
    const selectedMaterial = allSupplierMaterials[selectedSupplierId]?.find((m) => m.id == selectedMaterialId)

    const quantity = parseNumericInput(row.querySelector(".po-item-quantity").value)
    const unitPrice = selectedMaterial ? selectedMaterial.precio : 0

    const itemTotal = quantity * unitPrice
    row.querySelector(".po-item-total").textContent = formatCurrency(itemTotal)
    totalToPay += itemTotal
  })

  document.getElementById("po_total_to_pay").textContent = formatCurrency(totalToPay)
  document.getElementById("preview_total_to_pay").textContent = formatCurrency(totalToPay)
  document.getElementById("preview_total_words").textContent = convertNumberToWords(totalToPay)
  updatePreview()
}

// Update preview (for client POs, kept for existing functionality)
function updatePreview() {
  const orderDate = document.getElementById("po_order_date_hidden").value
  document.getElementById("preview_po_date").textContent = formatDate(orderDate)

  const supplierSelect = document.getElementById("po_supplier_id")
  const selectedSupplierId = supplierSelect.value
  const selectedSupplier = allSuppliers.find((s) => s.id == selectedSupplierId)

  if (selectedSupplier) {
    document.getElementById("preview_supplier_name").textContent = selectedSupplier.nombre
    document.getElementById("preview_supplier_rif").textContent = selectedSupplier.rif
    document.getElementById("preview_supplier_address").textContent = selectedSupplier.direccion
    document.getElementById("preview_supplier_contact").textContent = selectedSupplier.nombre_contacto || "N/A"
    document.getElementById("preview_supplier_phone").textContent =
      selectedSupplier.telefono_contacto || selectedSupplier.telefono || "N/A"
  } else {
    document.getElementById("preview_supplier_name").textContent = ""
    document.getElementById("preview_supplier_rif").textContent = ""
    document.getElementById("preview_supplier_address").textContent = ""
    document.getElementById("preview_supplier_contact").textContent = ""
    document.getElementById("preview_supplier_phone").textContent = ""
  }

  const itemsTbody = document.getElementById("preview-items-tbody")
  itemsTbody.innerHTML = ""
  const itemsContainer = document.getElementById("po_items_container")
  const itemRows = itemsContainer.querySelectorAll(".po-item-row")
  itemRows.forEach((row) => {
    const materialSelect = row.querySelector(".po-item-material-select")
    const selectedMaterialId = materialSelect.value
    const selectedMaterial = allSupplierMaterials[selectedSupplierId]?.find((m) => m.id == selectedMaterialId)

    const materialName = selectedMaterial ? selectedMaterial.nombre_material : ""
    const quantity = parseNumericInput(row.querySelector(".po-item-quantity").value)
    const unitPrice = selectedMaterial ? selectedMaterial.precio : 0
    const unit = selectedMaterial ? selectedMaterial.unidad_medida : ""
    const itemTotal = quantity * unitPrice

    if (materialName && quantity > 0 && unitPrice > 0) {
      const tr = document.createElement("tr")
      tr.innerHTML = `
            <td style="border: 1px solid #ddd; padding: 8px;">${materialName}</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${quantity.toLocaleString("es-ES")}</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: left;">${unit}</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${formatCurrency(unitPrice)}</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${formatCurrency(itemTotal)}</td>
        `
      itemsTbody.appendChild(tr)
    }
  })
}

// Function to generate PDF for client purchase orders
function createPurchaseOrderPdf(order, items) {
  // Implement PDF generation logic here
  console.log("Generating PDF for client purchase order:", order, items)
}

// Function to print client purchase order content
function printPurchaseOrderContent(order, items) {
  // Implement print logic here
  console.log("Printing client purchase order:", order, items)
}

// Function to generate PDF for supplier purchase orders
function createSupplierPurchaseOrderPdf(order, items) {
  // Implement PDF generation logic here
  console.log("Generating PDF for supplier purchase order:", order, items)
}

// Function to print supplier purchase order content
function printSupplierPurchaseOrderContent(orderData, itemsData) {
  const poNumber = orderData.po_number
  const date = formatDate(orderData.fecha)
  const supplierName = orderData.proveedor_nombre
  const supplierRif = orderData.proveedor_rif
  const supplierAddress = orderData.proveedor_direccion
  const supplierContact = orderData.proveedor_contacto || "N/A"
  const supplierPhone = orderData.proveedor_telefono || "N/A"

  const totalToPay = formatCurrency(orderData.total)
  const totalWords = convertNumberToWords(orderData.total)

  let itemsHtml = ""
  itemsData.forEach((item) => {
    itemsHtml += `
  <tr>
    <td style="border: 1px solid #ddd; padding: 8px;">${item.nombre_material}</td>
    <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${item.cantidad.toLocaleString("es-ES")}</td>
    <td style="border: 1px solid #ddd; padding: 8px;">${item.unidad_medida}</td>
    <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${formatCurrency(item.precio_unitario)}</td>
    <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${formatCurrency(item.subtotal_item)}</td>
  </tr>
`
  })

  const printableContent = `
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Orden de Compra Proveedor ${poNumber}</title>
    <style>
        body { font-family: 'Poppins', sans-serif; margin: 20px; color: #333; }
        .container { width: 100%; max-width: 800px; margin: 0 auto; padding: 20px; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0,0,0,0.05); }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .company-info img { max-width: 300px; height: auto; margin-bottom: 5px; }
        .company-info p, .address-info p { margin: 0; font-size: 0.8em; }
        h4 { text-align: center; margin-bottom: 10px; }
        .supplier-details p { margin: 0; font-size: 0.9em; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 0.9em; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; color: #000; font-weight: bold; }
        .totals-summary p { margin: 0; font-size: 0.9em; text-align: right; }
        .totals-summary .final-total { font-weight: bold; }
        @media print {
            body { margin: 0; }
            .container { border: none; box-shadow: none; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="company-info">
                <img src="/static/uploads/Logo Prealca Sin Fondo.png" alt="Prealca Logo">
                <p>RIF.: J-30913171-0</p>
            </div>
            <div class="address-info">
                <p>Av. 2 parcela E-37, Zona Ind. Sta Cruz</p>
                <p>Estado Aragua</p>
                <p>Telf: 04128936930 / Roberto Quintero</p>
            </div>
        </div>
        <h4>ORDEN DE COMPRA A PROVEEDOR: ${poNumber}</h4>
        <p style="text-align: right; margin-bottom: 20px;">Fecha: ${date}</p>
        
        <div class="supplier-details">
            <p><strong>Proveedor:</strong> ${supplierName}</p>
            <p><strong>RIF:</strong> ${supplierRif}</p>
            <p><strong>Dirección:</strong> ${supplierAddress}</p>
            <p><strong>CONTACTO:</strong> ${supplierContact}</p>
            <p><strong>TELF:</strong> ${supplierPhone}</p>
        </div>

        <table>
            <thead>
                <tr>
                    <th>Material</th>
                    <th style="text-align: right;">Cantidad</th>
                    <th style="text-align: left;">Unidad</th>
                    <th style="text-align: right;">Precio Unitario</th>
                    <th style="text-align: right;">Subtotal</th>
                </tr>
            </thead>
            <tbody>
                ${itemsHtml}
            </tbody>
        </table>

        <div class="totals-summary">
            <p class="final-total">TOTAL: ${totalToPay}</p>
        </div>
        <p style="text-align: left; margin-top: 20px; font-size: 0.9em;">Son: ${totalWords}</p>
    </div>
</body>
</html>
`

  const printWindow = window.open("", "_blank")
  if (printWindow) {
    printWindow.document.write(printableContent)
    printWindow.document.close()
    printWindow.focus()
    printWindow.onload = () => {
      printWindow.print()
      // Optional: close window after print dialog is dismissed
      // printWindow.onafterprint = function() { printWindow.close(); };
    }
  } else {
    displayFlashMessage("No se pudo abrir la ventana de impresión. Por favor, permita pop-ups.", "error")
  }
}

// NEW: Load suppliers for the purchase guide form
let allSuppliers = []
const allSupplierMaterials = {}

function loadSuppliersForPurchaseGuide() {
  fetch("/api/proveedores")
    .then((response) => response.json())
    .then((data) => {
      allSuppliers = data
      const supplierSelect = document.getElementById("po_supplier_id")
      if (supplierSelect) {
        supplierSelect.innerHTML = '<option value="">Seleccione proveedor</option>'
        data.forEach((supplier) => {
          const option = document.createElement("option")
          option.value = supplier.id
          option.textContent = supplier.nombre
          supplierSelect.appendChild(option)
          allSupplierMaterials[supplier.id] = supplier.materiales // Store materials by supplier ID
        })
      }
    })
    .catch((error) => console.error("Error al cargar proveedores:", error))
}

// REEMPLAZA LA FUNCIÓN loadPendingMaterialRequestsTable EXISTENTE CON ESTA VERSIÓN

function loadPendingMaterialRequestsTable() {
  const alertsContainer = document.getElementById("admin-alerts-content")
  if (!alertsContainer) return

  // Mostrar esqueleto de carga
  alertsContainer.innerHTML = `
        <div class="alerts-skeleton">
            <div class="skeleton-card"></div>
            <div class="skeleton-card"></div>
        </div>
    `

  fetch("/api/material_requests/list")
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return response.json()
    })
    .then((data) => {
      alertsContainer.innerHTML = "" // Limpiar esqueleto

      const pendingRequests = data.filter((request) => request.status === "pending")

      if (pendingRequests.length === 0) {
        alertsContainer.innerHTML = `
                    <div class="alerts-empty">
                        <i class="fas fa-check-circle"></i>
                        <p>No hay solicitudes de material pendientes.</p>
                    </div>
                `
        return
      }

      const alertsGrid = document.createElement("div")
      alertsGrid.className = "alerts-grid"

      pendingRequests.forEach((request) => {
        const alertCard = document.createElement("div")
        alertCard.className = "alert-card warning" // Todas las pendientes son 'warning'

        // Construir botones de acción
        const actionsHtml = `
                    <div class="actions-row" style="margin-top: 10px;">
                        <button class="btn-sm btn-success approve-material-request" data-id="${request.id}"><i class="fas fa-check"></i> Aprobar</button>
                        <button class="btn-sm btn-danger deny-material-request" data-id="${request.id}"><i class="fas fa-times"></i> Denegar</button>
                    </div>
                `

        alertCard.innerHTML = `
                    <div class="alert-card-header">
                        <div class="alert-card-icon"><i class="fas fa-box-open"></i></div>
                        <h3 class="alert-card-title">Solicitud Pendiente</h3>
                    </div>
                    <div class="alert-card-content">
                        <strong>${request.requester_full_name}</strong> ha solicitado <strong>${request.quantity_requested} ${request.unit}</strong> de <strong>${request.material_name}</strong>.
                        <br>
                        <em>Razón: ${request.reason || "No especificada"}</em>
                    </div>
                    <div class="alert-card-meta">
                        <span>${formatDate(request.request_date)}</span>
                    </div>
                    ${actionsHtml}
                `
        alertsGrid.appendChild(alertCard)
      })

      alertsContainer.appendChild(alertsGrid)

      // Re-vincular los eventos a los nuevos botones
      setupAdminMaterialRequestActions()
    })
    .catch((error) => {
      console.error("Error al cargar solicitudes de material pendientes:", error)
      alertsContainer.innerHTML = `<p class="error-message">Error al cargar las solicitudes pendientes.</p>`
    })
}

function loadCostoDiseno() {
  const table = document.getElementById("costo-diseno-table")
  if (!table) return

  const tbody = table.querySelector("tbody")

  fetch("/api/costo_diseno")
    .then((response) => response.json())
    .then((data) => {
      tbody.innerHTML = ""
      let totalGeneral = 0

      if (data.success === false) {
        tbody.innerHTML = `<tr><td colspan="6" class="error-message">Error: ${data.message}</td></tr>`
        return
      }

      if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="info-message">No hay diseños registrados.</td></tr>`
        return
      }

      data.forEach((diseno) => {
        const valorTotal = diseno.m3_disponible * diseno.precio_unitario
        totalGeneral += valorTotal

        const row = document.createElement("tr")
        row.innerHTML = `
                    <td>${diseno.id}</td>
                    <td>${diseno.nombre}</td>
                    <td>${diseno.m3_disponible.toFixed(2)}</td>
                    <td>${formatCurrency(diseno.precio_unitario)}</td>
                    <td>${formatCurrency(valorTotal)}</td>
                    <td>
                        <button class="action-btn edit-precio-btn" data-id="${diseno.id}" data-nombre="${diseno.nombre}" data-precio="${diseno.precio_unitario}" title="Editar Precio">
                            <i class="fas fa-edit"></i>
                        </button>
                    </td>
                `
        tbody.appendChild(row)
      })

      // Actualizar total general
      document.getElementById("precio-total-general").textContent = formatCurrency(totalGeneral)

      // Agregar event listeners para botones de editar
      document.querySelectorAll(".edit-precio-btn").forEach((button) => {
        button.addEventListener("click", (e) => {
          const disenoId = e.currentTarget.dataset.id
          const disenoNombre = e.currentTarget.dataset.nombre
          const precioActual = e.currentTarget.dataset.precio
          openEditPrecioModal(disenoId, disenoNombre, precioActual)
        })
      })
    })
    .catch((error) => {
      console.error("Error al cargar costo por diseño:", error)
      tbody.innerHTML = `<tr><td colspan="6" class="error-message">Error al cargar datos</td></tr>`
    })
}

function openEditPrecioModal(disenoId, disenoNombre, precioActual) {
  const modal = document.getElementById("edit-precio-modal")
  const disenoIdInput = document.getElementById("edit_diseno_id")
  const disenoNombreInput = document.getElementById("edit_diseno_nombre")
  const precioUnitarioInput = document.getElementById("edit_precio_unitario")

  disenoIdInput.value = disenoId
  disenoNombreInput.value = disenoNombre
  precioUnitarioInput.value = precioActual

  modal.style.display = "block"
}

function setupEditPrecioModal() {
  const modal = document.getElementById("edit-precio-modal")
  const closeBtn = document.getElementById("close-edit-precio-modal")
  const form = document.getElementById("edit-precio-form")

  if (!modal || !closeBtn || !form) return

  closeBtn.addEventListener("click", () => {
    modal.style.display = "none"
  })

  window.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.style.display = "none"
    }
  })

  form.addEventListener("submit", (e) => {
    e.preventDefault()

    const disenoId = document.getElementById("edit_diseno_id").value
    const precioUnitario = Number.parseFloat(document.getElementById("edit_precio_unitario").value)

    if (!disenoId || isNaN(precioUnitario) || precioUnitario < 0) {
      displayFlashMessage("Por favor ingrese un precio válido.", "error")
      return
    }

    fetch(`/api/costo_diseno/${disenoId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        precio_unitario: precioUnitario,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          displayFlashMessage(data.message, "success")
          modal.style.display = "none"
          loadCostoDiseno() // Recargar la tabla
        } else {
          displayFlashMessage(data.message, "error")
        }
      })
      .catch((error) => {
        console.error("Error al actualizar precio:", error)
        displayFlashMessage("Error al actualizar el precio.", "error")
      })
  })
}

// Modify the existing DOMContentLoaded event listener
document.addEventListener("DOMContentLoaded", () => {
  loadUserInfo()
  loadInitialData()
  setupPurchaseGuideForm()
  loadSuppliersForPurchaseGuide()
  loadPurchaseOrdersTable()
  loadUsersTable()
  loadPendingMaterialRequestsTable()
  setupEditPrecioModal()

  // Add event listener for page navigation
  document.querySelectorAll(".sidebar a[data-page]").forEach((link) => {
    link.addEventListener("click", function (e) {
      e.preventDefault()
      const targetPage = this.getAttribute("data-page")
      showPage(targetPage)

      if (targetPage === "costo-diseno") {
        loadCostoDiseno()
      }
    })
  })
})

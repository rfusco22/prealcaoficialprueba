// Declare the url variable (if this is used for a specific HTML file, otherwise remove)
const url = "https://blobs.vusercontent.net/blob/dashboard_vendedor-ZUPxgIpDdiUPan3lMWDQ2zvSI53INu.html"

// Cargar información del usuario
async function loadUserInfo() {
  const userName = document.getElementById("user-name")

  // Retrieve from session storage first
  const userId = sessionStorage.getItem("userId")
  const userNameFromSession = sessionStorage.getItem("userName")
  const userRole = sessionStorage.getItem("userRole")
  const vendedorDbId = sessionStorage.getItem("vendedorDbId") // Get stored vendedorDbId

  // If window.userInfo is not yet populated by the template, try to reconstruct from session storage
  if (!window.userInfo && userId && userNameFromSession && userRole) {
    window.userInfo = {
      id: Number.parseInt(userId),
      nombreCompleto: userNameFromSession,
      rol: userRole,
      vendedorDbId: vendedorDbId ? Number.parseInt(vendedorDbId) : undefined, // Add vendedorDbId if available
    }
  }

  if (window.userInfo && window.userInfo.nombreCompleto) {
    if (userName.textContent === "Cargando...") {
      userName.textContent = window.userInfo.nombreCompleto
    }
    const userPhoto = document.getElementById("user-photo")
    if (userPhoto && window.userInfo.foto) {
      userPhoto.src = window.userInfo.foto
    }
    sessionStorage.setItem("userName", window.userInfo.nombreCompleto)
    sessionStorage.setItem("userId", window.userInfo.id)
    sessionStorage.setItem("userRole", window.userInfo.rol)

    // If the user is a 'vendedor' and we don't have their vendedorDbId yet, fetch it
    // This is still useful for client-side logic, even if backend session is primary
    if (window.userInfo.rol === "vendedor" && !window.userInfo.vendedorDbId) {
      try {
        const response = await fetch("/api/get_vendedor_info_by_user_id")
        const data = await response.json()
        if (data.success && data.vendedor_id) {
          window.userInfo.vendedorDbId = data.vendedor_id
          sessionStorage.setItem("vendedorDbId", data.vendedor_id) // Store for future sessions
          console.log("[DEBUG] VendedorDbId fetched and set:", window.userInfo.vendedorDbId)
        } else {
          console.warn("[WARN] Could not get vendedorDbId for seller:", data.message)
        }
      } catch (error) {
        console.error("Error fetching vendedor info:", error)
      }
    }
  } else {
    // This block handles cases where window.userInfo is not set initially (e.g., first load or after logout)
    // and session storage also doesn't have full info.
    // In a real app, window.userInfo should be populated by the server-rendered template.
    // For this context, we assume it's either set by template or we try to get it from session.
    userName.textContent = sessionStorage.getItem("userName") || "Usuario Registro"
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
    // Load data for specific pages
    switch (pageId) {
      case "clientes":
        loadClientesTableVendedor() // This will now fetch data if not already loaded
        break
      case "cotizaciones":
        // No specific load needed here, form setup handles it
        break
      case "registro-cotizaciones": // New case for the registered quotations page
        loadQuotationsTable()
        break
      case "generar-guia-despacho": // NEW
        setTodayDateToInput("fecha_display", "fecha_hidden")
        updateDispatchPreview()
        break
      case "registro-guias-despacho": // NEW
        loadRegistroGuiaDespachoTable()
        break
    }
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

// Global map to store client data
const clientsDataMap = new Map()
// NEW: Global maps for other entities
const choferesDataMap = new Map()
const camionesDataMap = new Map()
const disenosDataMap = new Map()
const vendedoresDataMap = new Map()

// Load Clients for Select (and return data for table)
function loadClientesForSelect() {
  return fetch("/api/clientes") // Return the promise
    .then((response) => response.json())
    .then((data) => {
      console.log("[DEBUG] Data received from /api/clientes:", data) // DEBUG LOG
      const clienteSelect = document.getElementById("cot_client")
      // Removed editVendedorSelect as it's no longer needed in the HTML

      if (clienteSelect) {
        clienteSelect.innerHTML = '<option value="">Seleccione cliente</option>'
      }

      clientsDataMap.clear() // Clear previous data
      data.forEach((cliente) => {
        const option = document.createElement("option")
        option.value = cliente.id
        option.textContent = cliente.nombre
        // Store client details as data attributes for easy access in preview
        option.setAttribute("data-name", cliente.nombre || "N/A")
        option.setAttribute("data-address", cliente.direccion || "N/A")
        option.setAttribute("data-phone", cliente.telefono || "N/A")
        option.setAttribute("data-document", cliente.documento || "N/A")
        if (clienteSelect) {
          clienteSelect.appendChild(option)
        }
        clientsDataMap.set(cliente.id.toString(), cliente) // Store full client object
      })
      console.log("[DEBUG] clientsDataMap after population:", Array.from(clientsDataMap.keys())) // DEBUG LOG
      console.log("[DEBUG] clientsDataMap size after loadClientesForSelect:", clientsDataMap.size) // NEW DEBUG LOG
      return data // Return the fetched data for use in loadClientesTableVendedor
    })
    .catch((error) => {
      console.error("Error al cargar clientes para select:", error)
      return [] // Return empty array on error
    })
}

// Global map to store concrete design data
const concreteDesignsMap = new Map()

// Load Concrete Designs for Select
function loadConcreteDesignsForSelect() {
  return fetch("/api/concrete_designs") // Return the promise
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} for /api/concrete_designs`)
      }
      return response.json()
    })
    .then((data) => {
      disenosDataMap.clear() // Clear previous data
      concreteDesignsMap.clear() // Clear previous data
      data.forEach((design) => {
        disenosDataMap.set(design.id.toString(), design)
        concreteDesignsMap.set(design.id.toString(), design) // Also populate concreteDesignsMap
      })
      // Re-render quotation items to update design names if needed
      const itemRows = document.querySelectorAll("#quotation_items_container .quotation-item-row")
      itemRows.forEach((row) => {
        const codeSelect = row.querySelector(".quotation-item-code")
        const descriptionDisplay = row.querySelector(".quotation-item-description-display")
        const selectedDesign = concreteDesignsMap.get(codeSelect.value)
        // Removed days logic as per new design
        if (selectedDesign && days) {
          descriptionDisplay.value = `RC = ${selectedDesign.resistencia}kgf/cm² - ${selectedDesign.asentamiento}" ADTVO SUPER PLASTIFICANTE WRDA79 FRACTIL 10% A LOS ${days} DIAS`;
        } else {
          descriptionDisplay.value = ""
        }
      })
      generateQuotationPreview() // Call preview update
    })
    .catch((error) => {
      console.error("Error al cargar diseños de concreto:", error)
      displayFlashMessage(`Error al cargar diseños de concreto: ${error.message}. Verifique permisos.`, "error")
    })
}

// Load Clients Table for Vendedor
function loadClientesTableVendedor(clientsData = null) {
  const table = document.getElementById("clientes-table-vendedor")
  if (!table) return

  const tbody = table.querySelector("tbody")

  const renderTable = (data) => {
    tbody.innerHTML = ""
    if (data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="info-message">No hay clientes registrados para este vendedor.</td></tr>`
      return
    }
    data.forEach((cliente) => {
      const row = document.createElement("tr")
      row.innerHTML = `
<td>${cliente.nombre}</td>
<td>${cliente.direccion}</td>
<td>${cliente.telefono}</td>
<td>${cliente.documento}</td>
<td>${cliente.vendedor_nombre || "N/A"}</td>
<td>
    <button class="action-btn edit-client-btn" data-id="${cliente.id}" title="Editar Cliente"><i class="fas fa-edit"></i></button>
    <button class="action-btn delete-client-btn" data-id="${cliente.id}" title="Eliminar Cliente"><i class="fas fa-trash-alt"></i></button>
</td>
`
      tbody.appendChild(row)
    })

    // Add event listeners for edit and delete buttons
    document.querySelectorAll(".edit-client-btn").forEach((button) => {
      button.addEventListener("click", (e) => openEditClientModal(e.currentTarget.dataset.id))
    })
    document.querySelectorAll(".delete-client-btn").forEach((button) => {
      button.addEventListener("click", (e) => deleteClient(e.currentTarget.dataset.id))
    })
  }

  if (clientsData) {
    renderTable(clientsData)
  } else {
    // If no data provided (e.g., when navigating to the page later), fetch it
    fetch("/api/clientes")
      .then((response) => {
        if (!response.ok) {
          // If response is not OK (e.g., 500 status), parse JSON error and throw
          return response.json().then((errorData) => {
            throw new Error(errorData.message || errorData.error || `Server error: ${response.status}`)
          })
        }
        return response.json() // Parse JSON if response is OK
      })
      .then((data) => {
        // Now 'data' should always be an array if response.ok was true
        renderTable(data)
      })
      .catch((error) => {
        console.error("Error al cargar clientes:", error)
        displayFlashMessage(`Error al cargar clientes: ${error.message}. Por favor, intente de nuevo.`, "error")
      })
  }
}

// Load Quotations Table
function loadQuotationsTable() {
  const table = document.getElementById("quotations-table")
  if (!table) return

  const tbody = table.querySelector("tbody")

  return fetch("/api/quotations/list") // Return the promise
    .then((response) => response.json())
    .then((data) => {
      tbody.innerHTML = ""
      if (data.success === false && data.message.includes("Error al listar cotizaciones")) {
        tbody.innerHTML = `<tr><td colspan="9" class="error-message">Error al cargar cotizaciones: ${data.message}</td></tr>`
        return
      }
      if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="info-message">No hay cotizaciones registradas.</td></tr>`
        return
      }
      data.forEach((quotation) => {
        let expiryDateString = "N/A"

        if (quotation.quotation_date && quotation.validity_days && !isNaN(quotation.validity_days)) {
          // Convertir fecha de dd/mm/yyyy a formato que JavaScript pueda parsear
          const dateStr = quotation.quotation_date
          const dateParts = dateStr.split("/")

          if (dateParts.length === 3) {
            const [day, month, year] = dateParts
            // Crear fecha en formato yyyy-mm-dd para parsing correcto
            const quotationDate = new Date(`${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`)

            if (!isNaN(quotationDate.getTime())) {
              const expiryDate = new Date(quotationDate)
              expiryDate.setDate(quotationDate.getDate() + Number.parseInt(quotation.validity_days))

              if (!isNaN(expiryDate.getTime())) {
                // Formatear fecha de vencimiento como dd/mm/yyyy
                const expDay = String(expiryDate.getDate()).padStart(2, "0")
                const expMonth = String(expiryDate.getMonth() + 1).padStart(2, "0")
                const expYear = expiryDate.getFullYear()
                expiryDateString = `${expDay}/${expMonth}/${expYear}`
              }
            }
          }
        }

        const row = document.createElement("tr")
        row.innerHTML = `
         <td>${quotation.quotation_number}</td>
         <td>${formatDate(quotation.quotation_date)}</td>
         <td>${expiryDateString}</td>
         <td>${quotation.client_name || "N/A"}</td>
         <td>${quotation.item_summary_description || "N/A"}</td>
         <td>${quotation.total_quantity || 0}</td>
         <td>${formatCurrency(quotation.total_amount)}</td>
         <td>${quotation.status === "cancelled" ? '<span class="text-red-500 font-semibold">Anulada</span>' : '<span class="text-green-500 font-semibold">Activa</span>'}</td>
         <td>
             <button class="action-btn view-quotation-btn" data-id="${quotation.id}" title="Ver Cotización"><i class="fas fa-eye"></i></button>
             <button class="action-btn print-quotation-btn" data-id="${quotation.id}" title="Imprimir Cotización"><i class="fas fa-print"></i></button>
             <button class="action-btn delete-quotation-btn ${quotation.status === "cancelled" ? "hidden" : ""}" data-id="${quotation.id}" title="Anular Cotización"><i class="fas fa-ban"></i></button>
         </td>
     `
        tbody.appendChild(row)
      })

      // Add event listeners for new buttons
      document.querySelectorAll(".view-quotation-btn").forEach((button) => {
        button.addEventListener("click", (e) => openViewQuotationModal(e.currentTarget.dataset.id))
      })
      document.querySelectorAll(".print-quotation-btn").forEach((button) => {
        button.addEventListener("click", (e) => printQuotation(e.currentTarget.dataset.id))
      })
      document.querySelectorAll(".delete-quotation-btn").forEach((button) => {
        button.addEventListener("click", (e) => cancelQuotation(e.currentTarget.dataset.id))
      })
    })
    .catch((error) => console.error("Error al cargar cotizaciones:", error))
}

// Utility functions
function formatDate(dateString) {
  if (!dateString) return "N/A"
  // Ensure dateString is in YYYY-MM-DD format before creating Date object
  const normalizedDateString = convertDDMMYYYYtoYYYYMMDD(dateString) || dateString
  const date = new Date(`${normalizedDateString}T00:00:00-04:00`) // Explicitly set to Caracas timezone offset
  // Check if the date is valid before formatting
  if (isNaN(date.getTime())) {
    console.warn("[WARN] Invalid date string provided to formatDate:", dateString)
    return "Fecha inválida"
  }
  // Format as DD/MM/YYYY
  const day = String(date.getDate()).padStart(2, "0")
  const month = String(date.getMonth() + 1).padStart(2, "0") // Months are 0-indexed
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

function convertDDMMYYYYtoYYYYMMDD(dateString) {
  if (!dateString || dateString === "N/A") return ""
  const parts = dateString.split("/")
  if (parts.length === 3) {
    const [day, month, year] = parts
    return `${year}-${month}-${day}`
  }
  return dateString // Return as is if not in DD/MM/YYYY format (e.g., already YYYY-MM-DD)
}

function formatCurrency(value, includeSymbol = true) {
  if (isNaN(value) || value === null) return includeSymbol ? "Bs.S 0,00" : "0,00"
  const formatted = new Intl.NumberFormat("es-VE", {
    style: "currency",
    currency: "VES",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
  return includeSymbol ? formatted : formatted.replace("Bs.S ", "")
}

function displayFlashMessage(message, category) {
  const flashMessagesDiv = document.getElementById("flash-messages")
  if (flashMessagesDiv) {
    // Clear any existing messages
    flashMessagesDiv.innerHTML = ""

    const alertDiv = document.createElement("div")
    alertDiv.classList.add("alert", `alert-${category}`, "fade-in")
    alertDiv.setAttribute("role", "alert")

    const contentSpan = document.createElement("span")
    contentSpan.classList.add("alert-content")
    contentSpan.textContent = message

    const closeButton = document.createElement("button")
    closeButton.classList.add("alert-close")
    closeButton.innerHTML = "&times;" // HTML entity for 'x'
    closeButton.setAttribute("aria-label", "Cerrar alerta")

    alertDiv.appendChild(contentSpan)
    alertDiv.appendChild(closeButton)
    flashMessagesDiv.appendChild(alertDiv)

    // Add event listener to close button
    closeButton.addEventListener("click", () => {
      alertDiv.classList.remove("fade-in")
      alertDiv.classList.add("fade-out")
      alertDiv.addEventListener("animationend", () => {
        alertDiv.remove()
      })
    })

    // Automatically remove after 5 seconds
    setTimeout(() => {
      if (alertDiv.parentNode) {
        // Check if it hasn't been manually closed
        alertDiv.classList.remove("fade-in")
        alertDiv.classList.add("fade-out")
        alertDiv.addEventListener("animationend", () => {
          alertDiv.remove()
        })
      }
    }, 5000)
  }
}

// Function to parse numeric input from text fields, handling Venezuelan/Spanish format
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

function addItemRow(item = {}) {
  const itemsContainer = document.getElementById("quotation_items_container")
  const itemRow = document.createElement("div")
  itemRow.classList.add("quotation-item-row")

  // Generate options for the code select using the concreteDesignsMap
  const codeOptions = Array.from(concreteDesignsMap.values())
    .map(
      (design) => `<option value="${design.id}" ${item.design_id == design.id ? "selected" : ""}>${design.id}</option>`,
    )
    .join("")

  itemRow.innerHTML = `
<select class="quotation-item-code px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300 text-sm shadow-sm">
<option value="">Código</option>
${codeOptions}
</select>
<input type="text" class="quotation-item-description-display px-3 py-2 border border-gray-200 rounded-md bg-gray-50 focus:outline-none text-sm shadow-sm" placeholder="Descripción" value="${
    item.description || ""
  }" readonly>
<input type="number" class="quotation-item-days px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300 text-sm shadow-sm" placeholder="Días" value="${
    item.days || ""
  }" min="1">
<input type="number" class="quotation-item-quantity px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300 text-sm shadow-sm" placeholder="Cantidad" value="${
    item.quantity || ""
  }" min="1">
<input type="text" class="quotation-item-unit-price px-3 py-2 border border-gray-200 rounded-md bg-gray-50 focus:outline-none text-sm shadow-sm" placeholder="P. Unitario" value="${
    item.unit_price ? formatCurrency(item.unit_price, false) : ""
  }" readonly>
<span class="quotation-item-total px-3 py-2 text-right font-semibold text-gray-900 text-sm bg-gray-50 border border-gray-200 rounded-md shadow-sm">${formatCurrency(
    item.item_total || 0,
  )}</span>
<button type="button" class="remove-item-btn text-red-400 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-offset-2 rounded-full w-6 h-6 flex items-center justify-center text-lg">&times;</button>
`
  // Add the grid class to the itemRow after it's created
  itemRow.classList.add(
    "grid",
    "grid-cols-[0.8fr_2fr_0.5fr_0.5fr_1fr_1fr_0.2fr]", // Updated grid columns to include Days
    "gap-2",
    "items-center",
    "p-2",
    "bg-white",
    "rounded-lg",
    "shadow-sm",
    "border",
    "border-gray-100",
  )
  itemsContainer.appendChild(itemRow)

  // Add event listeners for new row
  const codeSelect = itemRow.querySelector(".quotation-item-code")
  const daysInput = itemRow.querySelector(".quotation-item-days") // Reintroduced
  const quantityInput = itemRow.querySelector(".quotation-item-quantity")
  const unitPriceInput = itemRow.querySelector(".quotation-item-unit-price")
  const descriptionDisplay = itemRow.querySelector(".quotation-item-description-display")

  const updateDescription = () => {
    const selectedDesign = concreteDesignsMap.get(codeSelect.value)
    const days = daysInput.value // Reintroduced
    if (selectedDesign && days) {
      descriptionDisplay.value = `RC = ${selectedDesign.resistencia}kgf/cm² - ${selectedDesign.asentamiento}" ADTVO SUPER PLASTIFICANTE WRDA79 FRACTIL 10% A LOS ${days} DIAS`;
    } else {
      descriptionDisplay.value = ""
    }
    calculateTotals()
  }

  const loadPrecioUnitario = () => {
    const selectedDesignId = codeSelect.value
    if (selectedDesignId) {
      fetch(`/api/costo_diseno/${selectedDesignId}`)
        .then((response) => response.json())
        .then((data) => {
          if (data.success !== false && data.precio_unitario) {
            unitPriceInput.value = formatCurrency(data.precio_unitario, false)
            calculateTotals()
          }
        })
        .catch((error) => {
          console.error("Error al cargar precio unitario:", error)
        })
    } else {
      unitPriceInput.value = ""
      calculateTotals()
    }
  }

  codeSelect.addEventListener("change", () => {
    updateDescription()
    loadPrecioUnitario() // Cargar precio automáticamente al cambiar código
  })
  daysInput.addEventListener("input", updateDescription) // Reintroduced
  quantityInput.addEventListener("input", calculateTotals)
  unitPriceInput.addEventListener("input", calculateTotals)
  itemRow.querySelector(".remove-item-btn").addEventListener("click", () => {
    itemRow.remove()
    calculateTotals()
  })

  updateDescription() // Initial description update
  if (item.design_id) {
    loadPrecioUnitario()
  }
}

// Calculate totals for quotations
function calculateTotals() {
  const itemsContainer = document.getElementById("quotation_items_container")
  let subtotal = 0
  const itemRows = itemsContainer.querySelectorAll(".quotation-item-row")
  itemRows.forEach((row) => {
    const quantity = parseNumericInput(row.querySelector(".quotation-item-quantity").value)
    const unitPrice = parseNumericInput(row.querySelector(".quotation-item-unit-price").value)
    const itemTotal = quantity * unitPrice
    row.querySelector(".quotation-item-total").textContent = formatCurrency(itemTotal)
    subtotal += itemTotal
  })

  // ****** INICIO: LÓGICA DE FLETE ******
  const includeFreight = document.getElementById("cot_include_freight").checked
  const freightCostInput = document.getElementById("cot_freight_cost")
  const freightSummaryLine = document.getElementById("freight_summary_line")
  const freightTotalSpan = document.getElementById("cot_freight_total")

  let freightCost = 0
  if (includeFreight) {
    freightCost = parseNumericInput(freightCostInput.value)
    freightSummaryLine.style.display = "flex" // Muestra la línea de flete en el resumen
    freightTotalSpan.textContent = formatCurrency(freightCost)
  } else {
    freightSummaryLine.style.display = "none" // Oculta la línea de flete
  }
  // ****** FIN: LÓGICA DE FLETE ******

  const ivaRate = 0.16 // 16% IVA
  const taxableBase = subtotal // Assuming all items are taxable for simplicity
  const ivaAmount = taxableBase * ivaRate
  const totalAmount = taxableBase + ivaAmount + freightCost // Se suma el flete al total

  document.getElementById("cot_subtotal").textContent = formatCurrency(subtotal)
  document.getElementById("cot_exempt_amount").textContent = formatCurrency(0) // Always 0 as per PDF
  document.getElementById("cot_taxable_base").textContent = formatCurrency(taxableBase)
  document.getElementById("cot_iva_amount").textContent = formatCurrency(ivaAmount)
  document.getElementById("cot_total_amount").textContent = formatCurrency(totalAmount)

  generateQuotationPreview() // Update preview on total changes
}

// Function to generate the quotation preview
function generateQuotationPreview() {
  const previewContainer = document.getElementById("quotation-preview")
  if (!previewContainer) return

  const cotDate = document.getElementById("cot_date").value // This will now be DD/MM/YYYY
  const cotClientSelect = document.getElementById("cot_client")
  const cotValidity = document.getElementById("cot_validity").value

  const selectedClientOption = cotClientSelect.options[cotClientSelect.selectedIndex]
  const selectedClient =
    selectedClientOption && selectedClientOption.value ? clientsDataMap.get(selectedClientOption.value) : null

  const selectedSeller = { nombreCompleto: window.userInfo.nombreCompleto } // Use the logged-in user's full name

  const items = []
  const itemRows = document.querySelectorAll("#quotation_items_container .quotation-item-row")
  //...
  itemRows.forEach((row) => {
    const designId = row.querySelector(".quotation-item-code").value
    const description = row.querySelector(".quotation-item-description-display").value;
    const code = designId
    const days = row.querySelector(".quotation-item-days").value; // <--- AÑADIR ESTA LÍNEA
    const quantity = parseNumericInput(row.querySelector(".quotation-item-quantity").value);
    const unitPrice = parseNumericInput(row.querySelector(".quotation-item-unit-price").value);
    const itemTotal = quantity * unitPrice;

    if (code && description && days && quantity > 0 && unitPrice > 0) {
      items.push({
        item_type: "concrete_design",
        item_id: designId,
        design_id: designId,
        code,
        description, // <--- Ahora la variable existe
        days,
        quantity,
        unit_price: unitPrice,
        item_total: itemTotal,
      })
    }
  })
  //...

  const subtotal = parseNumericInput(document.getElementById("cot_subtotal").textContent)
  const exemptAmount = parseNumericInput(document.getElementById("cot_exempt_amount").textContent)
  const taxableBase = parseNumericInput(document.getElementById("cot_taxable_base").textContent)
  const ivaAmount = parseNumericInput(document.getElementById("cot_iva_amount").textContent)
  const totalAmount = parseNumericInput(document.getElementById("cot_total_amount").textContent)

  // Placeholder for quotation number, backend will generate actual number
  // Based on backend logic: Nº[5-digit sequence][4-digit year]
  const currentYear = new Date().getFullYear()
  const placeholderQuotationNumber = `Nº00000${currentYear}` // Example: Nº000002024
  // ****** INICIO: LÓGICA DE FLETE PARA VISTA PREVIA ******
  const includeFreight = document.getElementById("cot_include_freight").checked
  const freightCost = parseNumericInput(document.getElementById("cot_freight_cost").value)
  let freightSummaryHTML = ""
  if (includeFreight && freightCost > 0) {
    freightSummaryHTML = `<p>Flete: <span>${formatCurrency(freightCost)}</span></p>`
  }
  previewContainer.innerHTML = `
    <div class="quotation-document">
        <div class="preview-header">
            <div class="company-info">
                <img src="/static/uploads/Logo Prealca Sin Fondo.png" alt="Prealca Logo" class="company-logo">
                <p>RIF.: J-30913171-0</p>
            </div>
            <div class="address-info">
                <p>Av. 2 parcela E-37, Zona Ind. Sta Cruz</p>
                <p>Estado Aragua</p>
                <p>Telf: 04128936930 / Roberto Quintero</p>
            </div>
        </div>
        <h4 class="quotation-main-title">PRESUPUESTO: <span id="preview_quotation_number">${placeholderQuotationNumber}</span></h4>
        <p class="quotation-date-display">Fecha: <span id="preview_quotation_date">${cotDate ? formatDate(cotDate) : "DD/MM/YYYY"}</span></p>
        <div class="client-seller-details">
            <p><strong>Cliente:</strong> <span id="preview_client_name">${selectedClient ? selectedClient.nombre : "SIN RELLENAR"}</span></p>
            <p><strong>Dirección:</strong> <span id="preview_client_address">${selectedClient ? selectedClient.direccion : "SIN RELLENAR"}</span></p>
            <p><strong>Rif:</strong> <span id="preview_client_rif">${selectedClient ? selectedClient.documento : "SIN RELLENAR"}</span></p>
            <p><strong>Teléfono:</strong> <span id="preview_client_phone">${selectedClient ? selectedClient.telefono : "SIN RELLENAR"}</span></p>
            <p><strong>Vendedor:</strong> <span id="preview_seller_name">${selectedSeller ? selectedSeller.nombreCompleto : "SIN RELLENAR"}</span></p>
        </div>
        <div class="quotation-items-table">
            <table>
                <thead>
                    <tr>
                        <th style="width: 15%;">Código</th>
                        <th style="width: 35%;">Descripción</th>
                        <th style="10%;">Cantidad</th>
                        <th style="width: 15%;">P. Unitario</th>
                        <th style="width: 25%;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${
                      items.length > 0
                        ? items
                            .map(
                              (item) => `
                        <tr>
                            <td>${item.code}</td>
                            <td>${item.description}</td>
                            <td>${item.quantity}</td>
                            <td>${formatCurrency(item.unit_price)}</td>
                            <td>${formatCurrency(item.item_total)}</td>
                        </tr>
                    `,
                            )
                            .join("")
                        : `<tr><td colspan="5" class="no-items-message">No hay productos/servicios añadidos.</td></tr>`
                    }
                </tbody>
            </table>
        </div>
        <div class="quotation-summary-section">
            <div class="bank-details">
                <p><strong>HACER TRANSFERENCIA A NOMBRE:</strong></p>
                <p>PREALCA, C.A. RIF: J-30913171-0</p>
                <p>CTA CTE 0134-0142-06-1421439245</p>
            </div>
            <div class="financial-summary">
                <p>Sub Total: <span>${formatCurrency(subtotal)}</span></p>
                <p>Excento: <span>${formatCurrency(exemptAmount)}</span></p>
                <p>Base Imponible: <span>${formatCurrency(taxableBase)}</span></p>
                <p>IVA 16%: <span>${formatCurrency(ivaAmount)}</span></p>
                ${freightSummaryHTML}
                <p class="total-operation">Total Operación: <span>${formatCurrency(totalAmount)}</span></p>
            </div>
        </div>
        <div class="quotation-observation">
            <p><strong>OBSERVACION:</strong>TASA BCV DEL DIA.</p>
        </div>
    </div>
  `
}

// Function to set today's date to a given input field
function setTodayDateToInput(displayElementId, hiddenInputId) {
  const displayElement = document.getElementById(displayElementId)
  const hiddenInput = document.getElementById(hiddenInputId)

  if (displayElement && hiddenInput) {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, "0")
    const day = String(today.getDate()).padStart(2, "0")
    const formattedDate = `${year}-${month}-${day}`

    displayElement.textContent = formattedDate // Update display span
    hiddenInput.value = formattedDate // Update hidden input value
  } else if (displayElementId === "cot_date") {
    // Handle the single input case for cot_date
    const dateInput = document.getElementById(displayElementId)
    if (dateInput) {
      const today = new Date()
      const options = {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        timeZone: "America/Caracas",
      }
      const caracasDate = new Intl.DateTimeFormat("es-VE", options).format(today)

      dateInput.value = caracasDate
    }
  }
}

// Setup Quotation Form
function setupQuotationForm() {
  const form = document.getElementById("quotation-form")
  const itemsContainer = document.getElementById("quotation_items_container")
  const addItemBtn = document.getElementById("add-quotation-item-btn")
  const cotDateInput = document.getElementById("cot_date")
  const cotClientSelect = document.getElementById("cot_client")
  const cotValidityInput = document.getElementById("cot_validity")

  // ****** INICIO: LÓGICA DE FLETE ******
  const includeFreightCheckbox = document.getElementById("cot_include_freight")
  const freightCostContainer = document.getElementById("freight_cost_container")
  const freightCostInput = document.getElementById("cot_freight_cost")

  includeFreightCheckbox.addEventListener("change", () => {
    if (includeFreightCheckbox.checked) {
      freightCostContainer.style.display = "block"
    } else {
      freightCostContainer.style.display = "none"
      freightCostInput.value = "0.00" // Resetea el valor si se desmarca
    }
    calculateTotals()
  })

  freightCostInput.addEventListener("input", calculateTotals)
  // ****** FIN: LÓGICA DE FLETE ******

  if (!form) return

  if (itemsContainer.children.length <= 1 && concreteDesignsMap.size > 0) {
    addItemRow()
  }

  addItemBtn.addEventListener("click", () => addItemRow())

  cotClientSelect.addEventListener("change", generateQuotationPreview)
  cotDateInput.addEventListener("change", generateQuotationPreview)
  cotValidityInput.addEventListener("input", generateQuotationPreview)
  itemsContainer.addEventListener("input", calculateTotals)

  calculateTotals()
  generateQuotationPreview()

  form.addEventListener("submit", (e) => {
    e.preventDefault()

    // ... (código de validación y recolección de datos de items)
    const quotation_date = convertDDMMYYYYtoYYYYMMDD(cotDateInput.value)
    const client_id = cotClientSelect.value
    const seller_id = window.userInfo.vendedorDbId
    const validity_days = cotValidityInput.value
    const notes = ""

    const items = []
    const itemRows = itemsContainer.querySelectorAll(".quotation-item-row")
    // ...
    itemRows.forEach((row) => {
      const designId = row.querySelector(".quotation-item-code").value;
      const description = row.querySelector(".quotation-item-description-display").value; // <--- AÑADIR ESTA LÍNEA
      const code = designId;
      const days = row.querySelector(".quotation-item-days").value;
      const quantity = parseNumericInput(row.querySelector(".quotation-item-quantity").value);
      const unitPrice = parseNumericInput(row.querySelector(".quotation-item-unit-price").value);
      const itemTotal = quantity * unitPrice;

      if (designId && days && quantity > 0 && unitPrice > 0) {
        items.push({
          item_type: "concrete_design",
          item_id: designId,
          design_id: designId,
          code,
          description, // <--- Ahora la variable existe
          days,
          quantity,
          unit_price: unitPrice,
          item_total: itemTotal,
        });
      }
    });
    // ...

    if (items.length === 0) {
      displayFlashMessage("Debe agregar al menos un producto/servicio a la cotización.", "error")
      return
    }

    const subtotal = parseNumericInput(document.getElementById("cot_subtotal").textContent)
    const taxable_base = parseNumericInput(document.getElementById("cot_taxable_base").textContent)
    const iva_amount = parseNumericInput(document.getElementById("cot_iva_amount").textContent)
    const total_amount = parseNumericInput(document.getElementById("cot_total_amount").textContent)

    // ****** INICIO: ENVIAR DATOS DE FLETE ******
    const include_freight = document.getElementById("cot_include_freight").checked
    const freight_cost = include_freight ? parseNumericInput(document.getElementById("cot_freight_cost").value) : 0
    // ****** FIN: ENVIAR DATOS DE FLETE ******

    const bank_details =
      "HACER TRANSFERENCIA A NOMBRE:\nPREALCA, C.A. RIF: J-30913171-0\nCTA CTE 0134-0142-06-1421439245"
    const observation = "PRECIOS INCLUYES FLETE DE ENVIO. TASA BCV DEL DIA."

    const quotationData = {
      quotation_date,
      client_id,
      seller_id,
      validity_days,
      notes,
      items,
      subtotal,
      exempt_amount: 0,
      taxable_base,
      iva_rate: 0.16,
      iva_amount,
      total_amount,
      bank_details,
      observation,
      include_freight, // Nuevo campo
      freight_cost, // Nuevo campo
    }

    fetch("/api/quotations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(quotationData),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          displayFlashMessage(data.message, "success")
          form.reset()
          // ... (código para resetear el formulario)
          // Reset freight section
          includeFreightCheckbox.checked = false
          freightCostContainer.style.display = "none"
          freightCostInput.value = "0.00"

          itemsContainer.innerHTML = `<div class="po-item-row header-row">...</div>`
          addItemRow()
          calculateTotals()
          loadQuotationsTable()
          setTodayDateToInput("cot_date")
        } else {
          displayFlashMessage(data.message, "error")
        }
      })
      .catch((error) => {
        console.error("Error submitting quotation:", error)
        displayFlashMessage("Error al registrar la cotización.", "error")
      })
  })
}

// Setup Main Client Form for Vendedor
function setupMainClienteFormVendedor() {
    const mainForm = document.getElementById("add-client-form-vendedor");
    if (!mainForm) return;

    // Se asigna el ID del vendedor al campo oculto
    const vendedorIdInput = document.getElementById("vendedor_cliente_vendedor");
    if (vendedorIdInput && window.userInfo && window.userInfo.vendedorDbId) {
        vendedorIdInput.value = window.userInfo.vendedorDbId;
    }
    
    // Se obtienen los elementos para asignarles validación en tiempo real
    const nombreInput = document.getElementById("nombre_cliente_vendedor");
    const direccionInput = document.getElementById("direccion_cliente_vendedor");
    const telefonoPrefixInput = document.getElementById("telefono_cliente_vendedor_prefix");
    const telefonoNumberInput = document.getElementById("telefono_cliente_vendedor_number");
    const documentoTypeInput = document.getElementById("documento_cliente_vendedor_type");
    const documentoNumberInput = document.getElementById("documento_cliente_vendedor_number");

    // Asignación de listeners para validación
    nombreInput.addEventListener("input", () => validateName(nombreInput, "nombre_cliente_vendedor_validation_message"));
    direccionInput.addEventListener("input", () => validateAddress(direccionInput, "direccion_cliente_vendedor_validation_message"));
    telefonoPrefixInput.addEventListener("change", () => validateSplitPhone(telefonoPrefixInput, telefonoNumberInput, "telefono_cliente_vendedor_validation_message"));
    telefonoNumberInput.addEventListener("input", () => validateSplitPhone(telefonoPrefixInput, telefonoNumberInput, "telefono_cliente_vendedor_validation_message"));
    documentoTypeInput.addEventListener("change", () => validateVenezuelanDocument(documentoTypeInput.value, documentoNumberInput.value, documentoTypeInput.value !== "V", "documento_cliente_vendedor_validation_message"));
    documentoNumberInput.addEventListener("input", () => validateVenezuelanDocument(documentoTypeInput.value, documentoNumberInput.value, documentoTypeInput.value !== "V", "documento_cliente_vendedor_validation_message"));

    mainForm.addEventListener("submit", (e) => {
        e.preventDefault();

        // 1. Validar todos los campos antes de enviar
        const isNombreValid = validateName(nombreInput, "nombre_cliente_vendedor_validation_message");
        const isDireccionValid = validateAddress(direccionInput, "direccion_cliente_vendedor_validation_message");
        const isTelefonoValid = validateSplitPhone(telefonoPrefixInput, telefonoNumberInput, "telefono_cliente_vendedor_validation_message");
        const isDocumentoValid = validateVenezuelanDocument(documentoTypeInput.value, documentoNumberInput.value, documentoTypeInput.value !== "V", "documento_cliente_vendedor_validation_message");

        if (!isNombreValid || !isDireccionValid || !isTelefonoValid || !isDocumentoValid) {
            displayFlashMessage("Por favor, corrija los errores en el formulario antes de enviar.", "error");
            return;
        }

        // 2. Recolectar todos los valores de los campos
        const nombre = nombreInput.value.trim();
        const direccion = direccionInput.value.trim();
        const documentoType = documentoTypeInput.value;
        const documentoNumber = documentoNumberInput.value.trim();
        const vendedorId = vendedorIdInput.value;
        const telefono = telefonoPrefixInput.value + telefonoNumberInput.value.trim();

        // 3. Construir el objeto FormData manualmente
        const formData = new FormData();
        formData.append("nombre", nombre);
        formData.append("direccion", direccion);
        formData.append("telefono", telefono);
        formData.append("documento_type", documentoType);
        formData.append("documento_number", documentoNumber);
        formData.append("vendedor", vendedorId);

        // 4. Enviar los datos al servidor
        fetch(mainForm.action, {
            method: "POST",
            body: formData,
        })
        .then(async (response) => {
            const data = await response.json();
            if (response.ok) {
                return data;
            } else {
                throw new Error(data.message || `Error HTTP: ${response.status}`);
            }
        })
        .then((data) => {
            if (data.success) {
                displayFlashMessage(data.message, "success");
                mainForm.reset();
                // Limpiar mensajes de validación
                setValidationFeedback(nombreInput, null, "nombre_cliente_vendedor_validation_message");
                setValidationFeedback(direccionInput, null, "direccion_cliente_vendedor_validation_message");
                validateSplitPhone(telefonoPrefixInput, telefonoNumberInput, "telefono_cliente_vendedor_validation_message");
                validateVenezuelanDocument(documentoTypeInput.value, "", documentoTypeInput.value !== "V", "documento_cliente_vendedor_validation_message");
                
                loadClientesTableVendedor(); // Recargar la tabla de clientes
            } else {
                displayFlashMessage(data.message, "error");
            }
        })
        .catch((error) => {
            console.error("Error al registrar cliente:", error);
            displayFlashMessage(`Error al agregar cliente: ${error.message}`, "error");
        });
    });
}

// Validation functions (copied from dashboard_sistema.js or validation.js if available)
function setValidationFeedback(element, isValid, messageDivId, message) {
  const messageDiv = document.getElementById(messageDivId)
  if (!messageDiv) return

  element.classList.remove("field-valid", "field-invalid")
  messageDiv.classList.remove("error", "success")
  messageDiv.textContent = ""

  if (isValid === true) {
    element.classList.add("field-valid")
    messageDiv.classList.add("success")
    messageDiv.textContent = message || "Válido."
  } else if (isValid === false) {
    element.classList.add("field-invalid")
    messageDiv.classList.add("error")
    messageDiv.textContent = message || "Inválido"
  }
}

function validateName(input, messageDivId) {
  const name = input.value.trim()
  if (name.length < 2) {
    setValidationFeedback(input, false, messageDivId, "Debe tener al menos 2 caracteres.")
    return false
  }
  if (name.length > 100) {
    setValidationFeedback(input, false, messageDivId, "No puede exceder 100 caracteres.")
    return false
  }
  // Updated regex to include numbers, commas, and parentheses
  const namePattern = /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s'\-.,()]+$/
  if (!namePattern.test(name)) {
    setValidationFeedback(
      input,
      false,
      messageDivId,
      "Solo puede contener letras, números, espacios, acentos y caracteres básicos (', -, ., ,, (, )).",
    )
    return false
  }
  setValidationFeedback(input, true, messageDivId, "Válido.")
  return true
}

function validatePhone(input, messageDivId) {
  const phone = input.value.trim()
  if (!phone) {
    setValidationFeedback(input, false, messageDivId, "El teléfono no puede estar vacío.")
    return false
  }
  const cleanPhone = phone.replace(/[^\d]/g, "")
  if (!/^\d{10,11}$/.test(cleanPhone)) {
    setValidationFeedback(input, false, messageDivId, "El teléfono debe tener 10 u 11 dígitos numéricos.")
    return false
  }
  setValidationFeedback(input, true, messageDivId, "Teléfono válido.")
  return true
}

// Add validateAddress function to dashboard_vendedor.js
function validateAddress(input, messageDivId) {
  const address = input.value.trim()
  if (address.length < 5) {
    setValidationFeedback(input, false, messageDivId, "La dirección debe tener al menos 5 caracteres.")
    return false
  }
  if (address.length > 255) {
    setValidationFeedback(input, false, messageDivId, "La dirección no puede exceder 255 caracteres.")
    return false
  }
  const addressPattern = /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s,.\-#]+$/
  if (!addressPattern.test(address)) {
    setValidationFeedback(input, false, messageDivId, "La dirección contiene caracteres inválidos.")
    return false
  }
  setValidationFeedback(input, true, messageDivId, "Dirección válida.")
  return true
}

/**
 * Validates a Venezuelan document (Cédula or RIF).
 * @param {string} type - The document type prefix (V, J, G, E, P).
 * @param {string} number - The document number string (e.g., "12345678" for Cédula, "12345678-9" for RIF).
 * @param {boolean} isRif - True if validating a RIF, false for Cédula.
 * @param {string} errorSpanId - The ID of the span element to display error messages.
 * @returns {boolean} - True if the document is valid, false otherwise.
 */
function validateVenezuelanDocument(type, number, isRif, errorSpanId) {
  const errorDiv = document.getElementById(errorSpanId)
  const documentInputGroup = errorDiv.previousElementSibling // Assuming the input group is the previous sibling

  // Clear previous feedback
  if (documentInputGroup && documentInputGroup.classList.contains("document-input-group")) {
    documentInputGroup.classList.remove("field-valid", "field-invalid")
  }
  errorDiv.classList.remove("error", "success")
  errorDiv.textContent = ""

  let isValid = true
  let errorMessage = ""

  if (!number) {
    isValid = false
    errorMessage = "El número de documento no puede estar vacío."
  } else if (isRif) {
    // For RIF, combine type and number to form the full RIF string for validation
    const fullRif = `${type.toUpperCase()}-${number}` // e.g., "J-12345678-9"
    const rifRegex = /^([JVGEP])-(\d{8})-(\d)$/
    const match = fullRif.match(rifRegex)

    if (!match) {
      isValid = false
      errorMessage = "El formato de RIF debe ser [J|V|G|E|P]-XXXXXXXX-X."
    } else {
      const prefix = match[1]
      const bodyStr = match[2]
      const checkDigit = Number.parseInt(match[3], 10)

      const weights = [3, 2, 7, 6, 5, 4, 3, 2]
      let sum = 0

      for (let i = 0; i < bodyStr.length; i++) {
        sum += Number.parseInt(bodyStr[i], 10) * weights[i]
      }

      const prefixValues = {
        J: 1,
        G: 9,
        V: 1,
        E: 2,
        P: 3,
      }
      sum += prefixValues[prefix] || 0

      const remainder = sum % 11
      let expectedCheckDigit = 0

      if (remainder === 0) {
        expectedCheckDigit = 0
      } else if (remainder === 1) {
        expectedCheckDigit = type.toUpperCase() === "V" || type.toUpperCase() === "E" ? 0 : 9
      } else {
        expectedCheckDigit = 11 - remainder
      }

      if (expectedCheckDigit !== checkDigit) {
        isValid = false
        errorMessage = `Dígito verificador del RIF incorrecto. Se esperaba ${expectedCheckDigit}.`
      }
    }
  } else {
    // Cédula validation
    const cedulaCleaned = number.replace(/[^0-9]/g, "")
    if (!/^\d{6,9}$/.test(cedulaCleaned)) {
      // Cédula can be 6 to 9 digits
      isValid = false
      errorMessage = "El número de cédula debe tener entre 6 y 9 dígitos."
    }
  }

  if (isValid) {
    if (documentInputGroup && documentInputGroup.classList.contains("document-input-group")) {
      documentInputGroup.classList.add("field-valid")
      documentInputGroup.classList.remove("field-invalid")
    }
    errorDiv.classList.add("success")
    errorDiv.textContent = "Documento válido."
  } else {
    if (documentInputGroup && documentInputGroup.classList.contains("document-input-group")) {
      documentInputGroup.classList.add("field-invalid")
      documentInputGroup.classList.remove("field-valid")
    }
    errorDiv.classList.add("error")
    errorDiv.textContent = errorMessage
  }
  return isValid
}

// --- Client Edit Modal Functions ---
const editClientModal = document.getElementById("edit-client-modal")
const closeEditClientModalBtn = document.getElementById("close-edit-client-modal")
const editClientForm = document.getElementById("edit-client-form")

const editClientIdInput = document.getElementById("edit_client_id")
const editNombreInput = document.getElementById("edit_nombre_cliente")
const editDireccionInput = document.getElementById("edit_direccion_cliente")
const editTelefonoInput = document.getElementById("edit_telefono_cliente")
const editDocumentoTypeInput = document.getElementById("edit_documento_cliente_type")
const editDocumentoNumberInput = document.getElementById("edit_documento_cliente_number")
// Removed editVendedorSelect as it's no longer in the HTML

function openEditClientModal(clientId) {
  // Validate clientId before opening modal and fetching data
  const parsedClientId = Number.parseInt(clientId, 10)
  if (isNaN(parsedClientId) || parsedClientId <= 0) {
    console.error("[ERROR] Invalid client ID received for edit modal:", clientId)
    displayFlashMessage("Error: ID de cliente inválido para edición.", "error")
    return
  }
  editClientModal.style.display = "block"
  fetchClientDataForEdit(parsedClientId)
}

closeEditClientModalBtn.addEventListener("click", () => {
  editClientModal.style.display = "none"
  resetEditFormValidation()
})

window.addEventListener("click", (event) => {
  if (event.target == editClientModal) {
    editClientModal.style.display = "none"
    resetEditFormValidation()
  }
})

function resetEditFormValidation() {
  const inputs = [editNombreInput, editDireccionInput, editTelefonoInput]
  inputs.forEach((input) => setValidationFeedback(input, null, `${input.id}_validation_message`))

  // Reset document input group specifically
  const docInputGroup = editDocumentoNumberInput.closest(".document-input-group")
  if (docInputGroup) {
    docInputGroup.classList.remove("field-valid", "field-invalid")
  }
  const docMessageDiv = document.getElementById("edit_documento_cliente_validation_message")
  if (docMessageDiv) {
    docMessageDiv.classList.remove("error", "success")
    docMessageDiv.textContent = ""
  }
}

async function fetchClientDataForEdit(clientId) {
    try {
        const response = await fetch(`/api/clientes/${clientId}`);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Error HTTP: ${response.status}`);
        }
        const data = await response.json();

        // Rellenar los campos del formulario de edición
        editClientIdInput.value = data.id;
        editNombreInput.value = data.nombre;
        editDireccionInput.value = data.direccion;

        // SE USA LA FUNCIÓN HELPER PARA SEPARAR EL TELÉFONO
        splitPhoneNumber(
            data.telefono,
            document.getElementById("edit_telefono_cliente_prefix"),
            document.getElementById("edit_telefono_cliente_number")
        );

        // Lógica para separar el documento
        if (data.documento && typeof data.documento === "string" && data.documento.includes("-")) {
            const [docType, docNumber] = data.documento.split("-", 2);
            editDocumentoTypeInput.value = docType;
            editDocumentoNumberInput.value = docNumber;
        } else {
            editDocumentoTypeInput.value = "V"; // Valor por defecto
            editDocumentoNumberInput.value = data.documento || "";
        }
        
        // Rellenar el ID del vendedor en el campo oculto
        const editVendedorClienteIdInput = document.getElementById("edit_vendedor_cliente_id");
        if (editVendedorClienteIdInput) {
            editVendedorClienteIdInput.value = data.vendedor_id;
        }

    } catch (error) {
        console.error("Error al cargar datos del cliente para edición:", error);
        displayFlashMessage(`Error al cargar datos del cliente: ${error.message}`, "error");
        editClientModal.style.display = "none";
    }
}

editClientForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // 1. Obtener todos los elementos del formulario de edición
    const editNombreInput = document.getElementById("edit_nombre_cliente");
    const editDireccionInput = document.getElementById("edit_direccion_cliente");
    const editTelefonoPrefixInput = document.getElementById("edit_telefono_cliente_prefix");
    const editTelefonoNumberInput = document.getElementById("edit_telefono_cliente_number");
    const editDocumentoTypeInput = document.getElementById("edit_documento_cliente_type");
    const editDocumentoNumberInput = document.getElementById("edit_documento_cliente_number");
    const editVendedorIdInput = document.getElementById("edit_vendedor_cliente_id");

    // 2. Validar todos los campos antes de enviar
    const isNombreValid = validateName(editNombreInput, "edit_nombre_cliente_validation_message");
    const isDireccionValid = validateAddress(editDireccionInput, "edit_direccion_cliente_validation_message");
    const isTelefonoValid = validateSplitPhone(editTelefonoPrefixInput, editTelefonoNumberInput, "edit_telefono_cliente_validation_message");
    const isDocumentoValid = validateVenezuelanDocument(editDocumentoTypeInput.value, editDocumentoNumberInput.value, editDocumentoTypeInput.value !== "V", "edit_documento_cliente_validation_message");

    if (!isNombreValid || !isDireccionValid || !isTelefonoValid || !isDocumentoValid) {
        displayFlashMessage("Por favor, corrija los errores en el formulario antes de enviar.", "error");
        return;
    }

    // 3. Recolectar todos los valores
    const clientId = document.getElementById("edit_client_id").value;
    const nombre = editNombreInput.value.trim();
    const direccion = editDireccionInput.value.trim();
    const documentoType = editDocumentoTypeInput.value;
    const documentoNumber = editDocumentoNumberInput.value.trim();
    const vendedorId = editVendedorIdInput.value;
    const telefono = editTelefonoPrefixInput.value + editTelefonoNumberInput.value.trim();

    // 4. Construir el objeto FormData manualmente
    const formData = new FormData();
    formData.append("nombre", nombre);
    formData.append("direccion", direccion);
    formData.append("telefono", telefono);
    formData.append("documento_type", documentoType);
    formData.append("documento_number", documentoNumber);
    formData.append("vendedor", vendedorId);

    // 5. Enviar los datos al servidor
    try {
        const response = await fetch(`/api/clientes/${clientId}`, {
            method: "POST",
            body: formData,
        });
        const data = await response.json();

        if (data.success) {
            displayFlashMessage(data.message, "success");
            editClientModal.style.display = "none";
            loadClientesTableVendedor();
        } else {
            displayFlashMessage(data.message, "error");
        }
    } catch (error) {
        console.error("Error al actualizar cliente:", error);
        displayFlashMessage(`Error al actualizar cliente: ${error.message}`, "error");
    }
});

async function deleteClient(clientId) {
  if (!confirm("¿Está seguro de que desea eliminar este cliente? Esta acción no se puede deshacer.")) {
    return
  }

  try {
    const response = await fetch(`/api/clientes/delete/${clientId}`, {
      method: "POST", // Flask uses POST for deletes
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: clientId }),
    })
    const data = await response.json()

    if (data.success) {
      displayFlashMessage(data.message, "success")
      loadClientesTableVendedor() // Refresh table
    } else {
      displayFlashMessage(data.message, "error")
    }
  } catch (error) {
    console.error("Error deleting client:", error)
    displayFlashMessage(`Error al eliminar cliente: ${error.message}`, "error")
  }
}

// --- View Quotation Modal Functions ---
const viewQuotationModal = document.getElementById("view-quotation-modal")
const closeViewQuotationModalBtn = document.getElementById("close-view-quotation-modal")
const viewQuotationContent = document.getElementById("view-quotation-content")
const printQuotationBtn = document.getElementById("print-quotation-btn")

closeViewQuotationModalBtn.addEventListener("click", () => {
  viewQuotationModal.style.display = "none"
})

window.addEventListener("click", (event) => {
  if (event.target == viewQuotationModal) {
    viewQuotationModal.style.display = "none"
  }
})

async function openViewQuotationModal(quotationId) {
  try {
    const response = await fetch(`/api/quotations/${quotationId}`)
    const data = await response.json()

    console.log("Fetched quotation data for view:", data) // Log the fetched data for debugging

    if (data.success === false) {
      // Check for explicit success: false from backend
      displayFlashMessage(data.message, "error")
      return
    }

    // Update the quotation number in the modal title
    document.getElementById("view_quotation_number").textContent = data.quotation_number || "N/A" // MODIFICADO: Actualiza el span del título

    renderQuotationDocument(data, "view-quotation-content", false) // Render fetched data
    viewQuotationModal.style.display = "block"
    // Store quotation ID for printing
    printQuotationBtn.dataset.quotationId = quotationId
  } catch (error) {
    console.error("Error fetching quotation for view:", error)
    displayFlashMessage("Error al cargar los detalles de la cotización.", "error")
  }
}

printQuotationBtn.addEventListener("click", () => {
  const quotationId = printQuotationBtn.dataset.quotationId
  if (quotationId) {
    printQuotation(quotationId)
  } else {
    displayFlashMessage("No se pudo encontrar la cotización para imprimir.", "error")
  }
})

function printQuotation(quotationId) {
  // Get the content to print (the rendered quotation document)
  const printContent = document.getElementById("view-quotation-content").innerHTML

  // Create a new window for printing
  const printWindow = window.open("", "_blank")
  printWindow.document.write("<html><head><title>Imprimir Cotización</title>")
  // Link the CSS for the print view
  printWindow.document.write('<link rel="stylesheet" href="/static/css/quotation-preview.css">')
  printWindow.document.write("</head><body>")
  printWindow.document.write(printContent)
  printWindow.document.close()

  // Wait for content to load, then print
  printWindow.onload = () => {
    printWindow.focus()
    printWindow.print()
    // Optionally close the window after printing
    // printWindow.close();
  }
}

async function cancelQuotation(quotationId) {
  if (!confirm("¿Está seguro de que desea anular esta cotización? Esta acción no se puede deshacer.")) {
    return
  }

  try {
    const response = await fetch(`/api/quotations/cancel/${quotationId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: quotationId }),
    })
    const data = await response.json()

    if (data.success) {
      displayFlashMessage(data.message, "success")
      loadQuotationsTable() // Refresh table to show updated status
    } else {
      displayFlashMessage(data.message, "error")
    }
  } catch (error) {
    console.error("Error cancelling quotation:", error)
    displayFlashMessage(`Error al anular cotización: ${error.message}`, "error")
  }
}

async function loadInitialData() {
  // Cargar información del usuario, clientes (para select y tabla), vendedores,
  // diseños de concreto y la tabla de cotizaciones, todo en paralelo.
  const [
    userInfoResult,
    clientsData,
    concreteDesignsResult,
    quotationsResult,
    choferesResult,
    disenosResult,
    camionesResult,
  ] = await Promise.all([
    loadUserInfo(),
    loadClientesForSelect(), // Esta función ahora devuelve los datos de clientes
    loadConcreteDesignsForSelect(),
    loadQuotationsTable(), // Esta función ya actualiza su propia tabla
    loadChoferes(), // NEW
    loadDisenos(), // NEW
    loadCamiones(), // NEW
  ])

  // Una vez que los datos de clientes están disponibles, se usa para poblar la tabla de clientes.
  loadClientesTableVendedor(clientsData)

  // Despus de que todos los datos iniciales estén cargados, se configuran los formularios.
  setTodayDateToInput("cot_date")
  setTodayDateToInput("fecha_display", "fecha_hidden") // NEW: For dispatch date
  setupQuotationForm()
  setupMainClienteFormVendedor()
  setupDespachoForm() // NEW

  loadClientesForDispatchSelect() // NEW: Call this after loadClientesForSelect
}

document.addEventListener("DOMContentLoaded", async () => {
  await loadInitialData() // Asegura que todos los datos iniciales se carguen
  setupSidebarNavigation()
  setupLogout()
  setupPurchaseOrderDetailsModal() // NEW: Ensure this is called once
})

// Function to render the quotation document
function renderQuotationDocument(data, containerId, isForPrinting = false) {
  const container = document.getElementById(containerId)
  if (!container) {
    console.error(`Container with ID "${containerId}" not found.`)
    return
  }

  const quotation = data // The entire data object is the quotation

  // Helper function to format date

  // ****** INICIO: LÓGICA DE FLETE PARA VISTA DE DETALLE ******
  let freightDetailHTML = ""
  if (quotation.include_freight && quotation.freight_cost > 0) {
    freightDetailHTML = `<p>Flete: <span>${formatCurrency(quotation.freight_cost)}</span></p>`
  }
  // ****** FIN: LÓGICA DE FLETE PARA VISTA DE DETALLE ******


  // Build the HTML string for the quotation document
  const quotationHTML = `
  <div class="quotation-document">
      <div class="preview-header">
          <div class="company-info">
              <img src="/static/uploads/Logo Prealca Sin Fondo.png" alt="Prealca Logo" class="company-logo">
              <p>RIF.: J-30913171-0</p>
          </div>
          <div class="address-info">
              <p>Av. 2 parcela E-37, Zona Ind. Sta Cruz</p>
              <p>Estado Aragua</p>
              <p>Telf: 04128936930 / Roberto Quintero</p>
          </div>
      </div>
      <h4 class="quotation-main-title">PRESUPUESTO: <span id="preview_quotation_number">${
        quotation.quotation_number || "N/A"
      }</span></h4>
      <p class="quotation-date-display">Fecha: <span id="preview_quotation_date">${formatDate(
        quotation.quotation_date,
      )}</span></p>
      
      <div class="client-seller-details">
          <p><strong>Cliente:</strong> <span id="preview_client_name">${quotation.client_name || "N/A"}</span></p>
          <p><strong>Dirección:</strong> <span id="preview_client_address">${
            quotation.client_address || "N/A"
          }</span></p>
          <p><strong>Rif:</strong> <span id="preview_client_rif">${quotation.client_rif || "N/A"}</span></p>
          <p><strong>Teléfono:</strong> <span id="preview_client_phone">${quotation.client_phone || "N/A"}</span></p>
          <p><strong>Vendedor:</strong> <span id="preview_seller_name">${quotation.seller_name || "N/A"}</span></p>
      </div>

      <div class="quotation-items-table">
          <table>
              <thead>
                  <tr>
                      <th style="width: 15%;">Código</th>
                      <th style="width: 35%;">Descripción</th>
                      <th style="10%;">Cantidad</th>
                      <th style="width: 15%;">P. Unitario</th>
                      <th style="width: 25%;">Total</th>
                  </tr>
              </thead>
              <tbody>
                  ${
                    quotation.items && quotation.items.length > 0
                      ? quotation.items
                          .map(
                            (item) => `
                      <tr>
                          <td>${item.code}</td>
                          <td>${item.description}</td>
                          <td>${item.quantity}</td>
                          <td>${formatCurrency(item.unit_price)}</td>
                          <td>${formatCurrency(item.item_total)}</td>
                      </tr>
                  `,
                          )
                          .join("")
                      : `<tr><td colspan="5" class="no-items-message">No hay productos/servicios añadidos.</td></tr>`
                  }
              </tbody>
          </table>
      </div>
      
      <div class="quotation-summary-section">
          <div class="bank-details">
              <p><strong>HACER TRANSFERENCIA A NOMBRE:</strong></p>
              <p>PREALCA, C.A. RIF: J-30913171-0</p>
              <p>CTA CTE 0134-0142-06-1421439245</p>
          </div>
          <div class="financial-summary">
              <p>Sub Total: <span>${formatCurrency(quotation.subtotal)}</span></p>
              <p>Excento: <span>${formatCurrency(quotation.exempt_amount)}</span></p>
              <p>Base Imponible: <span>${formatCurrency(quotation.taxable_base)}</span></p>
              <p>IVA 16%: <span>${formatCurrency(quotation.iva_amount)}</span></p>
              ${freightDetailHTML}
              <p class="total-operation">Total Operación: <span>${formatCurrency(quotation.total_amount)}</span></p>
          </div>
          </div>
      <div class="quotation-observation">
          <p><strong>OBSERVACION:</strong> PRECIOS INCLUYES FLETE DE ENVIO. TASA BCV DEL DIA.</p>
      </div>
  </div>
`

  container.innerHTML = quotationHTML
}

// NEW: Cargar vendedores para selects (moved from admin)
function loadVendedores() {
  return fetch("/api/vendedores") // Return the promise
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} for /api/vendedores`)
      }
      return response.json()
    })
    .then((data) => {
      const vendedorSelect = document.getElementById("vendedor")
      if (vendedorSelect) {
        vendedorSelect.innerHTML = '<option value="">Seleccione vendedor</option>'
      }
      vendedoresDataMap.clear() // Clear previous data
      data.forEach((vendedor) => {
        const option = document.createElement("option")
        option.value = vendedor.id
        option.textContent = vendedor.nombre
        if (vendedorSelect) {
          vendedorSelect.appendChild(option)
        }
        vendedoresDataMap.set(vendedor.id.toString(), vendedor) // Store full vendedor object
      })
    })
    .catch((error) => {
      console.error("Error al cargar vendedores:", error)
      displayFlashMessage(`Error al cargar vendedores: ${error.message}. Verifique permisos.`, "error")
    })
}

function loadClientesForDispatchSelect() {
  const clienteSelect = document.getElementById("cliente")
  if (clienteSelect) {
    clienteSelect.innerHTML = '<option value="">Seleccione cliente</option>'

    // Remove any existing event listeners to prevent duplicates
    clienteSelect.removeEventListener("change", updateDispatchPreview)

    console.log("[DEBUG] loadClientesForDispatchSelect - clientsDataMap size:", clientsDataMap.size)
    console.log("[DEBUG] loadClientesForDispatchSelect - sample client:", Array.from(clientsDataMap.values())[0])

    if (clientsDataMap.size === 0) {
      console.log("[DEBUG] clientsDataMap is empty, loading clients first...")
      return fetch("/api/clientes")
        .then((response) => response.json())
        .then((data) => {
          console.log("[DEBUG] Data received from /api/clientes for dispatch:", data)

          clientsDataMap.clear()
          data.forEach((cliente) => {
            const option = document.createElement("option")
            option.value = cliente.id
            option.textContent = cliente.nombre
            clienteSelect.appendChild(option)
            clientsDataMap.set(cliente.id.toString(), cliente) // Store full client object
          })

          console.log("[DEBUG] clientsDataMap populated for dispatch, size:", clientsDataMap.size)
          console.log("[DEBUG] Sample client data:", Array.from(clientsDataMap.values())[0])
          // Add event listener only once after data is loaded
          clienteSelect.addEventListener("change", updateDispatchPreview)
        })
        .catch((error) => {
          console.error("Error al cargar clientes para dispatch:", error)
        })
    } else {
      // Use existing data from clientsDataMap
      console.log("[DEBUG] Using existing clientsDataMap, size:", clientsDataMap.size)
      clientsDataMap.forEach((cliente) => {
        const option = document.createElement("option")
        option.value = cliente.id
        option.textContent = cliente.nombre
        clienteSelect.appendChild(option)
      })
      console.log(
        "[DEBUG] 'cliente' select options after population:",
        Array.from(clienteSelect.options).map((opt) => ({ value: opt.value, text: opt.textContent })),
      )
      // Add event listener only once after options are populated
      clienteSelect.addEventListener("change", updateDispatchPreview)

      updateDispatchPreview()
    }
  }
}

// NEW: Cargar choferes para selects (moved from admin)
function loadChoferes() {
  return fetch("/api/choferes") // Return the promise
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} for /api/choferes`)
      }
      return response.json()
    })
    .then((data) => {
      const choferSelect = document.getElementById("chofer")
      if (choferSelect) {
        choferSelect.innerHTML = '<option value="">Seleccione chofer</option>'
      }
      choferesDataMap.clear() // Clear previous data
      data.forEach((chofer) => {
        const option = document.createElement("option")
        option.value = chofer.id
        option.textContent = chofer.nombre
        if (choferSelect) {
          choferSelect.appendChild(option)
        }
        choferesDataMap.set(chofer.id.toString(), chofer) // Store full chofer object
      })
    })
    .catch((error) => {
      console.error("Error al cargar choferes:", error)
      displayFlashMessage(`Error al cargar choferes: ${error.message}. Verifique permisos.`, "error")
    })
}

// NEW: Cargar diseños en el select (moved from admin)
function loadDisenos() {
  const disenoSelect = document.getElementById("diseno")
  if (disenoSelect) {
    disenoSelect.innerHTML = '<option value="">Seleccione diseño</option>'
    return fetch("/api/concrete_designs") // Return the promise
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status} for /api/concrete_designs`)
        }
        return response.json()
      })
      .then((data) => {
        disenosDataMap.clear() // Clear previous data
        data.forEach((diseno) => {
          const option = document.createElement("option")
          option.value = diseno.id
          option.textContent = `${diseno.resistencia} kgf/cm² - ${diseno.asentamiento}"`
          disenoSelect.appendChild(option)
          disenosDataMap.set(diseno.id.toString(), diseno) // Store full diseno object
        })
      })
      .catch((error) => {
        console.error("Error al cargar diseños de concreto:", error)
        displayFlashMessage(`Error al cargar diseños de concreto: ${error.message}. Verifique permisos.`, "error")
      })
  }
  return Promise.resolve() // Return a resolved promise if disenoSelect is not found
}

// NEW: Cargar camiones para selects (moved from admin)
function loadCamiones() {
  return fetch("/api/camiones") // Return the promise
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} for /api/camiones`)
      }
      return response.json()
    })
    .then((data) => {
      const camionSelect = document.getElementById("camion")
      if (camionSelect) {
        camionSelect.innerHTML = '<option value="">Seleccione camión</option>'
      }
      camionesDataMap.clear() // Clear previous data
      data.forEach((camion) => {
        const option = document.createElement("option")
        option.value = camion.id
        option.textContent = `${camion.placa} - ${camion.modelo}`
        if (camionSelect) {
          camionSelect.appendChild(option)
        }
        camionesDataMap.set(camion.id.toString(), camion) // Store full camion object
      })
    })
    .catch((error) => {
      console.error("Error al cargar camiones:", error)
      displayFlashMessage(`Error al cargar camiones: ${error.message}. Verifique permisos.`, "error")
    })
}

// NEW: Function to handle despacho form submission (moved from admin)
function setupDespachoForm() {
  const despachoForm = document.getElementById("despacho-form")
  // Removed vendedorSelect as it's no longer in the HTML
  // The seller ID will be taken directly from window.userInfo.vendedorDbId

  if (!despachoForm) return

  document.getElementById("m3").addEventListener("input", updateDispatchPreview)
  document.getElementById("fecha_hidden").addEventListener("change", updateDispatchPreview)

  // Add event listeners for the dropdowns - EXCEPT cliente which is handled in loadClientesForDispatchSelect
  document.getElementById("diseno").addEventListener("change", updateDispatchPreview)
  // document.getElementById("cliente").addEventListener("change", updateDispatchPreview)
  document.getElementById("chofer").addEventListener("change", updateDispatchPreview)
  document.getElementById("camion").addEventListener("change", updateDispatchPreview)

  despachoForm.addEventListener("submit", (e) => {
    e.preventDefault()

    const fecha = document.getElementById("fecha_hidden").value
    const m3 = parseFloat(document.getElementById("m3").value)
    const disenoId = document.getElementById("diseno").value
    const clienteId = document.getElementById("cliente").value
    const choferId = document.getElementById("chofer").value
    const vendedorId = window.userInfo.vendedorDbId // Directly use the logged-in seller's ID
    const camionId = document.getElementById("camion").value

    if (!fecha || !m3 || !disenoId || !clienteId || !choferId || !vendedorId || !camionId) {
      displayFlashMessage("Todos los campos son obligatorios", "error")
      return
    }

    if (m3 <= 0) {
      displayFlashMessage("Los M³ deben ser mayor a 0", "error")
      return
    }

    const formData = new FormData()
    formData.append("fecha", fecha)
    formData.append("m3", m3)
    formData.append("diseno", disenoId)
    formData.append("cliente", clienteId)
    formData.append("chofer", choferId)
    formData.append("vendedor", vendedorId)
    formData.append("camion", camionId)

    fetch("/api/despachos", {
      method: "POST",
      body: formData,
      credentials: "include", // Add this line
    })
      .then((response) => {
        if (response.ok) {
          return response.json()
        } else {
          return response.text().then((text) => {
            throw new Error(text || "Error al registrar despacho")
          })
        }
      })
      .then((data) => {
        if (data.success) {
          displayFlashMessage("Guía de despacho generada y pendiente de aprobación.", "success")
          despachoForm.reset()
          setTodayDateToInput("fecha_display", "fecha_hidden")
          // Update preview with actual guide number and departure time
          document.getElementById("preview_guia_number").textContent = "PENDIENTE"
          document.getElementById("preview_hora_salida").textContent = "PENDIENTE"
          updateDispatchPreview() // Call again to reset other fields if needed
          loadRegistroGuiaDespachoTable()
        } else {
          displayFlashMessage(data.message, "error")
        }
      })
      .catch((error) => {
        console.error("Error:", error)
        displayFlashMessage(`Error al registrar el despacho: ${error.message}`, "error")
      })
  })

  updateDispatchPreview()
}

const updateDispatchPreview = () => {
  console.log("[DEBUG] updateDispatchPreview called.")
  const fecha = document.getElementById("fecha_hidden").value
  const m3 = document.getElementById("m3").value
  const disenoSelect = document.getElementById("diseno")
  const clienteSelect = document.getElementById("cliente")

  console.log("[DEBUG] clienteSelect.value (raw):", clienteSelect.value)
  console.log("[DEBUG] clienteSelect.value type:", typeof clienteSelect.value)
  console.log("[DEBUG] clientsDataMap keys:", Array.from(clientsDataMap.keys()))
  console.log("[DEBUG] clientsDataMap has key:", clientsDataMap.has(clienteSelect.value))

  let selectedCliente = clientsDataMap.get(clienteSelect.value)
  if (!selectedCliente && clienteSelect.value) {
    // Try with string conversion
    selectedCliente = clientsDataMap.get(clienteSelect.value.toString())
    if (!selectedCliente) {
      // Try with number conversion
      selectedCliente = clientsDataMap.get(Number.parseInt(clienteSelect.value).toString())
    }
  }

  const choferSelect = document.getElementById("chofer")
  const camionSelect = document.getElementById("camion")

  const selectedChofer = choferesDataMap.get(choferSelect.value)
  const selectedCamion = camionesDataMap.get(camionSelect.value)
  const selectedDiseno = disenosDataMap.get(disenoSelect.value)

  console.log("[DEBUG] selectedCliente from clientsDataMap:", selectedCliente)
  if (selectedCliente) {
    console.log("[DEBUG] selectedCliente.nombre:", selectedCliente.nombre)
    console.log("[DEBUG] selectedCliente.direccion:", selectedCliente.direccion)
    console.log("[DEBUG] selectedCliente.telefono:", selectedCliente.telefono)
    console.log("[DEBUG] selectedCliente.documento:", selectedCliente.documento)
  } else {
    console.log("[DEBUG] selectedCliente is null or undefined. Client not selected or not found in map.")
    console.log("[DEBUG] clienteSelect.value:", clienteSelect.value)
    console.log("[DEBUG] Available keys in clientsDataMap:", Array.from(clientsDataMap.keys()))
    console.log("[DEBUG] Available values in clientsDataMap:", Array.from(clientsDataMap.values()))
  }

  document.getElementById("preview_dispatch_date").textContent = fecha ? formatDate(fecha) : "N/A"
  document.getElementById("preview_m3").textContent = m3 || "SIN RELLENAR"
  document.getElementById("preview_diseno_name").textContent = selectedDiseno
    ? `${selectedDiseno.resistencia} kgf/cm² - ${selectedDiseno.asentamiento}"`
    : "SIN RELLENAR"

  const clientName = selectedCliente && selectedCliente.nombre ? selectedCliente.nombre : "SIN RELLENAR"
  const clientAddress = selectedCliente && selectedCliente.direccion ? selectedCliente.direccion : "SIN RELLENAR"
  const clientPhone = selectedCliente && selectedCliente.telefono ? selectedCliente.telefono : "SIN RELLENAR"
  const clientDocument = selectedCliente && selectedCliente.documento ? selectedCliente.documento : "SIN RELLENAR"

  console.log(
    "[DEBUG] Setting preview values - Name:",
    clientName,
    "Address:",
    clientAddress,
    "Phone:",
    clientPhone,
    "Document:",
    clientDocument,
  )

  document.getElementById("preview_client_name").textContent = clientName
  document.getElementById("preview_client_address").textContent = clientAddress
  document.getElementById("preview_client_phone").textContent = clientPhone
  document.getElementById("preview_client_document").textContent = clientDocument

  document.getElementById("preview_chofer_name").textContent = selectedChofer ? selectedChofer.nombre : "SIN RELLENAR"
  document.getElementById("preview_camion_info").textContent = selectedCamion
    ? `${selectedCamion.placa} - ${selectedCamion.modelo}`
    : "SIN RELLENAR"
  document.getElementById("preview_vendedor_name").textContent = window.userInfo.nombreCompleto || "SIN RELLENAR"

  // Default values for status, hora_salida, hora_llegada, received_by
  document.getElementById("preview_dispatch_status").textContent = "Pendiente"
  document.getElementById("preview_hora_salida").textContent = "N/A"
  document.getElementById("preview_hora_llegada").textContent = "N/A"
  document.getElementById("preview_received_name").textContent = "SIN RELLENAR"
  document.getElementById("preview_received_signature").textContent = "SIN RELLENAR"
  document.getElementById("preview_received_datetime").textContent = "SIN RELLENAR"
  document.getElementById("preview_guia_number").textContent = "N/A" // Guia number is generated on submission
}

const loadRegistroGuiaDespachoTable = () => {
  const table = document.getElementById("despachos-registro-table");
  if (!table) return;

  const tbody = table.querySelector("tbody");

  fetch("/api/despachos")
    .then((response) => response.json())
    .then((data) => {
      tbody.innerHTML = "";

      // Verificación clave para evitar el TypeError
      if (!Array.isArray(data)) {
        console.error("La respuesta del servidor para guías de despacho no es una lista:", data);
        throw new Error(data.message || "Error al procesar los datos de guías de despacho.");
      }

      if (data.length === 0) {
        tbody.innerHTML =
          '<tr><td colspan="9" style="text-align: center;">No hay guías de despacho registradas.</td></tr>';
        return;
      }
      data.forEach((despacho) => {
        const row = document.createElement("tr");
        const disenoNombre = despacho.diseno_resistencia
          ? `${despacho.diseno_resistencia} kgf/cm² - ${despacho.diseno_asentamiento}"`
          : "N/A";

        row.innerHTML = `
          <td>${despacho.fecha}</td>
          <td>${despacho.guia}</td>
          <td>${despacho.m3}</td>
          <td>${disenoNombre}</td>
          <td>${despacho.cliente_nombre || "N/A"}</td>
          <td>${despacho.chofer_nombre || "N/A"}</td>
          <td>${despacho.camion_placa || "N/A"}</td>
          <td>${despacho.vendedor_nombre || "N/A"}</td>
          <td>
            <button class="action-btn view-dispatch-admin" data-id="${despacho.id}" title="Ver"><i class="fas fa-eye"></i></button>
          </td>
        `;
        tbody.appendChild(row);
      });
      setupDispatchActionsAdmin();
    })
    .catch((error) => {
        console.error("Error al cargar despachos para registro:", error);
        tbody.innerHTML = `<tr><td colspan="9" class="error-message">Error al cargar guías de despacho: ${error.message}</td></tr>`;
    });
};
const setupDispatchActionsAdmin = () => {
  document.querySelectorAll(".view-dispatch-admin").forEach((button) => {
    button.addEventListener("click", function () {
      const dispatchId = this.getAttribute("data-id")
      viewDispatchDetails(dispatchId)
    })
  })
}

const viewDispatchDetails = (dispatchId) => {
  const modal = document.getElementById("purchase-order-details-modal")
  const modalTitle = modal.querySelector("h4")
  const modalDate = document.getElementById("modal_preview_po_date")
  const modalClientName = document.getElementById("modal_preview_client_name")
  const modalClientAddress = document.getElementById("modal_preview_client_address")
  const modalClientDocument = document.getElementById("modal_preview_client_rif")
  const modalClientPhone = document.getElementById("modal_preview_client_phone")
  const modalClientContact = document.getElementById("modal_preview_client_contact")
  const modalItemsTable = document.getElementById("modal-preview-items-table")
  const modalItemsTbody = document.getElementById("modal-preview-items-tbody")
  const modalTotalToPay = document.getElementById("modal_preview_total_to_pay")
  const modalTotalWords = document.getElementById("modal_preview_total_words")
  const printBtn = document.getElementById("modal-print-purchase-order") // Botón de imprimir para el modal de despacho

  // Hide buttons not relevant for dispatch view
  document.getElementById("modal-download-purchase-pdf").style.display = "none"
  // Also hide totals section for dispatch view
  modalTotalToPay.closest(".totals-summary").style.display = "none"
  modalTotalWords.closest("p").style.display = "none"
  modalItemsTable.style.display = "none"

  fetch(`/api/despachos/${dispatchId}`)
    .then((response) => {
      if (!response.ok) throw new Error(`Error HTTP: ${response.status}`)
      return response.json()
    })
    .then((data) => {
      modalTitle.innerHTML = `GUÍA DE DESPACHO: <span id="modal_preview_po_number">${data.guia}</span>`
      modalDate.textContent = formatDate(data.fecha)
      modalClientName.textContent = data.cliente_nombre || "N/A"
      modalClientAddress.textContent = data.cliente_direccion || "N/A"
      modalClientDocument.textContent = data.cliente_documento || "N/A"
      modalClientPhone.textContent = data.cliente_telefono || "N/A"
      modalClientContact.textContent = data.cliente_nombre || "N/A"

      modalItemsTbody.innerHTML = ""

      const dispatchDetailsHtml = `
  <p style="margin: 0;"><strong>Chofer:</strong> ${data.chofer_nombre || "N/A"}</p>
  <p style="margin: 0;"><strong>Camión:</strong> ${data.camion_placa || "N/A"} - ${data.camion_modelo || "N/A"}</p>
  <p style="margin: 0;"><strong>M3:</strong> ${data.m3 || "N/A"}</p>
  <p style="margin: 0;"><strong>Diseño:</strong> ${data.diseno_nombre || "N/A"} (${data.diseno_resistencia} kgf/cm² - ${data.diseno_asentamiento}")</p>
  <p style="margin: 0;"><strong>Vendedor:</strong> ${data.vendedor_nombre || "N/A"}</p>
  <p style="margin: 0;"><strong>Estado:</strong> ${data.status || "N/A"}</p>
  <p style="margin: 0;"><strong>Hora de Salida:</strong> ${data.hora_salida || "N/A"}</p>
  <p style="margin: 0;"><strong>Hora de Llegada:</strong> ${data.hora_llegada || "N/A"}</p>
  <hr style="border: 0; border-top: 1px dashed #ccc; margin: 20px 0;">
  <p style="margin: 0;"><strong>RECIBIDO POR:</strong></p>
  <p style="margin: 0;"><strong>Nombre:</strong> ${data.received_by || "SIN RELLENAR"}</p>
  <p style="margin: 0;"><strong>Firma:</strong> SIN RELLENAR</p>
  <p style="margin: 0;"><strong>Fecha y Hora:</strong> SIN RELLENAR</p>
`
      const clientDetailsDiv = modal.querySelector("#modal-purchase-order-preview-content .client-details")
      if (clientDetailsDiv) {
        let existingDispatchDetails = clientDetailsDiv.nextElementSibling
        while (existingDispatchDetails && !existingDispatchDetails.classList.contains("table-container")) {
          const nextSibling = existingDispatchDetails.nextElementSibling
          existingDispatchDetails.remove()
          existingDispatchDetails = nextSibling
        }
        clientDetailsDiv.insertAdjacentHTML(
          "afterend",
          `<div class="dispatch-additional-details" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 0.9em;">${dispatchDetailsHtml}</div>`,
        )
      }

      // Show/hide print button based on status
      if (data.status === "approved" || data.status === "pending") {
          printBtn.style.display = "inline-block";
          printBtn.onclick = () => printDispatchGuide(data);
      } else {
          printBtn.style.display = "none";
      }

      modal.style.display = "flex"
    })
    .catch((error) => {
      console.error("Error al cargar detalles de despacho:", error)
      displayFlashMessage(`Error al cargar detalles de despacho: ${error.message}`, "error")
    })
}

// Function to print dispatch guide
function printDispatchGuide(data) {
  const printContent = document.getElementById("modal-purchase-order-preview-content").innerHTML;
  const printWindow = window.open("", "_blank");
  printWindow.document.write("<html><head><title>Imprimir Guía de Despacho</title>");
  printWindow.document.write('<link rel="stylesheet" href="/static/css/quotation-preview.css">');
  printWindow.document.write("</head><body>");
  printWindow.document.write(printContent);
  printWindow.document.close();

  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
  };
}

const setupPurchaseOrderDetailsModal = () => {
  const modal = document.getElementById("purchase-order-details-modal")
  if (!modal) return

  const closeBtn = modal.querySelector(".close-po-details-modal")
  closeBtn.addEventListener("click", () => {
    modal.style.display = "none"
    // Restore visibility of elements hidden for dispatch view
    document.getElementById("modal_preview_total_to_pay").closest(".totals-summary").style.display = "block"
    document.getElementById("modal_preview_total_words").closest("p").style.display = "block"
    document.getElementById("modal-preview-items-table").style.display = "table"
    // Remove dynamically added dispatch details
    const dispatchDetailsDiv = modal.querySelector(".dispatch-additional-details")
    if (dispatchDetailsDiv) {
      dispatchDetailsDiv.remove()
    }
  })

  window.addEventListener("click", (event) => {
    if (event.target === modal) {
      modal.style.display = "none"
      // Restore visibility of elements hidden for dispatch view
      document.getElementById("modal_preview_total_to_pay").closest(".totals-summary").style.display = "block"
      document.getElementById("modal_preview_total_words").closest("p").style.display = "block"
      document.getElementById("modal-preview-items-table").style.display = "table"
    }
  })

  // No PDF/Print buttons for dispatch view in this modal, so no event listeners needed here.
  // The buttons are hidden in viewDispatchDetails.
  // The buttons are hidden in viewDispatchDetails.
}


function splitPhoneNumber(fullPhone, prefixElement, numberElement) {
    if (!fullPhone || !prefixElement || !numberElement) {
        if (numberElement) numberElement.value = '';
        return;
    };
    const prefixes = ["0412", "0422", "0416", "0426", "0414", "0424"];
    let foundPrefix = false;
    for (const p of prefixes) {
        if (fullPhone.startsWith(p)) {
            prefixElement.value = fullPhone.substring(0, 4);
            numberElement.value = fullPhone.substring(4);
            foundPrefix = true;
            break;
        }
    }
    if (!foundPrefix && fullPhone.length >= 7) {
        prefixElement.value = fullPhone.substring(0, 4);
        numberElement.value = fullPhone.substring(4);
    } else if (!foundPrefix) {
        numberElement.value = fullPhone;
    }
}

function validateSplitPhone(prefixInput, numberInput, messageDivId) {
    const prefix = prefixInput.value;
    const number = numberInput.value.trim();
    if (!prefix || !number) {
        setValidationFeedback(numberInput, false, messageDivId, "El teléfono completo es requerido.");
        return false;
    }
    const cleanNumber = number.replace(/[^\d]/g, "");
    if (cleanNumber.length !== 7) {
        setValidationFeedback(numberInput, false, messageDivId, "El número debe tener 7 dígitos.");
        return false;
    }
    setValidationFeedback(numberInput, true, messageDivId, "Teléfono válido.");
    return true;
}

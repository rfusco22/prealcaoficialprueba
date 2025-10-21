window.availableMaterials = []

// Cargar información del usuario
function loadUserInfo() {
  const userName = document.getElementById("user-name")

  if (window.userInfo && window.userInfo.nombreCompleto) {
    if (userName) userName.textContent = window.userInfo.nombreCompleto
    sessionStorage.setItem("userName", window.userInfo.nombreCompleto)
    sessionStorage.setItem("userId", window.userInfo.id)
    sessionStorage.setItem("userRole", window.userInfo.rol)
  } else {
    if (userName) userName.textContent = sessionStorage.getItem("userName") || "Usuario Control y Calidad"
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
  }

  const allSidebarLinks = document.querySelectorAll(".sidebar ul li a")
  allSidebarLinks.forEach((link) => {
    link.classList.remove("active")
    if (link.dataset.page === pageId) {
      link.classList.add("active")
    }
  })
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

// Load Inventory Table
function loadInventarioTable() {
  const table = document.getElementById("inventario-table")
  if (!table) return

  const tbody = table.querySelector("tbody")

  fetch("/api/inventario")
    .then((response) => {
      console.log("DEBUG: Response for /api/inventario:", response)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return response.json()
    })
    .then((data) => {
      console.log("DEBUG: Data for inventario table:", data)
      tbody.innerHTML = ""
      data.forEach((item) => {
        const row = document.createElement("tr")

        let estadoClass = "estado-normal"
        let estadoText = "Normal"

        const MIN_THRESHOLD = 100
        if (item.cantidad <= MIN_THRESHOLD / 2) {
          estadoClass = "estado-critico"
          estadoText = "Crítico"
        } else if (item.cantidad <= MIN_THRESHOLD) {
          estadoClass = "estado-bajo"
          estadoText = "Bajo"
        }

        let displayUnit = item.unidad
        if (item.nombre.toLowerCase().includes("agua") || item.nombre.toLowerCase().includes("aditivo")) {
          displayUnit = "Lts"
        }

        row.innerHTML = `
              <td>${item.nombre}</td>
              <td>${item.cantidad}</td>
              <td>${displayUnit}</td>
              <td><span class="estado-badge ${estadoClass}">${estadoText}</span></td>
          `
        tbody.appendChild(row)
      })
      setupInventarioActions()
    })
    .catch((error) => {
      console.error("Error al cargar inventario:", error)
      tbody.innerHTML = `<tr><td colspan="5" class="error-message">Error al cargar inventario: ${error.message}</td></tr>`
    })
}

// Setup Inventory Actions
function setupInventarioActions() {
  const editButtons = document.querySelectorAll("#inventario-table .action-btn.edit")
  editButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const itemId = this.getAttribute("data-id")
      editInventarioItem(itemId)
    })
  })

  const deleteButtons = document.querySelectorAll("#inventario-table .action-btn.delete")
  deleteButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const itemId = this.getAttribute("data-id")
      deleteInventarioItem(itemId)
    })
  })
}

// Edit Inventory Item
function editInventarioItem(itemId) {
  fetch(`/api/inventario/${itemId}`)
    .then((response) => {
      console.log("DEBUG: Response for /api/inventario/:id (edit):", response)
      if (!response.ok) {
        throw new Error("Error al obtener datos del item")
      }
      return response.json()
    })
    .then((item) => {
      console.log("DEBUG: Item de inventario cargado para edición:", item)
      document.getElementById("item_id").value = item.id
      document.getElementById("nombre_item").value = item.nombre
      document.getElementById("cantidad").value = item.cantidad
      document.getElementById("unidad").value = item.unidad
      document.getElementById("densidad").value = item.densidad || ""

      document.getElementById("form-title").textContent = "Editar Item"
      document.getElementById("inventario-form").action = `/api/inventario/${item.id}`
      document.getElementById("item-form").style.display = "block"
    })
    .catch((error) => {
      console.error("Error al obtener datos del item:", error)
      displayFlashMessage("No se pudo cargar la información del item. Por favor, intente nuevamente.", "error")
    })
}

// Delete Inventory Item
function deleteInventarioItem(itemId) {
  if (confirm("¿Está seguro que desea eliminar este item?")) {
    fetch(`/api/inventario/delete/${itemId}`, {
      method: "POST",
    })
      .then((response) => {
        console.log("DEBUG: Response for /api/inventario/delete/:id:", response)
        if (response.ok) {
          displayFlashMessage("Item de inventario eliminado exitosamente.", "success")
          loadInventarioTable()
          loadAlertasDisenos()
          loadAvailableMaterials()
        } else {
          return response.json().then((data) => {
            throw new Error(data.message || "Error al eliminar item")
          })
        }
      })
      .catch((error) => {
        console.error("Error al eliminar item:", error)
        displayFlashMessage("Error al eliminar el item. Por favor, intente nuevamente.", "error")
      })
  }
}

// Load Design Table (for "Inventario por Diseños de Concreto")
function loadDisenosTable() {
  const table = document.getElementById("disenos-table")
  if (!table) return

  const tbody = table.querySelector("tbody")

  fetch("/api/inventario/disenos")
    .then((response) => {
      console.log("DEBUG: Response for /api/inventario/disenos:", response)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return response.json()
    })
    .then((data) => {
      console.log("DEBUG: Data for disenos table:", data)
      tbody.innerHTML = ""

      const disenosOrdenados = Object.values(data).sort((a, b) => {
        if (a.resistencia !== b.resistencia) {
          return a.resistencia - b.resistencia
        }
        return a.asentamiento - b.asentamiento
      })

      disenosOrdenados.forEach((diseno) => {
        const row = document.createElement("tr")

        let estadoClass = "estado-agotado"
        let estadoText = "Agotado"

        if (diseno.m3_posibles > 200) {
          estadoClass = "estado-disponible"
          estadoText = "Disponible"
        } else if (diseno.m3_posibles > 0) {
          estadoClass = "estado-limitado"
          estadoText = "Limitado"
        }

        let materialesLimitantes = "N/A"
        if (diseno.limitante) {
          if (Array.isArray(diseno.limitante)) {
            materialesLimitantes = diseno.limitante.join(", ")
          } else if (typeof diseno.limitante === "string") {
            materialesLimitantes = diseno.limitante
          }
        }

        row.innerHTML = `
              <td><strong>${diseno.nombre}</strong></td>
              <td><strong>${diseno.m3_posibles} M³</strong></td>
              <td class="material-limitante">${materialesLimitantes}</td>
              <td><span class="estado-diseno ${estadoClass}">${estadoText}</span></td>
          `
        tbody.appendChild(row)
      })
    })
    .catch((error) => {
      console.error("Error al cargar diseños:", error)
      tbody.innerHTML = `<tr><td colspan="4" class="error-message">Error al cargar datos de diseños: ${error.message}</td></tr>`
    })
}

// REEMPLAZA LA FUNCIÓN loadAlertasDisenos EXISTENTE CON ESTA VERSIÓN

function loadAlertasDisenos() {
  const alertsContainer = document.getElementById("calidad-alerts-content");
  if (!alertsContainer) return;

  // Mostrar esqueleto de carga
  alertsContainer.innerHTML = `
      <div class="alerts-skeleton">
          <div class="skeleton-card"></div>
          <div class="skeleton-card"></div>
      </div>
  `;

  fetch("/api/inventario/disenos")
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      alertsContainer.innerHTML = ""; // Limpiar esqueleto

      const disenosEnAlerta = Object.values(data).filter(diseno => diseno.m3_posibles <= 200);

      if (disenosEnAlerta.length === 0) {
        alertsContainer.innerHTML = `
          <div class="alerts-empty">
            <i class="fas fa-check-circle"></i>
            <p>No hay alertas actualmente.</p>
          </div>
        `;
        return;
      }

      // Ordenar: agotados primero, luego por menos m³ disponibles
      disenosEnAlerta.sort((a, b) => a.m3_posibles - b.m3_posibles);

      const alertsGrid = document.createElement("div");
      alertsGrid.className = "alerts-grid";

      disenosEnAlerta.forEach(diseno => {
        const nivel = diseno.m3_posibles === 0 ? 'critical' : 'warning';
        const iconClass = nivel === 'critical' ? 'fa-exclamation-circle' : 'fa-exclamation-triangle';
        const materialLimitante = Array.isArray(diseno.limitante) ? diseno.limitante.join(', ') : diseno.limitante;
        
        let message = `El diseño <strong>${diseno.nombre}</strong> tiene <strong>${diseno.m3_posibles} m³</strong> disponibles. El material limitante es: <strong>${materialLimitante}</strong>.`;
        if (nivel === 'critical') {
            message = `El diseño <strong>${diseno.nombre}</strong> está agotado. El material limitante es: <strong>${materialLimitante}</strong>.`
        }

        const alertCard = document.createElement("div");
        alertCard.className = `alert-card ${nivel}`;
        alertCard.innerHTML = `
          <div class="alert-card-header">
            <div class="alert-card-icon"><i class="fas ${iconClass}"></i></div>
            <h3 class="alert-card-title">Alerta de Inventario</h3>
          </div>
          <div class="alert-card-content">${message}</div>
          <div class="alert-card-meta">
            <span>${diseno.estado_texto}</span>
          </div>
        `;
        alertsGrid.appendChild(alertCard);
      });

      alertsContainer.appendChild(alertsGrid);
    })
    .catch(error => {
      console.error("Error al cargar alertas de diseños:", error);
      alertsContainer.innerHTML = `<p class="error-message">Error al cargar las alertas de diseños.</p>`;
    });
}

// Load available materials from inventory for dropdowns
function loadAvailableMaterials() {
  fetch("/api/inventario")
    .then((response) => {
      console.log("DEBUG: Response for /api/inventario (available materials):", response)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return response.json()
    })
    .then((data) => {
      console.log("DEBUG: Data for available materials:", data)
      window.availableMaterials = data.map((item) => item.nombre)
      if (document.getElementById("design-form-modal").style.display === "block") {
        const materialsContainer = document.getElementById("design-materials-container")
        Array.from(materialsContainer.children).forEach((row) => {
          const materialNameInput = row.querySelector('select[name="material_name"]')
          if (materialNameInput) {
            const currentMaterialName = materialNameInput.value
            const newSelect = createMaterialSelect(currentMaterialName)
            materialNameInput.replaceWith(newSelect)
          }
        })
      }
    })
    .catch((error) => console.error("Error al cargar materiales disponibles:", error))
}

// Helper function to create a material select dropdown
function createMaterialSelect(selectedValue = "") {
  const select = document.createElement("select")
  select.name = "material_name"
  select.required = true
  select.className = "material-select"

  const defaultOption = document.createElement("option")
  defaultOption.value = ""
  defaultOption.textContent = "-- Seleccione un material --"
  select.appendChild(defaultOption)

  window.availableMaterials.forEach((material) => {
    const option = document.createElement("option")
    option.value = material
    option.textContent = material
    if (material === selectedValue) {
      option.selected = true
    }
    select.appendChild(option)
  })
  return select
}

// Setup Modals (for "Agregar Nuevo Item")
function setupModals() {
  const itemModal = document.getElementById("item-form")
  const addItemBtn = document.getElementById("add-item-btn")
  const closeBtn = itemModal ? itemModal.querySelector(".close") : null

  if (addItemBtn) {
    addItemBtn.addEventListener("click", () => {
      document.getElementById("inventario-form").reset()
      document.getElementById("item_id").value = ""
      document.getElementById("densidad").value = ""

      document.getElementById("form-title").textContent = "Agregar Item"
      document.getElementById("inventario-form").action = "/api/inventario"

      itemModal.style.display = "block"
    })
  }

  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      itemModal.style.display = "none"
    })
  }

  window.addEventListener("click", (event) => {
    if (itemModal && event.target === itemModal) {
      itemModal.style.display = "none"
    }
  })
}

// Setup Add Quantity Modal
function setupAddQuantityModal() {
  const addQuantityModal = document.getElementById("add-quantity-modal")
  const addQuantityBtn = document.getElementById("add-quantity-btn")
  const closeQuantityModalBtn = addQuantityModal ? addQuantityModal.querySelector(".close") : null
  const existingMaterialSelect = document.getElementById("existing_material_select")
  const addQuantityUnitInput = document.getElementById("add_quantity_unit")

  if (addQuantityBtn) {
    addQuantityBtn.addEventListener("click", () => {
      document.getElementById("add-quantity-form").reset()
      document.getElementById("add_quantity_amount").value = ""
      addQuantityUnitInput.value = ""
      existingMaterialSelect.innerHTML = '<option value="">Cargando materiales...</option>'
      loadMaterialsForAddQuantity()
      addQuantityModal.style.display = "block"
    })
  }

  if (closeQuantityModalBtn) {
    closeQuantityModalBtn.addEventListener("click", () => {
      addQuantityModal.style.display = "none"
    })
  }

  window.addEventListener("click", (event) => {
    if (addQuantityModal && event.target === addQuantityModal) {
      addQuantityModal.style.display = "none"
    }
  })

  existingMaterialSelect.addEventListener("change", () => {
    const selectedOption = existingMaterialSelect.options[existingMaterialSelect.selectedIndex]
    addQuantityUnitInput.value = selectedOption.dataset.unit || ""
  })
}

// Load materials for Add Quantity Modal
function loadMaterialsForAddQuantity() {
  const existingMaterialSelect = document.getElementById("existing_material_select")
  fetch("/api/inventario")
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return response.json()
    })
    .then((data) => {
      existingMaterialSelect.innerHTML = '<option value="">Seleccione material</option>'
      data.forEach((item) => {
        const option = document.createElement("option")
        option.value = item.nombre
        option.textContent = item.nombre
        option.dataset.unit = item.unidad
        existingMaterialSelect.appendChild(option)
      })
    })
    .catch((error) => {
      console.error("Error al cargar materiales para añadir cantidad:", error)
      existingMaterialSelect.innerHTML = '<option value="">Error al cargar materiales</option>'
    })
}

// --- Concrete Design Functions ---

// Load Concrete Designs Table
function loadConcreteDesignsTable() {
  const table = document.getElementById("concrete-designs-table")
  if (!table) return

  const tbody = table.querySelector("tbody")

  fetch("/api/concrete_designs")
    .then((response) => {
      console.log("DEBUG: Response for /api/concrete_designs:", response)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return response.json()
    })
    .then((data) => {
      console.log("DEBUG: Data for concrete designs table:", data)
      tbody.innerHTML = ""
      data.forEach((design) => {
        const row = document.createElement("tr")
        const materialsHtml = design.materiales.map((m) => `${m.material_name}: ${m.quantity_kg} kg`).join("<br>")

        row.innerHTML = `
              <td>${design.nombre}</td>
              <td>${design.resistencia}</td>
              <td>${design.asentamiento}</td>
              <td>${materialsHtml}</td>
              <td>
                  <button class="action-btn edit-design" data-id="${design.id}" title="Editar Diseño"><i class="fas fa-edit"></i></button>
                  <button class="action-btn delete-design" data-id="${design.id}" title="Eliminar Diseño"><i class="fas fa-trash"></i></button>
              </td>
          `
        tbody.appendChild(row)
      })
      setupConcreteDesignActions()
    })
    .catch((error) => {
      console.error("Error al cargar diseños de concreto:", error)
      tbody.innerHTML = `<tr><td colspan="5" class="error-message">Error al cargar datos de diseños de concreto: ${error.message}</td></tr>`
    })
}

// Setup Concrete Design Actions
function setupConcreteDesignActions() {
  const editButtons = document.querySelectorAll("#concrete-designs-table .action-btn.edit-design")
  editButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const designId = this.getAttribute("data-id")
      editConcreteDesign(designId)
    })
  })

  const deleteButtons = document.querySelectorAll("#concrete-designs-table .action-btn.delete-design")
  deleteButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const designId = this.getAttribute("data-id")
      deleteConcreteDesign(designId)
    })
  })
}

// Edit Concrete Design
function editConcreteDesign(designId) {
  fetch(`/api/concrete_designs/${designId}`)
    .then((response) => {
      console.log("DEBUG: Response for /api/concrete_designs/:id (edit):", response)
      if (!response.ok) {
        throw new Error("Error al obtener datos del diseño")
      }
      return response.json()
    })
    .then((design) => {
      console.log("DEBUG: Design data loaded for edit:", design)
      document.getElementById("design_id").value = design.id
      document.getElementById("design_nombre").value = design.nombre
      document.getElementById("design_resistencia").value = design.resistencia
      document.getElementById("design_asentamiento").value = design.asentamiento

      const materialsContainer = document.getElementById("design-materials-container")
      materialsContainer.innerHTML = ""

      design.materiales.forEach((material) => {
        addMaterialRow(material.material_name, material.quantity_kg)
      })

      document.getElementById("design-form-title").textContent = "Editar Diseño de Concreto"
      document.getElementById("concrete-design-form").action = `/api/concrete_designs/${design.id}`
      document.getElementById("concrete-design-form").method = "PUT"
      document.getElementById("design-form-modal").style.display = "block"
    })
    .catch((error) => {
      console.error("Error al obtener datos del diseño:", error)
      displayFlashMessage("No se pudo cargar la información del diseño. Por favor, intente nuevamente.", "error")
    })
}

// Delete Concrete Design
function deleteConcreteDesign(designId) {
  if (
    confirm("¿Está seguro que desea eliminar este diseño de concreto? Esto también eliminará sus materiales asociados.")
  ) {
    fetch(`/api/concrete_designs/delete/${designId}`, {
      method: "POST",
    })
      .then((response) => {
        console.log("DEBUG: Response for /api/concrete_designs/delete/:id:", response)
        if (response.ok) {
          displayFlashMessage("Diseño de concreto eliminado exitosamente.", "success")
          loadConcreteDesignsTable()
          loadDisenosTable()
          loadAlertasDisenos()
        } else {
          return response.json().then((data) => {
            throw new Error(data.message || "Error al eliminar diseño de concreto")
          })
        }
      })
      .catch((error) => {
        console.error("Error:", error)
        displayFlashMessage(`Error al eliminar el diseño de concreto: ${error.message}`, "error")
      })
  }
}

// Add Material Row to Design Form
function addMaterialRow(materialName = "", quantityKg = "") {
  const materialsContainer = document.getElementById("design-materials-container")
  const newRow = document.createElement("div")
  newRow.className = "material-row"
  newRow.innerHTML = `
      <input type="number" name="quantity_kg" value="${quantityKg}" placeholder="Cantidad (kg/m³)" step="0.001" required>
      <button type="button" class="remove-material-btn"><i class="fas fa-times-circle"></i></button>
  `

  const materialSelect = createMaterialSelect(materialName)
  newRow.prepend(materialSelect)

  materialsContainer.appendChild(newRow)

  newRow.querySelector(".remove-material-btn").addEventListener("click", () => {
    newRow.remove()
  })
}

// Load available materials for the material request form dropdown
function loadMaterialRequestFormMaterials() {
  const materialSelect = document.getElementById("request_material_name")
  const unitInput = document.getElementById("request_unit")
  if (!materialSelect) return

  fetch("/api/inventario")
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return response.json()
    })
    .then((data) => {
      materialSelect.innerHTML = '<option value="">Seleccione material</option>'
      data.forEach((item) => {
        const option = document.createElement("option")
        option.value = item.nombre
        option.textContent = item.nombre
        option.dataset.unit = item.unidad
        materialSelect.appendChild(option)
      })

      materialSelect.addEventListener("change", () => {
        const selectedOption = materialSelect.options[materialSelect.selectedIndex]
        unitInput.value = selectedOption.dataset.unit || ""
      })
    })
    .catch((error) => {
      console.error("Error al cargar materiales para solicitud:", error)
      materialSelect.innerHTML = '<option value="">Error al cargar materiales</option>'
    })
}

function loadMaterialRequestsTable() {
  const table = document.getElementById("material-requests-table");
  if (!table) return;

  const tbody = table.querySelector("tbody");

  fetch("/api/material_requests/list")
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      tbody.innerHTML = "";
      if (data.length === 0) {
        tbody.innerHTML =
          '<tr><td colspan="7" style="text-align: center;">No hay solicitudes de material registradas.</td></tr>';
        return;
      }
      data.forEach((request) => {
        const row = document.createElement("tr");
        let statusClass = "";
        if (request.status === "pending") {
          statusClass = "status-pending";
        } else if (request.status === "approved") {
          statusClass = "status-approved";
        } else if (request.status === "denied") {
          statusClass = "status-denied";
        }

        // Correcciones aplicadas aquí:
        row.innerHTML = `
          <td>${request.request_date}</td> 
          <td>${request.material_name}</td>
          <td>${request.quantity_requested}</td>
          <td>${request.unit}</td>
          <td>${request.reason || "N/A"}</td>
          <td><span class="status-badge ${statusClass}">${traducirEstado(request.status)}</span></td>
          <td>${request.responder_full_name || "N/A"}</td>
        `;
        tbody.appendChild(row);
      });
    })
    .catch((error) => {
      console.error("Error al cargar solicitudes de material:", error);
      tbody.innerHTML = `<tr><td colspan="7" class="error-message">Error al cargar solicitudes de material: ${error.message}</td></tr>`;
    });
}

// Utility functions
function formatDate(dateString) {
  if (!dateString) return "N/A"
  const date = new Date(dateString)
  return date.toLocaleDateString("es-ES")
}

function formatCurrency(value) {
  return new Intl.NumberFormat("es-VE", {
    style: "currency",
    currency: "VES",
  }).format(value)
}

function displayFlashMessage(message, category) {
  const flashMessagesDiv = document.getElementById("flash-messages")
  if (flashMessagesDiv) {
    // Clear existing messages and add fade-out class if any
    Array.from(flashMessagesDiv.children).forEach((child) => {
      child.classList.add("fade-out")
      child.addEventListener("animationend", () => child.remove(), { once: true })
    })

    const alertDiv = document.createElement("div")
    alertDiv.className = `alert alert-${category} fade-in`
    alertDiv.innerHTML = `
      <div class="alert-content">
        ${category === "success" ? '<i class="fas fa-check-circle"></i>' : ""}
        ${category === "error" ? '<i class="fas fa-times-circle"></i>' : ""}
        ${category === "warning" ? '<i class="fas fa-exclamation-triangle"></i>' : ""}
        ${category === "info" ? '<i class="fas fa-info-circle"></i>' : ""}
        <span>${message}</span>
      </div>
      <button type="button" class="alert-close" aria-label="Close alert">
        <i class="fas fa-times"></i>
      </button>
    `
    flashMessagesDiv.appendChild(alertDiv)

    // Add event listener for close button
    alertDiv.querySelector(".alert-close").addEventListener("click", () => {
      alertDiv.classList.remove("fade-in")
      alertDiv.classList.add("fade-out")
      alertDiv.addEventListener("animationend", () => alertDiv.remove(), { once: true })
    })

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      if (alertDiv.parentNode) {
        // Check if it hasn't been manually dismissed
        alertDiv.classList.remove("fade-in")
        alertDiv.classList.add("fade-out")
        alertDiv.addEventListener("animationend", () => alertDiv.remove(), { once: true })
      }
    }, 5000)
  }
}

function openAddItemModal() {
  document.getElementById("item-form").style.display = "block"
}

function openAddQuantityModal() {
  document.getElementById("add-quantity-modal").style.display = "block"
}

function openAddDesignModal() {
  document.getElementById("design-form-modal").style.display = "block"
}

function traducirEstado(estado) {
  const traducciones = {
    pending: 'Pendiente',
    approved: 'Aprobado',
    denied: 'Negado'
  };
  return traducciones[estado.toLowerCase()] || estado;
}

function handleFormSubmission(form, url, successMessage, callback) {
  const formData = new FormData(form)
  fetch(url, {
    method: form.method,
    body: formData,
  })
    .then((response) => {
      console.log("DEBUG: Response for form submission:", response)
      if (response.ok) {
        return response.json()
      } else {
        return response.json().then((data) => {
          throw new Error(data.message || "Error al guardar datos")
        })
      }
    })
    .then((data) => {
      displayFlashMessage(successMessage, "success")
      callback()
    })
    .catch((error) => {
      console.error("Error:", error)
      displayFlashMessage(`Error al guardar datos: ${error.message}`, "error")
    })
}

document.addEventListener("DOMContentLoaded", () => {
  const sidebarLinks = document.querySelectorAll(".sidebar ul li a")
  const pages = document.querySelectorAll(".page")
  const logoutBtn = document.getElementById("logout-btn")
  const userNameDisplay = document.getElementById("user-name")
  const flashMessagesContainer = document.getElementById("flash-messages")

  const addItemBtn = document.getElementById("add-item-btn")
  const itemFormModal = document.getElementById("item-form")
  const closeItemModalBtn = itemFormModal ? itemFormModal.querySelector(".close") : null
  const inventarioForm = document.getElementById("inventario-form")

  const addQuantityBtn = document.getElementById("add-quantity-btn")
  const addQuantityModal = document.getElementById("add-quantity-modal")
  const closeQuantityModalBtn = addQuantityModal ? addQuantityModal.querySelector(".close") : null
  const addQuantityForm = document.getElementById("add-quantity-form")

  const addDesignBtn = document.getElementById("add-design-btn")
  const designFormModal = document.getElementById("design-form-modal")
  const closeDesignModalBtn = designFormModal ? designFormModal.querySelector(".close") : null
  const concreteDesignForm = document.getElementById("concrete-design-form")
  const addMaterialRowBtn = document.getElementById("add-material-row-btn")

  const materialRequestForm = document.getElementById("material-request-form") // Get the material request form

  if (window.userInfo && window.userInfo.nombreCompleto) {
    if (userNameDisplay) userNameDisplay.textContent = window.userInfo.nombreCompleto
  }

  loadUserInfo()
  loadInventarioTable()
  loadDisenosTable()
  loadConcreteDesignsTable()
  loadAvailableMaterials()
  loadAlertasDisenos()
  loadMaterialRequestFormMaterials()
  loadMaterialRequestsTable()

  // Centralized setup for all event listeners
  function setupEventListeners() {
    // Sidebar navigation
    const allSidebarLinks = document.querySelectorAll(".sidebar ul li a")
    allSidebarLinks.forEach((link) => {
      link.addEventListener("click", function (event) {
        event.preventDefault()
        showPage(this.dataset.page)
      })
    })

    // Logout button
    logoutBtn.addEventListener("click", async (event) => {
      event.preventDefault()
      if (confirm("¿Está seguro que desea cerrar sesión?")) {
        const response = await fetch("/api/logout", { method: "POST" })
        const result = await response.json()
        if (result.success) {
          window.location.href = "/"
        } else {
          alert("Error al cerrar sesión.")
        }
      }
    })

    // Inventario Form (Add/Edit Item)
    if (addItemBtn) addItemBtn.addEventListener("click", () => openAddItemModal())
    if (closeItemModalBtn) closeItemModalBtn.addEventListener("click", () => (itemFormModal.style.display = "none"))
    if (inventarioForm) {
      inventarioForm.addEventListener("submit", function (event) {
        event.preventDefault()
        handleFormSubmission(this, this.action, "Item de inventario guardado exitosamente.", () => {
          itemFormModal.style.display = "none" // Close modal
          loadInventarioTable()
          loadAlertasDisenos()
          loadAvailableMaterials()
        })
      })
    }

    // Add Quantity Form
    if (addQuantityBtn) addQuantityBtn.addEventListener("click", openAddQuantityModal)
    if (closeQuantityModalBtn)
      closeQuantityModalBtn.addEventListener("click", () => (addQuantityModal.style.display = "none"))
    if (addQuantityForm) {
      addQuantityForm.addEventListener("submit", function (event) {
        event.preventDefault()

        const selectedMaterialOption = document.getElementById("existing_material_select").selectedOptions[0]
        const nombre = selectedMaterialOption.value
        const cantidad = document.getElementById("add_quantity_amount").value
        const unidad = document.getElementById("add_quantity_unit").value

        if (!nombre || !cantidad || !unidad) {
          displayFlashMessage("Por favor, complete todos los campos.", "error")
          return
        }

        const formData = new FormData()
        formData.append("nombre", nombre)
        formData.append("cantidad", cantidad)
        formData.append("unidad", unidad)

        fetch(this.action, {
          method: "POST",
          body: formData,
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
            else throw new Error(data.message || `Error al añadir cantidad al material`)
          })
          .then((data) => {
            displayFlashMessage(data.message, "success")
            addQuantityModal.style.display = "none" // Close modal
            loadInventarioTable()
            loadAlertasDisenos()
            loadAvailableMaterials()
          })
          .catch((error) => {
            console.error("Error:", error)
            displayFlashMessage(`Error al añadir cantidad: ${error.message}`, "error")
          })
      })
    }

    // Concrete Design Form
    if (addDesignBtn) {
    addDesignBtn.addEventListener("click", () => {
      const form = document.getElementById("concrete-design-form");
      const modal = document.getElementById("design-form-modal");
      const materialsContainer = document.getElementById("design-materials-container");

      // 1. Restablecer los campos del formulario (nombre, resistencia, etc.)
      form.reset();

      // 2. Limpiar el ID oculto del diseño
      document.getElementById("design_id").value = "";

      // 3. Restaurar el título del modal al de "Agregar"
      document.getElementById("design-form-title").textContent = "Agregar Diseño de Concreto";

      // 4. Restaurar la acción del formulario a la ruta de creación
      form.action = "/api/concrete_designs";

      // 5. Asegurarse de que el método del formulario sea POST
      form.method = "POST";

      // 6. Limpiar todos los materiales que pudieran existir de una edición anterior
      materialsContainer.innerHTML = "";

      // 7. Añadir una fila de material vacía para empezar
      addMaterialRow();

      // 8. Finalmente, mostrar el modal ya limpio
      modal.style.display = "block";
    });
  }
  if (closeDesignModalBtn)
    closeDesignModalBtn.addEventListener("click", () => (designFormModal.style.display = "none"))
  if (addMaterialRowBtn) addMaterialRowBtn.addEventListener("click", () => addMaterialRow())
  if (concreteDesignForm) {
      concreteDesignForm.addEventListener("submit", (event) => {
        event.preventDefault()
        const designId = document.getElementById("design_id").value
        const apiUrl = designId ? `/api/concrete_designs/${designId}` : "/api/concrete_designs"

        const nombre = document.getElementById("design_nombre").value
        const resistencia = document.getElementById("design_resistencia").value
        const asentamiento = document.getElementById("design_asentamiento").value

        const materials = []
        let allMaterialsValid = true
        document.querySelectorAll("#design-materials-container .material-row").forEach((row) => {
          const materialName = row.querySelector('select[name="material_name"]').value
          const quantityKg = Number.parseFloat(row.querySelector('input[name="quantity_kg"]').value)
          if (materialName && !isNaN(quantityKg) && quantityKg >= 0) {
            materials.push({ material_name: materialName, quantity_kg: quantityKg })
          } else {
            allMaterialsValid = false
          }
        })

        if (!allMaterialsValid) {
          displayFlashMessage(
            "Por favor, asegúrese de que todos los materiales tienen un nombre seleccionado y una cantidad válida (no negativa).",
            "error",
          )
          return
        }

        const formData = {
          nombre: nombre,
          resistencia: Number.parseInt(resistencia),
          asentamiento: Number.parseInt(asentamiento),
          materiales: materials,
        }

        fetch(apiUrl, {
          method: designId ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        })
          .then((response) => response.json())
          .then((data) => {
            if (data.success) {
              displayFlashMessage(data.message, "success")
              concreteDesignForm.reset()
              document.getElementById("design_id").value = ""
              document.getElementById("design-materials-container").innerHTML = ""
              addMaterialRow() // Add one empty material row
              designFormModal.style.display = "none"
              loadDisenosTable()
              loadConcreteDesignsTable()
            } else {
              displayFlashMessage(data.message, "error")
            }
          })
          .catch((error) => {
            console.error("Error:", error)
            displayFlashMessage("Error al guardar el diseño de concreto.", "error")
          })
      })
    }

    // Material Request Form
    if (materialRequestForm) {
      materialRequestForm.addEventListener("submit", async (e) => {
        e.preventDefault() // Prevent default form submission

        const formData = new FormData(materialRequestForm)

        try {
          const response = await fetch(materialRequestForm.action, {
            method: "POST",
            body: formData,
          })

          const responseText = await response.text()
          let data
          try {
            data = JSON.parse(responseText)
          } catch (parseError) {
            data = { success: response.ok, message: responseText || `Error HTTP: ${response.status}` }
          }

          if (response.ok) {
            displayFlashMessage(data.message, "success")
            materialRequestForm.reset()
            document.getElementById("request_unit").value = "" // Clear the unit field as well
            loadMaterialRequestsTable() // Reload the table to show the new request
          } else {
            throw new Error(data.message || `Error HTTP: ${response.status}`)
          }
        } catch (error) {
          console.error("Error al enviar solicitud de material:", error)
          displayFlashMessage(`Error al enviar solicitud de material: ${error.message}`, "error")
        }
      })
    } else {
      console.warn("Material request form not found. Skipping setup for its submit listener.")
    }
  }

  // Initial loads and setup
  setupLogout()
  setupModals() // These modals are opened by buttons, not form submissions
  setupAddQuantityModal() // This modal is opened by a button

  // Call setupEventListeners to set up all form submission listeners and other event listeners
  setupEventListeners()
})

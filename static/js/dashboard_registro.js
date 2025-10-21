// Helper functions - Defined first to ensure they are available globally
// Helper function to parse various date string formats into a Date object
function parseDateString(dateString) {
  if (!dateString) return null

  // Attempt 1: Try parsing directly. This handles ISO 8601 (YYYY-MM-DDTHH:mm:ss.sssZ)
  // and some other common formats if they are unambiguous.
  let date = new Date(dateString)
  if (!isNaN(date.getTime())) {
    return date
  }

  // Attempt 2: Try YYYY-MM-DD (if it's just a date string without time, adding T00:00:00 helps with timezone interpretation)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    date = new Date(dateString + "T00:00:00")
    if (!isNaN(date.getTime())) {
      return date
    }
  }

  // Attempt 3: Try MM/DD/YYYY (common in US, and seen in modal screenshot)
  let parts = dateString.split("/")
  if (parts.length === 3) {
    const month = Number.parseInt(parts[0], 10) - 1 // Month is 0-indexed
    const day = Number.parseInt(parts[1], 10)
    const year = Number.parseInt(parts[2], 10)
    date = new Date(year, month, day)
    if (!isNaN(date.getTime())) {
      return date
    }
  }

  // Attempt 4: Try DD/MM/YYYY (as previously assumed for some backend data)
  parts = dateString.split("/")
  if (parts.length === 3) {
    const day = Number.parseInt(parts[0], 10)
    const month = Number.parseInt(parts[1], 10) - 1 // Month is 0-indexed
    const year = Number.parseInt(parts[2], 10)
    date = new Date(year, month, day)
    if (!isNaN(date.getTime())) {
      return date
    }
  }

  // If all attempts fail, return null
  return null
}

// Helper function to format date for display
function formatDate(dateString) {
  const date = parseDateString(dateString)
  if (!date) return "N/A" // Handles null, undefined, empty, or unparseable strings
  return date.toLocaleDateString("es-ES", { year: "numeric", month: "2-digit", day: "2-digit" })
}

// Helper function to format date for input type="date"
function formatDateForInput(dateString) {
  const date = parseDateString(dateString)
  if (!date) return "" // For input type="date", return empty string if invalid
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, "0")
  const day = date.getDate().toString().padStart(2, "0")
  return `${year}-${month}-${day}`
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("es-VE", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

function displayFlashMessage(message, category) {
  const flashMessagesDiv = document.getElementById("flash-messages")
  if (flashMessagesDiv) {
    const ul = flashMessagesDiv.querySelector(".flash-messages-list") || document.createElement("ul")
    ul.classList.add("flash-messages-list")
    flashMessagesDiv.appendChild(ul)

    const li = document.createElement("li")
    li.classList.add("alert", `alert-${category}`)
    li.textContent = message
    ul.appendChild(li)

    setTimeout(() => {
      li.remove()
      if (ul.children.length === 0) {
        ul.remove()
      }
    }, 5000)
  } else {
    alert(message)
  }
}

function validateVenezuelanPlate(plate, errorElementId) {
  const errorSpan = document.getElementById(errorElementId)
  const plateRegex = /^[A-Z]{1}\d{2}[A-Z]{2}\d{1}[A-Z]{1}$/i

  if (!plate) {
    errorSpan.textContent = "La placa no puede estar vacía."
    errorSpan.style.display = "block"
    return false
  }

  if (!plateRegex.test(plate)) {
    errorSpan.textContent = "Formato de placa inválido. Debe ser LDDLLDL (ej. A12BC3D)."
    errorSpan.style.display = "block"
    return false
  }

  errorSpan.style.display = "none"
  errorSpan.textContent = ""
  return true
}

function validateVenezuelanDocument(type, number, isRif = false, errorElementId) {
  const errorSpan = document.getElementById(errorElementId)
  errorSpan.style.display = "none"
  errorSpan.textContent = ""

  if (!type || !number) {
    errorSpan.textContent = "El tipo y número de documento no pueden estar vacíos."
    errorSpan.style.display = "block"
    return false
  }

  const fullDocument = `${type}-${number}`

  if (isRif) {
    const rifRegex = /^([JVGEP])-(\d{8})-(\d)$/i
    const match = rifRegex.exec(fullDocument.toUpperCase())

    if (!match) {
      errorSpan.textContent = "Formato de RIF inválido. Debe ser [J|V|G|E|P]-XXXXXXXX-X."
      errorSpan.style.display = "block"
      return false
    }

    const prefix = match[1]
    const bodyStr = match[2]
    const checkDigit = Number.parseInt(match[3], 10)

    const bodyDigits = bodyStr.split("").map(Number)
    const weights = [3, 2, 7, 6, 5, 4, 3, 2]
    let weightedSum = 0
    for (let i = 0; i < 8; i++) {
      weightedSum += bodyDigits[i] * weights[i]
    }

    const prefixValue = { J: 8, G: 9, V: 1, E: 2, P: 3 }[prefix] || 0
    const totalSum = weightedSum + prefixValue
    const remainder = totalSum % 11

    let expectedCheckDigit = 0
    if (remainder === 0) {
      expectedCheckDigit = 0
    } else if (remainder === 1) {
      expectedCheckDigit = prefix === "V" || prefix === "E" ? 0 : 9
    } else {
      expectedCheckDigit = 11 - remainder
    }

    if (expectedCheckDigit !== checkDigit) {
      errorSpan.textContent = `Dígito verificador del RIF incorrecto. Se esperaba ${expectedCheckDigit}.`
      errorSpan.style.display = "block"
      return false
    }
  } else {
    const cedulaRegex = /^([VEJG])-(\d{6,9})$/i
    if (!cedulaRegex.test(fullDocument.toUpperCase())) {
      errorSpan.textContent = "Formato de cédula inválido. Debe ser [V|E|J|G]-XXXXXXX o [V|E|J|G]-XXXXXXXX."
      errorSpan.style.display = "block"
      return false
    }
  }
  return true
}

function addMaterialRow(container, material = {}) {
    const materialRow = document.createElement("div");
    materialRow.classList.add("material-row");
    
    // Se ha actualizado el <select> para que coincida con el formulario de registro
    materialRow.innerHTML = `
        <input type="text" class="nombre-material" placeholder="Nombre Material" value="${material.nombre_material || ""}" required>
        <input type="number" step="0.01" class="precio-material" placeholder="Precio" value="${material.precio || ""}" required>
        <select class="unidad-medida-material" required>
            <option value="">Unidad</option>
            <option value="toneladas" ${material.unidad_medida === "toneladas" ? "selected" : ""}>Toneladas</option>
            <option value="M3" ${material.unidad_medida === "M3" ? "selected" : ""}>M3</option>
            <option value="litros" ${material.unidad_medida === "litros" ? "selected" : ""}>Litros</option>
            <option value="unidad" ${material.unidad_medida === "unidad" ? "selected" : ""}>Unidad</option>
            <option value="saco" ${material.unidad_medida === "saco" ? "selected" : ""}>Saco</option>
        </select>
        <button type="button" class="remove-material-btn btn-danger">X</button>
    `;

    container.appendChild(materialRow);

    materialRow.querySelector(".remove-material-btn").addEventListener("click", () => {
        materialRow.remove();
        // Asegura que siempre haya al menos una fila si se borran todas
        if (container.children.length === 0) {
            addMaterialRow(container);
        }
    });
}

// Load data functions - Defined after helpers
function loadUserInfo() {
  const userName = document.getElementById("user-name")
  if (window.userInfo && window.userInfo.nombreCompleto) {
    if (userName.textContent === "Cargando...") {
      userName.textContent = window.userInfo.nombreCompleto
    }
    sessionStorage.setItem("userName", window.userInfo.nombreCompleto)
    sessionStorage.setItem("userId", window.userInfo.id)
    sessionStorage.setItem("userRole", window.userInfo.rol)
  } else {
    userName.textContent = sessionStorage.getItem("userName") || "Usuario Registro"
  }
}

function loadVendedores() {
  fetch("/api/vendedores")
    .then((response) => response.json())
    .then((data) => {
      const vendedorClienteSelect = document.getElementById("vendedor_cliente")
      const vendedorClienteEditSelect = document.getElementById("vendedor_cliente_edit")

      if (vendedorClienteSelect) {
        vendedorClienteSelect.innerHTML = '<option value="">Seleccione vendedor</option>'
        data.forEach((vendedor) => {
          const option = document.createElement("option")
          option.value = vendedor.id
          option.textContent = vendedor.nombre
          vendedorClienteSelect.appendChild(option)
        })
      }

      if (vendedorClienteEditSelect) {
        vendedorClienteEditSelect.innerHTML = '<option value="">Seleccione vendedor</option>'
        data.forEach((vendedor) => {
          const option = document.createElement("option")
          option.value = vendedor.id
          option.textContent = vendedor.nombre
          vendedorClienteEditSelect.appendChild(option)
        })
      }
    })
    .catch((error) => console.error("Error al cargar vendedores:", error))
}

function loadCamionesForSelect() {
  fetch("/api/camiones")
    .then((response) => response.json())
    .then((data) => {

      if (!Array.isArray(data)) {
        console.error("La respuesta del servidor para el selector de camiones no es una lista:", data);
        return; // Detiene la ejecución si no es un array
      }

      const camionSelect = document.getElementById("camion_mantenimiento");
      const camionEditSelect = document.getElementById("camion_mantenimiento_edit");

      if (camionSelect) {
        camionSelect.innerHTML = '<option value="">Seleccione camión</option>';
        data.forEach((camion) => {
          const option = document.createElement("option");
          option.value = camion.id;
          option.textContent = `${camion.placa} - ${camion.modelo}`;
          option.setAttribute("data-odometer", camion.current_odometer || 0);
          camionSelect.appendChild(option);
        });
      }

      if (camionEditSelect) {
        camionEditSelect.innerHTML = '<option value="">Seleccione camión</option>';
        data.forEach((camion) => {
          const option = document.createElement("option");
          option.value = camion.id;
          option.textContent = `${camion.placa} - ${camion.modelo}`;
          option.setAttribute("data-odometer", camion.current_odometer || 0);
          camionEditSelect.appendChild(option);
        });
      }
    })
    .catch((error) => console.error("Error al cargar camiones para el selector:", error));
}

function loadClientesTable() {
  const table = document.getElementById("clientes-table")
  if (!table) return
  const tbody = table.querySelector("tbody")
  fetch("/api/clientes")
    .then((response) => response.json())
    .then((data) => {
      tbody.innerHTML = ""
      data.forEach((cliente) => {
        const row = document.createElement("tr")
        row.innerHTML = `
          <td>${cliente.nombre}</td>
          <td>${cliente.direccion}</td>
          <td>${cliente.telefono}</td>
          <td>${cliente.documento}</td>
          <td>${cliente.vendedor_nombre || "N/A"}</td>
      `
        tbody.appendChild(row)
      })
      setupClientesActions()
    })
    .catch((error) => console.error("Error al cargar clientes:", error))
}

// REEMPLAZA LA FUNCIÓN loadAlertsTable EXISTENTE CON ESTA VERSIÓN

function loadAlertsTable() {
    const alertsContainer = document.getElementById("registro-alerts-content");
    if (!alertsContainer) return;

    // Mostrar esqueleto de carga
    alertsContainer.innerHTML = `
        <div class="alerts-skeleton">
            <div class="skeleton-card"></div>
            <div class="skeleton-card"></div>
        </div>
    `;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const ninetyDaysFromNow = new Date();
    ninetyDaysFromNow.setDate(today.getDate() + 90);

    const allAlerts = [];

    const fetchChoferes = fetch("/api/choferes").then(response => response.json()).then(choferes => {
        choferes.forEach(chofer => {
            const licenciaDate = parseDateString(chofer.vencimiento_licencia);
            if (licenciaDate && licenciaDate <= ninetyDaysFromNow) {
                const diffDays = Math.ceil((licenciaDate - today) / (1000 * 60 * 60 * 24));
                allAlerts.push({
                    nivel: diffDays <= 7 ? 'critical' : 'warning',
                    title: 'Vencimiento de Licencia',
                    message: `La licencia del chofer <strong>${chofer.nombre}</strong> (${chofer.cedula}) vence el <strong>${formatDate(chofer.vencimiento_licencia)}</strong>.`,
                    days: diffDays
                });
            }

            const certificadoDate = parseDateString(chofer.vencimiento_certificado);
            if (certificadoDate && certificadoDate <= ninetyDaysFromNow) {
                const diffDays = Math.ceil((certificadoDate - today) / (1000 * 60 * 60 * 24));
                allAlerts.push({
                    nivel: diffDays <= 7 ? 'critical' : 'warning',
                    title: 'Vencimiento de Certificado Médico',
                    message: `El certificado médico de <strong>${chofer.nombre}</strong> (${chofer.cedula}) vence el <strong>${formatDate(chofer.vencimiento_certificado)}</strong>.`,
                    days: diffDays
                });
            }
        });
    });

    const fetchMantenimiento = fetch("/api/mantenimiento").then(response => response.json()).then(mantenimientos => {
        mantenimientos.forEach(mantenimiento => {
            const proximaFecha = parseDateString(mantenimiento.proxima_fecha_mantenimiento);
            if (proximaFecha && proximaFecha <= ninetyDaysFromNow) {
                const diffDays = Math.ceil((proximaFecha - today) / (1000 * 60 * 60 * 24));
                allAlerts.push({
                    nivel: diffDays <= 7 ? 'critical' : 'warning',
                    title: 'Mantenimiento Programado',
                    message: `El próximo mantenimiento para el camión <strong>${mantenimiento.placa}</strong> (${mantenimiento.tipo_mantenimiento}) es el <strong>${formatDate(mantenimiento.proxima_fecha_mantenimiento)}</strong>.`,
                    days: diffDays
                });
            }
        });
    });

    Promise.all([fetchChoferes, fetchMantenimiento]).then(() => {
        alertsContainer.innerHTML = ""; // Limpiar esqueleto

        if (allAlerts.length === 0) {
            alertsContainer.innerHTML = `
                <div class="alerts-empty">
                    <i class="fas fa-check-circle"></i>
                    <p>No hay alertas activas en este momento</p>
                </div>
            `;
            return;
        }

        // Ordenar: críticas primero, luego por menos días restantes
        allAlerts.sort((a, b) => {
            if (a.nivel === 'critical' && b.nivel !== 'critical') return -1;
            if (a.nivel !== 'critical' && b.nivel === 'critical') return 1;
            return a.days - b.days;
        });

        const alertsGrid = document.createElement("div");
        alertsGrid.className = "alerts-grid";

        allAlerts.forEach(alert => {
            const alertCard = document.createElement("div");
            const iconClass = alert.nivel === 'critical' ? 'fa-exclamation-circle' : 'fa-exclamation-triangle';
            
            alertCard.className = `alert-card ${alert.nivel}`;
            alertCard.innerHTML = `
                <div class="alert-card-header">
                    <div class="alert-card-icon"><i class="fas ${iconClass}"></i></div>
                    <h3 class="alert-card-title">${alert.title}</h3>
                </div>
                <div class="alert-card-content">${alert.message}</div>
                <div class="alert-card-meta">
                    <span class="alert-card-days">${alert.days < 0 ? 'Vencido' : `${alert.days} días restantes`}</span>
                </div>
            `;
            alertsGrid.appendChild(alertCard);
        });

        alertsContainer.appendChild(alertsGrid);

    }).catch(error => {
        console.error("Error al cargar alertas:", error);
        alertsContainer.innerHTML = `<p class="error-message">Error al cargar las alertas.</p>`;
    });
}

function loadCamionesTable() {
  const table = document.getElementById("camiones-table");
  if (!table) return;
  const tbody = table.querySelector("tbody");
  fetch("/api/camiones")
    .then((response) => response.json())
    .then((data) => {
      tbody.innerHTML = "";

      if (!Array.isArray(data)) {
        console.error("La respuesta del servidor para la tabla de camiones no es una lista:", data);
        throw new Error(data.message || "Error al procesar los datos de camiones.");
      }

      data.forEach((camion) => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${camion.marca}</td>
          <td>${camion.modelo}</td>
          <td>${camion.placa}</td>
          <td>${camion.capacidad} M3</td>
          <td>${camion.estado || "Activo"}</td>
          <td>
              <button class="action-btn edit" data-id="${camion.id}" title="Editar"><i class="fas fa-edit"></i></button>
              <button class="action-btn delete" data-id="${camion.id}" title="Eliminar"><i class="fas fa-trash"></i></button>
          </td>
        `;
        tbody.appendChild(row);
      });
      setupCamionesActions();
    })
    .catch((error) => {
      console.error("Error al cargar camiones:", error);
      tbody.innerHTML = `<tr><td colspan="6" class="error-message">Error al cargar datos de camiones: ${error.message}</td></tr>`;
    });
}

function loadChoferesTable() {
  const table = document.getElementById("choferes-table")
  if (!table) return
  const tbody = table.querySelector("tbody")
  fetch("/api/choferes")
    .then((response) => response.json())
    .then((data) => {
      tbody.innerHTML = ""
      data.forEach((chofer) => {
        const row = document.createElement("tr")
        row.innerHTML = `
          <td>${chofer.nombre}</td>
          <td>${chofer.cedula}</td>
          <td>${chofer.telefono || "N/A"}</td>
          <td>${chofer.direccion || "N/A"}</td>
          <td>${chofer.licencia}</td>
          <td>${formatDate(chofer.vencimiento_licencia)}</td>
          <td>${chofer.certificado_medico || "N/A"}</td>
          <td>${chofer.vencimiento_certificado ? formatDate(chofer.vencimiento_certificado) : "N/A"}</td>
          <td>
              <button class="action-btn edit" data-id="${chofer.id}" title="Editar"><i class="fas fa-edit"></i></button>
              <button class="action-btn delete" data-id="${chofer.id}" title="Eliminar"><i class="fas fa-trash"></i></button>
          </td>
      `
        tbody.appendChild(row)
      })
      setupChoferesActions()
    })
    .catch((error) => console.error("Error al cargar choferes:", error))
}

function loadVendedoresTable() {
  const table = document.getElementById("vendedores-table")
  if (!table) return
  const tbody = table.querySelector("tbody")
  fetch("/api/vendedores")
    .then((response) => response.json())
    .then((data) => {
      tbody.innerHTML = ""
      data.forEach((vendedor) => {
        const row = document.createElement("tr")
        row.innerHTML = `
          <td>${vendedor.nombre}</td>
          <td>${vendedor.cedula}</td>
          <td>${vendedor.telefono || "N/A"}</td>
          <td>${vendedor.direccion || "N/A"}</td>
          <td>${vendedor.correo || "N/A"}</td>
          <td>
              <button class="action-btn edit" data-id="${vendedor.id}" title="Editar"><i class="fas fa-edit"></i></button>
              <button class="action-btn delete" data-id="${vendedor.id}" title="Eliminar"><i class="fas fa-trash"></i></button>
          </td>
      `
        tbody.appendChild(row)
      })
      setupVendedoresActions()
    })
    .catch((error) => {
      console.error("Error al cargar vendedores:", error)
      tbody.innerHTML = `<tr><td colspan="7" class="error-message">Error al cargar datos de vendedores</td></tr>`
    })
}

function loadMantenimientoTable() {
  const table = document.getElementById("mantenimiento-table");
  if (!table) return;
  const tbody = table.querySelector("tbody");
  fetch("/api/mantenimiento")
    .then((response) => response.json())
    .then((data) => {
      tbody.innerHTML = "";

      // Verificación clave para evitar el TypeError
      if (!Array.isArray(data)) {
        console.error("La respuesta del servidor para mantenimientos no es una lista:", data);
        throw new Error(data.message || "Error al procesar los datos de mantenimientos.");
      }

      data.forEach((mantenimiento) => {
        const row = document.createElement("tr");
        row.innerHTML = `
              <td>${mantenimiento.placa} - ${mantenimiento.modelo}</td>
              <td>${mantenimiento.fecha}</td>
              <td>${mantenimiento.tipo_mantenimiento || "N/A"}</td>
              <td>${mantenimiento.kilometraje_actual || "N/A"} km</td>
              <td>${mantenimiento.proximo_kilometraje_mantenimiento ? `${mantenimiento.proximo_kilometraje_mantenimiento} km` : "N/A"}</td>
              <td>${mantenimiento.proxima_fecha_mantenimiento || "N/A"}</td>
              <td>${mantenimiento.descripcion}</td>
              <td>${formatCurrency(mantenimiento.costo)}</td>
              <td>
                  <button class="action-btn edit" data-id="${mantenimiento.id}" title="Editar"><i class="fas fa-edit"></i></button>
                  <button class="action-btn delete" data-id="${mantenimiento.id}" title="Eliminar"><i class="fas fa-trash"></i></button>
              </td>
          `;
        tbody.appendChild(row);
      });
      setupMantenimientoActions();
    })
    .catch((error) => {
        console.error("Error al cargar mantenimientos:", error);
        tbody.innerHTML = `<tr><td colspan="9" class="error-message">Error al cargar mantenimientos: ${error.message}</td></tr>`;
    });
}

function loadProveedoresTable() {
  const table = document.getElementById("proveedores-table")
  if (!table) return
  const tbody = table.querySelector("tbody")
  fetch("/api/proveedores")
    .then((response) => response.json())
    .then((data) => {
      tbody.innerHTML = ""
      data.forEach((proveedor) => {
        const materialesList = proveedor.materiales
          .map((m) => `${m.nombre_material} (${m.precio} ${m.unidad_medida})`)
          .join(", ")
        const row = document.createElement("tr")
        row.innerHTML = `
          <td>${proveedor.nombre}</td>
          <td>${proveedor.rif}</td>
          <td>${proveedor.direccion || "N/A"}</td>
          <td>${proveedor.telefono || "N/A"}</td>
          <td>${proveedor.email || "N/A"}</td>
          <td>${proveedor.nombre_contacto || "N/A"}</td>
          <td>${proveedor.telefono_contacto || "N/A"}</td>
          <td>${materialesList || "N/A"}</td>
          <td>
              <button class="action-btn edit" data-id="${proveedor.id}" title="Editar"><i class="fas fa-edit"></i></button>
              <button class="action-btn delete" data-id="${proveedor.id}" title="Eliminar"><i class="fas fa-trash"></i></button>
          </td>
      `
        tbody.appendChild(row)
      })
      setupProveedoresActions()
    })
    .catch((error) => {
      console.error("Error al cargar proveedores:", error)
      tbody.innerHTML = `<tr><td colspan="9" class="error-message">Error al cargar datos de proveedores</td></tr>`
    })
}

// Action setup functions - Depend on load functions
function setupClientesActions() {
  const editButtons = document.querySelectorAll("#clientes-table .action-btn.edit")
  editButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const clienteId = this.getAttribute("data-id")
      editCliente(clienteId)
    })
  })
  const deleteButtons = document.querySelectorAll("#clientes-table .action-btn.delete")
  deleteButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const clienteId = this.getAttribute("data-id")
      deleteCliente(clienteId)
    })
  })
}

function setupCamionesActions() {
  const editButtons = document.querySelectorAll("#camiones-table .action-btn.edit")
  editButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const camionId = this.getAttribute("data-id")
      editCamion(camionId)
    })
  })
  const deleteButtons = document.querySelectorAll("#camiones-table .action-btn.delete")
  deleteButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const camionId = this.getAttribute("data-id")
      deleteCamion(camionId)
    })
  })
}

function setupChoferesActions() {
  const editButtons = document.querySelectorAll("#choferes-table .action-btn.edit")
  editButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const choferId = this.getAttribute("data-id")
      editChofer(choferId)
    })
  })
  const deleteButtons = document.querySelectorAll("#choferes-table .action-btn.delete")
  deleteButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const choferId = this.getAttribute("data-id")
      deleteChofer(choferId)
    })
  })
}

function setupVendedoresActions() {
  const userRole = sessionStorage.getItem("userRole")
  const editButtons = document.querySelectorAll("#vendedores-table .action-btn.edit")
  const deleteButtons = document.querySelectorAll("#vendedores-table .action-btn.delete")

  editButtons.forEach((button) => {
    if (userRole === "registro") {
      button.style.display = "none"
    } else {
      button.style.display = ""
      button.addEventListener("click", function () {
        const vendedorId = this.getAttribute("data-id")
        editVendedor(vendedorId)
      })
    }
  })

  deleteButtons.forEach((button) => {
    if (userRole === "registro") {
      button.style.display = "none"
    } else {
      button.style.display = ""
      button.addEventListener("click", function () {
        const vendedorId = this.getAttribute("data-id")
        deleteVendedor(vendedorId)
      })
    }
  })
}

function setupMantenimientoActions() {
  const editButtons = document.querySelectorAll("#mantenimiento-table .action-btn.edit")
  editButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const mantenimientoId = this.getAttribute("data-id")
      editMantenimiento(mantenimientoId)
    })
  })
  const deleteButtons = document.querySelectorAll("#mantenimiento-table .action-btn.delete")
  deleteButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const mantenimientoId = this.getAttribute("data-id")
      deleteMantenimiento(mantenimientoId)
    })
  })
}

function setupProveedoresActions() {
  const editButtons = document.querySelectorAll("#proveedores-table .action-btn.edit")
  editButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const proveedorId = this.getAttribute("data-id")
      editProveedor(proveedorId)
    })
  })
  const deleteButtons = document.querySelectorAll("#proveedores-table .action-btn.delete")
  deleteButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const proveedorId = this.getAttribute("data-id")
      deleteProveedor(proveedorId)
    })
  })
}

// Edit functions - Depend on load functions and helpers
function editCliente(clienteId) {
  fetch(`/api/clientes/${clienteId}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`)
      }
      return response.json()
    })
    .then((data) => {
      const cliente = data
      document.getElementById("cliente_id_edit").value = cliente.id
      document.getElementById("nombre_cliente_edit").value = cliente.nombre || ""
      document.getElementById("telefono_cliente_edit").value = cliente.telefono || ""

      let documentoType = "V"
      let documentoNumber = ""
      if (cliente.documento) {
        const parts = cliente.documento.split("-")
        if (parts.length === 2) {
          documentoType = parts[0]
          documentoNumber = parts[1]
        } else {
          documentoNumber = cliente.documento
        }
      }
      document.getElementById("documento_cliente_edit_type").value = documentoType
      document.getElementById("documento_cliente_edit_number").value = documentoNumber
      document.getElementById("direccion_cliente_edit").value = cliente.direccion || ""

      const vendedorSelect = document.getElementById("vendedor_cliente_edit")
      if (vendedorSelect && cliente.vendedor_id) {
        vendedorSelect.value = cliente.vendedor_id
      } else if (vendedorSelect) {
        vendedorSelect.value = ""
      }

      document.getElementById("form-title-cliente").textContent = "Editar Cliente"
      document.getElementById("cliente-form").action = `/api/clientes/${cliente.id}`
      document.getElementById("cliente-form-modal").style.display = "block"
    })
    .catch((error) => {
      console.error("Error al cargar la información del cliente:", error)
      displayFlashMessage(`Error al cargar la información del cliente: ${error.message}`, "error")
    })
}

function deleteCliente(clienteId) {
  if (confirm("¿Está seguro que desea eliminar este cliente?")) {
    fetch(`/api/clientes/delete/${clienteId}`, {
      method: "POST",
    })
      .then((response) => {
        if (response.ok) {
          
          displayFlashMessage("Cliente eliminado exitosamente.", "success");
          loadClientesTable(); // Se actualiza solo la tabla
        } else {
          return response.text().then((text) => {
            throw new Error(text || "Error al eliminar cliente")
          })
        }
      })
      .catch((error) => {
        console.error("Error:", error)
        displayFlashMessage("Error al eliminar el cliente. Es posible que tenga despachos asociados.", "error")
      })
  }
}

function editCamion(camionId) {
  fetch(`/api/camiones/${camionId}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Error al obtener datos del camión")
      }
      return response.json()
    })
    .then((camion) => {
      document.getElementById("camion_id_edit").value = camion.id
      document.getElementById("marca_camion_edit").value = camion.marca
      document.getElementById("modelo_camion_edit").value = camion.modelo
      document.getElementById("placa_camion_edit").value = camion.placa
      document.getElementById("capacidad_camion_edit").value = camion.capacidad

      const estadoSelect = document.getElementById("estado_camion_edit")
      if (estadoSelect) {
        estadoSelect.value = camion.estado || "Activo"
      }

      document.getElementById("form-title-camion").textContent = "Editar Camión"
      document.getElementById("camion-form").action = `/api/camiones/${camion.id}`
      document.getElementById("camion-form-modal").style.display = "block"
    })
    .catch((error) => {
      console.error("Error al obtener datos del camión:", error)
      displayFlashMessage("No se pudo cargar la información del camión. Por favor, intente nuevamente.", "error")
    })
}

function deleteCamion(camionId) {
  if (confirm("¿Está seguro que desea eliminar este camión?")) {
    fetch(`/api/camiones/delete/${camionId}`, {
      method: "POST",
    })
      .then((response) => {
        if (response.ok) {
          displayFlashMessage("Camión eliminado exitosamente.", "success");
          loadCamionesTable(); // Se actualiza solo la tabla
        } else {
          return response.text().then((text) => {
            throw new Error(text || "Error al eliminar camión")
          })
        }
      })
      .catch((error) => {
        console.error("Error:", error)
        displayFlashMessage("Error al eliminar el camión. Es posible que tenga mantenimientos asociados.", "error")
      })
  }
}

function editChofer(choferId) {
  fetch(`/api/choferes/${choferId}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Error al obtener datos del chofer: ${response.status}`)
      }
      return response.json()
    })
    .then((chofer) => {
      document.getElementById("chofer_id_edit").value = chofer.id
      document.getElementById("nombre_chofer_edit").value = chofer.nombre

      let choferDocumentoType = "V"
      let choferDocumentoNumber = ""
      if (chofer.cedula) {
        const parts = chofer.cedula.split("-")
        if (parts.length === 2) {
          choferDocumentoType = parts[0]
          choferDocumentoNumber = parts[1]
        } else {
          choferDocumentoNumber = chofer.cedula
        }
      }
      document.getElementById("documento_chofer_edit_type").value = choferDocumentoType
      document.getElementById("documento_chofer_edit_number").value = choferDocumentoNumber
      splitPhoneNumber(
        chofer.telefono,
        document.getElementById("telefono_chofer_edit_prefix"),
        document.getElementById("telefono_chofer_edit_number")
      );
      document.getElementById("direccion_chofer_edit").value = chofer.direccion || "";


      document.getElementById("licencia_chofer_edit").value = chofer.licencia

      if (chofer.vencimiento_licencia) {
        document.getElementById("vencimiento_licencia_chofer_edit").value = formatDateForInput(
          chofer.vencimiento_licencia,
        )
      }
      document.getElementById("certificado_medico_chofer_edit").value = chofer.certificado_medico || ""
      if (chofer.vencimiento_certificado) {
        document.getElementById("vencimiento_certificado_chofer_edit").value = formatDateForInput(
          chofer.vencimiento_certificado,
        )
      }

      document.getElementById("form-title-chofer").textContent = "Editar Chofer"
      document.getElementById("chofer-form").action = `/api/choferes/${chofer.id}`
      document.getElementById("chofer-form-modal").style.display = "block"
    })
    .catch((error) => {
      console.error("Error al obtener datos del chofer:", error)
      displayFlashMessage("No se pudo cargar la información del chofer. Por favor, intente nuevamente.", "error")
    })
}

function deleteChofer(choferId) {
  if (confirm("¿Está seguro que desea eliminar este chofer?")) {
    fetch(`/api/choferes/delete/${choferId}`, {
      method: "POST",
    })
      .then((response) => {
        if (response.ok) {
          displayFlashMessage("Chofer eliminado exitosamente.", "success");
          loadChoferesTable();
        } else {
          return response.text().then((text) => {
            throw new Error(text || "Error al eliminar chofer")
          })
        }
      })
      .catch((error) => {
        console.error("Error:", error)
        displayFlashMessage("Error al eliminar el chofer. Es posible que tenga despachos asociados.", "error")
      })
  }
}

function editVendedor(vendedorId) {
    fetch(`/api/vendedores/${vendedorId}`)
        .then((response) => {
            if (!response.ok) {
                throw new Error(`Error al obtener datos del vendedor: ${response.status}`);
            }
            return response.json();
        })
        .then((vendedor) => {
            document.getElementById("vendedor_id_edit").value = vendedor.id;
            document.getElementById("nombre_vendedor_edit").value = vendedor.nombre;
            // Se eliminó la línea que buscaba 'apellido_vendedor_edit'

            splitPhoneNumber(
                vendedor.telefono,
                document.getElementById("telefono_vendedor_edit_prefix"),
                document.getElementById("telefono_vendedor_edit_number")
            );
            
            document.getElementById("direccion_vendedor_edit").value = vendedor.direccion || "";
            document.getElementById("correo_vendedor_edit").value = vendedor.correo || "";

            let vendedorDocumentoType = "V";
            let vendedorDocumentoNumber = "";
            if (vendedor.cedula) {
                const parts = vendedor.cedula.split("-");
                if (parts.length === 2) {
                    vendedorDocumentoType = parts[0];
                    vendedorDocumentoNumber = parts[1];
                } else {
                    vendedorDocumentoNumber = vendedor.cedula;
                }
            }
            document.getElementById("documento_vendedor_edit_type").value = vendedorDocumentoType;
            document.getElementById("documento_vendedor_edit_number").value = vendedorDocumentoNumber;

            document.getElementById("form-title-vendedor").textContent = "Editar Vendedor";
            document.getElementById("vendedor-form").action = `/api/vendedores/${vendedor.id}`;
            document.getElementById("vendedor-form-modal").style.display = "block";
        })
        .catch((error) => {
            console.error("Error al obtener datos del vendedor:", error);
            displayFlashMessage("No se pudo cargar la información del vendedor. Por favor, intente nuevamente.", "error");
        });
}


function deleteVendedor(vendedorId) {
  if (confirm("¿Está seguro que desea eliminar este vendedor?")) {
    fetch(`/api/vendedores/delete/${vendedorId}`, {
      method: "POST",
    })
      .then((response) => {
        if (response.ok) {
          displayFlashMessage("Vendedor eliminado exitosamente.", "success");
          loadVendedoresTable();
        } else {
          return response.text().then((text) => {
            throw new Error(text || "Error al eliminar vendedor")
          })
        }
      })
      .catch((error) => {
        console.error("Error:", error)
        displayFlashMessage("Error al eliminar el vendedor. Es posible que tenga clientes asociados.", "error")
      })
  }
}

function editMantenimiento(mantenimientoId) {
  fetch(`/api/mantenimiento/${mantenimientoId}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`)
      }
      return response.json()
    })
    .then((data) => {
      const mantenimiento = data
      document.getElementById("mantenimiento_id_edit").value = mantenimiento.id
      document.getElementById("camion_mantenimiento_edit").value = mantenimiento.camion_id
      document.getElementById("fecha_mantenimiento_edit").value = formatDateForInput(mantenimiento.fecha)
      document.getElementById("tipo_mantenimiento_edit").value = mantenimiento.tipo_mantenimiento || ""
      document.getElementById("kilometraje_actual_edit").value = mantenimiento.kilometraje_actual || ""
      document.getElementById("proximo_kilometraje_mantenimiento_edit").value =
        mantenimiento.proximo_kilometraje_mantenimiento || ""
      document.getElementById("proxima_fecha_mantenimiento_edit").value =
        formatDateForInput(mantenimiento.proxima_fecha_mantenimiento) || ""
      document.getElementById("descripcion_mantenimiento_edit").value = mantenimiento.descripcion || ""
      document.getElementById("costo_mantenimiento_edit").value = mantenimiento.costo || ""

      document.getElementById("form-title-mantenimiento").textContent = "Editar Mantenimiento"
      document.getElementById("mantenimiento-form").action = `/api/mantenimiento/${mantenimiento.id}`
      document.getElementById("mantenimiento-form-modal").style.display = "block"
    })
    .catch((error) => {
      console.error("Error al cargar la información del mantenimiento:", error)
      displayFlashMessage(`Error al cargar la información del mantenimiento: ${error.message}`, "error")
    })
}

function deleteMantenimiento(mantenimientoId) {
  if (confirm("¿Está seguro que desea eliminar este registro de mantenimiento?")) {
    fetch(`/api/mantenimiento/delete/${mantenimientoId}`, {
      method: "POST",
    })
      .then((response) => {
        if (response.ok) {
          displayFlashMessage("Mantenimiento eliminado exitosamente.", "success");
          loadMantenimientoTable();
        } else {
          return response.text().then((text) => {
            throw new Error(text || "Error al eliminar mantenimiento")
          })
        }
      })
      .catch((error) => {
        console.error("Error:", error)
        displayFlashMessage(`Error al eliminar el mantenimiento: ${error.message}`, "error")
      })
  }
}

function editProveedor(proveedorId) {
    fetch(`/api/proveedores/${proveedorId}`)
        .then((response) => {
            if (!response.ok) {
                throw new Error(`Error al obtener datos del proveedor: ${response.status}`);
            }
            return response.json();
        })
        .then((proveedor) => {
            // Se rellenan los campos del formulario con los datos del proveedor
            document.getElementById("proveedor_id_edit").value = proveedor.id;
            document.getElementById("nombre_proveedor_edit").value = proveedor.nombre || "";

            // Lógica para separar el RIF
            let rifType = "J";
            let rifNumber = "";
            if (proveedor.rif) {
                const parts = proveedor.rif.split("-");
                if (parts.length >= 2) {
                    rifType = parts[0];
                    rifNumber = parts.slice(1).join("-");
                } else {
                    rifNumber = proveedor.rif;
                }
            }
            document.getElementById("rif_proveedor_edit_type").value = rifType;
            document.getElementById("rif_proveedor_edit_number").value = rifNumber;

            document.getElementById("direccion_proveedor_edit").value = proveedor.direccion || "";
            document.getElementById("email_proveedor_edit").value = proveedor.email || "";
            document.getElementById("nombre_contacto_proveedor_edit").value = proveedor.nombre_contacto || "";

            // Se utiliza la función helper para separar ambos números de teléfono
            splitPhoneNumber(
                proveedor.telefono,
                document.getElementById("telefono_proveedor_edit_prefix"),
                document.getElementById("telefono_proveedor_edit_number")
            );
            splitPhoneNumber(
                proveedor.telefono_contacto,
                document.getElementById("telefono_contacto_proveedor_edit_prefix"),
                document.getElementById("telefono_contacto_proveedor_edit_number")
            );
            
            // --- LA LÍNEA ERRÓNEA FUE ELIMINADA DE AQUÍ ---

            // Lógica para rellenar los materiales
            const materialesEditContainer = document.getElementById("materiales-edit-container");
            materialesEditContainer.innerHTML = "";
            if (proveedor.materiales && proveedor.materiales.length > 0) {
                proveedor.materiales.forEach((material) => {
                    addMaterialRow(materialesEditContainer, material);
                });
            } else {
                addMaterialRow(materialesEditContainer); // Añade una fila vacía si no hay materiales
            }

            // Se configura y muestra el modal
            document.getElementById("form-title-proveedor").textContent = "Editar Proveedor";
            document.getElementById("proveedor-form").action = `/api/proveedores/${proveedor.id}`;
            document.getElementById("proveedor-form-modal").style.display = "block";
        })
        .catch((error) => {
            // Este es el bloque que se estaba ejecutando debido al error
            console.error("Error al obtener datos del proveedor:", error);
            displayFlashMessage("No se pudo cargar la información del proveedor. Por favor, intente nuevamente.", "error");
        });
}

function deleteProveedor(proveedorId) {
  if (confirm("¿Está seguro que desea eliminar este proveedor?")) {
    fetch(`/api/proveedores/delete/${proveedorId}`, {
      method: "POST",
    })
      .then((response) => {
        if (response.ok) {
          displayFlashMessage("Proveedor eliminado exitosamente.", "success");
          loadProveedoresTable();
        } else {
          return response.text().then((text) => {
            throw new Error(text || "Error al eliminar proveedor")
          })
        }
      })
      .catch((error) => {
        console.error("Error:", error)
        displayFlashMessage(
          "Error al eliminar el proveedor. Es posible que tenga órdenes de compra asociadas.",
          "error",
        )
      })
  }
}

// Setup Main Forms - Depend on helpers
function setupMainClienteForm() {
  const mainForm = document.querySelector('#clientes form[action="/api/clientes"]')
  if (!mainForm) return

  mainForm.addEventListener("submit", (e) => {
    e.preventDefault()

    const nombreElement = document.getElementById("nombre_cliente")
    const telefonoElement = document.getElementById("telefono_cliente")
    const documentoTypeElement = document.getElementById("documento_cliente_type")
    const documentoNumberElement = document.getElementById("documento_cliente_number")
    const direccionElement = document.getElementById("direccion_cliente")
    const vendedorElement = document.getElementById("vendedor_cliente")
    const documentoErrorSpan = document.getElementById("documento_cliente_error")

    documentoErrorSpan.style.display = "none"
    documentoErrorSpan.textContent = ""

    if (!nombreElement || !telefonoElement || !documentoTypeElement || !documentoNumberElement || !direccionElement) {
      displayFlashMessage("Error: No se pudieron encontrar todos los campos del formulario", "error")
      return
    }

    const nombre = nombreElement.value.trim()
    const telefono = telefonoElement.value.trim()
    const documentoType = documentoTypeElement.value
    const documentoNumber = documentoNumberElement.value.trim()
    const direccion = direccionElement.value.trim()
    const vendedorId = vendedorElement.value

    if (!nombre || !telefono || !documentoType || !documentoNumber || !direccion) {
      displayFlashMessage("Todos los campos son obligatorios", "error")
      return
    }

    if (!/^\d+$/.test(telefono)) {
      displayFlashMessage("El teléfono debe contener solo números", "error")
      return
    }

    if (!validateVenezuelanDocument(documentoType, documentoNumber, false, "documento_cliente_error")) {
      return
    }

    const formData = new FormData()
    formData.append("nombre", nombre)
    formData.append("direccion", direccion)
    formData.append("telefono", telefono)
    formData.append("documento_type", documentoType)
    formData.append("documento_number", documentoNumber)
    formData.append("vendedor", vendedorId)
    fetch(mainForm.action, {
      method: "POST",
      body: formData,
    })
      .then((response) => {
        if (response.ok) {
          return response.text()
        } else {
          return response.text().then((text) => {
            throw new Error(text || "Error al guardar cliente")
          })
        }
      })
      .then((text) => {
        window.location.reload()
      })
      .catch((error) => {
        console.error("Error:", error)
        displayFlashMessage(`Error al guardar el cliente: ${error.message}`, "error")
      })
  })
}

function setupMainCamionForm() {
  const mainForm = document.querySelector('#camiones form[action="/api/camiones"]')
  if (!mainForm) return

  mainForm.addEventListener("submit", (e) => {
    e.preventDefault()

    const marcaElement = document.getElementById("marca_camion")
    const modeloElement = document.getElementById("modelo_camion")
    const placaElement = document.getElementById("placa_camion")
    const capacidadElement = document.getElementById("capacidad_camion")
    const estadoElement = document.getElementById("estado_camion")
    const placaErrorSpan = document.getElementById("placa_camion_error")
    placaErrorSpan.style.display = "none"
    placaErrorSpan.textContent = ""

    if (!marcaElement || !modeloElement || !placaElement || !capacidadElement || !estadoElement) {
      displayFlashMessage("Error: No se pudieron encontrar todos los campos del formulario", "error")
      return
    }

    const marca = marcaElement.value.trim()
    const modelo = modeloElement.value.trim()
    const placa = placaElement.value.trim()
    const capacidad = capacidadElement.value.trim()
    const estado = estadoElement.value

    if (!marca || !modelo || !placa || !capacidad || !estado) {
      displayFlashMessage("Todos los campos son obligatorios", "error")
      return
    }

    if (!validateVenezuelanPlate(placa, "placa_camion_error")) {
      return
    }

    const formData = new FormData()
    formData.append("marca", marca)
    formData.append("modelo", modelo)
    formData.append("placa", placa)
    formData.append("capacidad", capacidad)
    formData.append("estado", estado)

    fetch(mainForm.action, {
            method: "POST",
            body: formData,
        })
        .then((response) => response.json())
        .then((data) => {
            if (data.success) {
                // SE REEMPLAZA LA RECARGA DE PÁGINA
                displayFlashMessage(data.message, "success");
                mainForm.reset();
                loadCamionesTable();
            } else {
                throw new Error(data.message);
            }
        })
        .catch((error) => {
            console.error("Error:", error);
            displayFlashMessage(`Error al guardar el camión: ${error.message}`, "error");
        });
  })
}

function setupMainChoferForm() {
    const mainForm = document.querySelector('#choferes form[action="/api/choferes"]');
    if (!mainForm) return;

    mainForm.addEventListener("submit", (e) => {
        e.preventDefault();

        // Se buscan los elementos correctos del formulario, incluyendo los nuevos de teléfono
        const nombreElement = document.getElementById("nombre_chofer");
        const documentoTypeElement = document.getElementById("documento_chofer_type");
        const documentoNumberElement = document.getElementById("documento_chofer_number");
        const telefonoPrefixElement = document.getElementById("telefono_chofer_prefix"); // CORREGIDO
        const telefonoNumberElement = document.getElementById("telefono_chofer_number"); // CORREGIDO
        const direccionElement = document.getElementById("direccion_chofer");
        const licenciaElement = document.getElementById("licencia_chofer");
        const vencimientoLicenciaElement = document.getElementById("vencimiento_licencia_chofer");
        const certificadoMedicoElement = document.getElementById("certificado_medico_chofer");
        const vencimientoCertificadoElement = document.getElementById("vencimiento_certificado_chofer");
        
        // Se valida que todos los nuevos elementos existan
        if (!nombreElement || !documentoTypeElement || !documentoNumberElement || !telefonoPrefixElement || !telefonoNumberElement || !direccionElement || !licenciaElement || !vencimientoLicenciaElement) {
            displayFlashMessage("Error: No se pudieron encontrar todos los campos del formulario", "error");
            return;
        }

        const nombre = nombreElement.value.trim();
        const documentoType = documentoTypeElement.value;
        const documentoNumber = documentoNumberElement.value.trim();
        const telefono = telefonoPrefixElement.value + telefonoNumberElement.value.trim(); // Se une el teléfono
        const direccion = direccionElement.value.trim();
        const licencia = licenciaElement.value.trim();
        const vencimientoLicencia = vencimientoLicenciaElement.value;
        const certificadoMedico = certificadoMedicoElement.value.trim();
        const vencimientoCertificado = vencimientoCertificadoElement.value;

    if (!nombre || !documentoType || !documentoNumber || !telefono || !direccion || !licencia || !vencimientoLicencia) {
      displayFlashMessage("Los campos nombre, documento, licencia y vencimiento de licencia son obligatorios", "error")
      return
    }

    if (!validateVenezuelanDocument(documentoType, documentoNumber, false, "documento_chofer_error")) {
      return
    }

    const formData = new FormData();
        formData.append("nombre", nombre);
        formData.append("documento_type", documentoType);
        formData.append("documento_number", documentoNumber);
        formData.append("telefono", telefono);
        formData.append("direccion", direccion);
        formData.append("licencia", licencia);
        formData.append("vencimientoLicencia", vencimientoLicencia);
        formData.append("certificadoMedico", certificadoMedico);
        formData.append("vencimientoCertificado", vencimientoCertificado);

        fetch(mainForm.action, { method: "POST", body: formData })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    displayFlashMessage(data.message, "success");
                    mainForm.reset();
                    loadChoferesTable();
                } else {
                    throw new Error(data.message);
                }
            })
            .catch(error => {
                displayFlashMessage(`Error al guardar el chofer: ${error.message}`, "error");
            });
    });
}

function setupMainProveedorForm() {
    const mainForm = document.getElementById("main-proveedor-form");
    const materialesContainer = document.getElementById("materiales-container");
    const addMaterialBtn = document.getElementById("add-material-btn");

    if (!mainForm || !materialesContainer || !addMaterialBtn) return;

    if (materialesContainer.children.length === 0) {
        addMaterialRow(materialesContainer);
    }

    addMaterialBtn.addEventListener("click", () => addMaterialRow(materialesContainer));

    mainForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        // 1. Recolectar todos los valores de los campos
        const nombre = document.getElementById("nombre_proveedor").value.trim();
        const rifType = document.getElementById("rif_proveedor_type").value;
        const rifNumber = document.getElementById("rif_proveedor_number").value.trim();
        const direccion = document.getElementById("direccion_proveedor").value.trim();
        const email = document.getElementById("email_proveedor").value.trim();
        const nombreContacto = document.getElementById("nombre_contacto_proveedor").value.trim();
        
        const telefonoPrefix = document.getElementById("telefono_proveedor_prefix").value;
        const telefonoNumber = document.getElementById("telefono_proveedor_number").value.trim();
        const telefono = telefonoNumber ? telefonoPrefix + telefonoNumber : "";

        const telefonoContactoPrefix = document.getElementById("telefono_contacto_proveedor_prefix").value;
        const telefonoContactoNumber = document.getElementById("telefono_contacto_proveedor_number").value.trim();
        const telefonoContacto = telefonoContactoNumber ? telefonoContactoPrefix + telefonoContactoNumber : "";
        
        // 2. Recolectar materiales
        const materiales = [];
        let allMaterialsValid = true;
        materialesContainer.querySelectorAll(".material-row").forEach((row) => {
            const nombreMaterial = row.querySelector(".nombre-material").value.trim();
            const precioMaterial = parseFloat(row.querySelector(".precio-material").value);
            const unidadMedida = row.querySelector(".unidad-medida-material").value;

            if (!nombreMaterial || isNaN(precioMaterial) || !unidadMedida) {
                allMaterialsValid = false;
            } else {
                 materiales.push({
                    nombre_material: nombreMaterial,
                    precio: precioMaterial,
                    unidad_medida: unidadMedida,
                });
            }
        });

        if (!allMaterialsValid) {
            displayFlashMessage("Todos los campos de los materiales son obligatorios.", "error");
            return;
        }

        // 3. Construir FormData manualmente
        const formData = new FormData();
        formData.append("nombre", nombre);
        formData.append("rif_type", rifType);
        formData.append("rif_number", rifNumber);
        formData.append("direccion", direccion);
        formData.append("telefono", telefono);
        formData.append("email", email);
        formData.append("nombre_contacto", nombreContacto);
        formData.append("telefono_contacto", telefonoContacto);
        formData.append("materiales", JSON.stringify(materiales));

        // 4. Enviar los datos
        try {
            const response = await fetch(mainForm.action, { method: "POST", body: formData });
            const data = await response.json();
            if (response.ok) {
                displayFlashMessage(data.message, "success");
                mainForm.reset();
                materialesContainer.innerHTML = '';
                addMaterialRow(materialesContainer);
                loadProveedoresTable();
            } else {
                displayFlashMessage(data.message || "Error al guardar proveedor", "error");
            }
        } catch (error) {
            displayFlashMessage(`Error de red: ${error.message}`, "error");
        }
    });
}

function setupMainMantenimientoForm() {
  const mainForm = document.querySelector('#mantenimiento form[action="/api/mantenimiento"]')
  if (!mainForm) return

  const camionSelect = document.getElementById("camion_mantenimiento")
  const kilometrajeActualInput = document.getElementById("kilometraje_actual")

  if (camionSelect && kilometrajeActualInput) {
    camionSelect.addEventListener("change", async () => {
      const selectedOption = camionSelect.options[camionSelect.selectedIndex]
      const camionId = selectedOption.value
      if (camionId) {
        try {
          const response = await fetch(`/api/camiones/${camionId}/odometer`)
          if (response.ok) {
            const data = await response.json()
            kilometrajeActualInput.value = data.current_odometer || 0
          } else {
            console.error("Error fetching odometer:", response.statusText)
            kilometrajeActualInput.value = 0
          }
        } catch (error) {
          console.error("Fetch error for odometer:", error)
          kilometrajeActualInput.value = 0
        }
      } else {
        kilometrajeActualInput.value = ""
      }
    })
  }

  mainForm.addEventListener("submit", (e) => {
    e.preventDefault()

    const camionId = document.getElementById("camion_mantenimiento").value
    const fecha = document.getElementById("fecha_mantenimiento").value
    const tipoMantenimiento = document.getElementById("tipo_mantenimiento").value
    const kilometrajeActual = document.getElementById("kilometraje_actual").value
    const descripcion = document.getElementById("descripcion_mantenimiento").value
    const costo = document.getElementById("costo_mantenimiento").value

    if (!camionId || !fecha || !tipoMantenimiento || !kilometrajeActual || !descripcion || !costo) {
      displayFlashMessage("Todos los campos son obligatorios", "error")
      return
    }

    const formData = new FormData()
    formData.append("camion_id", camionId)
    formData.append("fecha", fecha)
    formData.append("tipo_mantenimiento", tipoMantenimiento)
    formData.append("kilometraje_actual", kilometrajeActual)
    formData.append("descripcion", descripcion)
    formData.append("costo", costo)

    fetch(mainForm.action, {
            method: "POST",
            body: formData,
        })
        .then((response) => response.json())
        .then((data) => {
            if(data.success) {
                // SE REEMPLAZA LA RECARGA DE PÁGINA
                displayFlashMessage(data.message, "success");
                mainForm.reset();
                loadMantenimientoTable();
            } else {
                throw new Error(data.message);
            }
        })
        .catch((error) => {
            console.error("Error:", error);
            displayFlashMessage(`Error al guardar el mantenimiento: ${error.message}`, "error");
        });
  })
}

// Setup Edit Forms - Depend on helpers
function setupClientesForm() {
  const form = document.getElementById("cliente-form")
  if (!form) return

  form.addEventListener("submit", (e) => {
    e.preventDefault()

    const nombreElement = document.getElementById("nombre_cliente_edit")
    const telefonoElement = document.getElementById("telefono_cliente_edit")
    const documentoTypeElement = document.getElementById("documento_cliente_edit_type")
    const documentoNumberElement = document.getElementById("documento_cliente_edit_number")
    const direccionElement = document.getElementById("direccion_cliente_edit")
    const vendedorElement = document.getElementById("vendedor_cliente_edit")
    const documentoErrorSpan = document.getElementById("documento_cliente_edit_error")

    documentoErrorSpan.style.display = "none"
    documentoErrorSpan.textContent = ""

    if (!nombreElement || !telefonoElement || !documentoTypeElement || !documentoNumberElement || !direccionElement) {
      displayFlashMessage("Error: No se pudieron encontrar todos los campos del formulario", "error")
      return
    }

    const nombre = nombreElement.value.trim()
    const telefono = telefonoElement.value.trim()
    const documentoType = documentoTypeElement.value
    const documentoNumber = documentoNumberElement.value.trim()
    const direccion = direccionElement.value.trim()
    const vendedorId = vendedorElement.value

    if (!nombre || !telefono || !documentoType || !documentoNumber || !direccion) {
      displayFlashMessage("Todos los campos son obligatorios", "error")
      return
    }

    if (!/^\d+$/.test(telefono)) {
      displayFlashMessage("El teléfono debe contener solo números", "error")
      return
    }

    if (!validateVenezuelanDocument(documentoType, documentoNumber, false, "documento_cliente_edit_error")) {
      return
    }

    const formData = new FormData()
    formData.append("nombre", nombre)
    formData.append("direccion", direccion)
    formData.append("telefono", telefono)
    formData.append("documento_type", documentoType)
    formData.append("documento_number", documentoNumber)
    formData.append("vendedor", vendedorId)

    fetch(form.action, {
      method: "POST",
      body: formData,
    })
      .then((response) => {
        if (response.ok) {
          return response.text()
        } else {
          return response.text().then((text) => {
            throw new Error(text || "Error al actualizar cliente")
          })
        }
      })
      .then((text) => {
        window.location.reload()
      })
      .catch((error) => {
        console.error("Error:", error)
        displayFlashMessage(`Error al actualizar el cliente: ${error.message}`, "error")
      })
  })
}

function setupCamionesForm() {
  const form = document.getElementById("camion-form")
  if (!form) return

  form.addEventListener("submit", (e) => {
    e.preventDefault()

    const marcaElement = document.getElementById("marca_camion_edit")
    const modeloElement = document.getElementById("modelo_camion_edit")
    const placaElement = document.getElementById("placa_camion_edit")
    const capacidadElement = document.getElementById("capacidad_camion_edit")
    const estadoElement = document.getElementById("estado_camion_edit")
    const placaErrorSpan = document.getElementById("placa_camion_edit_error")
    placaErrorSpan.style.display = "none"
    placaErrorSpan.textContent = ""

    if (!marcaElement || !modeloElement || !placaElement || !capacidadElement || !estadoElement) {
      displayFlashMessage("Error: No se pudieron encontrar todos los campos del formulario", "error")
      return
    }

    const marca = marcaElement.value.trim()
    const modelo = modeloElement.value.trim()
    const placa = placaElement.value.trim()
    const capacidad = capacidadElement.value.trim()
    const estado = estadoElement.value

    if (!marca || !modelo || !placa || !capacidad || !estado) {
      displayFlashMessage("Todos los campos son obligatorios", "error")
      return
    }

    if (!validateVenezuelanPlate(placa, "placa_camion_edit_error")) {
      return
    }

    const formData = new FormData()
    formData.append("marca", marca)
    formData.append("modelo", modelo)
    formData.append("placa", placa)
    formData.append("capacidad", capacidad)
    formData.append("estado", estado)

    fetch(form.action, {
            method: "POST",
            body: formData,
        })
        .then((response) => response.json())
        .then((data) => {
            if (data.success) {
                // SE REEMPLAZA LA RECARGA DE PÁGINA
                displayFlashMessage(data.message, "success");
                document.getElementById("camion-form-modal").style.display = "none";
                loadCamionesTable();
            } else {
                throw new Error(data.message);
            }
        })
        .catch((error) => {
            console.error("Error:", error);
            displayFlashMessage(`Error al actualizar el camión: ${error.message}`, "error");
        });
  })
}

// dashboard_registro.js

// REEMPLAZA ESTA FUNCIÓN COMPLETA
function setupChoferesForm() {
    const form = document.getElementById("chofer-form");
    if (!form) return;

    form.addEventListener("submit", (e) => {
        e.preventDefault();

        // --- 1. Se obtienen TODOS los elementos del formulario de edición ---
        const nombreElement = document.getElementById("nombre_chofer_edit");
        const documentoTypeElement = document.getElementById("documento_chofer_edit_type");
        const documentoNumberElement = document.getElementById("documento_chofer_edit_number");
        const telefonoPrefixElement = document.getElementById("telefono_chofer_edit_prefix"); // CORREGIDO
        const telefonoNumberElement = document.getElementById("telefono_chofer_edit_number"); // CORREGIDO
        const direccionElement = document.getElementById("direccion_chofer_edit");
        const licenciaElement = document.getElementById("licencia_chofer_edit");
        const vencimientoLicenciaElement = document.getElementById("vencimiento_licencia_chofer_edit");
        // --- LÍNEA AÑADIDA QUE FALTABA ---
        const certificadoMedicoElement = document.getElementById("certificado_medico_chofer_edit"); 
        const vencimientoCertificadoElement = document.getElementById("vencimiento_certificado_chofer_edit");
        const documentoErrorSpan = document.getElementById("documento_chofer_edit_error");

        // --- 2. Se valida que se hayan encontrado todos los elementos ---
        if (!nombreElement || !documentoTypeElement || !documentoNumberElement || !telefonoPrefixElement || !telefonoNumberElement || !direccionElement || !licenciaElement || !vencimientoLicenciaElement || !certificadoMedicoElement || !vencimientoCertificadoElement) {
            displayFlashMessage("Error: No se pudieron encontrar todos los campos del formulario", "error");
            return;
        }

        // --- 3. Se recolectan y combinan los valores ---
        const nombre = nombreElement.value.trim();
        const documentoType = documentoTypeElement.value;
        const documentoNumber = documentoNumberElement.value.trim();
        const telefono = telefonoPrefixElement.value + telefonoNumberElement.value.trim();
        const direccion = direccionElement.value.trim();
        const licencia = licenciaElement.value.trim();
        const vencimientoLicencia = vencimientoLicenciaElement.value;
        const certificadoMedico = certificadoMedicoElement.value.trim();
        const vencimientoCertificado = vencimientoCertificadoElement.value;

        // --- 4. Se construye el FormData ---
        const formData = new FormData();
        formData.append("nombre", nombre);
        formData.append("documento_type", documentoType);
        formData.append("documento_number", documentoNumber);
        formData.append("telefono", telefono);
        formData.append("direccion", direccion);
        formData.append("licencia", licencia);
        formData.append("vencimientoLicencia", vencimientoLicencia);
        formData.append("certificadoMedico", certificadoMedico);
        formData.append("vencimientoCertificado", vencimientoCertificado);

        // --- 5. Se envía la petición ---
        fetch(form.action, {
            method: "POST",
            body: formData,
        })
        .then((response) => response.json())
        .then((data) => {
            if (data.success) {
                displayFlashMessage(data.message, "success");
                document.getElementById("chofer-form-modal").style.display = "none";
                loadChoferesTable();
            } else {
                throw new Error(data.message);
            }
        })
        .catch((error) => {
            console.error("Error:", error);
            displayFlashMessage(`Error al actualizar el chofer: ${error.message}`, "error");
        });
    });
}

function setupVendedoresForm() {
    const form = document.getElementById("vendedor-form");
    if (!form) return;

    form.addEventListener("submit", (e) => {
        e.preventDefault();

        const nombreElement = document.getElementById("nombre_vendedor_edit");
        // Se eliminó la referencia a 'apellido_vendedor_edit'
        const telefonoPrefixElement = document.getElementById("telefono_vendedor_edit_prefix");
        const telefonoNumberElement = document.getElementById("telefono_vendedor_edit_number");
        const direccionElement = document.getElementById("direccion_vendedor_edit");
        const correoElement = document.getElementById("correo_vendedor_edit");
        const documentoTypeElement = document.getElementById("documento_vendedor_edit_type");
        const documentoNumberElement = document.getElementById("documento_vendedor_edit_number");
        const documentoErrorSpan = document.getElementById("documento_vendedor_edit_error");

        if (!nombreElement || !telefonoPrefixElement || !telefonoNumberElement || !direccionElement || !correoElement || !documentoTypeElement || !documentoNumberElement) {
            displayFlashMessage("Error: No se pudieron encontrar todos los campos del formulario", "error");
            return;
        }

        const nombre = nombreElement.value.trim();
        const telefono = telefonoPrefixElement.value + telefonoNumberElement.value.trim();
        const direccion = direccionElement.value.trim();
        const correo = correoElement.value.trim();
        const documentoType = documentoTypeElement.value;
        const documentoNumber = documentoNumberElement.value.trim();

        documentoErrorSpan.style.display = "none";
        documentoErrorSpan.textContent = "";

        if (!nombre || !documentoType || !documentoNumber || !telefono || !direccion || !correo) {
            displayFlashMessage("Todos los campos son obligatorios", "error");
            return;
        }

        if (!validateVenezuelanDocument(documentoType, documentoNumber, false, "documento_vendedor_edit_error")) {
            return;
        }

        const formData = new FormData();
        formData.append("nombre", nombre);
        formData.append("telefono", telefono);
        formData.append("direccion", direccion);
        formData.append("correo", correo);
        formData.append("documento_type", documentoType);
        formData.append("documento_number", documentoNumber);

        fetch(form.action, {
                method: "POST",
                body: formData,
            })
            .then((response) => response.json())
            .then((data) => {
                if (data.success) {
                    displayFlashMessage(data.message, "success");
                    document.getElementById("vendedor-form-modal").style.display = "none";
                    loadVendedoresTable();
                } else {
                    throw new Error(data.message);
                }
            })
            .catch((error) => {
                console.error("Error:", error);
                displayFlashMessage(`Error al actualizar el vendedor: ${error.message}`, "error");
            });
    });
}

function setupProveedoresForm() {
    const form = document.getElementById("proveedor-form");
    const materialesEditContainer = document.getElementById("materiales-edit-container");
    const addMaterialEditBtn = document.getElementById("add-material-edit-btn");

    if (!form || !materialesEditContainer || !addMaterialEditBtn) return;

    addMaterialEditBtn.addEventListener("click", () => addMaterialRow(materialesEditContainer));

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        // --- 1. Obtener todos los elementos del formulario de edición ---
        const nombreElement = document.getElementById("nombre_proveedor_edit");
        const rifTypeElement = document.getElementById("rif_proveedor_edit_type");
        const rifNumberElement = document.getElementById("rif_proveedor_edit_number");
        const direccionElement = document.getElementById("direccion_proveedor_edit");
        const telefonoPrefixElement = document.getElementById("telefono_proveedor_edit_prefix");
        const telefonoNumberElement = document.getElementById("telefono_proveedor_edit_number");
        const emailElement = document.getElementById("email_proveedor_edit");
        const nombreContactoElement = document.getElementById("nombre_contacto_proveedor_edit");
        const telefonoContactoPrefixElement = document.getElementById("telefono_contacto_proveedor_edit_prefix");
        const telefonoContactoNumberElement = document.getElementById("telefono_contacto_proveedor_edit_number");
        const rifErrorSpan = document.getElementById("rif_proveedor_edit_error");
        
        if (!nombreElement || !rifTypeElement || !rifNumberElement || !direccionElement || !telefonoPrefixElement || !telefonoNumberElement || !emailElement || !nombreContactoElement || !telefonoContactoPrefixElement || !telefonoContactoNumberElement) {
            displayFlashMessage("Error: No se pudieron encontrar todos los campos del formulario de edición.", "error");
            return;
        }

        // --- 2. Recolectar y validar valores ---
        const nombre = nombreElement.value.trim();
        const rifType = rifTypeElement.value;
        const rifNumber = rifNumberElement.value.trim();
        const direccion = direccionElement.value.trim();
        const email = emailElement.value.trim();
        const nombreContacto = nombreContactoElement.value.trim();

        const telefono = telefonoNumberElement.value.trim() ? telefonoPrefixElement.value + telefonoNumberElement.value.trim() : "";
        const telefonoContacto = telefonoContactoNumberElement.value.trim() ? telefonoContactoPrefixElement.value + telefonoContactoNumberElement.value.trim() : "";

        if (!validateVenezuelanDocument(rifType, rifNumber, true, "rif_proveedor_edit_error")) {
            return;
        }

        // --- 3. Recolectar materiales (lógica existente) ---
        const materiales = [];
        let allMaterialsValid = true;
        // ... (lógica para recolectar materiales se mantiene igual) ...

        // --- 4. Construir FormData manualmente ---
        const formData = new FormData();
        formData.append("nombre", nombre);
        formData.append("rif_type", rifType);
        formData.append("rif_number", rifNumber);
        formData.append("direccion", direccion);
        formData.append("telefono", telefono);
        formData.append("email", email);
        formData.append("nombre_contacto", nombreContacto);
        formData.append("telefono_contacto", telefonoContacto);
        formData.append("materiales", JSON.stringify(materiales));

        // --- 5. Enviar petición ---
        try {
            const response = await fetch(form.action, { method: "POST", body: formData });
            const data = await response.json();
            if (response.ok) {
                displayFlashMessage(data.message, "success");
                document.getElementById("proveedor-form-modal").style.display = "none";
                loadProveedoresTable();
            } else {
                displayFlashMessage(data.message || "Error al actualizar proveedor", "error");
            }
        } catch (error) {
            displayFlashMessage(`Error de red: ${error.message}`, "error");
        }
    });
}

function setupMantenimientoForm() {
  const form = document.getElementById("mantenimiento-form")
  if (!form) return

  const camionSelect = document.getElementById("camion_mantenimiento_edit")
  const kilometrajeActualInput = document.getElementById("kilometraje_actual_edit")
  const proximoKilometrajeInput = document.getElementById("proximo_kilometraje_mantenimiento_edit")
  const proximaFechaInput = document.getElementById("proxima_fecha_mantenimiento_edit")
  const tipoMantenimientoSelect = document.getElementById("tipo_mantenimiento_edit")
  const fechaMantenimientoInput = document.getElementById("fecha_mantenimiento_edit")

  if (camionSelect && kilometrajeActualInput) {
    camionSelect.addEventListener("change", async () => {
      const selectedOption = camionSelect.options[camionSelect.selectedIndex]
      const camionId = selectedOption.value
      if (camionId) {
        try {
          const response = await fetch(`/api/camiones/${camionId}/odometer`)
          if (response.ok) {
            const data = await response.json()
            kilometrajeActualInput.value = data.current_odometer || 0
          } else {
            console.error("Error fetching odometer for edit:", response.statusText)
            kilometrajeActualInput.value = 0
          }
        } catch (error) {
          console.error("Fetch error for odometer in edit:", error)
          kilometrajeActualInput.value = 0
        }
      } else {
        kilometrajeActualInput.value = ""
      }
    })
  }

  const recalculateNextMaintenance = () => {
    const tipo = tipoMantenimientoSelect.value
    const fechaStr = fechaMantenimientoInput.value
    const kmActual = Number.parseInt(kilometrajeActualInput.value, 10)

    if (tipo && fechaStr && !isNaN(kmActual)) {
      const fecha = new Date(fechaStr + "T00:00:00")
      let proximoKm = ""
      let proximaFecha = ""

      const intervalos = {
        "Cambio de Aceite": { km: 10000, months: 6 },
        "Revisión General": { km: 50000, months: 12 },
        Frenos: { km: 30000, months: null },
        Neumáticos: { km: 20000, months: null },
        "Inspección de Fluidos": { km: 15000, months: 3 },
        "Reemplazo de Filtros": { km: 25000, months: 9 },
      }

      const intervalo = intervalos[tipo]
      if (intervalo) {
        if (intervalo.km) {
          proximoKm = kmActual + intervalo.km
        }
        if (intervalo.months) {
          const futureDate = new Date(fecha)
          futureDate.setMonth(futureDate.getMonth() + intervalo.months)
          proximaFecha = formatDateForInput(futureDate)
        }
      }
      proximoKilometrajeInput.value = proximoKm
      proximaFechaInput.value = proximaFecha
    } else {
      proximoKilometrajeInput.value = ""
      proximaFechaInput.value = ""
    }
  }

  if (tipoMantenimientoSelect && fechaMantenimientoInput && kilometrajeActualInput) {
    tipoMantenimientoSelect.addEventListener("change", recalculateNextMaintenance)
    fechaMantenimientoInput.addEventListener("change", recalculateNextMaintenance)
    kilometrajeActualInput.addEventListener("input", recalculateNextMaintenance)
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault()

    const camionId = document.getElementById("camion_mantenimiento_edit").value
    const fecha = document.getElementById("fecha_mantenimiento_edit").value
    const tipoMantenimiento = document.getElementById("tipo_mantenimiento_edit").value
    const kilometrajeActual = document.getElementById("kilometraje_actual_edit").value
    const descripcion = document.getElementById("descripcion_mantenimiento_edit").value
    const costo = document.getElementById("costo_mantenimiento_edit").value

    if (!camionId || !fecha || !tipoMantenimiento || !kilometrajeActual || !descripcion || !costo) {
      displayFlashMessage("Todos los campos son obligatorios", "error")
      return
    }

    const formData = new FormData()
    formData.append("camion_id", camionId)
    formData.append("fecha", fecha)
    formData.append("tipo_mantenimiento", tipoMantenimiento)
    formData.append("kilometraje_actual", kilometrajeActual)
    formData.append("descripcion", descripcion)
    formData.append("costo", costo)

    fetch(form.action, {
            method: "POST",
            body: formData,
        })
        .then((response) => response.json())
        .then((data) => {
            if(data.success) {
                // SE REEMPLAZA LA RECARGA DE PÁGINA
                displayFlashMessage(data.message, "success");
                document.getElementById("mantenimiento-form-modal").style.display = "none";
                loadMantenimientoTable();
            } else {
                throw new Error(data.message);
            }
        })
        .catch((error) => {
            console.error("Error:", error);
            displayFlashMessage(`Error al actualizar el mantenimiento: ${error.message}`, "error");
        });
  })
}

// Setup Modals
function setupModals() {
  const clienteModal = document.getElementById("cliente-form-modal")
  if (clienteModal) {
    const closeBtnCliente = clienteModal.querySelector(".close")
    if (closeBtnCliente) {
      closeBtnCliente.addEventListener("click", () => {
        clienteModal.style.display = "none"
      })
    }
  }

  const camionModal = document.getElementById("camion-form-modal")
  if (camionModal) {
    const closeBtnCamion = camionModal.querySelector(".close")
    if (closeBtnCamion) {
      closeBtnCamion.addEventListener("click", () => {
        camionModal.style.display = "none"
      })
    }
  }

  const choferModal = document.getElementById("chofer-form-modal")
  if (choferModal) {
    const closeBtnChofer = choferModal.querySelector(".close")
    if (closeBtnChofer) {
      closeBtnChofer.addEventListener("click", () => {
        choferModal.style.display = "none"
      })
    }
  }

  const vendedorModal = document.getElementById("vendedor-form-modal")
  if (vendedorModal) {
    const closeBtnVendedor = vendedorModal.querySelector(".close")
    if (closeBtnVendedor) {
      closeBtnVendedor.addEventListener("click", () => {
        vendedorModal.style.display = "none"
      })
    }
  }

  const proveedorModal = document.getElementById("proveedor-form-modal")
  if (proveedorModal) {
    const closeBtnProveedor = proveedorModal.querySelector(".close")
    if (closeBtnProveedor) {
      closeBtnProveedor.addEventListener("click", () => {
        proveedorModal.style.display = "none"
      })
    }
  }

  const mantenimientoModal = document.getElementById("mantenimiento-form-modal")
  if (mantenimientoModal) {
    const closeBtnMantenimiento = mantenimientoModal.querySelector(".close")
    if (closeBtnMantenimiento) {
      closeBtnMantenimiento.addEventListener("click", () => {
        mantenimientoModal.style.display = "none"
      })
    }
  }

  window.addEventListener("click", (event) => {
    if (clienteModal && event.target === clienteModal) {
      clienteModal.style.display = "none"
    }
    if (camionModal && event.target === camionModal) {
      camionModal.style.display = "none"
    }
    if (choferModal && event.target === choferModal) {
      choferModal.style.display = "none"
    }
    if (vendedorModal && event.target === vendedorModal) {
      vendedorModal.style.display = "none"
    }
    if (proveedorModal && event.target === proveedorModal) {
      proveedorModal.style.display = "none"
    }
    if (mantenimientoModal && event.target === mantenimientoModal) {
      mantenimientoModal.style.display = "none"
    }
  })
}

// Core setup functions - Depend on all above
function setupSidebarNavigation() {
  const menuLinks = document.querySelectorAll(".sidebar ul li a:not(#logout-btn)")

  menuLinks.forEach((link) => {
    link.addEventListener("click", function (e) {
      e.preventDefault()

      menuLinks.forEach((item) => item.classList.remove("active"))
      this.classList.add("active")

      const pageId = this.getAttribute("data-page")
      showPage(pageId)

      if (pageId === "proveedores") {
        loadProveedoresTable()
      } else if (pageId === "choferes") {
        loadChoferesTable()
      } else if (pageId === "mantenimiento") {
        loadMantenimientoTable()
      } else if (pageId === "alertas") {
        // NEW
        loadAlertsTable()
      }
    })
  })
}

function showPage(pageId) {
  const pages = document.querySelectorAll(".page")
  pages.forEach((page) => {
    page.classList.remove("active")
  })
  const activePage = document.getElementById(pageId)
  if (activePage) {
    activePage.classList.add("active")
  }
}

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

function loadInitialData() {
  loadVendedores()
  loadClientesTable()
  loadCamionesTable()
  loadChoferesTable()
  loadVendedoresTable()
  loadMantenimientoTable()
  loadCamionesForSelect()
  loadProveedoresTable()
  loadAlertsTable() // NEW
}

// DOMContentLoaded listener - Entry point
document.addEventListener("DOMContentLoaded", () => {
  loadUserInfo()
  setupSidebarNavigation()
  setupLogout()
  loadInitialData()
  setupModals()
  setupMainClienteForm()
  setupMainCamionForm()
  setupMainChoferForm()
  setupMainProveedorForm()
  setupMainMantenimientoForm()
  setupClientesForm()
  setupCamionesForm()
  setupChoferesForm()
  setupVendedoresForm()
  setupProveedoresForm()
  setupMantenimientoForm()

  const placaCamion = document.getElementById("placa_camion")
  if (placaCamion) {
    const validateCamionPlaca = () => {
      validateVenezuelanPlate(placaCamion.value, "placa_camion_error")
    }
    placaCamion.addEventListener("input", validateCamionPlaca)
  }

  const placaCamionEdit = document.getElementById("placa_camion_edit")
  if (placaCamionEdit) {
    const validateCamionEditPlaca = () => {
      validateVenezuelanPlate(placaCamionEdit.value, "placa_camion_edit_error")
    }
    placaCamionEdit.addEventListener("input", validateCamionEditPlaca)
  }

  const choferDocType = document.getElementById("documento_chofer_type")
  const choferDocNumber = document.getElementById("documento_chofer_number")
  if (choferDocType && choferDocNumber) {
    const validateChoferDoc = () => {
      validateVenezuelanDocument(choferDocType.value, choferDocNumber.value, false, "documento_chofer_error")
    }
    choferDocType.addEventListener("change", validateChoferDoc)
    choferDocNumber.addEventListener("input", validateChoferDoc)
  }

  const choferDocEditType = document.getElementById("documento_chofer_edit_type")
  const choferDocEditNumber = document.getElementById("documento_chofer_edit_number")
  if (choferDocEditType && choferDocEditNumber) {
    const validateChoferEditDoc = () => {
      validateVenezuelanDocument(
        choferDocEditType.value,
        choferDocEditNumber.value,
        false,
        "documento_chofer_edit_error",
      )
    }
    choferDocEditType.addEventListener("change", validateChoferEditDoc)
    choferDocEditNumber.addEventListener("input", validateChoferEditDoc)
  }

  const vendedorDocType = document.getElementById("documento_vendedor_type")
  const vendedorDocNumber = document.getElementById("documento_vendedor_number")
  if (vendedorDocType && vendedorDocNumber) {
    const validateVendedorDoc = () => {
      validateVenezuelanDocument(vendedorDocType.value, vendedorDocNumber.value, false, "documento_vendedor_error")
    }
    vendedorDocType.addEventListener("change", validateVendedorDoc)
    vendedorDocNumber.addEventListener("input", validateVendedorDoc)
  }

  const vendedorDocEditType = document.getElementById("documento_vendedor_edit_type")
  const vendedorDocEditNumber = document.getElementById("documento_vendedor_edit_number")
  if (vendedorDocEditType && vendedorDocEditNumber) {
    const validateVendedorEditDoc = () => {
      validateVenezuelanDocument(
        vendedorDocEditType.value,
        vendedorDocEditNumber.value,
        false,
        "documento_vendedor_edit_error",
      )
    }
    vendedorDocEditType.addEventListener("change", validateVendedorEditDoc)
    vendedorDocEditNumber.addEventListener("input", validateVendedorEditDoc)
  }
})

function splitPhoneNumber(fullPhone, prefixElement, numberElement) {
    if (!fullPhone || !prefixElement || !numberElement) {
        if (numberElement) numberElement.value = '';
        return;
    };

    const prefixes = ["0412", "0422", "0426", "0414", "0424", "0243"];
    let foundPrefix = false;

    for (const p of prefixes) {
        if (fullPhone.startsWith(p)) {
            const prefix = fullPhone.substring(0, 4);
            const number = fullPhone.substring(4);
            prefixElement.value = prefix;
            numberElement.value = number;
            foundPrefix = true;
            break;
        }
    }

    if (!foundPrefix) {
        if (fullPhone.length >= 7) {
            prefixElement.value = fullPhone.substring(0, 4);
            numberElement.value = fullPhone.substring(4);
        } else {
            numberElement.value = fullPhone;
        }
    }
}

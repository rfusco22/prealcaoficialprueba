export function formatDate(dateString) {
  if (!dateString) return "N/A"
  const date = new Date(dateString)
  return date.toLocaleDateString("es-ES")
}

export function formatCurrency(value) {
  return new Intl.NumberFormat("es-VE", {
    style: "currency",
    currency: "VES",
  }).format(value)
}

export function displayFlashMessage(message, category) {
  const flashMessagesDiv = document.getElementById("flash-messages")
  if (flashMessagesDiv) {
    flashMessagesDiv.innerHTML = `<div class="alert alert-${category}">${message}</div>`
    setTimeout(() => {
      flashMessagesDiv.innerHTML = ""
    }, 5000)
  }
}

export function parseNumericInput(inputString) {
  if (typeof inputString !== "string") {
    return Number.parseFloat(inputString) || 0
  }
  let cleanedString = inputString.replace(/[^\d.,]/g, "")
  cleanedString = cleanedString.replace(/\./g, "")
  cleanedString = cleanedString.replace(/,/g, ".")
  return Number.parseFloat(cleanedString) || 0
}

export function convertNumberToWords(num) {
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

  const [integerPart, decimalPart] = num.toFixed(2).split(".")
  let result = ""
  let n = Number.parseInt(integerPart, 10)

  if (n === 1000000) {
    result = "un millón"
  } else if (n > 1000000) {
    const millions = Math.floor(n / 1000000)
    result += convertGroup(millions) + " millones "
    n %= 1000000
  }

  if (n > 1000) {
    const thousands = Math.floor(n / 1000)
    if (thousands === 1) {
      result += "mil "
    } else {
      result += convertGroup(thousands) + " mil "
    }
    n %= 1000
  }

  if (n > 0) {
    result += convertGroup(n)
  }

  result = result.trim()

  if (decimalPart && Number.parseInt(decimalPart, 10) > 0) {
    result += ` con ${decimalPart}/100`
  }

  return result.charAt(0).toUpperCase() + result.slice(1)
}

export function showModal(modalId) {
  const modal = document.getElementById(modalId)
  if (modal) {
    modal.style.display = "block"
    modal.classList.add("show")
  }
}

export function closeModal(modalId) {
  const modal = document.getElementById(modalId)
  if (modal) {
    modal.classList.remove("show")
    setTimeout(() => {
      modal.style.display = "none"
    }, 300) // Match CSS transition duration
  }
}

export function setupModalCloseListeners(modalId) {
  const modal = document.getElementById(modalId)
  if (modal) {
    const closeButton = modal.querySelector(".close")
    if (closeButton) {
      closeButton.onclick = () => closeModal(modalId)
    }
    window.onclick = (event) => {
      if (event.target === modal) {
        closeModal(modalId)
      }
    }
  }
}

export function showPage(pageId) {
  document.querySelectorAll(".page").forEach((page) => {
    page.classList.remove("active")
  })
  document.getElementById(pageId).classList.add("active")

  document.querySelectorAll(".sidebar nav ul li a").forEach((link) => {
    link.classList.remove("active")
  })
  document.querySelector(`.sidebar nav ul li a[data-page="${pageId}"]`).classList.add("active")
}

export async function fetchData(url, method = "GET", data = null, isFormData = false) {
  const options = {
    method: method,
    headers: {},
  }

  if (data) {
    if (isFormData) {
      options.body = data // FormData object
    } else {
      options.headers["Content-Type"] = "application/json"
      options.body = JSON.stringify(data)
    }
  }

  try {
    const response = await fetch(url, options)
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
    }
    return await response.json()
  } catch (error) {
    console.error("Fetch error:", error)
    displayFlashMessage(error.message || "Error de red o del servidor.", "error")
    throw error
  }
}

export function populateSelect(selectElementId, data, valueKey, textKey, defaultOptionText = "Seleccione...") {
  const select = document.getElementById(selectElementId)
  if (!select) {
    console.warn(`Select element with ID '${selectElementId}' not found.`)
    return
  }
  select.innerHTML = `<option value="">${defaultOptionText}</option>`
  data.forEach((item) => {
    const option = document.createElement("option")
    option.value = item[valueKey]
    option.textContent = item[textKey]
    select.appendChild(option)
  })
}

export function populateTable(tableId, data, columns, actions = {}) {
  const tableBody = document.querySelector(`#${tableId} tbody`)
  if (!tableBody) {
    console.warn(`Table body with ID '${tableId}' not found.`)
    return
  }
  tableBody.innerHTML = ""

  if (!data || data.length === 0) {
    const row = tableBody.insertRow()
    const cell = row.insertCell()
    cell.colSpan = columns.length + (Object.keys(actions).length > 0 ? 1 : 0)
    cell.textContent = "No hay registros para mostrar."
    cell.style.textAlign = "center"
    return
  }

  data.forEach((item) => {
    const row = tableBody.insertRow()
    columns.forEach((col) => {
      const cell = row.insertCell()
      let value = item[col.dataKey]
      if (col.format) {
        value = col.format(value, item)
      }
      cell.textContent = value
      if (col.className) {
        cell.classList.add(col.className)
      }
    })

    if (Object.keys(actions).length > 0) {
      const actionsCell = row.insertCell()
      actionsCell.classList.add("actions-cell")
      for (const actionName in actions) {
        const button = document.createElement("button")
        button.textContent = actions[actionName].text
        button.classList.add("btn-action", `btn-${actionName}`)
        button.onclick = () => actions[actionName].onClick(item.id, item)
        actionsCell.appendChild(button)
      }
    }
  })
}

export function getFormData(formId) {
  const form = document.getElementById(formId)
  if (!form) {
    console.error(`Form with ID '${formId}' not found.`)
    return null
  }
  return new FormData(form)
}

export function getJsonData(formId) {
  const form = document.getElementById(formId)
  if (!form) {
    console.error(`Form with ID '${formId}' not found.`)
    return null
  }
  const formData = new FormData(form)
  const data = {}
  for (const [key, value] of formData.entries()) {
    data[key] = value
  }
  return data
}

export function clearForm(formId) {
  const form = document.getElementById(formId)
  if (form) {
    form.reset()
    const hiddenIdInput = form.querySelector('input[type="hidden"][name="id"]')
    if (hiddenIdInput) {
      hiddenIdInput.value = ""
    }
    // Clear file input preview if any
    const photoPreview = form.querySelector("img[id$='_photo_preview']")
    if (photoPreview) {
      photoPreview.src = "/static/img/user.png"
      photoPreview.style.display = "none"
    }
    // Clear dynamic material inputs
    const dynamicContainers = form.querySelectorAll(
      "#supplier_materials_container, #design_materials_container, #po_items_container",
    )
    dynamicContainers.forEach((container) => {
      container.innerHTML = ""
    })
  }
}

export function populateForm(formId, data, fieldMap) {
  const form = document.getElementById(formId)
  if (!form) {
    console.error(`Form with ID '${formId}' not found.`)
    return
  }

  // Set hidden ID field if it exists
  const hiddenIdInput = form.querySelector('input[type="hidden"][name="id"]')
  if (hiddenIdInput && data.id) {
    hiddenIdInput.value = data.id
  }

  for (const key in fieldMap) {
    const elementId = fieldMap[key]
    const element = document.getElementById(elementId)
    if (element && data[key] !== undefined && data[key] !== null) {
      if (element.type === "file") {
        // For file inputs, update the preview if available
        const photoPreview = document.getElementById(`current_${elementId}_preview`)
        if (photoPreview) {
          photoPreview.src = data[key] || "/static/img/user.png"
          photoPreview.style.display = data[key] ? "block" : "none"
        }
      } else if (element.tagName === "SELECT") {
        element.value = data[key]
        // Trigger change event for selects that might have dependent fields
        const event = new Event("change", { bubbles: true })
        element.dispatchEvent(event)
      } else if (element.type === "date") {
        // Ensure date is in YYYY-MM-DD format
        element.value = data[key].split("T")[0] // Assuming ISO format from backend
      } else if (element.type === "number") {
        element.value = Number.parseFloat(data[key])
      } else if (element.type === "radio" || element.type === "checkbox") {
        element.checked = data[key]
      } else {
        element.value = data[key]
      }
    }
  }
}

export function populateDocumentFields(documentFull, typeSelectId, numberInputId) {
  const typeSelect = document.getElementById(typeSelectId)
  const numberInput = document.getElementById(numberInputId)

  if (typeSelect && numberInput && documentFull) {
    const parts = documentFull.split("-")
    if (parts.length === 2) {
      typeSelect.value = parts[0]
      numberInput.value = parts[1]
    } else {
      // Fallback if format is unexpected
      typeSelect.value = ""
      numberInput.value = documentFull
    }
  }
}

export function setupSidebarNavigation(userInfo) {
  const navLinks = document.querySelectorAll(".sidebar nav ul li a")
  const userRole = userInfo.rol

  // Define which pages are accessible by each role
  const roleAccess = {
    administrador: [
      "generar-guia-despacho",
      "registro-guias-despacho",
      "purchase-guide",
      "purchase-orders-list",
      "manage-users",
      "manage-clients",
      "manage-drivers",
      "manage-trucks",
      "manage-sellers",
      "manage-suppliers",
      "manage-inventory",
      "manage-concrete-designs",
      "manage-maintenance",
    ],
    registro: [
      "generar-guia-despacho",
      "registro-guias-despacho",
      "manage-clients",
      "manage-drivers",
      "manage-trucks",
      "manage-sellers",
      "manage-suppliers",
    ],
    control_calidad: ["manage-inventory", "manage-concrete-designs"],
    vendedor: ["manage-clients", "quotation-form"], // Assuming a quotation form page
    gerencia: [
      "registro-guias-despacho",
      "manage-users",
      "manage-clients",
      "manage-drivers",
      "manage-trucks",
      "manage-sellers",
      "manage-suppliers",
      "manage-supplier-purchase-orders",
      "manage-inventory",
      "manage-concrete-designs",
      "manage-maintenance",
    ],
  }

  // Hide all pages initially
  document.querySelectorAll(".page").forEach((page) => {
    page.style.display = "none"
    page.classList.remove("active")
  })

  // Hide all nav links initially
  navLinks.forEach((link) => {
    link.style.display = "none"
    link.classList.remove("active")
  })

  let firstAccessiblePage = null

  navLinks.forEach((link) => {
    const pageId = link.dataset.page
    if (roleAccess[userRole] && roleAccess[userRole].includes(pageId)) {
      link.style.display = "block" // Show the link
      if (!firstAccessiblePage) {
        firstAccessiblePage = pageId // Set the first accessible page
      }
      link.addEventListener("click", (e) => {
        e.preventDefault()
        showPage(pageId)
      })
    }
  })

  // Show the first accessible page
  if (firstAccessiblePage) {
    showPage(firstAccessiblePage)
  } else {
    // Fallback if no pages are accessible (should not happen with proper role setup)
    console.warn("No accessible pages found for this role.")
  }

  // Update user info in sidebar
  document.getElementById("user-name").textContent = userInfo.nombreCompleto
  document.getElementById("user-role").textContent = userInfo.rol.charAt(0).toUpperCase() + userInfo.rol.slice(1)
  const userPhoto = document.getElementById("user-photo")
  if (userPhoto && userInfo.foto) {
    userPhoto.src = userInfo.foto
  }
}

export async function logout() {
  try {
    const response = await fetch("/api/logout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    })
    const data = await response.json()
    if (data.success) {
      window.location.href = "/" // Redirect to login page
    } else {
      displayFlashMessage("Error al cerrar sesión.", "error")
    }
  } catch (error) {
    console.error("Error during logout:", error)
    displayFlashMessage("Error de red al cerrar sesión.", "error")
  }
}

export function setupLogoutButton() {
  const logoutBtn = document.getElementById("logout-btn")
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault()
      logout()
    })
  }
}

export function startHeartbeat() {
  setInterval(async () => {
    try {
      await fetch("/api/user/heartbeat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })
    } catch (error) {
      console.error("Heartbeat failed:", error)
      // Optionally, redirect to login if heartbeat consistently fails
    }
  }, 60000) // Send heartbeat every 60 seconds
}

export function printDiv(divId, title) {
  const printContents = document.getElementById(divId).innerHTML
  const originalContents = document.body.innerHTML
  document.body.innerHTML = printContents
  document.title = title
  window.print()
  document.body.innerHTML = originalContents
  location.reload() // Reload to restore original page content and scripts
}

export function generatePdf(htmlContent, filename) {
  // This is a placeholder. In a real application, you'd send the HTML
  // to a backend service (like Flask with WeasyPrint or ReportLab)
  // or use a client-side library like jsPDF with html2canvas.
  // For simplicity, we'll just open a new window with the content.
  const newWindow = window.open("", "_blank")
  newWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>${filename}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .preview-box { border: 1px solid #ccc; padding: 20px; margin-bottom: 20px; }
                .preview-content p { margin: 5px 0; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
                .totals-summary { text-align: right; margin-top: 10px; }
            </style>
        </head>
        <body>
            ${htmlContent}
        </body>
        </html>
    `)
  newWindow.document.close()
  newWindow.print() // Trigger print dialog
}

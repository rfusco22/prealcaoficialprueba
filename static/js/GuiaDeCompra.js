// Helper function to format date
function formatDate(dateString) {
  if (!dateString) return "N/A"
  const date = new Date(dateString)
  return date.toLocaleDateString("es-ES")
}

// Helper function to format currency
function formatCurrency(value) {
  return new Intl.NumberFormat("es-VE", {
    style: "currency",
    currency: "VES",
  }).format(value)
}

// Helper function to convert number to words (for "Son:" field in PDF)
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

// Function to generate PDF for supplier purchase orders (placeholder)
function createSupplierPurchaseOrderPdf(order, items) {
  console.log("Generating PDF for supplier purchase order:", order, items)
  // Implement actual PDF generation using jspdf here if needed
  // For example:
  // const { jsPDF } = window.jspdf;
  // const doc = new jsPDF();
  // doc.text("Orden de Compra", 10, 10);
  // doc.save(`Orden_Compra_${order.po_number}.pdf`);
  displayFlashMessage("Funcionalidad de descarga de PDF no implementada aún.", "info")
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

// View Purchase Order (now opens in a modal for supplier POs)
function viewSupplierPurchaseOrder(orderId) {
  // Directly target the supplier purchase order modal
  const modal = document.getElementById("supplier-purchase-order-details-modal")
  if (!modal) {
    console.error("Supplier Purchase Order Modal element not found.")
    displayFlashMessage("Error: No se encontró el modal para ver la orden de compra del proveedor.", "error")
    return
  }

  // Since we are explicitly targeting the supplier modal, we can simplify element selection
  const modalPoNumber = document.getElementById("modal_preview_supplier_po_number")
  const modalPoDate = document.getElementById("modal_preview_supplier_po_date")
  const modalSupplierName = document.getElementById("modal_preview_supplier_name")
  const modalSupplierAddress = document.getElementById("modal_preview_supplier_address")
  const modalSupplierRif = document.getElementById("modal_preview_supplier_rif")
  const modalSupplierContact = document.getElementById("modal_preview_supplier_contact_name")
  const modalSupplierPhone = document.getElementById("modal_preview_supplier_contact_phone")
  const modalItemsTbody = document.getElementById("modal-preview-supplier-items-tbody")
  const modalTotalToPay = document.getElementById("modal_preview_supplier_total_to_pay")
  const modalTotalWords = document.getElementById("modal_preview_supplier_total_words")

  // Buttons for Gerencia modal
  const approveBtn = document.getElementById("modal-approve-supplier-po")
  const denyBtn = document.getElementById("modal-deny-supplier-po")
  const printBtn = document.getElementById("modal-print-supplier-purchase-order")

  fetch(`/api/ordenes_compra_proveedor/${orderId}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`)
      }
      return response.json()
    })
    .then((data) => {
      // Populate the modal preview section with fetched data
      if (modalPoNumber) modalPoNumber.textContent = data.po_number
      if (modalPoDate) modalPoDate.textContent = formatDate(data.fecha)
      if (modalSupplierName) modalSupplierName.textContent = data.proveedor_nombre
      if (modalSupplierAddress) modalSupplierAddress.textContent = data.proveedor_direccion
      if (modalSupplierRif) modalSupplierRif.textContent = data.proveedor_rif
      if (modalSupplierContact) modalSupplierContact.textContent = data.proveedor_contacto || "N/A"
      if (modalSupplierPhone) modalSupplierPhone.textContent = data.proveedor_telefono || "N/A"

      if (modalItemsTbody) {
        modalItemsTbody.innerHTML = ""
        data.items.forEach((item) => {
          const tr = document.createElement("tr")
          tr.innerHTML = `
                <td style="border: 1px solid #ddd; padding: 8px;">${item.nombre_material}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${item.cantidad.toLocaleString("es-ES")}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: left;">${item.unidad_medida}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${formatCurrency(item.precio_unitario)}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${formatCurrency(item.subtotal_item)}</td>
            `
          modalItemsTbody.appendChild(tr)
        })
      }

      if (modalTotalToPay) modalTotalToPay.textContent = formatCurrency(data.total)
      if (modalTotalWords) modalTotalWords.textContent = convertNumberToWords(data.total)

      // Set data-id for PDF/Print buttons in the modal (if they exist)
      if (printBtn) {
        printBtn.setAttribute("data-order-id", orderId)
        printBtn.style.display = data.status === "approved" ? "inline-block" : "none"
      }
      if (approveBtn) approveBtn.style.display = data.status === "pending" ? "inline-block" : "none"
      if (denyBtn) denyBtn.style.display = data.status === "pending" ? "inline-block" : "none"

      // Show the modal
      modal.style.display = "flex" // Use flex to center content
    })
    .catch((error) => {
      console.error("Error al cargar la guía de compra:", error)
      displayFlashMessage(`Error al cargar la guía de compra: ${error.message}`, "error")
    })
}

// Helper function to display flash messages (needed here for viewSupplierPurchaseOrder)
function displayFlashMessage(message, category) {
  const flashMessagesDiv = document.getElementById("flash-messages")
  if (flashMessagesDiv) {
    flashMessagesDiv.innerHTML = `<div class="alert alert-${category}">${message}</div>`
    setTimeout(() => {
      flashMessagesDiv.innerHTML = ""
    }, 5000)
  }
}

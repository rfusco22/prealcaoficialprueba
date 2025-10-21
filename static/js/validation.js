// This file contains general validation functions used across the application.

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
  errorDiv.classList.remove("error", "success")
  errorDiv.textContent = ""

  let isValid = true
  let errorMessage = ""

  if (isRif) {
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
    if (!/^\d{6,8}$/.test(cedulaCleaned)) {
      // Cédula can be 6 to 9 digits
      isValid = false
      errorMessage = "El número de cédula debe tener entre 6 y 8 dígitos."
    }
  }

  const documentInputGroup = document.getElementById(errorSpanId).previousElementSibling

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

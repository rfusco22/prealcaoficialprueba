document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("login-form")

  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault()

      const username = document.getElementById("username").value
      const password = document.getElementById("password").value

      try {
        const response = await fetch("/api/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ username, password }),
        })

        let data
        try {
          data = await response.json()
        } catch (jsonError) {
          console.error("Error al parsear la respuesta JSON del servidor:", jsonError)
          displayFlashMessage("Error inesperado: La respuesta del servidor no es válida. Intente de nuevo.", "error")
          return // Salir si el JSON no es válido
        }

        // Verificar si la respuesta HTTP fue exitosa (status 2xx) y si la lógica de la API indica éxito
        if (response.ok && data.success) {
          // Redirigir según el rol
          const userRole = data.user.rol
          let redirectUrl = "/" // Fallback por defecto

          if (userRole === "administrador") {
            redirectUrl = "/dashboard/administrador"
          } else if (userRole === "registro") {
            redirectUrl = "/dashboard/registro"
          } else if (userRole === "control_calidad") {
            redirectUrl = "/dashboard/control_calidad"
          } else if (userRole === "vendedor") {
            redirectUrl = "/dashboard/vendedor/ventas"
          } else if (userRole === "gerencia") {
            redirectUrl = "/dashboard/gerencia"
          } else if (userRole === "sistema") {
            redirectUrl = "/dashboard/sistema"
          }

          window.location.href = redirectUrl
        } else {
          // Si la respuesta HTTP no fue 2xx o data.success es false, mostrar el mensaje del servidor
          const errorMessage =
            data.message || "Error al iniciar sesión. Credenciales incorrectas o problema del servidor."
          displayFlashMessage(errorMessage, "error")
        }
      } catch (networkError) {
        // Este bloque se ejecuta si hay un error de red (ej. servidor no accesible)
        console.error("Error durante el inicio de sesión (red o inesperado):", networkError)
        displayFlashMessage("Error de conexión. Verifique su red o intente más tarde.", "error")
      }
    })
  }

  function displayFlashMessage(message, category) {
    const flashMessagesDiv = document.getElementById("flash-messages")
    if (flashMessagesDiv) {
      flashMessagesDiv.innerHTML = `<div class="alert alert-${category}">${message}</div>`
      setTimeout(() => {
        flashMessagesDiv.innerHTML = ""
      }, 5000) // Eliminar después de 5 segundos
    }
  }

  // Verificar mensajes flash de Flask al cargar la página
  const flaskFlashMessages = document.querySelectorAll("#flash-messages .alert")
  if (flaskFlashMessages.length > 0) {
    setTimeout(() => {
      flaskFlashMessages.forEach((msg) => msg.remove())
    }, 5000)
  }
})

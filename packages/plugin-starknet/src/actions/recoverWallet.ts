import {
    type Action,
    type IAgentRuntime,
    type Memory,
    type State,
    type HandlerCallback,
    type Content,
    elizaLogger
  } from "@elizaos/core"
  import { InvisibleWalletProvider } from "../providers/invisibleWalletProvider"
  
  export interface RecoverWalletContent extends Content {
    pin?: string
    email?: string
  }
  
  // Función auxiliar para extraer el correo del texto
  function extractEmail(text: string): string | null {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
    const match = text.match(emailRegex)
    return match ? match[0] : null
  }
  
  // Función auxiliar para extraer el PIN del texto
  function extractPin(text: string): string | null {
    // Buscar patrones como "pin 1234", "PIN: 1234", "contraseña 1234", etc.
    const pinRegex = /(?:pin|contraseña|password|clave)[\s:]*(\d{4,})/i
    const match = text.match(pinRegex)
    if (match) return match[1]
    
    // Buscar números de 4+ dígitos como posible PIN
    const numberRegex = /\b(\d{4,})\b/
    const numberMatch = text.match(numberRegex)
    return numberMatch ? numberMatch[1] : null
  }
  
  const recoverWalletAction: Action = {
    name: "RECOVER_INVISIBLE_WALLET_STARKNET",
    similes: [
      "RECOVER_WALLET",
      "RECUPERAR_ALCANCIA",
      "RECUPERAR_ALCANCIA_DIGITAL",
      "ACCEDER_ALCANCIA",
      "ENTRAR_ALCANCIA",
      "RECUPERAR_CARTERA",
      "ACCEDER_WALLET",
      "LOGIN_WALLET",
      "RESTORE_DIGITAL_PIGGYBANK",
      "ACCESS_ALCANCIA"
    ],
    description: "Recupera una alcancía digital existente en Starknet usando email y PIN.",
    suppressInitialMessage: true,
    validate: async (_runtime, message) => {
      const text = message.content?.text?.toLowerCase() || ""
      
      console.log("🔍 RECOVER_INVISIBLE_WALLET_STARKNET validate ejecutándose para:", text)
      elizaLogger.log("🔍 RECOVER_INVISIBLE_WALLET_STARKNET validate ejecutándose para:", text)
      
      // Verificar palabras clave de recuperación
      const recoverKeywords = ["recuperar", "recover", "acceder", "access", "login", "entrar", "restaurar", "restore"]
      const piggyBankKeywords = ["alcancia", "alcancía", "wallet", "cartera", "billetera", "digital"]
      
      const hasRecoverKeyword = recoverKeywords.some(keyword => text.includes(keyword))
      const hasPiggyBankKeyword = piggyBankKeywords.some(keyword => text.includes(keyword))
      
      // Detectar "alcancía digital" específicamente
      const hasAlcanciaDigital = /alcanci[aá]\s*digital/i.test(text) || /digital\s*alcanci[aá]/i.test(text)
      
      // Validar si contiene un email
      const hasEmail = /@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(text)
      
      // Validar si contiene un PIN
      const hasPinWithKeyword = /(?:pin|contraseña|password|clave)[\s:]*\d{4,}/i.test(text)
      const hasLongNumber = /\b\d{4,}\b/.test(text)
      
      // Activar si tiene palabras de recuperar + (alcancía o wallet)
      const isAlcanciaRecoveryRequest = hasRecoverKeyword && (hasPiggyBankKeyword || hasAlcanciaDigital)
      
      elizaLogger.log("RECOVER_INVISIBLE_WALLET_STARKNET validate detallado:", {
        originalText: message.content?.text || "",
        textLower: text,
        hasRecoverKeyword,
        hasPiggyBankKeyword,
        hasAlcanciaDigital,
        hasEmail,
        hasPinWithKeyword,
        hasLongNumber,
        isAlcanciaRecoveryRequest
      })
      
      console.log("✅ RECOVER_INVISIBLE_WALLET_STARKNET validate resultado:", isAlcanciaRecoveryRequest)
      
      return isAlcanciaRecoveryRequest
    },
    handler: async (
      runtime: IAgentRuntime,
      message: Memory,
      _state: State,
      _options: { [key: string]: unknown },
      callback?: HandlerCallback
    ) => {
      try {
        console.log("🔄 RECOVER_INVISIBLE_WALLET_STARKNET handler ejecutándose")
        console.log("📝 Texto del mensaje:", message.content?.text)
        
        elizaLogger.log("RECOVER_INVISIBLE_WALLET_STARKNET handler ejecutándose:", {
          messageText: message.content?.text,
          messageContent: message.content
        })
        
        // Verificar configuración de Starknet
        const starknetRpcUrl = runtime.getSetting("STARKNET_RPC_URL") || process.env.STARKNET_RPC_URL
        
        console.log("🔧 Verificando configuración:")
        console.log("   STARKNET_RPC_URL:", starknetRpcUrl ? "✅ Configurada" : "❌ Falta") 
        
        // Extraer email y PIN del mensaje
        const originalText = message.content?.text || ""
        
        const pinFromContent = typeof message.content?.pin === 'string' ? message.content.pin : null
        const pinFromText = extractPin(originalText)
        const pin = pinFromContent || pinFromText || ""
  
        const emailFromContent = typeof message.content?.email === 'string' ? message.content.email : null
        const emailFromText = extractEmail(originalText)
        const email = emailFromContent || emailFromText || ""
  
        console.log("📧 Email extraído:", email)
        console.log("🔐 PIN extraído:", pin ? `${pin.length} dígitos` : "no encontrado")
        
        // Validar email
        if (!email || !email.includes("@")) {
          const errorMsg = "❌ Por favor proporciona el correo electrónico de tu wallet invisible."
          console.log(errorMsg)
          callback?.({
            text: errorMsg,
            content: { error: "Missing or invalid email" }
          })
          return false
        }
  
        // Validar PIN
        if (!pin) {
          const responseMsg = `¡Hola de nuevo compadre! Para acceder a tu wallet con ${email} 🔐 
  
  Escribe tu PIN de seguridad:
  "PIN 1234" 
  
  ¡Vamos a recuperar tu tesoro digital! 🏴‍☠️ #RecuperarWallet`
          console.log("⏳", responseMsg)
          callback?.({
            text: responseMsg,
            content: { error: "Missing pin", email: email }
          })
          return false
        }
  
        if (pin.length < 4 || !/^\d+$/.test(pin)) {
          const errorMsg = `❌ El PIN debe tener al menos 4 dígitos numéricos. Ejemplo: PIN 1234`
          console.log(errorMsg)
          callback?.({
            text: errorMsg,
            content: { error: "Invalid pin format", email: email }
          })
          return false
        }
  
        console.log(`✅ Iniciando recuperación de wallet para ${email}`)
        
        // Recuperar la wallet
        const walletProvider = new InvisibleWalletProvider(starknetRpcUrl)
        const walletData = await walletProvider.recoverWallet(email, pin)
  
        // Obtener balance actual
        const balance = await walletProvider.getBalance(walletData.address)
  
        console.log("🎉 Wallet recuperada exitosamente!")
        elizaLogger.log("Wallet recuperada:", {
          address: walletData.address,
          email: walletData.email,
          isDeployed: walletData.isDeployed
        })
  
        const successMsg = `¡Bienvenido de vuelta compadre! Tu wallet invisible ha sido recuperada 🥷✨
  
  📧 **Email**: ${email}
  📍 **Dirección Completa**: 
  \`${walletData.address}\`
  💰 **Balance**: ${balance} ETH
  🏗️ **Estado**: ${walletData.isDeployed ? 'Activa y desplegada' : 'Lista para usar'}
  
  ${!walletData.isDeployed ? '⚡ Tu wallet se activará automáticamente en tu primera transacción' : ''}
  
  ¡Tu tesoro sigue seguro como siempre! 🏴‍☠️💎 #WalletRecuperada`
  
        callback?.({
          text: successMsg,
          content: { 
            wallet: {
              address: walletData.address,
              email: walletData.email,
              balance: balance,
              isDeployed: walletData.isDeployed
            },
            status: "recovered"
          }
        })
        return true
        
      } catch (error: any) {
        console.error("❌ Error al recuperar wallet:", error)
        elizaLogger.error("Error al recuperar wallet:", error)
        
        const errorMsg = `❌ No se pudo recuperar la wallet. 
  
  🔧 Verifica que:
  - El correo electrónico sea exactamente el mismo
  - El PIN sea el correcto
  - Tu conexión a internet esté funcionando
  
  ¿Seguro que usaste este email y PIN antes? 🤔`
  
        callback?.({
          text: errorMsg,
          content: { error: error.message }
        })
        return false
      }
    },
    examples: [
      [
        {
          user: "{{user1}}",
          content: { text: "Recuperar mi wallet con correo usuario@gmail.com" }
        },
        {
          user: "{{agent}}",
          content: { text: "¡Hola de nuevo compadre! Para acceder a tu wallet con usuario@gmail.com escribe tu PIN: \"PIN 1234\" 🔐 #RecuperarWallet" }
        }
      ],
      [
        {
          user: "{{user1}}",
          content: { text: "acceder a mi wallet con ana@test.com PIN 5678" }
        },
        {
          user: "{{agent}}",
          content: { text: "¡Bienvenido de vuelta! Recuperando tu wallet invisible con ana@test.com 🥷✨ #WalletRecuperada" }
        }
      ],
      [
        {
          user: "{{user1}}",
          content: { text: "login wallet" }
        },
        {
          user: "{{agent}}",
          content: { text: "¡Por supuesto! Para acceder a tu wallet invisible necesito tu correo y PIN. Ejemplo: \"recuperar wallet con correo@test.com PIN 1234\" 🔐" }
        }
      ]
    ]
  }
  
  export default recoverWalletAction 
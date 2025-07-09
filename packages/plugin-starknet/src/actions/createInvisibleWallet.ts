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

export interface CreateInvisibleWalletContent extends Content {
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

const createInvisibleWalletAction: Action = {
  name: "CREATE_INVISIBLE_WALLET_STARKNET",
  similes: [
    "CREATE_INVISIBLE_WALLET",
    "CREATE_SOCIAL_WALLET", 
    "CREATE_STARKNET_WALLET",
    "CREAR_WALLET_INVISIBLE",
    "CREAR_WALLET_SOCIAL",
    "CREAR_WALLET_STARKNET",
    "CREAR_MI_WALLET",
    "CREAR_WALLET",
    "CREAR_CARTERA",
    "CREAR_MI_CARTERA",
    "CREAR_BILLETERA"
  ],
  description: "Crea una wallet invisible en Starknet usando solo email y PIN. No requiere extensiones ni descargas.",
  suppressInitialMessage: true,
  validate: async (_runtime, message) => {
    const text = message.content?.text?.toLowerCase() || ""
    
    console.log("🔍 CREATE_INVISIBLE_WALLET_STARKNET validate ejecutándose para:", text)
    elizaLogger.log("🔍 CREATE_INVISIBLE_WALLET_STARKNET validate ejecutándose para:", text)
    
    // Verificar palabras clave de wallet
    const walletKeywords = ["wallet", "cartera", "billetera"]
    const createKeywords = ["crear", "crea", "create", "new", "nueva", "nuevo"]
    
    const hasWalletKeyword = walletKeywords.some(keyword => text.includes(keyword))
    const hasCreateKeyword = createKeywords.some(keyword => text.includes(keyword))
    
    // Validar si contiene un email
    const hasEmail = /@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(text)
    
    // Validar si contiene un PIN
    const hasPinWithKeyword = /(?:pin|contraseña|password|clave)[\s:]*\d{4,}/i.test(text)
    const hasLongNumber = /\b\d{4,}\b/.test(text)
    
    // Activar si tiene palabras de crear + wallet, O si tiene email + PIN pero NO palabras de recuperar
    const hasRecoverKeyword = ["recuperar", "recover", "acceder", "access", "login", "entrar", "restaurar", "restore"].some(keyword => text.includes(keyword))
    const isWalletCreationRequest = (hasCreateKeyword && hasWalletKeyword) || 
                                   (hasEmail && (hasPinWithKeyword || hasLongNumber) && !hasRecoverKeyword)
    
    elizaLogger.log("CREATE_INVISIBLE_WALLET_STARKNET validate detallado:", {
      originalText: message.content?.text || "",
      textLower: text,
      hasWalletKeyword,
      hasCreateKeyword, 
      hasEmail,
      hasPinWithKeyword,
      hasLongNumber,
      isWalletCreationRequest
    })
    
    console.log("✅ CREATE_INVISIBLE_WALLET_STARKNET validate resultado:", isWalletCreationRequest)
    
    return isWalletCreationRequest
  },
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: { [key: string]: unknown },
    callback?: HandlerCallback
  ) => {
    try {
      console.log("🚀 CREATE_INVISIBLE_WALLET_STARKNET handler ejecutándose")
      console.log("📝 Texto del mensaje:", message.content?.text)
      
      elizaLogger.log("CREATE_INVISIBLE_WALLET_STARKNET handler ejecutándose:", {
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
        const errorMsg = "❌ Por favor proporciona un correo electrónico válido para crear tu wallet invisible."
        console.log(errorMsg)
        callback?.({
          text: errorMsg,
          content: { error: "Missing or invalid email" }
        })
        return false
      }

      // Validar PIN
      if (!pin) {
        const responseMsg = `¡Perfecto compadre! Vamos a crear tu wallet invisible con ${email} 🎯 
        
Ahora necesito que escribas tu PIN de seguridad (mínimo 4 dígitos):
"PIN 1234" 

¡Tu wallet será única e invisible para el mundo! 🥷 #WalletInvisible`
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

      console.log(`✅ Iniciando creación de wallet invisible para ${email}`)
      
      // Crear el provider y la wallet
      const walletProvider = new InvisibleWalletProvider(starknetRpcUrl)
      const walletData = await walletProvider.createInvisibleWallet({
        email,
        pin,
        rpcUrl: starknetRpcUrl
      })

      // Obtener balance (será 0 para una wallet nueva)
      const balance = await walletProvider.getBalance(walletData.address)

      console.log("🎉 Wallet invisible creada exitosamente!")
      elizaLogger.log("Wallet invisible creada:", {
        address: walletData.address,
        email: walletData.email,
        isDeployed: walletData.isDeployed
      })

      const successMsg = `¡Excelente compadre! Tu wallet invisible ha sido creada 🥷✨

📧 **Email**: ${email}
📍 **Dirección Completa**: 
\`${walletData.address}\`
💰 **Balance**: ${balance} ETH
🏗️ **Estado**: ${walletData.isDeployed ? 'Desplegada' : 'Lista para usar'}

${!walletData.isDeployed ? '⚡ Tu wallet se desplegará automáticamente en tu primera transacción' : ''}

¡Tu wallet está más segura que el tesoro de un pirata! 🏴‍☠️ 
Solo tú puedes acceder con tu email y PIN 🔐 #WalletInvisible`

      callback?.({
        text: successMsg,
        content: { 
          wallet: {
            address: walletData.address,
            email: walletData.email,
            balance: balance,
            isDeployed: walletData.isDeployed
          },
          status: "success"
        }
      })
      return true
      
    } catch (error: any) {
      console.error("❌ Error al crear wallet invisible:", error)
      elizaLogger.error("Error al crear wallet invisible:", error)
      
      const errorMsg = `❌ Error al crear la wallet invisible: ${error.message}
      
🔧 Posibles soluciones:
- Verifica tu conexión a internet
- Inténtalo de nuevo en unos momentos
- Contacta al administrador si el problema persiste`

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
        content: { text: "Crear wallet invisible con mi correo usuario@gmail.com" }
      },
      {
        user: "{{agent}}",
        content: { text: "¡Perfecto compadre! Vamos a crear tu wallet invisible con usuario@gmail.com 🎯 Ahora escribe tu PIN de seguridad: \"PIN 1234\" 🔐 #WalletInvisible" }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: { text: "PIN 5678" }
      },
      {
        user: "{{agent}}",
        content: { text: "¡Excelente! Creando tu wallet invisible más segura que el tesoro de un pirata 🏴‍☠️ #WalletInvisible" }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: { text: "crear wallet invisible con ana@test.com PIN 9999" }
      },
      {
        user: "{{agent}}",
        content: { text: "¡Perfecto! Wallet invisible creada con ana@test.com. ¡Solo tú puedes acceder con tu PIN! 🥷✨ #WalletInvisible" }
      }
    ]
  ]
}

export default createInvisibleWalletAction 
import {
  type Action,
  type IAgentRuntime,
  type Memory,
  type State,
  type HandlerCallback,
  type Content,
  elizaLogger
} from "@elizaos/core"
import { ChipiWalletProvider } from "../providers/chipiWalletProvider"

export interface CreateWalletContent extends Content {
  pin?: string // PIN de 4+ dígitos
  email?: string
}

// Función auxiliar para extraer el correo del texto
function extractEmail(text: string): string | null {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
  const match = text.match(emailRegex)
  return match ? match[0] : null
}

// Función auxiliar para extraer el PIN del texto (solo dígitos)
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

const createWalletAction: Action = {
  name: "CREATE_CHIPI_WALLET",
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
    "CREAR_MI_CARTERA"
  ],
  description: "Crea una wallet invisible en Starknet usando ChipiPay. Requiere correo electrónico y PIN de 4+ dígitos.",
  suppressInitialMessage: true,
  validate: async (_runtime, message) => {
    const text = message.content?.text?.toLowerCase() || ""
    
    // Log siempre visible para confirmar que validate se ejecuta
    console.log("🔍 CREATE_CHIPI_WALLET validate ejecutándose para:", text)
    elizaLogger.log("🔍 CREATE_CHIPI_WALLET validate ejecutándose para:", text)
    
    // Verificar palabras clave de wallet (más específico)
    const walletKeywords = ["wallet", "cartera", "billetera"]
    const createKeywords = ["crear", "crea", "create", "new", "nueva", "nuevo"]
    
    const hasWalletKeyword = walletKeywords.some(keyword => text.includes(keyword))
    const hasCreateKeyword = createKeywords.some(keyword => text.includes(keyword))
    
    // Validar si contiene un email
    const hasEmail = /@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(text)
    
    // Validar si contiene un PIN con palabra clave específica
    const hasPinWithKeyword = /(?:pin|contraseña|password|clave)[\s:]*\d{4,}/i.test(text)
    
    // Validar si contiene un número de 4+ dígitos (posible PIN)
    const hasLongNumber = /\b\d{4,}\b/.test(text)
    
    // Ser más permisivo: si tiene palabras de crear + wallet, O si tiene email + PIN
    const isWalletCreationRequest = (hasCreateKeyword && hasWalletKeyword) || 
                                   (hasEmail && (hasPinWithKeyword || hasLongNumber))
    
    const result = isWalletCreationRequest
    
    // Log detallado de debug
    elizaLogger.log("CREATE_CHIPI_WALLET validate detallado:", {
      originalText: message.content?.text || "",
      textLower: text,
      hasWalletKeyword,
      hasCreateKeyword,
      hasEmail,
      hasPinWithKeyword,
      hasLongNumber,
      isWalletCreationRequest,
      result
    })
    
    console.log("✅ CREATE_CHIPI_WALLET validate resultado:", result)
    
    return result
  },
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: { [key: string]: unknown },
    callback?: HandlerCallback
  ) => {
    try {
      // Log visible - inicio del handler
      console.log("🚀 CREATE_CHIPI_WALLET handler ejecutándose")
      console.log("📝 Texto del mensaje:", message.content?.text)
      
      elizaLogger.log("CREATE_CHIPI_WALLET handler ejecutándose:", {
        messageText: message.content?.text,
        messageContent: message.content
      })
      
      // Validar variables de entorno primero
      const chipiApiKey = process.env.CHIPI_API_PUBLIC_KEY
      const starknetRpcUrl = process.env.STARKNET_RPC_URL
      
      console.log("🔧 Verificando variables de entorno:")
      console.log("   CHIPI_API_PUBLIC_KEY:", chipiApiKey ? "✅ Configurada" : "❌ Falta")
      console.log("   STARKNET_RPC_URL:", starknetRpcUrl ? "✅ Configurada" : "❌ Falta") 
      
      if (!chipiApiKey) {
        const errorMsg = "❌ Error de configuración: Falta la variable de entorno CHIPI_API_PUBLIC_KEY. Contacta al administrador para configurar las credenciales de ChipiPay."
        console.log(errorMsg)
        callback?.({
          text: errorMsg,
          content: { error: "Missing CHIPI_API_PUBLIC_KEY environment variable" }
        })
        return false
      }
      
      // Configuración del provider
      const provider = new ChipiWalletProvider({
        apiPublicKey: chipiApiKey
      })

      // Extraer el pin y el correo electrónico
      const originalText = message.content?.text || ""
      
      const pinFromContent = typeof message.content?.pin === 'string' ? message.content.pin : null
      const pinFromText = extractPin(originalText)
      const pin = pinFromContent || pinFromText || ""

      const emailFromContent = typeof message.content?.email === 'string' ? message.content.email : null
      const emailFromText = extractEmail(originalText)
      const email = emailFromContent || emailFromText || ""

      console.log("📧 Email extraído:", email)
      console.log("🔐 PIN extraído:", pin ? `${pin.length} dígitos` : "no encontrado")
      
      elizaLogger.log("Datos extraídos:", {
        originalText,
        email,
        pinLength: pin?.length || 0,
        emailFromText,
        pinFromText
      })

      // Validar que el correo esté presente y tenga formato válido
      if (!email || !email.includes("@")) {
        const errorMsg = "❌ Por favor proporciona un correo electrónico válido para asociar tu wallet."
        console.log(errorMsg)
        callback?.({
          text: errorMsg,
          content: { error: "Missing or invalid email" }
        })
        return false
      }

      // Validar que el pin esté presente
      if (!pin) {
        const responseMsg = `¡Perfecto compadre! Vamos a crear tu wallet con ese correo ${email}. Ahora escribe exactamente "PIN" seguido de tus 4 dígitos. Ejemplo: PIN 1234 🔐 #SeguridadPrimero`
        console.log("⏳", responseMsg)
        callback?.({
          text: responseMsg,
          content: { error: "Missing pin", email: email }
        })
        return false
      }

      // Validar que el pin sea solo dígitos y tenga al menos 4 caracteres
      if (pin.length < 4 || !/^\d+$/.test(pin)) {
        const errorMsg = `❌ El PIN debe tener al menos 4 dígitos (solo números). Por favor proporciona un PIN válido como 1234 o 5678.`
        console.log(errorMsg)
        callback?.({
          text: errorMsg,
          content: { error: "Invalid pin format", email: email }
        })
        return false
      }

      console.log(`✅ Iniciando creación de wallet para ${email} con PIN de ${pin.length} dígitos`)
      elizaLogger.log("Creando wallet con email:", email, "y pin de longitud:", pin.length)

      // Usar el correo como bearerToken
      const wallet = await provider.createWallet({ 
        encryptKey: pin,
        bearerToken: email,
        apiPublicKey: chipiApiKey,
        nodeUrl: starknetRpcUrl || 'https://starknet-mainnet.infura.io/v3/'
      })

      console.log("🎉 Wallet creada exitosamente!")
      elizaLogger.log("Wallet creada exitosamente:", wallet)

      const successMsg = `¡Excelente compadre! Tu wallet ha sido creada exitosamente 💪 
Correo: ${email}
¡Tu wallet está más segura que la caja fuerte del banco! 🏦 #WalletLista`

      callback?.({
        text: successMsg,
        content: { wallet, status: "success", email }
      })
      return true
    } catch (error: any) {
      console.error("❌ Error al crear wallet:", error)
      elizaLogger.error("Error al crear wallet:", error)
      callback?.({
        text: `❌ Error al crear la wallet: ${error.message}`,
        content: { error: error.message }
      })
      return false
    }
  },
    examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "Crear wallet con usuario@email.com" }
      },
      {
        user: "{{agent}}",
        content: { text: "¡Perfecto compadre! Vamos a crear tu wallet con ese correo. Ahora escribe exactamente \"PIN\" seguido de tus 4 dígitos. Ejemplo: PIN 1234 🔐 #SeguridadPrimero" }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: { text: "PIN 1234" }
      },
      {
        user: "{{agent}}",
        content: { text: "¡Excelente PIN compadre! Vamos a crear tu wallet más segura que la caja fuerte del banco 💪 #WalletLista" }
      }
    ]
  ]
}

export default createWalletAction 
import {
  type Action,
  type IAgentRuntime,
  type Memory,
  type State,
  type HandlerCallback,
  type Content,
  elizaLogger
} from "@elizaos/core"
import { CapaClient } from "../client"
import type { OnRampContent, CreateUserRequest, KYCLinkRequest } from "../types"

export interface CreateOnRampContent extends Content {
  amount?: string
  email?: string
  currency?: string
  // cryptoCurrency siempre será USDC
}

// Función auxiliar para extraer el correo del texto
function extractEmail(text: string): string | null {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
  const match = text.match(emailRegex)
  return match ? match[0] : null
}

// Función auxiliar para extraer el monto del texto
function extractAmount(text: string): number | null {
  // Buscar patrones como "depositar 1000", "enviar 500", etc.
  const amountRegex = /(\d+(?:\.\d+)?)\s*(pesos?|dolares?|dólares?|usd|mxn|euros?|eur)/i
  const match = text.match(amountRegex)
  if (match) {
    return parseFloat(match[1])
  }
  
  // Buscar números sueltos (mínimo 2 dígitos)
  const numberRegex = /\b(\d{2,})\b/
  const numberMatch = text.match(numberRegex)
  if (numberMatch) {
    return parseInt(numberMatch[1])
  }
  
  return null
}

// OnRamp action for Capa plugin
export const onRampAction: Action = {
  name: "CAPA_ON_RAMP",
  similes: [
    "INVESTMENT_STRATEGY",
    "SAVINGS_STRATEGY", 
    "CREATE_SAVINGS_PLAN",
    "HELP_SAVE_MONEY",
    "INVESTMENT_ADVICE",
    "FINANCIAL_PLANNING"
  ],
  description: "Usa CAPA_ON_RAMP SOLO para fondear alcancías digitales existentes o invertir dinero fiat directamente cuando el usuario proporcione email, cantidad y cryptocurrency específica. NO usar para estrategias de ahorro generales.",
  suppressInitialMessage: true,
  validate: async (_runtime: IAgentRuntime, message: Memory) => {
      console.log("🔍 CAPA_ON_RAMP validate ejecutándose para:", message.content.text);
      
      const text = message.content.text.toLowerCase();
      
      // MEJORADO: Detectar palabras clave de depósito/inversión
      const depositKeywords = /\b(depositar|deposit|fondear|agregar|añadir|invertir|inversion|inversión|comprar|buy|ahorrar|save)\b/i;
      const alcanciaKeywords = /\b(alcancia|alcancía|wallet|cartera|billetera|digital)\b/i;
      const emailKeywords = /@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
      
      const hasDepositKeyword = depositKeywords.test(text);
      const hasAlcanciaKeyword = alcanciaKeywords.test(text);
      const hasAmount = /\b\d+\s*(?:pesos?|dolares?|dólares?|usd|mxn|euros?|eur)\b/i.test(text) || 
                       /\$\d+|\d+\$/.test(text) ||
                       /\b\d{2,}\b/.test(text);
      const hasEmail = emailKeywords.test(text);
      
      // SOLO detectar inversión directa con email y cantidad - NO estrategias de ahorro
      const hasInvestKeyword = /\b(invertir|inversion|inversión|comprar|fondear|agregar dinero|añadir dinero|ahorrar|save|depositar|deposit)\b/i.test(text);
      const hasEmail2 = /@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(text);
      const hasAmount2 = /\b\d+\s*(?:pesos?|dolares?|dólares?|usd|mxn|euros?|eur)\b/i.test(text) || 
                        /\$\d+|\d+\$/.test(text) ||
                        /\b\d{2,}\b/.test(text);
      
      // Solo activar si tiene TODAS las keywords necesarias para inversión directa
      const isDirectInvestment = hasInvestKeyword && hasEmail2 && hasAmount2;
      
      console.log("CAPA_ON_RAMP validate detallado:", {
          originalText: message.content.text,
          hasInvestKeyword,
          hasEmail, 
          hasAmount,
          isDirectInvestment
      });
      
      console.log("✅ CAPA_ON_RAMP validate resultado:", isDirectInvestment);
      
      return isDirectInvestment;
  },
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
    _options?: { [key: string]: unknown },
    callback?: HandlerCallback,
  ): Promise<boolean> => {
    console.log("🚀 CAPA_ON_RAMP handler ejecutándose");
    
    // Variables para usar en el catch block
    let email: string | null = null;
    let amount: number | null = null;
    let fiatCurrency = 'MXN';
    const cryptoCurrency = 'USDC'; // USDC fijo como token por defecto
    
    try {
      const text = message.content.text;
      
      // SOLO procesar fondeo directo - no estrategias
      console.log("💰 Procesando fondeo directo de alcancía digital con USDC...");
      
      // Extraer información de inversión directa
      email = extractEmail(text);
      amount = extractAmount(text);
      
      if (!email) {
        const errorMsg = "❌ Por favor proporciona tu email para procesar el fondeo de tu alcancía digital.";
        callback?.({
          text: errorMsg,
          content: { error: "Missing email for funding" }
        });
        return false;
      }
      
      if (!amount || amount <= 0) {
        const errorMsg = "❌ Por favor especifica la cantidad que quieres invertir. Ejemplo: 'Fondear 1000 pesos en mi alcancía digital test@email.com'";
        callback?.({
          text: errorMsg,
          content: { error: "Missing or invalid amount" }
        });
        return false;
      }
      
      // Detectar moneda fiat (MXN por defecto, USD si se especifica)
      const lowerText = text.toLowerCase();
      if (lowerText.includes('dolar') || lowerText.includes('usd') || lowerText.includes('$')) {
        fiatCurrency = 'USD';
      }
      
      console.log(`✅ Fondeo confirmado: ${amount} ${fiatCurrency} para ${email} - Token: ${cryptoCurrency}`);
      
      // Procesar el fondeo usando la API de Capa
      const capaApiKey = runtime.getSetting("CAPA_API_KEY") || process.env.CAPA_API_KEY;
      const capaSecretKey = runtime.getSetting("CAPA_SECRET_KEY") || process.env.CAPA_SECRET_KEY;
      
      if (!capaApiKey || !capaSecretKey) {
        throw new Error("Faltan las claves de API de Capa");
      }
      
      // Resto del código de procesamiento de Capa...
      
      // 2. Inicializar cliente Capa
      const capaConfig = {
        apiKey: capaApiKey,
        webhookSecret: process.env.CAPA_WEBHOOK_SECRET!,
        environment: (process.env.CAPA_ENVIRONMENT as 'staging' | 'production') || 'staging'
      };
      
      const capaClient = new CapaClient(capaConfig);
      console.log("🔧 Cliente Capa inicializado");
      
      // 3. Crear/obtener usuario en Capa
      callback?.({
        text: `🔄 Procesando compra de ${cryptoCurrency} por ${amount} ${fiatCurrency}...\n\n1️⃣ Creando usuario en Capa...`,
        content: { status: "processing", step: "user_creation" }
      });
      
      // En V2, siempre creamos un nuevo usuario ya que no existe getUserByEmail
      // Generar externalUserId único basado en email
      const externalUserId = `user_${email.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;
      
      const newUserData: CreateUserRequest = {
        externalUserId,
        email
      };
      
      const newUser = await capaClient.createUser(newUserData);
      if (!newUser.success || !newUser.data) {
        throw new Error(`Error creando usuario: ${JSON.stringify(newUser.error)}`);
      }
      
      const capaUser = newUser.data;
      console.log("📊 Respuesta completa de la API:", JSON.stringify(capaUser, null, 2));
      
      // Obtener el ID del usuario - acceder correctamente a la estructura anidada
      console.log("🔍 Debugging userId:", {
          capaUser: capaUser,
          capaUserType: typeof capaUser,
          hasUserId: 'userId' in capaUser,
          capaUserData: (capaUser as any).data,
          capaUserDataUserId: (capaUser as any).data?.userId,
          externalUserId: externalUserId
      });

      // Acceder correctamente al userId desde capaUser.data.userId
      const userId = (capaUser as any).data?.userId;
      if (!userId) {
          console.error("❌ No se encontró userId en la respuesta:", capaUser);
          console.error("❌ Estructura de data:", (capaUser as any).data);
          throw new Error("No se pudo obtener el userId de la respuesta de la API");
      }
      console.log("✅ Nuevo usuario creado con ID:", userId);
      
      // Nuevo usuario siempre necesita KYC
      callback?.({
        text: `👋 **¡Bienvenido a CAPA!**\n\n2️⃣ Generando tu verificación de identidad...`,
        content: { status: "processing", step: "kyc_generation" }
      });
      
      const kycLinkResponse = await capaClient.generateKYCLink({
        userId: userId,
        country: fiatCurrency === 'MXN' ? 'MX' : 'DO',
        partnerRedirectUri: 'https://t.me/tu_bot'
      });
      
      if (!kycLinkResponse.success || !kycLinkResponse.data) {
        throw new Error(`Error generando link KYC: ${JSON.stringify(kycLinkResponse.error)}`);
      }
      
      const welcomeMessage = `🎉 **¡Cuenta creada exitosamente!**

👤 **Usuario:** ${capaUser.email}  
🆔 **ID:** ${userId}

🔐 **Último paso:** Verificar tu identidad para poder invertir

👆 [**COMPLETAR VERIFICACIÓN**](${kycLinkResponse.data.kycLink})

✅ **Qué necesitas:**
• Tu ${fiatCurrency === 'MXN' ? 'INE vigente' : 'Cédula vigente'}
• Un celular con cámara
• 2 minutos de tu tiempo

💰 **Tu inversión quedará pendiente:**
• ${amount} ${fiatCurrency} → ${cryptoCurrency}

🔔 Te notificaré en cuanto estés verificado para procesar tu inversión.`;

      callback?.({
        text: welcomeMessage,
        content: { 
          status: "kyc_required",
          kycLink: kycLinkResponse.data.kycLink,
          user: capaUser,
          pendingTransaction: { amount, fiatCurrency, cryptoCurrency },
          isNewUser: true
        }
      });
      
      return true; // Terminar aquí hasta que complete KYC
    } catch (error: any) {
      console.error("❌ Error en CAPA_ON_RAMP handler:", error);
      elizaLogger.error("Error en OnRamp:", error);
      
      // Detectar si es un error de conectividad con Capa API
      const isConnectionError = error.message?.includes('timeout') || 
                              error.message?.includes('ECONNREFUSED') ||
                              error.message?.includes('ENOTFOUND');
      
      if (isConnectionError) {
        const connectionErrorMessage = `⚠️ **Servicio temporalmente no disponible**

🔧 **Problema:** No se puede conectar con el servicio de Capa en este momento.

📋 **Tu solicitud quedó registrada:**
• Inversión: ${amount || 'N/A'} ${fiatCurrency} → ${cryptoCurrency}
• Email: ${email || 'N/A'}
• Estado: Pendiente

⏰ **Próximos pasos:**
1. Inténtalo de nuevo en unos minutos
2. Si persiste, contacta soporte
3. Te notificaré cuando el servicio esté disponible

💡 **Mientras tanto:** Puedes preparar tu documentación (INE/Cédula) para cuando se resuelva.`;

        callback?.({
          text: connectionErrorMessage,
          content: { 
            error: "capa_api_unavailable",
            status: "pending",
            pendingTransaction: { 
              amount: amount || 0, 
              fiatCurrency, 
              cryptoCurrency, 
              email: email || '' 
            }
          }
        });
      } else {
        const errorMessage = `❌ Error procesando la compra: ${error.message}

🔧 **Posibles soluciones:**
• Verifica que el monto sea válido
• Asegúrate de incluir tu email correcto
• Inténtalo de nuevo en unos momentos
• Contacta soporte si el problema persiste`;

        callback?.({
          text: errorMessage,
          content: { error: error.message, status: "failed" }
        });
      }
      
      return false;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "Quiero fondear mi alcancía digital con 1000 pesos mexicanos, mi email es usuario@gmail.com" }
      },
      {
        user: "{{agent}}",
        content: {
          text: "🔄 Procesando fondeo de tu alcancía digital con 1000 MXN...",
          action: "CAPA_ON_RAMP"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: { text: "Quiero agregar 500 dólares a mi alcancía digital con email crypto@example.com" }
      },
      {
        user: "{{agent}}",
        content: {
          text: "🔄 Procesando depósito de 500 USD a tu alcancía digital...",
          action: "CAPA_ON_RAMP"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: { text: "Invertir 2000 pesos en mi alcancía digital investor@test.com" }
      },
      {
        user: "{{agent}}",
        content: {
          text: "¡Perfecto! Fondeo tu alcancía digital con 2000 MXN...",
          action: "CAPA_ON_RAMP"
        }
      }
    ]
  ]
};

export default onRampAction; 
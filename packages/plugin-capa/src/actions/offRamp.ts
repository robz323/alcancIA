// Simplified OffRamp action for build compatibility
export interface Action {
  name: string;
  similes: string[];
  description: string;
  suppressInitialMessage?: boolean;
  validate: (runtime: any, message: any) => Promise<boolean>;
  handler: (runtime: any, message: any, state: any, options: any, callback?: any) => Promise<boolean>;
  examples?: any[];
}

// Mock OffRamp action for build - will be replaced with full implementation at runtime
export const offRampAction: Action = {
  name: "CAPA_OFF_RAMP",
  similes: [
    "SELL_CRYPTO",
    "VENDER_CRYPTO",
    "VENDER_CRIPTOMONEDA",
    "VENDER_USDC",
    "OFF_RAMP",
    "CRYPTO_TO_FIAT",
    "RETIRAR_DINERO",
    "CONVERTIR_A_PESOS"
  ],
  description: "Vende criptomonedas por fiat a través de Capa. Convierte USDC, USDT, BTC, ETH a MXN o DOP.",
  suppressInitialMessage: true,
  validate: async (_runtime: any, message: any) => {
    const text = message.content?.text?.toLowerCase() || "";
    const sellKeywords = ["vender", "sell", "retirar", "convertir"];
    const cryptoKeywords = ["crypto", "usdc", "btc", "eth", "criptomoneda"];
    const fiatKeywords = ["peso", "pesos", "mxn", "dop", "fiat", "dinero"];
    
    const hasSellKeyword = sellKeywords.some(keyword => text.includes(keyword));
    const hasCryptoKeyword = cryptoKeywords.some(keyword => text.includes(keyword));
    const hasFiatKeyword = fiatKeywords.some(keyword => text.includes(keyword));
    
    return hasSellKeyword && (hasCryptoKeyword || hasFiatKeyword);
  },
  handler: async (runtime: any, message: any, state: any, options: any, callback?: any) => {
    // Implementation will be loaded at runtime
    console.log("Capa OffRamp action called");
    if (callback) {
      callback({
        text: "Plugin Capa OffRamp cargado. Funcionalidad completa disponible en runtime.",
        content: { status: "loaded" }
      });
    }
    return true;
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "Vender 1000 USDC por pesos mexicanos a mi cuenta usuario@gmail.com" }
      },
      {
        user: "{{agent}}",
        content: { text: "¡Procesando venta de USDC por MXN!" }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: { text: "Convertir mi crypto a dinero real" }
      },
      {
        user: "{{agent}}",
        content: { text: "¿Qué criptomoneda quieres vender y cuánto?" }
      }
    ]
  ]
};

export default offRampAction; 
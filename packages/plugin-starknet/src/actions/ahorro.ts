import {
  type Action,
  type IAgentRuntime,
  type Memory,
  type State,
  type HandlerCallback,
  elizaLogger
} from "@elizaos/core";
import {
  IndividualSavingsContract,
  GroupSavingsContract
} from "./contractsIntegration";
import { RpcProvider } from "starknet";

/**
 * Enhanced extraction and validation functions for savings goals and group management
 * These functions extract relevant information from telegram messages including:
 * - Amounts (numeric values for deposits/goals) with proper validation
 * - Goal IDs (from patterns like "meta 1", "objetivo 2")
 * - Group IDs (from patterns like "grupo trabajo", "team vacaciones")
 * - Wallet addresses (0x format for Starknet)
 * - Member usernames (@username mentions)
 * - Dates (converted to Unix timestamps in seconds for Starknet compatibility)
 * 
 * Key improvements made:
 * ✅ Fixed date handling: Convert to Unix seconds instead of milliseconds
 * ✅ Added date validation: Must be future dates within reasonable range
 * ✅ Enhanced amount validation: Range checking and wei format conversion
 * ✅ Better error messages with specific examples
 * ✅ Smart member extraction from wallet addresses or usernames
 * ✅ Improved ID extraction with multiple language patterns
 */

function extractAmount(text: string): string | null {
  const match = text.match(/\b(\d+(?:\.\d+)?)\b/);
  return match ? match[1] : null;
}

function validateAmount(amount: string): boolean {
  const num = Number(amount);
  return !isNaN(num) && num > 0 && num <= 1000000; // Reasonable limits
}

function formatAmountForContract(amount: string): string {
  // Convert to wei format if needed (multiply by 10^18 for ETH-like tokens)
  // For now, keep as string but ensure it's a valid number
  const num = Number(amount);
  if (isNaN(num)) throw new Error("Invalid amount");
  return Math.floor(num * 1e18).toString(); // Convert to wei equivalent
}

function extractGoalId(text: string): string | null {
  const patterns = [
    /meta\s*(\d+)/i,
    /goal\s*(\d+)/i,
    /objetivo\s*(\d+)/i,
    /ahorro\s*(\d+)/i,
    /id\s*(\d+)/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function extractGroupId(text: string): string | null {
  const patterns = [
    /grupo\s*(\w+)/i,
    /group\s*(\w+)/i,
    /equipo\s*(\w+)/i,
    /team\s*(\w+)/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function extractWalletAddresses(text: string): string[] {
  const walletPattern = /0x[a-fA-F0-9]{63,64}/g;
  const matches = text.match(walletPattern);
  return matches ? [...new Set(matches)] : [];
}

function extractMemberUsernames(text: string): string[] {
  const usernamePattern = /@(\w+)/g;
  const matches = text.match(usernamePattern);
  return matches ? matches.map(match => match.substring(1)) : []; 
}

function getCurrentUserWallet(runtime: IAgentRuntime, message: Memory): string {

  const userWallet = runtime.getSetting(`USER_WALLET_${message.userId}`);
  if (userWallet) return userWallet;
  
  return "0x0";
}

function extractDescription(text: string): string {
  return text.replace(/meta\s*\d+/i, "").replace(/grupo\s*\w+/i, "").replace(/\b(\d+(?:\.\d+)?)\b/, "").replace(/\d{4}-\d{2}-\d{2}/, "").replace(/\d{2}\/\d{2}\/\d{4}/, "").trim();
}

function extractDateAsTimestamp(text: string): number | null {
  const isoMatch = text.match(/(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) {
    const date = new Date(isoMatch[1]);
    if (!isNaN(date.getTime())) {
      // Convert to Unix timestamp in seconds (not milliseconds) for Starknet
      return Math.floor(date.getTime() / 1000);
    }
  }
  const euMatch = text.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (euMatch) {
    const [_, dd, mm, yyyy] = euMatch;
    const date = new Date(`${yyyy}-${mm}-${dd}`);
    if (!isNaN(date.getTime())) {
      // Convert to Unix timestamp in seconds (not milliseconds) for Starknet
      return Math.floor(date.getTime() / 1000);
    }
  }
  return null;
}

function validateDateFormat(dateString: string): boolean {
  // Validate that the date is in the future and reasonable
  const timestamp = extractDateAsTimestamp(dateString);
  if (!timestamp) return false;
  
  const now = Math.floor(Date.now() / 1000); // Current time in seconds
  const oneYearFromNow = now + (365 * 24 * 60 * 60); // One year in seconds
  
  // Date should be in the future but not more than 10 years away
  return timestamp > now && timestamp < (now + (10 * 365 * 24 * 60 * 60));
}

export const createPersonalSavingsGoalAction: Action = {
  name: "CREATE_PERSONAL_SAVINGS_GOAL",
  similes: ["CREAR_AHORRO_PERSONAL", "NUEVA_META_AHORRO", "CREATE_SAVINGS_GOAL", "NUEVO_OBJETIVO_AHORRO", "CREAR_ALCANCIA", "CREAR_ALCANCÍA", "NUEVO_GUARDADITO", "META_ALCANCIA", "META_ALCANCÍA", "GUARDADITO_PERSONAL"],
  description: "Crea una nueva meta de ahorro personal en Starknet.",
  validate: async (_runtime, message) => {
    const text = message.content?.text?.toLowerCase() || "";
    return (text.includes("ahorro") || text.includes("alcancia") || text.includes("alcancía") || text.includes("guardadito")) && 
           (text.includes("meta") || text.includes("objetivo")) && 
           !text.includes("grupo");
  },
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: { [key: string]: unknown },
    callback?: HandlerCallback
  ) => {
    try {
      const text = message.content?.text || "";
      const targetAmount = extractAmount(text);
      const description = extractDescription(text);
      const goalId = Date.now().toString();
      const deadlineTimestamp = extractDateAsTimestamp(text);
      
      if (!targetAmount || !validateAmount(targetAmount)) {
        callback?.({
          text: `❌ Debes especificar un monto válido para la meta de ahorro (entre 1 y 1,000,000). Ejemplo: 'Crear ahorro meta 1000 para vacaciones antes del 2025-12-31'`,
          content: {}
        });
        return false;
      }
      
      if (!deadlineTimestamp) {
        callback?.({
          text: `❌ Debes especificar una fecha válida para la meta de ahorro (formato YYYY-MM-DD o DD/MM/YYYY). Ejemplo: 'Crear ahorro meta 1000 para vacaciones antes del 2024-12-31'`,
          content: {}
        });
        return false;
      }
      
      if (!validateDateFormat(text)) {
        callback?.({
          text: `❌ La fecha debe ser futura y dentro de un rango razonable (máximo 10 años). Ejemplo: 'Crear ahorro meta 1000 para vacaciones antes del 2025-12-31'`,
          content: {}
        });
        return false;
      }
      
      const deadline = deadlineTimestamp.toString();
      const provider = new RpcProvider({ nodeUrl: process.env.STARKNET_RPC_URL! });
      const contract = new IndividualSavingsContract(provider);
      const formattedAmount = formatAmountForContract(targetAmount);
      const tx = await contract.createSavingsGoal(goalId, formattedAmount, deadline, description);
      
      const displayDate = new Date(deadlineTimestamp * 1000).toLocaleDateString();
      callback?.({
        text: `🎯 ¡Meta de ahorro personal creada! Monto objetivo: ${targetAmount}. Descripción: ${description}. Fecha límite: ${displayDate}`,
        content: { tx, goalId, deadline: deadlineTimestamp }
      });
      return true;
    } catch (error: any) {
      elizaLogger.error("Error creando meta de ahorro personal:", error);
      callback?.({
        text: `❌ Error creando meta de ahorro personal: ${error.message}`,
        content: { error: error.message }
      });
      return false;
    }
  },
  examples: [
    [
      { user: "{{user1}}", content: { text: "Crear ahorro meta 1000 para vacaciones antes del 2025-12-31" } },
      { user: "{{agent}}", content: { text: "🎯 ¡Meta de ahorro personal creada! Monto objetivo: 1000. Descripción: para vacaciones" } }
    ]
  ]
};

export const depositToPersonalSavingsAction: Action = {
  name: "DEPOSIT_TO_PERSONAL_SAVINGS",
  similes: ["DEPOSITAR_AHORRO", "DEPOSITAR_EN_META", "DEPOSIT_TO_SAVINGS", "DEPOSITAR_ALCANCIA", "DEPOSITAR_ALCANCÍA", "DEPOSITAR_GUARDADITO", "METER_ALCANCIA", "METER_ALCANCÍA", "AHORRAR_GUARDADITO"],
  description: "Deposita fondos en una meta de ahorro personal.",
  validate: async (_runtime, message) => {
    const text = message.content?.text?.toLowerCase() || "";
    return text.includes("depositar") && 
           (text.includes("ahorro") || text.includes("alcancia") || text.includes("alcancía") || text.includes("guardadito")) && 
           !text.includes("grupo");
  },
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: { [key: string]: unknown },
    callback?: HandlerCallback
  ) => {
    try {
      const text = message.content?.text || "";
      const amount = extractAmount(text) || "0";
      const goalId = extractGoalId(text) || Date.now().toString();
      
      if (!validateAmount(amount)) {
        callback?.({
          text: `❌ Debes especificar un monto válido para depositar (entre 1 y 1,000,000). Ejemplo: 'Depositar 50 en mi ahorro meta 1'`,
          content: {}
        });
        return false;
      }
      
      const provider = new RpcProvider({ nodeUrl: process.env.STARKNET_RPC_URL! });
      const contract = new IndividualSavingsContract(provider);
      const formattedAmount = formatAmountForContract(amount);
      const tx = await contract.deposit(goalId, formattedAmount);
      callback?.({
        text: `💸 Depósito de ${amount} realizado en tu meta de ahorro personal (ID: ${goalId})`,
        content: { tx }
      });
      return true;
    } catch (error: any) {
      elizaLogger.error("Error depositando en ahorro personal:", error);
      callback?.({
        text: `❌ Error depositando en ahorro personal: ${error.message}`,
        content: { error: error.message }
      });
      return false;
    }
  },
  examples: [
    [
      { user: "{{user1}}", content: { text: "Depositar 50 en mi ahorro meta 1" } },
      { user: "{{agent}}", content: { text: "💸 Depósito de 50 realizado en tu meta de ahorro personal (ID: 1)" } }
    ]
  ]
};

export const createGroupSavingsAction: Action = {
  name: "CREATE_GROUP_SAVINGS",
  similes: ["CREAR_AHORRO_GRUPAL", "NUEVO_GRUPO_AHORRO", "CREATE_GROUP_SAVINGS", "CREAR_ALCANCIA_GRUPAL", "CREAR_ALCANCÍA_GRUPAL", "GUARDADITO_GRUPAL", "AHORRO_COMPAS", "AHORRO_AMIGOS", "ALCANCIA_COMPAS", "ALCANCÍA_AMIGOS", "GUARDADITO_COMPAS", "GUARDADITO_AMIGOS"],
  description: "Crea un nuevo grupo de ahorro en Starknet.",
  validate: async (_runtime, message) => {
    const text = message.content?.text?.toLowerCase() || "";
    return (text.includes("ahorro") || text.includes("alcancia") || text.includes("alcancía") || text.includes("guardadito")) && 
           (text.includes("grupo") || text.includes("compas") || text.includes("amigos"));
  },
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: { [key: string]: unknown },
    callback?: HandlerCallback
  ) => {
    try {
      const text = message.content?.text || "";
      const groupId = Date.now().toString();
      const groupName = extractDescription(text) || `Grupo ${groupId}`;
      
      // Extract members from wallet addresses or usernames in the message
      let members = extractWalletAddresses(text);
      
      // If no wallet addresses found, try to extract usernames and prompt for wallets
      if (members.length === 0) {
        const usernames = extractMemberUsernames(text);
        if (usernames.length > 0) {
          callback?.({
            text: `👥 He detectado estos miembros: @${usernames.join(', @')}. Por favor, proporciona las direcciones de wallet de cada miembro para continuar con la creación del grupo.`,
            content: { 
              groupName,
              pendingMembers: usernames,
              needsWallets: true 
            }
          });
          return false;
        }
        
        // Default fallback - include current user's wallet
        const currentUserWallet = getCurrentUserWallet(runtime, message);
        members = [currentUserWallet];
      }
      
      const provider = new RpcProvider({ nodeUrl: process.env.STARKNET_RPC_URL! });
      const contract = new GroupSavingsContract(provider);
      const tx = await contract.registerGroup(groupId, groupName, members);
      callback?.({
        text: `👥 ¡Grupo de ahorro creado! Nombre: ${groupName}. ID: ${groupId}. Miembros: ${members.length}`,
        content: { tx, members }
      });
      return true;
    } catch (error: any) {
      elizaLogger.error("Error creando grupo de ahorro:", error);
      callback?.({
        text: `❌ Error creando grupo de ahorro: ${error.message}`,
        content: { error: error.message }
      });
      return false;
    }
  },
  examples: [
    [
      { user: "{{user1}}", content: { text: "Crear grupo de ahorro para vacaciones" } },
      { user: "{{agent}}", content: { text: "👥 ¡Grupo de ahorro creado! Nombre: para vacaciones. ID: <id>" } }
    ]
  ]
};

export const depositToGroupSavingsAction: Action = {
  name: "DEPOSIT_TO_GROUP_SAVINGS",
  similes: ["DEPOSITAR_AHORRO_GRUPAL", "DEPOSITAR_EN_GRUPO", "DEPOSIT_TO_GROUP_SAVINGS", "DEPOSITAR_ALCANCIA_GRUPAL", "DEPOSITAR_ALCANCÍA_GRUPAL", "DEPOSITAR_GUARDADITO_GRUPAL", "DEPOSITAR_COMPAS", "DEPOSITAR_AMIGOS", "METER_ALCANCIA_GRUPO", "METER_ALCANCÍA_GRUPO"],
  description: "Deposita fondos en un grupo de ahorro.",
  validate: async (_runtime, message) => {
    const text = message.content?.text?.toLowerCase() || "";
    return text.includes("depositar") && 
           (text.includes("grupo") || text.includes("compas") || text.includes("amigos")) &&
           (text.includes("ahorro") || text.includes("alcancia") || text.includes("alcancía") || text.includes("guardadito"));
  },
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: { [key: string]: unknown },
    callback?: HandlerCallback
  ) => {
    try {
      const text = message.content?.text || "";
      const groupId = extractGroupId(text) || "default"; // Extract group ID or use default
      const member = getCurrentUserWallet(runtime, message); // Get current user's wallet
      const amount = extractAmount(text) || "0";
      
      // Validate amount
      if (!validateAmount(amount)) {
        callback?.({
          text: `❌ Debes especificar un monto válido para depositar (entre 1 y 1,000,000). Ejemplo: 'Depositar 100 en grupo vacaciones'`,
          content: {}
        });
        return false;
      }
      
      // Validate that we have a proper wallet address
      if (member === "0x0") {
        callback?.({
          text: `❌ No se pudo obtener tu dirección de wallet. Por favor, configura tu wallet primero.`,
          content: { error: "Wallet not configured" }
        });
        return false;
      }
      
      const provider = new RpcProvider({ nodeUrl: process.env.STARKNET_RPC_URL! });
      const contract = new GroupSavingsContract(provider);
      const formattedAmount = formatAmountForContract(amount);
      const tx = await contract.save(groupId, member, formattedAmount);
      callback?.({
        text: `💸 Depósito de ${amount} realizado en el grupo de ahorro (ID: ${groupId}) desde tu wallet ${member.substring(0, 10)}...`,
        content: { tx, member, groupId }
      });
      return true;
    } catch (error: any) {
      elizaLogger.error("Error depositando en grupo de ahorro:", error);
      callback?.({
        text: `❌ Error depositando en grupo de ahorro: ${error.message}`,
        content: { error: error.message }
      });
      return false;
    }
  },
  examples: [
    [
      { user: "{{user1}}", content: { text: "Depositar 100 en grupo vacaciones" } },
      { user: "{{agent}}", content: { text: "💸 Depósito de 100 realizado en el grupo de ahorro (ID: vacaciones)" } }
    ]
  ]
}; 
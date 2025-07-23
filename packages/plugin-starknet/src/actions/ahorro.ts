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

// --- Helpers to extract info from text (simple, can be improved) ---
function extractAmount(text: string): string | null {
  const match = text.match(/\b(\d+(?:\.\d+)?)\b/);
  return match ? match[1] : null;
}
function extractGoalId(text: string): string | null {
  const match = text.match(/meta\s*(\d+)/i);
  return match ? match[1] : null;
}
function extractGroupId(text: string): string | null {
  const match = text.match(/grupo\s*(\w+)/i);
  return match ? match[1] : null;
}
function extractDescription(text: string): string {
  return text.replace(/meta\s*\d+/i, "").replace(/grupo\s*\w+/i, "").trim();
}

// --- Individual/Personal Savings Actions ---
export const createPersonalSavingsGoalAction: Action = {
  name: "CREATE_PERSONAL_SAVINGS_GOAL",
  similes: ["CREAR_AHORRO_PERSONAL", "NUEVA_META_AHORRO", "CREATE_SAVINGS_GOAL", "NUEVO_OBJETIVO_AHORRO"],
  description: "Crea una nueva meta de ahorro personal en Starknet.",
  validate: async (_runtime, message) => {
    const text = message.content?.text?.toLowerCase() || "";
    return text.includes("ahorro") && text.includes("meta") && !text.includes("grupo");
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
      const targetAmount = extractAmount(text) || "0";
      const description = extractDescription(text);
      const goalId = Date.now().toString();
      const deadline = "2024-12-31"; // TODO: extract from text if needed
      const provider = new RpcProvider({ nodeUrl: process.env.STARKNET_RPC_URL! });
      const contract = new IndividualSavingsContract(provider);
      const tx = await contract.createSavingsGoal(goalId, targetAmount, deadline, description);
      callback?.({
        text: `🎯 ¡Meta de ahorro personal creada! Monto objetivo: ${targetAmount}. Descripción: ${description}`,
        content: { tx }
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
      { user: "{{user1}}", content: { text: "Crear ahorro meta 1000 para vacaciones" } },
      { user: "{{agent}}", content: { text: "🎯 ¡Meta de ahorro personal creada! Monto objetivo: 1000. Descripción: para vacaciones" } }
    ]
  ]
};

export const depositToPersonalSavingsAction: Action = {
  name: "DEPOSIT_TO_PERSONAL_SAVINGS",
  similes: ["DEPOSITAR_AHORRO", "DEPOSITAR_EN_META", "DEPOSIT_TO_SAVINGS"],
  description: "Deposita fondos en una meta de ahorro personal.",
  validate: async (_runtime, message) => {
    const text = message.content?.text?.toLowerCase() || "";
    return text.includes("depositar") && text.includes("ahorro") && !text.includes("grupo");
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
      const goalId = extractGoalId(text) || "1"; // TODO: improve extraction
      const provider = new RpcProvider({ nodeUrl: process.env.STARKNET_RPC_URL! });
      const contract = new IndividualSavingsContract(provider);
      const tx = await contract.deposit(goalId, amount);
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

// --- Group Savings Actions ---
export const createGroupSavingsAction: Action = {
  name: "CREATE_GROUP_SAVINGS",
  similes: ["CREAR_AHORRO_GRUPAL", "NUEVO_GRUPO_AHORRO", "CREATE_GROUP_SAVINGS"],
  description: "Crea un nuevo grupo de ahorro en Starknet.",
  validate: async (_runtime, message) => {
    const text = message.content?.text?.toLowerCase() || "";
    return text.includes("ahorro") && text.includes("grupo");
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
      const members = ["0xMEMBER1", "0xMEMBER2"]; // TODO: extract from context or text
      const provider = new RpcProvider({ nodeUrl: process.env.STARKNET_RPC_URL! });
      const contract = new GroupSavingsContract(provider);
      const tx = await contract.registerGroup(groupId, groupName, members);
      callback?.({
        text: `👥 ¡Grupo de ahorro creado! Nombre: ${groupName}. ID: ${groupId}`,
        content: { tx }
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
  similes: ["DEPOSITAR_AHORRO_GRUPAL", "DEPOSITAR_EN_GRUPO", "DEPOSIT_TO_GROUP_SAVINGS"],
  description: "Deposita fondos en un grupo de ahorro.",
  validate: async (_runtime, message) => {
    const text = message.content?.text?.toLowerCase() || "";
    return text.includes("depositar") && text.includes("grupo");
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
      const groupId = extractGroupId(text) || "1"; // TODO: improve extraction
      const member = "0xMEMBER"; // TODO: extract from context/session
      const amount = extractAmount(text) || "0";
      const provider = new RpcProvider({ nodeUrl: process.env.STARKNET_RPC_URL! });
      const contract = new GroupSavingsContract(provider);
      const tx = await contract.save(groupId, member, amount);
      callback?.({
        text: `💸 Depósito de ${amount} realizado en el grupo de ahorro (ID: ${groupId})`,
        content: { tx }
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
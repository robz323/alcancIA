import { Contract, Provider, Account } from "starknet";
import groupSavingsAbi from "../../ABIs/groupsavings_groupsavings.contract_class.json";
import individualSavingsAbi from "../../ABIs/groupsavings_individualsavings.contract_class.json";
import yieldManagerAbi from "../../ABIs/groupsavings_yieldmanager.contract_class.json";

function getContract(abi: any, address: string, provider: Provider | Account) {
  return new Contract(abi, address, provider);
}

export function getGroupSavingsAddress(): string {
  const addr = process.env.GROUPSAVINGS_CONTRACT_ADDRESS;
  if (!addr) throw new Error("GROUPSAVINGS_CONTRACT_ADDRESS env var not set");
  return addr;
}
export function getIndividualSavingsAddress(): string {
  const addr = process.env.INDIVIDUALSAVINGS_CONTRACT_ADDRESS;
  if (!addr) throw new Error("INDIVIDUALSAVINGS_CONTRACT_ADDRESS env var not set");
  return addr;
}
export function getYieldManagerAddress(): string {
  const addr = process.env.YIELDMANAGER_CONTRACT_ADDRESS;
  if (!addr) throw new Error("YIELDMANAGER_CONTRACT_ADDRESS env var not set");
  return addr;
}

// ===================== GroupSavings Contract =====================
export class GroupSavingsContract {
  contract: Contract;
  constructor(provider: Provider | Account, address?: string) {
    const contractAddress = address || getGroupSavingsAddress();
    this.contract = getContract(groupSavingsAbi, contractAddress, provider);
  }

  async registerGroup(groupId: string, name: string, members: string[]) {
    return this.contract.register_group(groupId, name, members);
  }
  async save(groupId: string, member: string, amount: string) {
    return this.contract.save(groupId, member, amount);
  }
  async getGroupTotal(groupId: string) {
    return this.contract.get_group_total(groupId);
  }
  async getMemberSavings(groupId: string, member: string) {
    return this.contract.get_member_savings(groupId, member);
  }
  async getGroupMember(groupId: string, index: number) {
    return this.contract.get_group_member(groupId, index);
  }
  async getGroupSize(groupId: string) {
    return this.contract.get_group_size(groupId);
  }
}

// ===================== IndividualSavings Contract =====================
export class IndividualSavingsContract {
  contract: Contract;
  constructor(provider: Provider | Account, address?: string) {
    const contractAddress = address || getIndividualSavingsAddress();
    this.contract = getContract(individualSavingsAbi, contractAddress, provider);
  }

  async createSavingsGoal(goalId: string, targetAmount: string, deadline: string, description: string) {
    return this.contract.create_savings_goal(goalId, targetAmount, deadline, description);
  }
  async deposit(goalId: string, amount: string) {
    return this.contract.deposit(goalId, amount);
  }
  async withdraw(goalId: string, amount: string) {
    return this.contract.withdraw(goalId, amount);
  }
  async completeGoal(goalId: string) {
    return this.contract.complete_goal(goalId);
  }
  async getGoalInfo(goalId: string) {
    return this.contract.get_goal_info(goalId);
  }
  async getGoalProgress(goalId: string) {
    return this.contract.get_goal_progress(goalId);
  }
  async getUserGoals(user: string) {
    return this.contract.get_user_goals(user);
  }
  async getGoalCount(user: string) {
    return this.contract.get_goal_count(user);
  }
  async applyPenalty(goalId: string, penaltyAmount: string) {
    return this.contract.apply_penalty(goalId, penaltyAmount);
  }
  async applyBonus(goalId: string, bonusAmount: string) {
    return this.contract.apply_bonus(goalId, bonusAmount);
  }
  async getPenalties(goalId: string) {
    return this.contract.get_penalties(goalId);
  }
  async getBonuses(goalId: string) {
    return this.contract.get_bonuses(goalId);
  }
  async setOwner(newOwner: string) {
    return this.contract.set_owner(newOwner);
  }
  async getOwner() {
    return this.contract.get_owner();
  }
}

// ===================== YieldManager Contract =====================
export class YieldManagerContract {
  contract: Contract;
  constructor(provider: Provider | Account, address?: string) {
    const contractAddress = address || getYieldManagerAddress();
    this.contract = getContract(yieldManagerAbi, contractAddress, provider);
  }

  async deposit(from: string, user: string, amount: string) {
    return this.contract.deposit(from, user, amount);
  }
  async updateStrategy(newStrategy: string) {
    return this.contract.update_strategy(newStrategy);
  }
  async distributeYield() {
    return this.contract.distribute_yield();
  }
  async getUserBalance(user: string) {
    return this.contract.get_user_balance(user);
  }
  async getStrategy() {
    return this.contract.get_strategy();
  }
  async getUserYield(user: string) {
    return this.contract.get_user_yield(user);
  }
  async setAuthorizedCaller(contract: string, isAuth: boolean) {
    return this.contract.set_authorized_caller(contract, isAuth);
  }
  async setPenalty(user: string, amount: string) {
    return this.contract.set_penalty(user, amount);
  }
  async setBonus(user: string, amount: string) {
    return this.contract.set_bonus(user, amount);
  }
  async setAdminForTest(newAdmin: string) {
    return this.contract.set_admin_for_test(newAdmin);
  }
}

// ===================== Suggestions =====================
// - You can extend these classes to add error handling, logging, or custom hooks for your agent.
// - Consider adding type definitions for method arguments/returns for better DX.
// - You can add a factory or registry to manage multiple contract addresses/environments.
// - For agent integration, import these classes and instantiate with the correct address/provider/account.

// Simple interface to avoid dependency issues during build
export interface Content {
  text?: string;
  [key: string]: any;
}

// Tipos base para la API de Capa
export interface CapaConfig {
  apiKey: string;
  webhookSecret: string;
  baseUrl?: string;
  environment?: 'staging' | 'production';
}

// Tipos para usuarios
export interface CapaUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  country: string;
  isVerified: boolean;
  kycStatus: 'pending' | 'approved' | 'rejected' | 'needs_review';
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserRequest {
  externalUserId: string;
  email: string;
}

// Tipos para transacciones
export interface CapaTransaction {
  id: string;
  userId: string;
  type: 'on_ramp' | 'off_ramp';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  fiatAmount: number;
  fiatCurrency: string;
  cryptoAmount: number;
  cryptoCurrency: string;
  rate: number;
  fees: number;
  walletAddress?: string;
  paymentMethod?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  failureReason?: string;
}

export interface OnRampRequest {
  userId: string;
  fiatAmount: number;
  fiatCurrency: string;
  cryptoCurrency: string;
  walletAddress: string;
  paymentMethod?: string;
}

export interface OffRampRequest {
  userId: string;
  cryptoAmount: number;
  cryptoCurrency: string;
  fiatCurrency: string;
  bankAccount?: BankAccount;
}

export interface BankAccount {
  accountNumber: string;
  routingNumber: string;
  accountType: 'checking' | 'savings';
  bankName: string;
}

// Tipos para webhooks
export interface WebhookEvent {
  id: string;
  type: 'transaction.created' | 'transaction.updated' | 'transaction.completed' | 'transaction.failed' | 'kyc.approved' | 'kyc.rejected';
  data: CapaTransaction | CapaUser;
  timestamp: string;
  signature: string;
}

// Tipos para actions de Eliza
export interface OnRampContent extends Content {
  userId?: string;
  email?: string;
  fiatAmount?: number;
  fiatCurrency?: string;
  cryptoCurrency?: string;
  walletAddress?: string;
}

export interface OffRampContent extends Content {
  userId?: string;
  email?: string;
  cryptoAmount?: number;
  cryptoCurrency?: string;
  fiatCurrency?: string;
  bankAccount?: BankAccount;
}

export interface CreateUserContent extends Content {
  email?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  country?: string;
}

// Tipos para respuestas de API
export interface CapaApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

// Tipos para rates y fees
export interface ExchangeRate {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  fees: number;
  timestamp: string;
  expiresAt: string;
}

// Tipos para KYC
export interface KYCLinkRequest {
  userId: string;
  country: string;
  partnerRedirectUri?: string;
}

export interface KYCLinkResponse {
  kycLink: string;
  userId: string;
  country: string;
  expiresAt: string;
}

export interface KYCDetails {
  userId: string;
  status: 'pending' | 'approved' | 'rejected' | 'needs_review';
  verificationId?: string;
  completedAt?: string;
  documents?: {
    type: string;
    status: string;
    url?: string;
  }[];
}

// Tipos para países soportados
export interface CountryInfo {
  code: string;
  name: string;
  supportedCurrencies: string[];
  supportedCryptos: string[];
  minimumAmounts: Record<string, number>;
  maximumAmounts: Record<string, number>;
}

// Constantes
export const SUPPORTED_FIAT_CURRENCIES = ['MXN', 'DOP'] as const;
export const SUPPORTED_CRYPTO_CURRENCIES = ['USDC', 'USDT', 'BTC', 'ETH'] as const;
export const SUPPORTED_COUNTRIES = ['MX', 'DO'] as const;

export type SupportedFiatCurrency = typeof SUPPORTED_FIAT_CURRENCIES[number];
export type SupportedCryptoCurrency = typeof SUPPORTED_CRYPTO_CURRENCIES[number];
export type SupportedCountryCode = typeof SUPPORTED_COUNTRIES[number]; 
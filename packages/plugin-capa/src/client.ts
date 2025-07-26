import axios, { AxiosInstance } from 'axios';
import { createHmac, timingSafeEqual } from 'crypto';
import type {
  CapaConfig,
  CapaUser,
  CreateUserRequest,
  CapaTransaction,
  OnRampRequest,
  OffRampRequest,
  CapaApiResponse,
  ExchangeRate,
  WebhookEvent,
  KYCLinkRequest,
  KYCLinkResponse,
  KYCDetails
} from './types';

export class CapaClient {
  private client: AxiosInstance;
  private webhookSecret: string;

  constructor(config: CapaConfig) {
    const baseURL = config.baseUrl || 
      (config.environment === 'production' 
        ? 'https://api.capa.fi' 
        : 'https://staging-api.capa.fi');

    this.client = axios.create({
      baseURL,
      headers: {
        'partner-api-key': config.apiKey, // Changed from Authorization to partner-api-key
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    this.webhookSecret = config.webhookSecret;

    // Request interceptor para logging
    this.client.interceptors.request.use(
      (config) => {
        console.log(`🌐 Capa API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor para logging y manejo de errores
    this.client.interceptors.response.use(
      (response) => {
        console.log(`✅ Capa API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        console.error(`❌ Capa API Error: ${error.response?.status} ${error.response?.data?.message || error.message}`);
        return Promise.reject(error);
      }
    );
  }

  // USUARIOS
  /**
   * Crear un nuevo usuario
   */
  async createUser(userData: CreateUserRequest): Promise<CapaApiResponse<CapaUser>> {
    try {
      const response = await this.client.post('/api/partner/v2/users', userData);
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  /**
   * Obtener información de un usuario
   */
  async getUser(userId: string): Promise<CapaApiResponse<CapaUser>> {
    try {
      const response = await this.client.get(`/api/partner/v2/users/${userId}`);
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  /**
   * Obtener usuario por email - NOT AVAILABLE IN V2
   * En V2, necesitamos crear el usuario directamente
   */
  async getUserByEmail(email: string): Promise<CapaApiResponse<CapaUser>> {
    // En V2, no existe este endpoint, retornamos error
    return {
      success: false,
      error: {
        code: "ENDPOINT_NOT_AVAILABLE",
        message: "getUserByEmail not available in V2 API"
      }
    };
  }

  /**
   * Iniciar proceso de verificación KYC
   */
  async startKyc(userId: string): Promise<CapaApiResponse<{ verificationUrl: string }>> {
    try {
      const response = await this.client.post(`/api/partner/v2/users/${userId}/kyc/start`);
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  /**
   * Generar link de verificación KYC
   */
  async generateKYCLink(kycRequest: KYCLinkRequest): Promise<CapaApiResponse<KYCLinkResponse>> {
    try {
      const response = await this.client.post(`/api/partner/v2/users/${kycRequest.userId}/kyc/verification-link`, {
        country: kycRequest.country,
        partnerRedirectUri: kycRequest.partnerRedirectUri
      });
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  /**
   * Obtener detalles de KYC
   */
  async getKYCDetails(userId: string): Promise<CapaApiResponse<KYCDetails>> {
    try {
      const response = await this.client.get(`/api/partner/v2/kyc/details?userId=${userId}`);
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  // TRANSACCIONES
  /**
   * Crear transacción On-Ramp (Fiat → Crypto)
   */
  async createOnRamp(onRampData: OnRampRequest): Promise<CapaApiResponse<CapaTransaction>> {
    try {
      const response = await this.client.post('/api/partner/v2/on-ramp', onRampData);
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  /**
   * Crear transacción Off-Ramp (Crypto → Fiat)
   */
  async createOffRamp(offRampData: OffRampRequest): Promise<CapaApiResponse<CapaTransaction>> {
    try {
      const response = await this.client.post('/api/partner/v2/off-ramp', offRampData);
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  /**
   * Obtener transacción por ID
   */
  async getTransaction(transactionId: string): Promise<CapaApiResponse<CapaTransaction>> {
    try {
      const response = await this.client.get(`/api/partner/v2/transactions/${transactionId}`);
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  /**
   * Obtener transacciones de un usuario
   */
  async getUserTransactions(userId: string, limit = 50, offset = 0): Promise<CapaApiResponse<CapaTransaction[]>> {
    try {
      const response = await this.client.get('/api/partner/v2/transactions', {
        params: {
          userId,
          limit,
          offset
        }
      });
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  /**
   * Cancelar transacción
   */
  async cancelTransaction(transactionId: string): Promise<CapaApiResponse<CapaTransaction>> {
    try {
      const response = await this.client.put(`/api/partner/v2/transactions/${transactionId}/cancel`);
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  /**
   * Obtener cotización de cambio
   */
  async getExchangeRate(fromCurrency: string, toCurrency: string, amount: number): Promise<CapaApiResponse<ExchangeRate>> {
    try {
      const response = await this.client.get('/api/partner/v2/quotes', {
        params: {
          from: fromCurrency,
          to: toCurrency,
          amount
        }
      });
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  // WEBHOOKS
  /**
   * Validar firma de webhook
   */
  validateWebhookSignature(payload: string, signature: string): boolean {
    try {
      const expectedSignature = createHmac('sha256', this.webhookSecret)
        .update(payload)
        .digest('hex');
      
      return timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      console.error('Error validando firma de webhook:', error);
      return false;
    }
  }

  /**
   * Procesar evento de webhook
   */
  processWebhookEvent(payload: string, signature: string): WebhookEvent | null {
    if (!this.validateWebhookSignature(payload, signature)) {
      console.error('Firma de webhook inválida');
      return null;
    }

    try {
      return JSON.parse(payload) as WebhookEvent;
    } catch (error) {
      console.error('Error parseando payload de webhook:', error);
      return null;
    }
  }

  // UTILIDADES
  /**
   * Verificar estado de la API
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  /**
   * Manejo centralizado de errores
   */
  private handleError(error: any): CapaApiResponse<any> {
    if (error.response) {
      // Error de respuesta HTTP
      return {
        success: false,
        error: {
          code: error.response.status.toString(),
          message: error.response.data?.message || error.message,
          details: error.response.data
        }
      };
    } else if (error.request) {
      // Error de red
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: 'Error de conexión con la API de Capa'
        }
      };
    } else {
      // Error desconocido
      return {
        success: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message: error.message || 'Error desconocido'
        }
      };
    }
  }
} 
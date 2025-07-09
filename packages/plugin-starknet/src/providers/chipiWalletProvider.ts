import { ChipiSDK, type CreateWalletParams, type CreateWalletResponse } from '@chipi-pay/chipi-sdk'
import { elizaLogger } from '@elizaos/core'

interface ChipiWalletProviderOptions {
  apiPublicKey: string
}

export class ChipiWalletProvider {
  private chipi: ChipiSDK

  constructor(options: ChipiWalletProviderOptions) {
    console.log('🏗️ ChipiWalletProvider constructor ejecutándose')
    if (!options.apiPublicKey) throw new Error('API Public Key is required')
    
    try {
      console.log('📦 Instanciando ChipiSDK...')
      this.chipi = new ChipiSDK({
        apiPublicKey: options.apiPublicKey
      })
      console.log('✅ ChipiSDK instanciado exitosamente')
    } catch (error) {
      console.error('❌ Error al instanciar ChipiSDK:', error)
      throw new Error(`Error initializing ChipiSDK: ${error}`)
    }
  }

  async createWallet(params: CreateWalletParams): Promise<CreateWalletResponse> {
    try {
      console.log('🔧 ChipiWalletProvider.createWallet iniciando...')
      
      // Validación básica de parámetros
      if (!params.bearerToken) throw new Error('Bearer token is required')
      if (!params.encryptKey) throw new Error('Encryption key is required')
      
      // Log de parámetros (sin información sensible)
      console.log('📋 Parámetros recibidos:', {
        hasBearerToken: !!params.bearerToken,
        hasEncryptKey: !!params.encryptKey,
        hasApiPublicKeyParam: !!params.apiPublicKey,
        hasNodeUrlParam: !!params.nodeUrl,
        envApiPublicKey: process.env.CHIPI_API_PUBLIC_KEY ? '[PRESENT]' : '[MISSING]',
        envNodeUrl: process.env.STARKNET_RPC_URL ? '[PRESENT]' : '[MISSING]'
      })
      
      elizaLogger.log('Iniciando creación de wallet con:', {
        hasBearerToken: !!params.bearerToken,
        hasEncryptKey: !!params.encryptKey,
        apiPublicKey: process.env.CHIPI_API_PUBLIC_KEY ? '[PRESENT]' : '[MISSING]',
        nodeUrl: process.env.STARKNET_RPC_URL ? '[PRESENT]' : '[MISSING]'
      })

      // Crear wallet con parámetros mínimos
      const walletParams: CreateWalletParams = {
        bearerToken: params.bearerToken,
        encryptKey: params.encryptKey,
        apiPublicKey: params.apiPublicKey || process.env.CHIPI_API_PUBLIC_KEY!,
        nodeUrl: params.nodeUrl || process.env.STARKNET_RPC_URL || 'https://starknet-mainnet.infura.io/v3/'
      }

      console.log('🚀 Llamando a this.chipi.createWallet con:', {
        bearerToken: walletParams.bearerToken,
        encryptKeyLength: walletParams.encryptKey.length,
        apiPublicKeyLength: walletParams.apiPublicKey?.length || 0,
        nodeUrl: walletParams.nodeUrl
      })
      
      // Intentar crear la wallet
      const response = await this.chipi.createWallet(walletParams)
      
      console.log('✅ Respuesta exitosa de ChipiSDK:', response)
      
      // Log de respuesta exitosa
      elizaLogger.log('Wallet creada exitosamente:', {
        response: JSON.stringify(response, null, 2)
      })

      return response
    } catch (error: any) {
      console.error('❌ Error en ChipiWalletProvider.createWallet:', {
        name: error?.name || 'Unknown',
        message: error?.message || 'Unknown error',
        originalError: error,
        errorType: typeof error,
        errorString: String(error)
      })
      
      // Log detallado del error
      elizaLogger.error('Error al crear wallet:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        params: {
          hasBearerToken: !!params.bearerToken,
          hasEncryptKey: !!params.encryptKey
        }
      })
      
      // Crear un error más descriptivo
      const errorMessage = error?.message || 'Error desconocido en ChipiSDK'
      throw new Error(`🔴 CHIPI WALLET ERROR CUSTOM MESSAGE: ${errorMessage}`)
    }
  }
} 
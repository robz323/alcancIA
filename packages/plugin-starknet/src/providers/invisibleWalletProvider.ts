import { elizaLogger } from '@elizaos/core'
import { Account, RpcProvider, CallData, hash, ec, num, Contract } from 'starknet'
import crypto from 'crypto'

export interface InvisibleWalletData {
  address: string
  privateKey: string
  publicKey: string
  email: string
  isDeployed: boolean
  deploymentHash?: string
}

export interface CreateInvisibleWalletParams {
  email: string
  pin: string
  rpcUrl?: string
}

export class InvisibleWalletProvider {
  private rpcProvider: RpcProvider

  constructor(rpcUrl?: string) {
    this.rpcProvider = new RpcProvider({
      nodeUrl: rpcUrl || process.env.STARKNET_RPC_URL || 'https://starknet-mainnet.public.blastapi.io'
    })
  }

  /**
   * Verifica si una wallet ya existe (desplegada o con balance)
   */
  async walletExists(email: string, pin: string): Promise<boolean> {
    try {
      // Generar private key determinísticamente usando email + PIN
      const seed = this.generateDeterministicSeed(email, pin)
      const privateKey = this.generatePrivateKeyFromSeed(seed)
      const publicKey = ec.starkCurve.getStarkKey(privateKey)
      
      // Calcular la dirección de la cuenta
      const address = this.calculateAccountAddress(publicKey)
      
      // Verificar si la cuenta está desplegada
      const isDeployed = await this.isAccountDeployed(address)
      if (isDeployed) {
        return true
      }
      
      // Si no está desplegada, verificar si tiene balance
      const balance = await this.getBalance(address)
      return parseFloat(balance) > 0
    } catch (error) {
      console.error('Error verificando existencia de wallet:', error)
      return false
    }
  }

  /**
   * Crea una wallet invisible usando solo email y PIN
   */
  async createInvisibleWallet(params: CreateInvisibleWalletParams): Promise<InvisibleWalletData> {
    try {
      console.log('🔧 InvisibleWalletProvider.createInvisibleWallet iniciando...')
      
      // Verificar si ya existe una wallet con este email + PIN
      const exists = await this.walletExists(params.email, params.pin)
      if (exists) {
        throw new Error(`Ya existe una wallet con el email ${params.email} y el PIN proporcionado. Usa la función de recuperación en lugar de crear una nueva.`)
      }
      
      // Generar private key determinísticamente usando email + PIN
      const seed = this.generateDeterministicSeed(params.email, params.pin)
      
      // Generar el keypair usando la seed
      const privateKey = this.generatePrivateKeyFromSeed(seed)
      const publicKey = ec.starkCurve.getStarkKey(privateKey)
      
      console.log('🔑 Claves generadas exitosamente')
      
      // Calcular la dirección de la cuenta usando el patrón estándar de Argent
      const address = this.calculateAccountAddress(publicKey)
      
      console.log('📍 Dirección calculada:', address)
      
      // Verificar si la cuenta ya está desplegada
      const isDeployed = await this.isAccountDeployed(address)
      
      // Si no está desplegada, verificar si tiene balance
      let hasBalance = false
      if (!isDeployed) {
        const balance = await this.getBalance(address)
        hasBalance = parseFloat(balance) > 0
      }
      
      console.log('🏗️ Estado de despliegue:', isDeployed ? 'Desplegada' : 'Sin desplegar')
      console.log('💰 Tiene balance:', hasBalance ? 'Sí' : 'No')
      
      const walletData: InvisibleWalletData = {
        address,
        privateKey: '0x' + privateKey,
        publicKey: '0x' + publicKey,
        email: params.email,
        isDeployed
      }
      
      // Si no está desplegada, podemos desplegarla opcionalmente
      if (!isDeployed) {
        console.log('⚡ La cuenta necesita ser desplegada en la primera transacción')
      }
      
      console.log('✅ Wallet invisible creada exitosamente')
      
      return walletData
      
    } catch (error) {
      console.error('❌ Error al crear wallet invisible:', error)
      elizaLogger.error('Error al crear wallet invisible:', error)
      throw new Error(`Error creating invisible wallet: ${error.message}`)
    }
  }

  /**
   * Recupera una wallet usando email y PIN
   */
  async recoverWallet(email: string, pin: string): Promise<InvisibleWalletData> {
    console.log('🔄 Recuperando wallet para:', email)
    
    // Generar private key determinísticamente usando email + PIN
    const seed = this.generateDeterministicSeed(email, pin)
    const privateKey = this.generatePrivateKeyFromSeed(seed)
    const publicKey = ec.starkCurve.getStarkKey(privateKey)
    
    // Calcular la dirección de la cuenta
    const address = this.calculateAccountAddress(publicKey)
    
    // Verificar si la wallet realmente existe en la blockchain
    const isDeployed = await this.isAccountDeployed(address)
    
    // Si la wallet no está desplegada, verificar si tiene balance
    let hasBalance = false
    if (!isDeployed) {
      const balance = await this.getBalance(address)
      hasBalance = parseFloat(balance) > 0
    }
    
    // Solo considerar como recuperación exitosa si la wallet existe o tiene balance
    if (!isDeployed && !hasBalance) {
      throw new Error(`No se encontró una wallet con el email ${email} y el PIN proporcionado. Verifica que el email y PIN sean correctos.`)
    }
    
    const walletData: InvisibleWalletData = {
      address,
      privateKey: '0x' + privateKey,
      publicKey: '0x' + publicKey,
      email: email,
      isDeployed
    }
    
    console.log('✅ Wallet recuperada exitosamente')
    return walletData
  }

  /**
   * Despliega una cuenta que aún no ha sido desplegada
   */
  async deployAccount(walletData: InvisibleWalletData, fundingTxHash?: string): Promise<string> {
    try {
      console.log('🚀 Desplegando cuenta:', walletData.address)
      
      const account = new Account(this.rpcProvider, walletData.address, walletData.privateKey)
      
      // El hash del constructor para cuentas Argent
      const constructorCalldata = CallData.compile([walletData.publicKey, '0'])
      
      const deployAccountPayload = {
        classHash: '0x01a736d6ed154502257f02b1ccdf4d9d1089f80811cd6acad48e6b6a9d1f2003', // Argent Account class hash
        constructorCalldata,
        contractAddress: walletData.address,
        addressSalt: walletData.publicKey,
      }
      
      const { transaction_hash } = await account.deployAccount(deployAccountPayload)
      
      console.log('✅ Cuenta desplegada con hash:', transaction_hash)
      
      return transaction_hash
      
    } catch (error) {
      console.error('❌ Error al desplegar cuenta:', error)
      throw new Error(`Error deploying account: ${error.message}`)
    }
  }

  /**
   * Genera una seed determinística usando email y PIN
   */
  private generateDeterministicSeed(email: string, pin: string): string {
    // Crear un hash determinístico usando PBKDF2
    const salt = 'starknet-invisible-wallet-salt'
    const iterations = 100000
    const keyLength = 32
    
    const derivedKey = crypto.pbkdf2Sync(
      email + pin, 
      salt, 
      iterations, 
      keyLength, 
      'sha256'
    )
    
    return derivedKey.toString('hex')
  }

  /**
   * Genera una private key desde una seed
   */
  private generatePrivateKeyFromSeed(seed: string): string {
    // Usar la seed para generar una private key válida para Starknet
    const hash = crypto.createHash('sha256').update(seed).digest('hex')
    
    // Asegurar que esté en el rango válido de la curva Stark
    let privateKey = hash
    const starkMaxValue = num.toBigInt('0x800000000000011000000000000000000000000000000000000000000000001')
    while (num.toBigInt('0x' + privateKey) >= starkMaxValue) {
      privateKey = crypto.createHash('sha256').update(privateKey).digest('hex')
    }
    
    return privateKey
  }

  /**
   * Calcula la dirección de cuenta usando el patrón estándar
   */
  private calculateAccountAddress(publicKey: string): string {
    // Hash de clase para cuentas Argent
    const CLASS_HASH = '0x01a736d6ed154502257f02b1ccdf4d9d1089f80811cd6acad48e6b6a9d1f2003'
    
    // Constructor calldata (publicKey, 0)
    const constructorCalldata = [publicKey, '0x0']
    
    // Salt es la public key
    const salt = publicKey
    
    // Calcular la dirección usando el método estándar de Starknet
    const address = hash.calculateContractAddressFromHash(
      salt,
      CLASS_HASH,
      constructorCalldata,
      0 // deployer address (0 para cuentas)
    )
    
    return address
  }

  /**
   * Verifica si una cuenta ya está desplegada en la red
   */
  private async isAccountDeployed(address: string): Promise<boolean> {
    try {
      const classHash = await this.rpcProvider.getClassHashAt(address)
      return classHash !== '0x0'
    } catch (error) {
      // Si la cuenta no existe, getClassHashAt lanza un error
      return false
    }
  }

  /**
   * Obtiene el balance de ETH de una wallet
   */
  async getBalance(address: string): Promise<string> {
    try {
      const ETH_CONTRACT = '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7'
      
      const call = {
        contractAddress: ETH_CONTRACT,
        entrypoint: 'balanceOf',
        calldata: [address]
      }
      
      const response = await this.rpcProvider.callContract(call)
      const balance = num.toBigInt(response[0])
      
      // Convertir de wei a ETH (18 decimales)
      const ethBalance = Number(balance) / Math.pow(10, 18)
      
      return ethBalance.toFixed(6)
      
    } catch (error) {
      console.error('Error obteniendo balance:', error)
      return '0'
    }
  }
} 
# @elizaos/plugin-capa

Plugin de ElizaOS para integrar pagos fiat a crypto usando [Capa](https://docs.capa.fi/docs/getting-started), conectando las finanzas tradicionales con las criptomonedas en América Latina.

## 🌟 Características

- **🔄 On-Ramp**: Compra criptomonedas con fiat (MXN, DOP)
- **💸 Off-Ramp**: Vende criptomonedas por fiat (próximamente)
- **🥷 Integración con Wallets Invisibles**: Compatible con wallets de Starknet
- **🔐 KYC Automático**: Verificación de identidad integrada
- **📱 Webhooks**: Notificaciones en tiempo real
- **🌎 América Latina**: Soporte para México y República Dominicana

## 🚀 Instalación

```bash
pnpm add @elizaos/plugin-capa
```

## ⚙️ Configuración

### Variables de Entorno

```typescript
CAPA_API_KEY=your_api_key_here
CAPA_WEBHOOK_SECRET=your_webhook_secret_here
STARKNET_RPC_URL=your_starknet_rpc_url
```

### Para Staging (Testing)

```typescript
CAPA_API_KEY=a6dccc31-ff03-4703-b105-8dd4b0274b4f:fdf4bb22-6dcb-4910-9a80-c42ecda22dc1
CAPA_WEBHOOK_SECRET=9ac89a54a11d88c88e7316e637f275c32ce275e8c61e24940b301594fb628312
```

### Registro del Plugin

```typescript
import { capaPlugin } from '@elizaos/plugin-capa';

// En tu configuración de ElizaOS
const runtime = new AgentRuntime({
  // ... otras configuraciones
  plugins: [
    capaPlugin,
    // ... otros plugins
  ]
});
```

## 🎯 Actions Disponibles

### 🛒 CAPA_ON_RAMP - Comprar Crypto

Permite a los usuarios comprar criptomonedas usando fiat.

**Palabras clave de activación:**
- `comprar crypto`
- `buy USDC`
- `adquirir bitcoin`
- `peso a crypto`
- `depositar fiat`

**Ejemplos de uso:**

```
Usuario: "Comprar USDC con mi correo usuario@gmail.com usando 1000 pesos"
Bot: "¡Excelente! Creando tu orden de compra de USDC por 1000 MXN..."

Usuario: "Quiero comprar crypto con ana@test.com"
Bot: "¡Perfecto! ¿Cuánto quieres invertir? Ejemplo: 'Comprar con 500 pesos'"
```

**Monedas soportadas:**
- **Fiat**: MXN (Peso Mexicano), DOP (Peso Dominicano)
- **Crypto**: USDC, USDT, BTC, ETH

## 🔧 API Cliente

### CapaClient

```typescript
import { CapaClient, CapaConfig } from '@elizaos/plugin-capa';

const config: CapaConfig = {
  apiKey: 'your-api-key',
  webhookSecret: 'your-webhook-secret',
  environment: 'staging' // o 'production'
};

const client = new CapaClient(config);
```

### Métodos Principales

#### Usuarios

```typescript
// Crear usuario
const user = await client.createUser({
  email: 'usuario@ejemplo.com',
  firstName: 'Juan',
  lastName: 'Pérez',
  country: 'MX'
});

// Obtener usuario
const user = await client.getUserByEmail('usuario@ejemplo.com');

// Iniciar KYC
const kyc = await client.startKyc(userId);
```

#### Transacciones

```typescript
// Crear On-Ramp
const transaction = await client.createOnRamp({
  userId: 'user-id',
  fiatAmount: 1000,
  fiatCurrency: 'MXN',
  cryptoCurrency: 'USDC',
  walletAddress: '0x123...'
});

// Obtener tasa de cambio
const rate = await client.getExchangeRate('MXN', 'USDC', 1000);
```

## 🔐 Integración con Wallets Invisibles

El plugin se integra automáticamente con las **wallets invisibles de Starknet**:

```typescript
// Se crea automáticamente una wallet invisible para el usuario
const walletData = await walletProvider.createInvisibleWallet({
  email: 'usuario@ejemplo.com',
  pin: 'pin-derivado-seguro'
});

// La crypto comprada llega directamente a la wallet invisible
console.log('Wallet destino:', walletData.address);
```

## 📡 Webhooks

### Validación de Firmas

```typescript
const isValid = client.validateWebhookSignature(payload, signature);

if (isValid) {
  const event = client.processWebhookEvent(payload, signature);
  console.log('Evento:', event.type, event.data);
}
```

### Tipos de Eventos

- `transaction.created`: Transacción creada
- `transaction.updated`: Transacción actualizada
- `transaction.completed`: Transacción completada
- `transaction.failed`: Transacción fallida
- `kyc.approved`: KYC aprobado
- `kyc.rejected`: KYC rechazado

## 🌍 Países y Monedas Soportadas

| País | Código | Moneda Fiat | Cryptos Soportadas |
|------|--------|-------------|-------------------|
| 🇲🇽 México | MX | MXN | USDC, USDT, BTC, ETH |
| 🇩🇴 Rep. Dominicana | DO | DOP | USDC, USDT, BTC, ETH |

## 🔄 Flujo de Compra Completo

1. **👤 Usuario solicita compra**: "Comprar USDC con juan@test.com usando 1000 pesos"

2. **🔍 Extracción de datos**:
   - Email: juan@test.com
   - Cantidad: 1000 MXN
   - Crypto objetivo: USDC

3. **👥 Gestión de usuario**:
   - Buscar usuario existente en Capa
   - Si no existe, crear nuevo usuario
   - Verificar estado KYC

4. **🥷 Wallet invisible**:
   - Crear/recuperar wallet invisible de Starknet
   - Usar dirección como destino

5. **💱 Tasa de cambio**:
   - Obtener tasa actual MXN → USDC
   - Calcular cantidad estimada de crypto

6. **🚀 Crear transacción**:
   - Iniciar transacción On-Ramp en Capa
   - Notificar al usuario con detalles

7. **📱 Seguimiento**:
   - Webhooks para actualizaciones
   - Notificaciones de estado

## 🛠️ Desarrollo

### Estructura del Proyecto

```
packages/plugin-capa/
├── src/
│   ├── types.ts          # Tipos TypeScript
│   ├── client.ts         # Cliente HTTP para Capa API
│   ├── actions/
│   │   ├── onRamp.ts     # Action de compra
│   │   └── offRamp.ts    # Action de venta (TODO)
│   └── index.ts          # Exportaciones principales
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── README.md
```

### Scripts Disponibles

```bash
# Desarrollo
pnpm dev

# Build
pnpm build

# Tests
pnpm test

# Linting
pnpm lint
```

## 🔮 Roadmap

- [x] ✅ **On-Ramp básico** - Comprar crypto con fiat
- [ ] 🚧 **Off-Ramp** - Vender crypto por fiat
- [ ] 🚧 **Gestión de usuarios mejorada** - Perfiles completos
- [ ] 🚧 **Límites personalizados** - Configuración por usuario
- [ ] 🚧 **Más países** - Expansión a otros países LATAM
- [ ] 🚧 **Dashboard web** - Interfaz para gestionar transacciones

## 🤝 Contribución

1. Fork el proyecto
2. Crea tu rama de feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 🆘 Soporte

- 📚 **Documentación**: [Capa API Docs](https://docs.capa.fi/docs/getting-started)
- 💬 **Issues**: [GitHub Issues](https://github.com/elizaos/eliza/issues)
- 🌐 **Website**: [ElizaOS](https://elizaos.ai)

---

Desarrollado con ❤️ para conectar América Latina con el futuro financiero 🚀 
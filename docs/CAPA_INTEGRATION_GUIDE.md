# 🚀 Guía de Integración: Plugin Capa + Proyecto Alcancía

Esta guía te explica paso a paso cómo integrar el **plugin de Capa** con el proyecto **alcancIA** para habilitar compras de criptomonedas con fiat en América Latina.

## 📋 Resumen de la Integración

**El plugin Capa conecta:**
- ✅ **Wallets Invisibles de Starknet** (ya implementadas)
- ✅ **API de Capa** (nuevo)
- ✅ **Fiat (MXN/DOP) → Crypto (USDC/BTC/ETH)** (nuevo)

## 🛠️ Paso 1: Instalación del Plugin

### 1.1 Agregar Dependencia

En el archivo `packages/plugin-capa/package.json` ya creado, ejecuta:

```bash
cd packages/plugin-capa
pnpm install
```

### 1.2 Build del Plugin

```bash
cd packages/plugin-capa
pnpm build
```

## ⚙️ Paso 2: Configuración de Variables de Entorno

### 2.1 Variables de Capa (STAGING)

Agrega estas variables al archivo `.env` del proyecto o en las configuraciones del character:

```bash
# Credenciales de Capa (Staging)
CAPA_API_KEY=a6dccc31-ff03-4703-b105-8dd4b0274b4f:fdf4bb22-6dcb-4910-9a80-c42ecda22dc1
CAPA_WEBHOOK_SECRET=9ac89a54a11d88c88e7316e637f275c32ce275e8c61e24940b301594fb628312

# Starknet (ya debería existir)
STARKNET_RPC_URL=https://starknet-mainnet.public.blastapi.io
```

### 2.2 Variables en el Character File

También puedes agregar las variables en tu archivo `characters/*.character.json`:

```json
{
  "name": "jaimito",
  "settings": {
    "CAPA_API_KEY": "a6dccc31-ff03-4703-b105-8dd4b0274b4f:fdf4bb22-6dcb-4910-9a80-c42ecda22dc1",
    "CAPA_WEBHOOK_SECRET": "9ac89a54a11d88c88e7316e637f275c32ce275e8c61e24940b301594fb628312",
    "STARKNET_RPC_URL": "https://starknet-mainnet.public.blastapi.io"
  }
}
```

## 🔌 Paso 3: Registrar el Plugin en el Agente

### 3.1 Modificar `agent/src/index.ts`

Agrega el import del plugin al inicio del archivo:

```typescript
// Agregar después de las otras importaciones de plugins
import { capaPlugin } from "@elizaos/plugin-capa";
```

### 3.2 Agregar Plugin a la Lista

En la configuración de plugins (alrededor de la línea 1021), agrega:

```typescript
plugins: [
    // ... otros plugins existentes ...
    
    // Plugin Capa - Fiat to Crypto para América Latina
    getSecret(character, "CAPA_API_KEY") && getSecret(character, "CAPA_WEBHOOK_SECRET")
        ? capaPlugin
        : null,
        
    // ... resto de plugins ...
]
```

### 3.3 Código Completo de Integración

```typescript
// En agent/src/index.ts

// 1. Import (agregar al inicio)
import { capaPlugin } from "@elizaos/plugin-capa";

// 2. Agregar a plugins (dentro de la función createAgent)
return new AgentRuntime({
    databaseAdapter: db,
    token,
    modelProvider: character.modelProvider,
    evaluators: [],
    character,
    plugins: [
        // ... plugins existentes ...
        
        // Capa Plugin - Fiat to Crypto para LATAM 🌎
        getSecret(character, "CAPA_API_KEY") && getSecret(character, "CAPA_WEBHOOK_SECRET")
            ? capaPlugin
            : null,
            
        // ... resto de plugins ...
    ].filter(Boolean),
    // ... resto de configuración ...
});
```

## 🧪 Paso 4: Testing de la Integración

### 4.1 Verificar Plugin Cargado

Inicia el agente y busca en los logs:

```bash
pnpm start
```

Deberías ver mensajes como:
```
✅ Plugin capa cargado exitosamente
🌐 Capa API conectada: staging environment
```

### 4.2 Probar Funcionalidad Básica

Envía estos mensajes de prueba al bot:

```
Prueba 1: "Crear wallet invisible con test@ejemplo.com PIN 1234"
Respuesta esperada: "¡Wallet invisible creada! 🥷✨"

Prueba 2: "Comprar USDC con test@ejemplo.com usando 100 pesos"  
Respuesta esperada: "¡Orden de compra creada! 🚀💰"
```

## 🔄 Paso 5: Flujo Completo de Usuario

### 5.1 Crear Wallet Invisible

```
Usuario: "Crear wallet invisible con juan@test.com PIN 5678"
Bot: "¡Wallet invisible creada! 🥷 Dirección: 0x123...abc"
```

### 5.2 Comprar Crypto

```
Usuario: "Comprar USDC con juan@test.com usando 1000 pesos"
Bot: "¡Orden creada! 
     💵 Pagas: 1000 MXN
     🪙 Recibes: ~50 USDC  
     📍 Destino: Tu wallet invisible
     🆔 ID: capa-tx-123"
```

### 5.3 Seguimiento de Transacción

Los webhooks de Capa notificarán automáticamente cuando:
- ✅ El pago sea procesado
- ✅ La crypto sea enviada a la wallet
- ❌ Si hay algún error

## 📡 Paso 6: Configuración de Webhooks (Opcional)

Para recibir notificaciones en tiempo real:

### 6.1 URL de Webhook

Configura en Capa Dashboard:
```
Webhook URL: https://tu-dominio.com/webhooks/capa
Secret: 9ac89a54a11d88c88e7316e637f275c32ce275e8c61e24940b301594fb628312
```

### 6.2 Endpoint de Webhook

Puedes crear un endpoint en tu aplicación:

```typescript
// En tu servidor web
app.post('/webhooks/capa', (req, res) => {
  const signature = req.headers['x-capa-signature'];
  const payload = JSON.stringify(req.body);
  
  if (capaClient.validateWebhookSignature(payload, signature)) {
    const event = capaClient.processWebhookEvent(payload, signature);
    
    // Procesar evento
    console.log('Evento Capa:', event.type, event.data);
    
    // Notificar al usuario
    if (event.type === 'transaction.completed') {
      // Enviar mensaje al usuario de que su crypto está lista
    }
  }
  
  res.status(200).send('OK');
});
```

## 🌍 Paso 7: Países y Monedas Soportadas

### 7.1 Configuración por País

```typescript
// México
Usuario: "Comprar USDC con 1000 pesos mexicanos"
Detección automática: MXN → USDC

// República Dominicana  
Usuario: "Comprar BTC con 500 pesos dominicanos"
Detección automática: DOP → BTC
```

### 7.2 Validaciones Automáticas

El plugin valida automáticamente:
- ✅ Email válido
- ✅ Moneda soportada (MXN, DOP)
- ✅ Crypto soportada (USDC, USDT, BTC, ETH)
- ✅ Cantidad mínima/máxima
- ✅ Estado KYC del usuario

## 🚨 Paso 8: Manejo de Errores

### 8.1 Errores Comunes

```typescript
// Usuario sin KYC
"⚠️ Verificación requerida para user@test.com
📋 Completa tu verificación aquí: https://verify.capa.fi/123"

// Moneda no soportada
"❌ Moneda no soportada: USD. Solo soportamos: MXN, DOP"

// API no disponible
"❌ La API de Capa no está disponible. Inténtalo más tarde."
```

### 8.2 Logs de Debug

Para debug, habilita logs detallados:

```bash
DEBUG=capa:* pnpm start
```

## 📊 Paso 9: Monitoreo y Analytics

### 9.1 Métricas Importantes

- 📈 **Transacciones por día**
- 💰 **Volumen total procesado**
- 🌍 **Distribución por país**
- ⚡ **Tiempo promedio de procesamiento**
- ❌ **Tasa de errores**

### 9.2 Dashboard de Capa

Accede al dashboard de Capa para:
- Ver todas las transacciones
- Gestionar usuarios y KYC
- Configurar límites
- Revisar webhooks

## 🔧 Paso 10: Desarrollo y Personalización

### 10.1 Agregar Nuevas Cryptos

```typescript
// En packages/plugin-capa/src/types.ts
export const SUPPORTED_CRYPTO_CURRENCIES = [
  'USDC', 'USDT', 'BTC', 'ETH',
  'SOL', 'MATIC' // Agregar nuevas
] as const;
```

### 10.2 Personalizar Mensajes

```typescript
// En packages/plugin-capa/src/actions/onRamp.ts
const successMsg = `¡Tu ${cryptoCurrency} está en camino! 🚀
// Personalizar mensaje aquí
`;
```

## ✅ Checklist de Verificación

- [ ] Plugin Capa instalado y compilado
- [ ] Variables de entorno configuradas
- [ ] Plugin registrado en agent/src/index.ts
- [ ] Agente iniciado sin errores
- [ ] Wallet invisible funciona
- [ ] Compra de crypto funciona
- [ ] KYC flow funciona
- [ ] Webhooks configurados (opcional)
- [ ] Logs de debug habilitados
- [ ] Tests básicos pasando

## 🎯 Casos de Uso Principales

### 🇲🇽 **México - Pesos a USDC**
```
"Comprar USDC con ana@mx.com usando 5000 pesos"
→ Crea wallet invisible
→ Procesa 5000 MXN → ~250 USDC
→ Envía a wallet de Starknet
```

### 🇩🇴 **República Dominicana - Pesos a BTC**
```
"Comprar Bitcoin con carlos@do.com usando 10000 pesos dominicanos"
→ Crea wallet invisible
→ Procesa 10000 DOP → ~0.004 BTC
→ Envía a wallet de Starknet
```

## 🚀 ¡Listo para Producción!

Una vez completados todos los pasos:

1. **Cambia a producción** en `capaConfig.environment = 'production'`
2. **Obtén credenciales de producción** de Capa
3. **Configura dominio real** para webhooks
4. **Implementa monitoreo** y alertas
5. **Documenta** para tu equipo

---

## 📞 Soporte

Si necesitas ayuda:
- 📚 **Documentación Capa**: https://docs.capa.fi
- 💬 **Issues**: GitHub del proyecto
- 🌐 **ElizaOS Docs**: https://elizaos.ai

¡Tu proyecto alcancIA ahora puede procesar fiat a crypto en América Latina! 🌎💰🚀 
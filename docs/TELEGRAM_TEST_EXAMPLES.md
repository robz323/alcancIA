# 🤖 **Ejemplos de Pruebas para Plugin Capa en Telegram**

Una vez que hayas configurado las variables de entorno y reiniciado el agente, puedes probar estos comandos en tu bot de Telegram:

## 🚀 **1. Pruebas de OnRamp (Comprar Crypto)**

### **✅ Comando Básico (Debería Activar CAPA_ON_RAMP)**
```
Comprar USDC con mi email juan@test.com
```

### **✅ Variaciones que Deberían Activar**
```
Buy crypto with 1000 pesos
Quiero adquirir bitcoin
Comprar criptomonedas
Adquirir USDC
Obtener crypto
Conseguir USDT
```

### **❌ Comandos que NO Deberían Activar OnRamp**
```
Hola como estas
Vender USDC
¿Qué tal?
```

## 💸 **2. Pruebas de OffRamp (Vender Crypto)**

### **✅ Comando Básico (Debería Activar CAPA_OFF_RAMP)**
```
Vender USDC por pesos mexicanos
```

### **✅ Variaciones que Deberían Activar**
```
Sell crypto to fiat
Convertir mi bitcoin a dinero
Retirar 500 USDT
Vender criptomoneda
Convertir a pesos
Retirar dinero
```

### **❌ Comandos que NO Deberían Activar OffRamp**
```
Comprar crypto
Hola mundo
```

## 🔍 **3. Verificar en los Logs**

Cuando envíes los comandos, deberías ver en los logs algo como:

### **✅ Logs Correctos (Plugin Funcionando)**
```bash
🔍 CAPA_ON_RAMP validate ejecutándose para: comprar criptomonedas
✅ CAPA_ON_RAMP validate resultado: true
🚀 CAPA_ON_RAMP handler ejecutándose
```

### **✅ Para OffRamp**
```bash
🔍 CAPA_OFF_RAMP validate ejecutándose para: vender usdc
✅ CAPA_OFF_RAMP validate resultado: true
🚀 CAPA_OFF_RAMP handler ejecutándose
```

## 🛠️ **4. Comandos de Configuración**

### **Verificar Variables de Entorno**
Asegúrate de que tienes estas variables en tu `.env`:
```env
CAPA_API_KEY=a6dccc31-ff03-4703-b105-8dd4b0274b4f:fdf4bb22-6dcb-4910-9a80-c42ecda22dc1
CAPA_WEBHOOK_SECRET=9ac89a54a11d88c88e7316e637f275c32ce275e8c61e24940b301594fb628312
```

### **Reiniciar el Agente**
```bash
pnpm start
```

## 🧪 **5. Secuencia de Prueba Completa**

### **Paso 1: Probar Detección**
```
Comprar crypto
```
**Esperado**: Activación de CAPA_ON_RAMP

### **Paso 2: Probar con Email**
```
Comprar USDC con mi email test@example.com
```
**Esperado**: Procesamiento del email

### **Paso 3: Probar OffRamp**
```
Vender USDC por pesos
```
**Esperado**: Activación de CAPA_OFF_RAMP

### **Paso 4: Probar Comandos No Relacionados**
```
Hola, ¿cómo estás?
```
**Esperado**: NO activar ningún plugin de Capa

## 🚨 **6. Troubleshooting**

### **Si No Ves los Logs de CAPA_ON_RAMP**
1. ✅ Verifica que agregaste la importación en `agent/src/index.ts`
2. ✅ Verifica que agregaste el plugin en la lista de plugins
3. ✅ Reinicia completamente el agente
4. ✅ Verifica que las variables de entorno estén configuradas

### **Si Ves Errores**
1. ✅ Revisa que el build fue exitoso
2. ✅ Verifica que `@elizaos/plugin-capa` está disponible
3. ✅ Asegúrate de que no hay errores de sintaxis

## 🎯 **Resultado Esperado**

Cuando funcione correctamente, deberías ver:

1. **En los logs**: Validaciones y ejecuciones de CAPA_ON_RAMP y CAPA_OFF_RAMP
2. **En Telegram**: Respuestas del agente reconociendo los comandos de crypto
3. **Comportamiento**: El agente distingue entre comandos de compra y venta

¡Listo para probar! 🚀 
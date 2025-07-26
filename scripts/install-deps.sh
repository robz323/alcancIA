#!/bin/bash

# Script para instalar dependencias con manejo especial para módulos nativos
set -e

echo "Instalando dependencias..."

# Configurar variables de entorno para mejor compatibilidad
export NODE_ENV=production
export PYTHON=/usr/bin/python3
export npm_config_python=/usr/bin/python3

# Instalar dependencias básicas primero
echo "Instalando dependencias básicas..."
pnpm install --no-frozen-lockfile --network-timeout=100000 --ignore-scripts

# Instalar dependencias con scripts de compilación por separado
echo "Instalando dependencias con scripts de compilación..."
pnpm install --no-frozen-lockfile --network-timeout=100000

# Verificar si @discordjs/opus se instaló correctamente
if [ -d "node_modules/@discordjs/opus" ]; then
    echo "✅ @discordjs/opus instalado correctamente"
else
    echo "❌ @discordjs/opus no se instaló correctamente"
    exit 1
fi

echo "✅ Todas las dependencias instaladas correctamente" 
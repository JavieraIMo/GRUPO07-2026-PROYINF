#!/bin/bash
# Script para limpiar archivos wait-for-it.sh.* temporales en la carpeta tests

TARGET_DIR="$(dirname "$0")"

find "$TARGET_DIR" -type f -name 'wait-for-it.sh.*' -exec rm -f {} +
echo "Archivos wait-for-it.sh.* eliminados en $TARGET_DIR"

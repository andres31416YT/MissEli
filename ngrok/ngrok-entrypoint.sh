#!/bin/sh
set -e

echo "Iniciando ngrok..."

ngrok http frontend:80 --authtoken="${NGROK_AUTHTOKEN}" --log=stdout &
NGROK_PID=$!

echo "Esperando que ngrok este listo..."
i=0
while [ $i -lt 60 ]; do
    PUBLIC_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | grep -o '"public_url":"[^"]*"' | head -1 | cut -d'"' -f4 || true)
    if [ -n "$PUBLIC_URL" ]; then
        break
    fi
    i=$((i + 1))
    sleep 1
done

if [ -n "$PUBLIC_URL" ]; then
    echo "=============================================="
    echo "  MISS ELI - ACCESO PUBLICO"
    echo "=============================================="
    echo "  URL: $PUBLIC_URL"
    echo "=============================================="
else
    echo "⚠ No se pudo obtener la URL publica de ngrok"
fi

wait $NGROK_PID

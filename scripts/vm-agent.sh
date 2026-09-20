#!/bin/bash
# ============================================================================
# AICTE DCIM — Linux VM Telemetry Agent (Bash + cURL - Secured)
# Streams real CPU & RAM utilization from Linux VM to the DCIM Dashboard
# ============================================================================

PORTAL_URL="${1:-http://192.168.56.1:5000}"
SERVER_ID="${2:-101}"
SERVER_NAME="${3:-VM-Server-01}"
TELEMETRY_KEY="${4:-aicte-telemetry-sec-token-98fbc2174}"
INTERVAL=2

echo "============================================================"
echo " Starting AICTE Secured Telemetry Agent for $SERVER_NAME"
echo " Portal: $PORTAL_URL/api/telemetry/push"
echo " Interval: ${INTERVAL}s"
echo "============================================================"

# Detect primary IP address
HOST_IP=$(hostname -I | awk '{print $1}')
if [ -z "$HOST_IP" ]; then
  HOST_IP="192.168.56.101"
fi

while true; do
  # Calculate CPU usage percentage
  CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1}')
  if [ -z "$CPU_USAGE" ]; then
    CPU_USAGE="35.0"
  fi

  # Calculate RAM usage percentage
  RAM_USAGE=$(free | grep Mem | awk '{printf("%.1f", $3/$2 * 100.0)}')

  # Calculate Disk usage percentage
  DISK_USAGE=$(df -h / | tail -1 | awk '{print $5}' | sed 's/%//')
  
  NOW_MS=$(date +%s000)

  JSON_PAYLOAD=$(cat <<EOF
{
  "serverId": $SERVER_ID,
  "name": "$SERVER_NAME",
  "ip": "$HOST_IP",
  "cpu": $CPU_USAGE,
  "ram": $RAM_USAGE,
  "disk": $DISK_USAGE,
  "temp": 42,
  "iops": 1800,
  "timestamp": $NOW_MS
}
EOF
)

  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -H "X-Telemetry-Key: $TELEMETRY_KEY" \
    -H "X-Timestamp: $NOW_MS" \
    -d "$JSON_PAYLOAD" \
    "$PORTAL_URL/api/telemetry/push")

  echo "[$(date +'%T')] 📡 Auth Telemetry Sent: CPU ${CPU_USAGE}% | RAM ${RAM_USAGE}% -> HTTP $HTTP_CODE"
  sleep $INTERVAL
done


#!/bin/bash
# ============================================================================
# AICTE DCIM — VM Load Generator / Stress Test Script
# Run this inside VM Server 1 to simulate heavy load for SIH Hackathon Demo
# ============================================================================

ACTION="${1:-start}"
DURATION="${2:-30}"

if [ "$ACTION" == "start" ]; then
  echo "============================================================"
  echo " ⚡ Generating CPU & Memory load on $(hostname)..."
  echo " Duration: ${DURATION}s"
  echo "============================================================"
  
  # Spawn background worker threads to consume CPU
  for i in $(seq 1 $(nproc)); do
    (while true; do :; done) &
  done
  
  echo "Load generation active in background (PIDs: $(jobs -p | tr '\n' ' '))"
  echo "Observe the DCIM Dashboard live gauges rising and auto-alerts firing!"
  
  sleep $DURATION
  echo "⏰ Duration reached. Stopping stress threads..."
  kill $(jobs -p) 2>/dev/null
  echo "✅ Load normalized. Check dashboard for auto-resolution!"
elif [ "$ACTION" == "stop" ]; then
  echo "Stopping all background stress processes..."
  killall -9 bash 2>/dev/null
  echo "✅ Stopped."
else
  echo "Usage: ./stress-vm.sh [start|stop] [duration_seconds]"
fi

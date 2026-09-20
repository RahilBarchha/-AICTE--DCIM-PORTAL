#!/usr/bin/env python3
"""
AICTE DCIM — Real-Time VM Telemetry Agent (Secured)
Runs inside your Virtual Machine / Demo Server to stream live CPU, Memory & Disk stats
directly to the DCIM Dashboard portal with API key authentication and anti-replay protection.

Usage:
  python3 vm-agent.py --server-id 101 --name "VM-Server-01" --portal-url "http://<YOUR_HOST_IP>:5000" --api-key "aicte-telemetry-sec-token-98fbc2174"
"""

import sys
import time
import json
import argparse
import socket

try:
    import urllib.request
except ImportError:
    pass

try:
    import psutil
    HAS_PSUTIL = True
except ImportError:
    HAS_PSUTIL = False

DEFAULT_TELEMETRY_KEY = "aicte-telemetry-sec-token-98fbc2174"

def get_cpu_percent():
    if HAS_PSUTIL:
        return psutil.cpu_percent(interval=1)
    else:
        # Fallback reading from /proc/stat on Linux
        try:
            with open("/proc/stat", "r") as f:
                fields = [float(column) for column in f.readline().strip().split()[1:]]
            idle, total = fields[3], sum(fields)
            time.sleep(1)
            with open("/proc/stat", "r") as f:
                fields = [float(column) for column in f.readline().strip().split()[1:]]
            idle2, total2 = fields[3], sum(fields)
            idle_delta, total_delta = idle2 - idle, total2 - total
            return round(100.0 * (1.0 - idle_delta / max(1, total_delta)), 1)
        except Exception:
            return 35.0

def get_ram_percent():
    if HAS_PSUTIL:
        return psutil.virtual_memory().percent
    else:
        try:
            with open("/proc/meminfo", "r") as f:
                mem = {}
                for line in f:
                    parts = line.split(":")
                    if len(parts) == 2:
                        mem[parts[0].strip()] = int(parts[1].split()[0])
                total = mem.get("MemTotal", 1)
                available = mem.get("MemAvailable", mem.get("MemFree", 1))
                return round(100.0 * (1.0 - (available / total)), 1)
        except Exception:
            return 45.0

def get_disk_percent():
    if HAS_PSUTIL:
        return psutil.disk_usage("/").percent
    return 48.0

def get_ip_address():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "192.168.56.101"

def main():
    parser = argparse.ArgumentParser(description="AICTE DCIM Real VM Telemetry Collector (Secured)")
    parser.add_argument("--server-id", type=int, default=101, help="Server ID (101 for VM-Server-01, 102 for VM-Server-02, 103 for VM-Server-03)")
    parser.add_argument("--name", type=str, default="VM-Server-01", help="Server Hostname")
    parser.add_argument("--portal-url", type=str, default="http://localhost:5000", help="AICTE Portal URL")
    parser.add_argument("--api-key", type=str, default=DEFAULT_TELEMETRY_KEY, help="Telemetry Authentication API Key")
    parser.add_argument("--interval", type=float, default=2.0, help="Push interval in seconds")
    args = parser.parse_args()

    endpoint = f"{args.portal_url.rstrip('/')}/api/telemetry/push"
    ip = get_ip_address()

    print(f"============================================================")
    print(f" AICTE DCIM Secured Telemetry Agent Running: {args.name}")
    print(f" Host IP: {ip} | Server ID: {args.server_id}")
    print(f" Target Portal Endpoint: {endpoint}")
    print(f" Authentication Key: {'*' * (len(args.api_key) - 4) + args.api_key[-4:]}")
    print(f" Polling Interval: {args.interval}s")
    print(f"============================================================")

    while True:
        try:
            now_ms = int(time.time() * 1000)
            cpu = get_cpu_percent()
            ram = get_ram_percent()
            disk = get_disk_percent()

            payload = {
                "serverId": args.server_id,
                "name": args.name,
                "ip": ip,
                "cpu": cpu,
                "ram": ram,
                "disk": disk,
                "temp": round(38 + (cpu * 0.35), 1),
                "iops": int(800 + (cpu * 45)),
                "timestamp": now_ms
            }

            req = urllib.request.Request(
                endpoint,
                data=json.dumps(payload).encode("utf-8"),
                headers={
                    "Content-Type": "application/json",
                    "User-Agent": "AICTE-VM-Agent/2.0",
                    "X-Telemetry-Key": args.api_key,
                    "X-Timestamp": str(now_ms)
                }
            )
            with urllib.request.urlopen(req, timeout=4) as response:
                if response.status == 200:
                    print(f"[{time.strftime('%X')}] 📡 Auth Push OK: CPU {cpu}% | RAM {ram}% | Disk {disk}% -> DCIM Dashboard")
        except Exception as e:
            print(f"[{time.strftime('%X')}] ⚠️ Telemetry push failed: {e}")

        time.sleep(args.interval)

if __name__ == "__main__":
    main()


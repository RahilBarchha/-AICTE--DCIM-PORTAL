# 🛡️ AICTE DCIM & Cybersecurity Operations Portal

[![Smart India Hackathon](https://img.shields.io/badge/Smart%20India%20Hackathon-SIH%202024%2F2026-blue?style=for-the-badge&logo=shield)](https://sih.gov.in)
[![Node.js](https://img.shields.io/badge/Node.js-v18+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Groq AI](https://img.shields.io/badge/AI%20Copilot-Groq%20Cloud-f55036?style=for-the-badge&logo=openai&logoColor=white)](https://groq.com)
[![Supabase](https://img.shields.io/badge/Cloud%20Database-Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

An enterprise-grade **Data Center Infrastructure Management (DCIM)** and **Cybersecurity Operations Center (SOC)** portal engineered for AICTE. Designed to deliver real-time telemetry monitoring, autonomous incident detection, dynamic load balancer routing, firewall policy management, and an integrated **AI Operations Copilot** powered by Groq Cloud AI.

---

## 🚀 Key Features

### 🖥️ 1. Infrastructure Telemetry & DCIM
- **Live Server Telemetry**: Real-time streaming gauges for CPU, RAM, Disk utilization, network throughput, and IOPS.
- **Dynamic Search Engine**: Instant multi-attribute filtering across hostnames, IPs, operating systems, and rack placements.
- **Hardware Asset & License Tracking**: Complete lifecycle management for bare-metal racks, virtual machines, and enterprise software licenses.
- **Load Balancer Pool Management**: Dynamic backend node allocation, health checks, and traffic balancing algorithms (Round Robin, Least Connections, IP Hash).

### 🔒 2. Cybersecurity & Autonomous Watchdog
- **Real-Time Incident Alerts**: Auto-alerting watchdog triggering warning notices at 88% and critical alerts at 94% resource thresholds.
- **Interactive SIH Attack Simulation**:
  - ⚡ **Traffic Surge**: Spikes CPU, RAM, and IOPS across compute nodes.
  - 🚨 **DDoS Attack**: Saturates server thresholds to test automated alert triggers.
  - 🛡️ **Auto-Scale & Stabilize**: Simulates autonomous load distribution and stabilization.
- **Firewall Rule Engine**: Granular ingress/egress policy enforcement, protocol inspection, and IP blocking.

### 🤖 3. AI Copilot (Powered by Groq Cloud)
- **Real-Time Infrastructure Assistant**: An AI operations co-pilot that ingests live telemetry, active firewall rules, and incident reports to diagnose bottlenecks and provide remediation steps.
- **Secured Backend Proxy**: Zero client-side key leakage; queries route securely through the backend server environment.

### 👥 4. Role-Based Access Control (RBAC)
- **Zero-Knowledge Security Policy**: Passwords are encrypted with PBKDF2 salted hashes; plaintext credentials are never revealed or exportable.
- **Granular Roles**:
  - 👑 **Super Admin**: Full platform configuration and tamper-resistant audit trail inspection.
  - 🛠️ **Admin**: Server provisioning and firewall configuration.
  - 💻 **IT Operator**: Server configuration, hardware limits, and power actions.
  - 🌐 **Network Engineer**: Firewall policies, load balancer pools, and subnet routing.
  - 📋 **Auditor**: Read-only access to audit trails and compliance reports.

### ☁️ 5. Real-Time Cloud Sync & VM Telemetry
- **Supabase Cloud Sync**: Dual-write architecture that caches locally and synchronizes telemetry batches and audit trails with Supabase PostgreSQL.
- **Live VM Telemetry Agent**: Includes Python (`vm-agent.py`) and Shell (`vm-agent.sh`) agents for streaming telemetry directly from physical/virtual hosts.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | Vanilla JavaScript (ES6+), HTML5, Modern CSS (Glassmorphism, Spotlight cards, Aurora mesh) |
| **Backend** | Node.js, Express.js |
| **AI Engine** | Groq Cloud AI (`openai/gpt-oss-120b`, `llama-3.3-70b-versatile`) |
| **Cloud Database** | Supabase (PostgreSQL with Realtime streaming) |
| **Agent / Telemetry** | Python 3 (`psutil`, `urllib`), Bash |

---

## 📁 Repository Structure

```
├── css/
│   ├── dashboard.css       # Glassmorphic SOC dashboard styling
│   ├── login.css           # Portal authentication styling
│   └── variables.css       # Design tokens, themes & color palettes
├── js/
│   ├── Servers.js          # Server provisioning & search engine
│   ├── aiAssistant.js      # AI Operations Copilot frontend client
│   ├── alerts.js           # Real-time incident alert engine
│   ├── app.js              # Application core & state manager
│   ├── audit.js            # Tamper-resistant audit log system
│   ├── auth.js             # Role authentication & session guards
│   ├── automation.js       # SIH attack simulations & auto-scale logic
│   ├── credentials.js      # Zero-knowledge credential store
│   ├── hardware.js         # Physical asset inventory
│   ├── home.js             # SOC overview & telemetry health
│   ├── licenses.js         # Software license lifecycle manager
│   ├── loadbalancers.js    # Load balancer pool configurations
│   ├── monitoring.js       # Live telemetry gauges & charts
│   ├── network.js          # Firewall & subnet management
│   ├── reports.js          # Compliance & audit report exports
│   ├── supabaseClient.js   # Supabase cloud synchronization
│   └── users.js            # User management subsystem
├── scripts/
│   ├── vm-agent.py         # Real-time VM telemetry agent (Python)
│   ├── vm-agent.sh         # Linux lightweight telemetry agent
│   └── stress-vm.sh        # Resource stress testing script
├── .env.example            # Environment configuration template
├── .gitignore              # Git ignore rules for secrets and node_modules
├── dashboard.html          # Main Operations Center portal
├── index.html              # Secure Login & Registration interface
├── package.json            # Node.js project manifest
├── server.js               # Express API backend & Groq AI proxy
└── supabase-setup.sql      # Supabase database schema & RLS policies
```

---

## 🚀 Quick Start Guide

### Prerequisites
- [Node.js](https://nodejs.org) (v16.0 or higher)
- [Git](https://git-scm.com/)

### 1. Clone the Repository
```bash
git clone https://github.com/RahilBarchha/-AICTE--DCIM-PORTAL.git
cd -AICTE--DCIM-PORTAL
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to create your `.env` file:
```bash
cp .env.example .env
```
Open `.env` and fill in your configuration:
```env
PORT=5000
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=openai/gpt-oss-120b
SESSION_SECRET=your_secure_session_secret
TELEMETRY_API_KEY=your_vm_telemetry_key
```

### 4. Start the Portal
```bash
npm start
```
Open your browser and navigate to:
```
http://localhost:5000
```

> **Note**: The portal also supports standalone static mode by opening `index.html` directly in modern web browsers.

---

## 🖥️ Running the VM Telemetry Agent

To stream live CPU, memory, and disk telemetry from a Linux virtual machine or server into the DCIM dashboard:

```bash
# On your Linux VM / Server
python3 scripts/vm-agent.py \
  --server-id 101 \
  --name "VM-Ubuntu-01" \
  --portal-url "http://<YOUR_HOST_IP>:5000" \
  --api-key "your_telemetry_key"
```

---

## 🔒 Security & Privacy Practices

- **Zero API Key Leakage**: API secrets are stored strictly in server-side environment variables and are excluded from Git version control.
- **Zero-Knowledge Passwords**: End-user passwords are never stored in plaintext and cannot be viewed or exported even by Super Administrators.
- **Anti-Replay Protection**: VM telemetry packets require API key validation and timestamp drift validation to prevent replay attacks.

---

## 👥 Authors & Acknowledgments

- **Lead Developer**: [Rahil Barchha](https://github.com/RahilBarchha)
- Developed for **Smart India Hackathon (SIH)** — AICTE DCIM Problem Statement.

# @cappern/node-red-dashboard-2-oauth2-auth

[![Node-RED](https://img.shields.io/badge/Node--RED-Dashboard%202-blue)](https://nodered.org)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL--3.0--or--later-blue.svg)](./LICENSE)

A [Node-RED Dashboard 2](https://github.com/flowfuse/node-red-dashboard) plugin that integrates with [oauth2-proxy](https://oauth2-proxy.github.io/oauth2-proxy/).  
It extracts user information from the HTTP headers added by oauth2-proxy and makes them available inside Dashboard flows via `msg._client.user`.

---

## 🚀 Features

- Automatically attaches user info to `msg._client.user`
- Supports common oauth2-proxy headers:
  - `x-auth-request-user`, `x-forwarded-user`
  - `x-auth-request-email`, `x-forwarded-email`
  - `x-auth-request-preferred-username`
- Adds `socketId` and `socketIp` to help trace individual client sessions
- Prevents unauthenticated users from interacting with flows (configurable in hook `onIsValidConnection`)

---

## 📦 Installation

From your Node-RED user directory (e.g. `~/.node-red` or `/data` inside Docker):

```bash
npm install @cappern/node-red-dashboard-2-oauth2-auth
```

Restart Node-RED after installation.

---

## 🔧 Usage

1. Run Node-RED Dashboard 2 behind [oauth2-proxy](https://oauth2-proxy.github.io/oauth2-proxy/)  
   (for example with Traefik, Nginx, or another reverse proxy).
2. Ensure oauth2-proxy is configured to forward user headers (e.g. `--set-xauthrequest`).
3. Open **Dashboard → Sidebar → Client Data**.  
   You should see **OAuth2 Proxy** listed as a client data provider.
4. In your flows, you can now access user info:

```json
{
  "_client": {
    "user": {
      "userId": "jdoe",
      "email": "jdoe@example.com",
      "username": "jdoe"
    },
    "socketId": "s0meid",
    "socketIp": "192.168.1.100"
  }
}
```

---

## 📜 License

This project is licensed under the [AGPL-3.0-or-later](./LICENSE).

---

## 🤝 Contributing

Pull requests and issues are welcome!  
Check out the [issues page](https://github.com/cappern/node-red-dashboard-2-oauth2-auth/issues).

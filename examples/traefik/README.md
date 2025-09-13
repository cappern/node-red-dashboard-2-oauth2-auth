# Traefik example

This directory contains a minimal [Docker Compose](docker-compose.yml) setup showing how to run Node-RED Dashboard 2 with `oauth2-proxy` behind [Traefik](https://traefik.io/).

## Usage

```bash
docker compose up
```

Traefik exposes Node-RED on port **8080** and protects it using `oauth2-proxy`. Replace the placeholder OAuth client credentials in the compose file before running.

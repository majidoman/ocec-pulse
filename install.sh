#!/bin/sh
# Pulse survey — first install on Linux / macOS.  Usage:  sh install.sh
# Creates .env with fresh secrets (only if it does not exist), builds and starts the containers,
# waits until the app is healthy, then prints the address and the setup code.
set -eu
cd "$(dirname "$0")"

command -v docker >/dev/null 2>&1 || { echo "Docker is not installed. Install Docker Engine first: https://docs.docker.com/engine/install/"; exit 1; }
docker compose version >/dev/null 2>&1 || { echo "The Docker Compose plugin is missing (docker compose)."; exit 1; }

rand() { head -c 48 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c "$1"; }

if [ ! -f .env ]; then
  printf "Public address people will use [http://localhost:8080]: "
  read -r url || url=""
  url=${url:-http://localhost:8080}
  url=${url%/}
  port=$(printf '%s' "$url" | sed -n 's#^http://localhost:\([0-9]*\)$#\1#p')
  port=${port:-8080}
  sed -e "s#^PUBLIC_URL=.*#PUBLIC_URL=$url#" \
      -e "s#^APP_PORT=.*#APP_PORT=$port#" \
      -e "s#^DB_PASSWORD=.*#DB_PASSWORD=$(rand 32)#" \
      -e "s#^AUTH_SECRET=.*#AUTH_SECRET=$(rand 48)#" \
      -e "s#^CRON_SECRET=.*#CRON_SECRET=$(rand 40)#" \
      -e "s#^SETUP_CODE=.*#SETUP_CODE=$(rand 12)#" \
      .env.example > .env
  chmod 600 .env
  echo "Created .env with new secrets."
else
  echo "Using the existing .env (secrets unchanged)."
fi

[ "${DRY_RUN:-0}" = "1" ] && { echo "DRY_RUN: stopping before Docker."; exit 0; }

mkdir -p backups
docker compose up -d --build

port=$(sed -n 's/^APP_PORT=//p' .env); port=${port:-8080}
printf "Waiting for the app to start"
i=0
until wget -q -O /dev/null "http://localhost:$port/api/health" 2>/dev/null || curl -fsS -o /dev/null "http://localhost:$port/api/health" 2>/dev/null; do
  i=$((i + 1)); [ "$i" -ge 100 ] && { echo; echo "Not healthy after 5 minutes. Check: docker compose logs app"; exit 1; }
  printf "."; sleep 3
done
echo
url=$(sed -n 's/^PUBLIC_URL=//p' .env)
code=$(sed -n 's/^SETUP_CODE=//p' .env)
echo ""
echo "Pulse is running."
echo "  Open:        $url/setup"
echo "  Setup code:  $code"
echo "  Backups:     ./backups (nightly)"

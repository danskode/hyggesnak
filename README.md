# Hyggesnakke

💬 A chat app for friends and families — private, self-hosted, and free from Big Tech. 💬

![Hyggesnakke](client/public/images/content/hyggesnak.png "Hyggesnakke - a chat app for friends and families")

---

## Run locally (development)

1. Clone the repo:
   ```bash
   git clone https://github.com/danskode/hyggesnak.git && cd hyggesnak
   ```
2. Install dependencies:
   ```bash
   cd client && npm i && cd ../server && npm i && cd ..
   ```
3. Create your `.env` file:
   ```bash
   cp server/.env.example server/.env
   ```
4. Seed the database with demo users:
   ```bash
   node server/database/seed.js
   ```
5. Start both client and server:
   ```bash
   npm run dev
   ```

App runs at `http://localhost:5173`. Demo users: `mor`, `far`, `lillebror` — password: `Familien1!`

---

## Self-host on a private server (Docker + Tailscale)

Run Hyggesnak privately for your family on a home server or VPS. Access it securely from any device via Tailscale — no port forwarding, no public exposure.

### 1. Install prerequisites

On your Ubuntu server:

```bash
# Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Log out and back in for the group change to take effect

# Tailscale
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
```

### 2. Clone and configure

```bash
git clone https://github.com/danskode/hyggesnak.git && cd hyggesnak
cp .env.production.example .env
nano .env
```

| Variable | Description |
|----------|-------------|
| `JWT_SECRET` | Random secret — generate with `openssl rand -hex 32` |
| `CLIENT_URL` | Your Tailscale IP, e.g. `http://100.x.x.x` |

Generate a secure secret (run once per variable):
```bash
openssl rand -hex 32
```

### 3. Build and start

```bash
docker compose up -d --build
```

Your family can now reach the app at `http://<tailscale-ip>` from any device on your Tailscale network. 🎉

### 4. Create your first users

Use the built-in CLI to add users — no database tools needed:

```bash
docker compose exec server node cli.js user create lars
```

You will be prompted for:
- **Display name** (shown in the app)
- **Role** — `user` (regular member) or `admin` (can manage the app)
- **Password** — type one, or press Enter to auto-generate a secure password

---

## Managing users

All user management is done via the CLI inside the server container.

### Commands

```bash
# Create a new user (interactive prompts)
docker compose exec server node cli.js user create <username>

# List all users
docker compose exec server node cli.js user list

# Reset a user's password
docker compose exec server node cli.js user password <username>

# Delete a user and all their data
docker compose exec server node cli.js user delete <username>
```

### Non-interactive options

Useful for scripts or when you want to skip prompts:

```bash
# Create admin with auto-generated password (prints it to terminal)
docker compose exec server node cli.js user create lars --name "Lars Hansen" --role admin --generate

# Create regular user with a specific password
docker compose exec server node cli.js user create anna --name "Anna" --password "SomeSafePassword1!"

# Reset password and auto-generate a new one
docker compose exec server node cli.js user password lars --generate
```

| Option | Description |
|--------|-------------|
| `--name "Display Name"` | Display name shown in the app (default: username) |
| `--role user\|admin` | Set role directly — skips the prompt |
| `--password <pwd>` | Set password directly — skips the prompt |
| `--generate` | Auto-generate a secure password and print it |

### Optional: add a shortcut alias

To avoid typing `docker compose exec server node cli.js` every time, add an alias to `~/.bashrc` on your server:

```bash
echo "alias hygge='docker compose -f ~/hyggesnak/docker-compose.yml exec server node cli.js'" >> ~/.bashrc
source ~/.bashrc
```

Then you can use:
```bash
hygge user create lars
hygge user list
hygge user password lars --generate
hygge user delete lars
```

---

## Updating the app

```bash
git pull
docker compose up -d --build
```

---

## Useful commands

```bash
docker compose logs -f server    # Follow server logs
docker compose logs -f client    # Follow client logs
docker compose ps                # Check container status
docker compose down              # Stop everything
docker compose down -v           # Stop and remove volumes (wipes database!)
```

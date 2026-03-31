# Hyggesnakke

💬 A chat app for friends and families focusing on privacy, security and to keep you close to the ones who matters and not meta or other big tech companies 💬

![Mangler du en app til at holde kontakten med familien uden at skulle ?](client/public/images/content/hyggesnak.png "Hyggesnakke - a chat app for friends and families")

Do you want to test it out? Well you can:

## How to run locally  

1. Clone the repo: `git clone https://github.com/danskode/hyggesnak.git`
2. `cd client`
3. `npm i`
4. `cd ..`
5. `cd server`
6. `npm i`
7. Setup an .env file guided by the .env.local key value pairs in the server folder
8. Run `node server/database/seed.js` to add sqlite database and dummy data into users table
9. You are ready to join a Hyggesnak: Run the command `npm run dev` (or `npm run dev:client` if you just want to run the client side or replace with `npm run dev:server` for backend only) from the root folder, then concurrently and the script will take care of starting both **client** and **server**.

Happy hyggesnak

💬💬💬💬💬💬💬💬💬💬💬💬💬💬💬💬💬💬💬💬💬💬💬💬💬💬💬💬

---

## Deploy to homelab (Docker + Tailscale)

Want to run Hyggesnak privately for your family on a local server? Here's how to get it running on Ubuntu with Docker and accessible via Tailscale.

### Prerequisites

On your Ubuntu server:

```bash
# Docker + Docker Compose
curl -fsSL https://get.docker.com | sh

# Allow your user to run Docker without sudo.
# This adds your current user to the "docker" group — it does NOT create a new user.
# You still log in to the server with the same username as always.
# The change only takes effect after you log out and back in.
sudo usermod -aG docker $USER
# Log out: exit
# Log back in via SSH, then continue below

# Tailscale
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
```

### First deployment

```bash
# 1. Clone the repo
git clone https://github.com/danskode/hyggesnak.git && cd hyggesnak

# 2. Create your production .env
cp .env.production.example .env
nano .env
```

Fill in `.env`:

| Variable | Description |
|----------|-------------|
| `JWT_SECRET` | Random 32-byte hex string — generate with the command below |
| `ENCRYPTION_KEY` | Random 32-byte hex string — generate with the command below (encrypts messages at rest) |
| `CLIENT_URL` | Your Tailscale IP, e.g. `http://100.x.x.x` |
| `INIT_ADMIN_USERNAME` | Your admin username |
| `INIT_ADMIN_PASSWORD` | Your admin password |
| `INIT_ADMIN_EMAIL` | Your admin email |

Generate a secure key (run this twice — once for each). No extra tools needed, `openssl` is built into Ubuntu:
```bash
openssl rand -hex 32
```
Copy the output and paste it as the value in `.env`. Run it again to get a second unique key for the other variable.

```bash
# 3. Build and start
docker compose up -d --build

# 4. Create admin user (first time only)
docker compose exec server node database/init.js
```

Your family can now reach the app at `http://<tailscale-ip>` — on any device connected to your Tailscale network. 🎉

### Updating the app

```bash
git pull
docker compose up -d --build
```

### Managing users

After deploying, use the built-in CLI to manage users directly on the server — no need to touch the database manually.

Run commands inside the server container:

```bash
docker compose exec server node cli.js user create lars
docker compose exec server node cli.js user list
docker compose exec server node cli.js user password lars
docker compose exec server node cli.js user delete lars
```

**Available commands:**

| Command | Description |
|---------|-------------|
| `user create <username>` | Create a new user. Prompts for password. |
| `user list` | List all users and their roles. |
| `user password <username>` | Reset a user's password. |
| `user delete <username>` | Delete a user and all their data. |

**Useful options:**

```bash
# Create an admin user with auto-generated password
docker compose exec server node cli.js user create lars --name "Lars Hansen" --admin --generate

# Create a regular user with a specific password
docker compose exec server node cli.js user create anna --password "FamilienRocks1!"

# Reset a password and auto-generate a new one
docker compose exec server node cli.js user password lars --generate
```

> Passwords are auto-generated if you leave the prompt blank or pass `--generate`.

### Useful commands

```bash
docker compose logs -f          # Follow logs
docker compose ps               # Check container status
docker compose down             # Stop everything
```
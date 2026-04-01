# Hyggesnakke

💬 A chat app for friends and families — private, self-hosted, and free from Big Tech. 💬

![Hyggesnakke](client/public/images/content/hyggesnak.png "Hyggesnakke - a chat app for friends and families")

---

# Table of Content
- [Hyggesnakke](#hyggesnakke)
- [Table of Content](#table-of-content)
  - [Run locally (development)](#run-locally-development)
  - [Self-host on a private server (Docker + Tailscale)](#self-host-on-a-private-server-docker--tailscale)
    - [0. Hardening the server](#0-hardening-the-server)
    - [1. Install prerequisites](#1-install-prerequisites)
    - [2. Clone and configure](#2-clone-and-configure)
    - [3. Build and start](#3-build-and-start)
    - [4. Create your first users](#4-create-your-first-users)
  - [Managing users](#managing-users)
    - [Commands](#commands)
    - [Non-interactive options](#non-interactive-options)
    - [Optional: add a shortcut alias](#optional-add-a-shortcut-alias)
  - [Updating the app](#updating-the-app)
  - [Useful commands](#useful-commands)



---

## Run locally (development)

1. Clone the repo:
   ```bash
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

Run Hyggesnak privately for your family on a home server or VPS. Access it securely from any device via Tailscale — no port forwarding, no public exposure. Safety first!

### 0. Hardening the server

Before deploying Hyggesnak, it's strongly recommended to harden your Ubuntu server to reduce risks and protect your data:

- **Keep the system updated**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

- **Create a non-root user**
   ```bash
   adduser hyggesnak
   usermod -aG sudo hyggesnak
   ```

- **Disable root SSH login**
   - Edit `/etc/ssh/sshd_config` and set:  
      ```
      PermitRootLogin no
      ```
   - Restart SSH:
      ```bash
      sudo systemctl restart ssh
      ```

- **Use SSH keys, disable password auth**
   - Generate a key on your local machine:
      ```bash
      ssh-keygen
      ```
   - Copy it to the server:
      ```bash
      ssh-copy-id hyggesnak@<server-ip>
      ```
   - Edit `/etc/ssh/sshd_config` and set:  
      ```
      PasswordAuthentication no
      ```
   - Restart SSH.

- **Set up a firewall (UFW)**
   ```bash
   sudo ufw enable
   sudo ufw status
   ```

- **Restrict all ports except Tailscale**
   - After Tailscale is running, block all incoming connections except via the Tailscale network interface:
      ```bash
      sudo ufw default deny incoming
      sudo ufw allow in on tailscale0
      # Allow SSH only via Tailscale interface for extra security:
      sudo ufw allow in on tailscale0 to any port 22
      sudo ufw enable
      sudo ufw status
      ```
   - **Note:** This restricts SSH access to only devices on your Tailscale network. If you need SSH from other networks, adjust the rule accordingly––but why take the risk?
   - This ensures only devices on your Tailscale network can access the server and app.

- **Install fail2ban to block brute-force attacks**
   ```bash
   sudo apt install fail2ban -y
   sudo systemctl enable --now fail2ban
   ```

- **Keep Docker secure**
   - Only trusted users in the `docker` group.
   - Keep Docker and images updated.

- **Monitor logs**
   - Use `journalctl`, `docker compose logs`, or set up log monitoring.

- **Regularly back up your `.env` and database files.**

These steps are not strictly required, but they are highly recommended for anyone self-hosting to help protect your server and data from common threats.


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

Useful for scripts or
when you want to skip prompts:

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


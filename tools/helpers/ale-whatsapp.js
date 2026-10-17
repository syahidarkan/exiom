#!/usr/bin/env node
/**
 * Ale Tool: WhatsApp client using Baileys
 * Usage:
 *   node ale-whatsapp.js qr           — show QR code to link
 *   node ale-whatsapp.js send <number> <message>
 *   node ale-whatsapp.js status
 *
 * Sessions stored in: tools/node/baileys-wa/session/
 */
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SESSION_DIR = path.join(__dirname, "../node/baileys-wa/session");

async function main() {
  let makeWASocket, useMultiFileAuthState, DisconnectReason, Boom;
  try {
    const baileys = await import("@whiskeysockets/baileys");
    makeWASocket = baileys.default;
    useMultiFileAuthState = baileys.useMultiFileAuthState;
    DisconnectReason = baileys.DisconnectReason;
    const boomPkg = await import("@hapi/boom");
    Boom = boomPkg.Boom;
  } catch {
    console.error(
      "Baileys not installed. Run: bash tools/install-tools.sh --agent nela"
    );
    process.exit(1);
  }

  const cmd = process.argv[2] || "qr";
  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: cmd === "qr",
    logger: { level: "silent", child: () => ({ level: "silent", silent: true, fatal: () => {}, error: () => {}, warn: () => {}, info: () => {}, debug: () => {}, trace: () => {} }) },
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr && cmd === "qr") {
      console.log("\nScan QR code above with WhatsApp > Linked Devices\n");
    }
    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect?.error instanceof Boom &&
        lastDisconnect.error.output?.statusCode !== DisconnectReason.loggedOut;
      if (!shouldReconnect) {
        console.log("Logged out or fatal error. Re-run to re-link.");
        process.exit(0);
      }
    }
    if (connection === "open") {
      console.log("✓ WhatsApp connected");
      if (cmd === "status") {
        console.log("Status: ONLINE");
        process.exit(0);
      }
      if (cmd === "send") {
        const number  = process.argv[3];
        const message = process.argv.slice(4).join(" ");
        if (!number || !message) {
          console.error("Usage: node ale-whatsapp.js send <number> <message>");
          process.exit(1);
        }
        const jid = number.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
        await sock.sendMessage(jid, { text: message });
        console.log(`✓ Sent to ${number}`);
        process.exit(0);
      }
    }
  });
}

main().catch(console.error);

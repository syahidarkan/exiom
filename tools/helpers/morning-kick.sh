#!/bin/bash
# morning-kick.sh — kick semua agent yang perlu kerja otomatis setiap pagi
# Dijalankan via cron jam 08:00 WIB setiap hari kerja
# Relay harus aktif di localhost:3101

RELAY="http://localhost:3101"
TODAY=$(date '+%Y-%m-%d')
DAYNAME=$(date '+%A' | tr '[:upper:]' '[:lower:]')  # e.g. "monday"
LOG="/home/naca/pemrograman/virtual office agent/workspace/morning-kick.log"

log() { echo "[$(date '+%H:%M:%S')] $*" | tee -a "$LOG"; }

log "=== MORNING KICK $TODAY ($DAYNAME) ==="

kick() {
  local agent="$1"
  local prompt="$2"
  local resp
  resp=$(curl -s -X POST "$RELAY/send" \
    -H "Content-Type: application/json" \
    -d "{\"agent\":\"$agent\",\"prompt\":$(python3 -c "import json,sys; print(json.dumps(sys.argv[1]))" "$prompt")}" \
    --max-time 30 2>&1)
  if echo "$resp" | grep -q '"ok":\s*true'; then
    log "[$agent] kicked OK"
  else
    log "[$agent] GAGAL: $resp"
  fi
}

# ── Mia: rencanakan hari ini ──────────────────────────────────────────────────
kick "mia" "Selamat pagi Mia. Hari ini $TODAY ($DAYNAME). Buka workspace/mia/content_calendar_2w.md dan cek konten apa yang dijadwalkan untuk hari ini. Kalau ada konten yang perlu dibuat: buat brief untuk Deril (workspace/mia/brief_deril.md) dan brief untuk Gagah (workspace/mia/brief_gagah.md), lalu submit ke approval queue Owner dengan priority 'routine' supaya bisa di-approve dan pipeline bisa jalan. Kalau tidak ada yang dijadwalkan hari ini, cukup tulis laporan singkat ke approval queue bahwa tidak ada konten hari ini."

sleep 5

# ── Joce: cari leads baru ────────────────────────────────────────────────────
kick "joce" "Selamat pagi Joce. Hari ini $TODAY. Tugasmu: cari 3-5 lead UMKM baru yang potensial untuk dihubungi hari ini. Fokus di daerah yang sudah di ICP (warung kopi, katering, toko baju, dll). Simpan di workspace/joce/leads_$TODAY.md dengan format: nama usaha, platform (IG/WA/Tokopedia), handle/nomor, pain point yang terlihat dari kontennya, dan alasan kenapa fit dengan layanan kita. Setelah selesai, submit ke approval queue Owner dengan title 'Leads baru $TODAY' supaya bisa di-review dan dilanjutkan ke Ale."

sleep 5

# ── Gagah: pantau trending keywords ─────────────────────────────────────────
kick "gagah" "Selamat pagi Gagah. Hari ini $TODAY. Tugasmu: pantau keyword trending untuk UMKM Indonesia hari ini (Google Trends, forum UMKM, berita). Cari topik yang bisa dijadikan artikel atau konten video. Tulis laporan singkat di workspace/gagah/trends_$TODAY.md. Kalau ada topik yang urgent/viral, submit ke approval queue Owner dengan priority 'routine' untuk dilanjutkan ke Deril."

log "=== MORNING KICK SELESAI ==="

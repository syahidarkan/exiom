#!/bin/bash
# Hugo Tool: PDF invoice generator using Typst
# Usage:
#   ./hugo-invoice.sh generate --client "PT Maju" --amount 5000000 --items items.json --out invoice-001.pdf
#   ./hugo-invoice.sh preview --template invoice.typ

set -euo pipefail
export PATH="$HOME/.local/bin:$PATH"

TEMPLATES_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../docs/templates"

cmd="${1:-}"
shift || true

case "$cmd" in
  generate)
    CLIENT=""
    AMOUNT=""
    ITEMS_JSON=""
    OUT="invoice-$(date +%Y%m%d-%H%M).pdf"
    INV_NUMBER="INV-$(date +%Y%m%d)-001"
    while [[ $# -gt 0 ]]; do
      case "$1" in
        --client)  CLIENT="$2";  shift 2 ;;
        --amount)  AMOUNT="$2";  shift 2 ;;
        --items)   ITEMS_JSON="$2"; shift 2 ;;
        --out)     OUT="$2";     shift 2 ;;
        --number)  INV_NUMBER="$2"; shift 2 ;;
        *)         shift ;;
      esac
    done

    if ! command -v typst >/dev/null 2>&1; then
      echo "ERROR: typst not installed. Run: bash tools/install-tools.sh --agent hugo"
      exit 1
    fi

    # Generate Typst source on the fly
    TMP=$(mktemp --suffix=.typ)
    cat > "$TMP" << TYPST
#set page(paper: "a4", margin: (top: 2.5cm, bottom: 2.5cm, left: 2.5cm, right: 2.5cm))
#set text(font: "Libertinus Serif", size: 11pt)

= INVOICE

*Nomor:* ${INV_NUMBER} \
*Tanggal:* #datetime.today().display("[day]/[month]/[year]")

== Dari
*Exiom AI & Software Consultant* \
Email: hello\@exiom.id

== Kepada
*${CLIENT:-[NAMA KLIEN]}*

== Layanan

#table(
  columns: (auto, auto, 1fr, auto),
  [*No*], [*Layanan*], [*Deskripsi*], [*Harga*],
  [1], [Jasa Software], [Sesuai perjanjian], [Rp ${AMOUNT:-0}],
  [], [], [*Total*], [*Rp ${AMOUNT:-0}*],
)

_Pembayaran dalam 14 hari kerja. Transfer ke rekening yang tertera di lampiran._

#v(1fr)
_Dokumen ini dibuat secara otomatis oleh sistem Exiom._
TYPST

    typst compile "$TMP" "$OUT"
    rm -f "$TMP"
    echo "✓ Invoice generated: $OUT"
    ;;

  preview)
    TEMPLATE="${1:-}"
    if [[ -z "$TEMPLATE" ]]; then
      echo "Usage: $0 preview <file.typ>"
      exit 1
    fi
    typst watch "$TEMPLATE"
    ;;

  *)
    echo "Usage: $0 {generate|preview} [options]"
    echo ""
    echo "  generate --client 'PT ABC' --amount 5000000 [--number INV-001] [--out file.pdf]"
    echo "  preview <template.typ>"
    ;;
esac

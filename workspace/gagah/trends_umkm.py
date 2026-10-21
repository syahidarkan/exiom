import json, time
from pytrends.request import TrendReq
kws = ["cara mencatat keuangan usaha kecil","aplikasi kasir gratis","rekap omzet harian","catatan stok barang",
"cara kelola pesanan whatsapp","catat data pelanggan toko","kasbon pelanggan",
"laundry dekat saya","bengkel motor terdekat","salon dekat sini","cara daftar google business profile",
"usaha kecil perlu website atau tidak","biaya bikin website toko","otomatisasi usaha kecil",
"rekap omzet harian tanpa buku","kapan berhenti pakai buku tulis"]
p = TrendReq(hl='id-ID', tz=420, timeout=(10,30))
out = {}
for i in range(0, len(kws), 5):
    batch = kws[i:i+5]
    try:
        p.build_payload(batch, timeframe='today 12-m', geo='ID')
        d = p.interest_over_time()
        for k in batch:
            s = d[k]
            out[k] = {"avg": round(float(s.mean()),1), "last4w_avg": round(float(s.tail(4).mean()),1),
                      "first4w_avg": round(float(s.head(4).mean()),1), "max": int(s.max())}
    except Exception as e:
        for k in batch: out[k] = {"error": str(e)[:120]}
    time.sleep(3)
json.dump(out, open("trends_raw.json","w"), indent=1, ensure_ascii=False)
for k,v in out.items(): print(k, v)

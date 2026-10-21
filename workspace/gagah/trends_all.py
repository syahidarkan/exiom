import json, time, csv
from pytrends.request import TrendReq
rows = [
("Pencatatan","cara mencatat keuangan usaha kecil","brief"),
("Pencatatan","aplikasi kasir gratis","brief"),
("Pencatatan","rekap omzet harian","brief"),
("Pencatatan","catatan stok barang","brief"),
("Pencatatan","cara mencatat omzet usaha tanpa aplikasi","usulan"),
("Pencatatan","buku kas usaha kecil","usulan"),
("Pencatatan","template laporan keuangan UMKM excel","usulan"),
("Pencatatan","aplikasi pencatatan stok gratis","usulan"),
("Pencatatan","aplikasi pembukuan UMKM","usulan"),
("Pesanan/pelanggan","cara kelola pesanan whatsapp","brief"),
("Pesanan/pelanggan","catat data pelanggan toko","brief"),
("Pesanan/pelanggan","kasbon pelanggan","brief"),
("Pesanan/pelanggan","cara mencatat utang pelanggan","usulan"),
("Pesanan/pelanggan","aplikasi catatan pesanan toko","usulan"),
("Pesanan/pelanggan","database pelanggan usaha kecil","usulan"),
("Pesanan/pelanggan","catatan pesanan online usaha kecil","usulan"),
("Kehadiran lokal","laundry dekat saya","brief"),
("Kehadiran lokal","bengkel motor terdekat","brief"),
("Kehadiran lokal","salon dekat sini","brief"),
("Kehadiran lokal","cara daftar google business profile","brief"),
("Kehadiran lokal","cara membuat google maps usaha","usulan"),
("Kehadiran lokal","laundry terdekat buka sekarang","usulan"),
("Digitalisasi pemula","usaha kecil perlu website atau tidak","brief"),
("Digitalisasi pemula","biaya bikin website toko","brief"),
("Digitalisasi pemula","otomatisasi usaha kecil","brief"),
("Digitalisasi pemula","cara digitalisasi usaha kecil","usulan"),
("Digitalisasi pemula","manfaat website untuk UMKM","usulan"),
("Digitalisasi pemula","aplikasi untuk usaha kecil gratis","usulan"),
("Artikel 1","rekap omzet harian tanpa buku","brief-artikel"),
("Artikel 2","kapan berhenti pakai buku tulis","brief-artikel"),
]
assert len(rows)==30, len(rows)
p = TrendReq(hl='id-ID', tz=420, timeout=(10,30))
res = {}
kws = [r[1] for r in rows]
for i in range(0, len(kws), 3):
    batch = kws[i:i+3]
    for attempt in range(3):
        try:
            p.build_payload(batch, timeframe='today 12-m', geo='ID')
            d = p.interest_over_time()
            for k in batch:
                s = d[k]
                res[k] = dict(avg=round(float(s.mean()),1), last4w=round(float(s.tail(4).mean()),1),
                              first4w=round(float(s.head(4).mean()),1), max=int(s.max()))
            break
        except Exception as e:
            err = str(e)[:100]; time.sleep(8)
    else:
        for k in batch: res[k] = dict(error=err)
    time.sleep(4)
with open("keyword_umkm_oktober.csv","w",newline="",encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["no","cluster","keyword","sumber_keyword","volume_bulanan_KeywordPlanner","trends_rata2_12bln_0_100","trends_4minggu_terakhir","trends_4minggu_pertama","trends_puncak","kesulitan","intent","catatan"])
    for n,(c,k,src) in enumerate(rows,1):
        r = res.get(k,{})
        if "error" in r: t=["ERROR","","",""]
        else: t=[r["avg"],r["last4w"],r["first4w"],r["max"]]
        w.writerow([n,c,k,src,"TIDAK TERSEDIA (butuh akun Google Ads)"]+t+["TIDAK TERSEDIA","informasional/komersial lokal","0 di Trends = volume terlalu kecil untuk diukur, bukan nol" if t[0]==0 else ""])
json.dump(res, open("trends_raw.json","w"), indent=1, ensure_ascii=False)
print("done", len(res), "errors:", sum(1 for v in res.values() if "error" in v))

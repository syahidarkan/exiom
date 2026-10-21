import json
x_thread = [
"Omzet hari ini baru ketahuan besok pagi, itu pun dari hitung ulang isi laci kasir.\n\nBanyak warung, laundry, dan bengkel kecil ramai tapi tidak tahu persis hari ini dapat berapa. Ini cara rekap yang cukup 10 menit setelah tutup. Thread:",
"Catat 6 hal tiap transaksi: tanggal, jam, barang atau jasa, jumlah, harga, cara bayar.\n\nCara bayar paling sering lupa, padahal itu yang menentukan uangnya dicocokkan ke mana. Tunai ke laci. QRIS dan transfer ke mutasi. Kasbon ke buku utang.",
"Catat langsung setelah pelanggan bayar, walau satu baris.\n\nKalau ditulis dari ingatan malam hari, yang hilang pasti transaksi kecil. Air mineral, tambahan parfum laundry, es batu. Justru itu yang menumpuk.",
"Setelah tutup: jumlahkan per cara bayar, hitung laci, cek mutasi QRIS dan transfer.\n\nAda selisih? Tulis nominal dan alasannya. Contoh: \"kembalian kurang Rp 2.000, pelanggan sudah pulang\". Selisih tanpa catatan bikin laporan bulanan tidak bisa dipercaya.",
"Menurut Business Fitness Index 2024 (OCBC x NielsenIQ), 77 persen UMKM Indonesia masih mencatat keuangan manual.\n\nCoba tujuh hari berturut-turut. Hari ke-8, bandingkan total rekap dengan isi laci. Kamu sekarang catat pakai apa? 🙂",
]
threads_post = "Pernah tutup warung atau toko, terus bingung hari ini sebenarnya dapat berapa?\n\nYang biasa terjadi: uang laci dihitung, transfer dan QRIS diingat-ingat, kasbon ditulis di kertas lain. Tiga angka itu tercampur jadi satu, dan rekapnya tidak bisa dipakai.\n\nPisahkan per cara bayar sejak transaksi dicatat. Tunai cocokkan ke laci, QRIS dan transfer ke mutasi, kasbon ke buku utang. Rekap 10 menit setelah tutup sudah cukup.\n\nKamu biasanya nyatet di buku, Sheets, atau nunggu ingat dulu?"
reddit = {
 "subreddit": "TBD (perlu keputusan Owner, cek rules dulu)",
 "title": "Rekap omzet harian warung/laundry/bengkel kecil: cara 10 menit yang menurut gue paling masuk akal",
 "kind": "self (text post), tanpa link, tanpa nama Exiom",
 "body": "Banyak usaha kecil yang ramai tapi pemiliknya nggak tahu persis hari ini dapat berapa. Biasanya omzet baru ketahuan besok, dari hitung ulang laci plus ingatan siapa yang bayar transfer dan siapa yang masih ngutang.\n\nRangkuman cara yang sederhana:\n\nTiap transaksi cukup catat tanggal, jam, barang atau jasa, jumlah, harga, dan cara bayar. Cara bayar yang paling sering kelewat, padahal itu yang nentuin dicocokkan ke mana: tunai ke laci, QRIS dan transfer ke mutasi, kasbon ke buku utang.\n\nCatat langsung setelah pelanggan bayar. Kalau nunggu malam, yang lupa pasti transaksi kecil kayak air mineral, es batu, atau tambahan parfum laundry. Dan itu yang numpuk.\n\nSetelah tutup, jumlahin per cara bayar, bandingin sama isi laci dan mutasi. Kalau selisih, tulis nominal dan alasannya. Selisih tanpa catatan bikin laporan bulanan nggak bisa dipercaya.\n\nSatu lagi: uang pribadi yang diambil dari laci kasih kolom sendiri, biar omzet nggak kelihatan lebih kecil dari aslinya.\n\nBuku tulis boleh banget, asal format tiap halaman sama. Google Sheets gratis juga cukup buat 1 atau 2 kasir, total per cara bayar pakai SUMIF.\n\nSoal data: riset Business Fitness Index 2024 (OCBC x NielsenIQ) nyebut 77 persen UMKM Indonesia masih nyatet keuangan manual. Angkanya dari 2024, bukan data terbaru.\n\nYang punya usaha kecil di sini, kalian rekap harian atau bulanan aja? Ada kebiasaan yang ternyata paling ngebantu?"
}
issues = []
for i,t in enumerate(x_thread,1):
    n=len(t)
    if n>280: issues.append(f"X post {i}: {n} char > 280 (perlu dipecah)")
    if "\u2014" in t: issues.append(f"X post {i}: em dash")
if "\u2014" in threads_post: issues.append("Threads: em dash")
payload = {
 "status": "DRY-RUN, belum upload. Menunggu approval queue id 289b5536 (agent mia) = pending",
 "x_thread": [{"tweet": f"{i}/5 " + t if False else t, "chars": len(t)} for i,t in enumerate(x_thread,1)],
 "threads": {"text": threads_post, "chars": len(threads_post), "limit": 500},
 "reddit": reddit,
 "issues": issues,
}
json.dump(payload, open("workspace/deril/threads/dryrun_artikel1.json","w"), ensure_ascii=False, indent=2)
for p in payload["x_thread"]: print("X", p["chars"])
print("Threads chars", len(threads_post), "| Reddit body chars", len(reddit["body"]))
print("issues:", issues or "none")

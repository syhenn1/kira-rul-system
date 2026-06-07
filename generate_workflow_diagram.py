import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch

fig, axes = plt.subplots(1, 3, figsize=(20, 14))
fig.patch.set_facecolor('#FAFAFA')
fig.suptitle('Diagram Alur Kerja Sistem KIRA — AI-Powered Asset RUL Prediction',
             fontsize=14, fontweight='bold', color='#1A1A2E', y=0.98)

# ── Shape helpers ─────────────────────────────────────────────────────────────

def rect(ax, x, y, w, h, text, fc='#FFFFFF', ec='#555555', fs=8.2, lw=1.4, bold=False):
    patch = FancyBboxPatch((x - w/2, y - h/2), w, h,
                           boxstyle='round,pad=0.08',
                           facecolor=fc, edgecolor=ec, linewidth=lw, zorder=3)
    ax.add_patch(patch)
    fw = 'bold' if bold else 'normal'
    ax.text(x, y, text, fontsize=fs, fontweight=fw, color='#1A1A1A',
            ha='center', va='center', zorder=4,
            multialignment='center', linespacing=1.35)

def diamond(ax, x, y, w, h, text, fc='#FFF9C4', ec='#F9A825', fs=7.8):
    xs = [x, x + w/2, x, x - w/2, x]
    ys = [y + h/2, y, y - h/2, y, y + h/2]
    ax.fill(xs, ys, color=fc, zorder=3)
    ax.plot(xs, ys, color=ec, linewidth=1.4, zorder=4)
    ax.text(x, y, text, fontsize=fs, fontweight='normal', color='#1A1A1A',
            ha='center', va='center', zorder=5, multialignment='center')

def terminal(ax, x, y, w, h, text, fc='#37474F', ec='#263238', fs=8.5):
    patch = FancyBboxPatch((x - w/2, y - h/2), w, h,
                           boxstyle='round,pad=0.22',
                           facecolor=fc, edgecolor=ec, linewidth=1.6, zorder=3)
    ax.add_patch(patch)
    ax.text(x, y, text, fontsize=fs, fontweight='bold', color='white',
            ha='center', va='center', zorder=4)

def arr(ax, x1, y1, x2, y2, label='', lx=None, ly=None, color='#444444'):
    ax.annotate('', xy=(x2, y2), xytext=(x1, y1),
                arrowprops=dict(arrowstyle='->', color=color, lw=1.4,
                                connectionstyle='arc3,rad=0.0',
                                mutation_scale=13, zorder=5))
    if label:
        mx = lx if lx is not None else (x1+x2)/2
        my = ly if ly is not None else (y1+y2)/2
        ax.text(mx, my, label, fontsize=7, color='#555555',
                ha='center', va='center', zorder=6,
                bbox=dict(fc='#FAFAFA', ec='none', pad=1))

def arr_right(ax, x1, y1, x2, y2, label=''):
    ax.annotate('', xy=(x2, y2), xytext=(x1, y1),
                arrowprops=dict(arrowstyle='->', color='#888888', lw=1.2,
                                connectionstyle='arc3,rad=0.0',
                                mutation_scale=11, zorder=5))
    if label:
        ax.text((x1+x2)/2, (y1+y2)/2 + 0.08, label, fontsize=6.8,
                color='#666666', ha='center', va='center', zorder=6,
                bbox=dict(fc='#FAFAFA', ec='none', pad=1))

def setup_ax(ax, title, xlim=(-2, 2), ylim=(0, 13)):
    ax.set_xlim(*xlim)
    ax.set_ylim(*ylim)
    ax.axis('off')
    ax.set_facecolor('#FAFAFA')
    ax.set_title(title, fontsize=10.5, fontweight='bold',
                 color='#1A1A2E', pad=10)

# ═══════════════════════════════════════════════════════════════════════════════
# DIAGRAM 1 — Alur Login & Autentikasi
# ═══════════════════════════════════════════════════════════════════════════════
ax = axes[0]
setup_ax(ax, 'Alur 1: Login & Autentikasi', (-2.2, 2.2), (0, 13.5))

W, DW, DH = 3.2, 2.4, 0.72

terminal(ax, 0, 13.0, W, 0.5, 'MULAI')
arr(ax, 0, 12.75, 0, 12.15)
rect(ax, 0, 11.9, W, 0.55, 'Pengguna membuka aplikasi', fc='#E3F2FD', ec='#1565C0')
arr(ax, 0, 11.62, 0, 11.05)
diamond(ax, 0, 10.7, DW, DH, 'Metode\nLogin?')

# Branch kiri: Email
arr(ax, -DW/2, 10.7, -1.5, 10.7, 'Email', lx=-1.1, ly=10.82)
arr(ax, -1.5, 10.7, -1.5, 10.0)
rect(ax, -1.5, 9.72, 2.4, 0.52, 'Input email\n& password', fc='#E8F8F0', ec='#1E8449')
arr(ax, -1.5, 9.46, -1.5, 8.9)
rect(ax, -1.5, 8.62, 2.4, 0.52, 'Verifikasi bcrypt\n(password hash)', fc='#E8F8F0', ec='#1E8449')
arr(ax, -1.5, 8.36, -1.5, 7.8)

# Branch kanan: Google
arr(ax, DW/2, 10.7, 1.5, 10.7, 'Google\nOAuth', lx=1.1, ly=10.82)
arr(ax, 1.5, 10.7, 1.5, 10.0)
rect(ax, 1.5, 9.72, 2.4, 0.52, 'Redirect ke\nGoogle OAuth 2.0', fc='#FCE4EC', ec='#C62828')
arr(ax, 1.5, 9.46, 1.5, 8.9)
rect(ax, 1.5, 8.62, 2.4, 0.52, 'Google verifikasi\nakun pengguna', fc='#FCE4EC', ec='#C62828')
arr(ax, 1.5, 8.36, 1.5, 7.8)

# Merge
ax.annotate('', xy=(0, 7.6), xytext=(-1.5, 7.8),
            arrowprops=dict(arrowstyle='->', color='#444', lw=1.4, mutation_scale=13))
ax.annotate('', xy=(0, 7.6), xytext=(1.5, 7.8),
            arrowprops=dict(arrowstyle='->', color='#444', lw=1.4, mutation_scale=13))

diamond(ax, 0, 7.2, DW, DH, 'Autentikasi\nBerhasil?')
arr(ax, DW/2, 7.2, 2.0, 7.2, 'Tidak', lx=1.6, ly=7.32)
rect(ax, 2.0, 6.5, 1.8, 0.52, 'Tampilkan\npesan error', fc='#FFEBEE', ec='#C62828', fs=7.5)
ax.annotate('', xy=(2.0, 7.2), xytext=(2.0, 6.76),
            arrowprops=dict(arrowstyle='->', color='#C62828', lw=1.2, mutation_scale=11))

arr(ax, 0, 6.84, 0, 6.28, 'Ya', lx=0.2, ly=6.55)
rect(ax, 0, 6.02, W, 0.5, 'Generate JWT Token\n(berlaku 7 hari)', fc='#E8F8F0', ec='#1E8449')
arr(ax, 0, 5.77, 0, 5.2)
rect(ax, 0, 4.95, W, 0.5, 'Redirect ke\nHalaman Dashboard', fc='#E3F2FD', ec='#1565C0')
arr(ax, 0, 4.70, 0, 4.12)
terminal(ax, 0, 3.88, W, 0.5, 'SELESAI')

# ═══════════════════════════════════════════════════════════════════════════════
# DIAGRAM 2 — Alur Penambahan Aset & Prediksi RUL
# ═══════════════════════════════════════════════════════════════════════════════
ax = axes[1]
setup_ax(ax, 'Alur 2: Penambahan Aset & Prediksi RUL', (-2.2, 2.2), (0, 13.5))

terminal(ax, 0, 13.0, W, 0.5, 'MULAI')
arr(ax, 0, 12.75, 0, 12.15)
rect(ax, 0, 11.9, W, 0.52, 'Pengguna mengisi\nformulir tambah aset', fc='#E3F2FD', ec='#1565C0')
arr(ax, 0, 11.64, 0, 11.05)
rect(ax, 0, 10.78, W, 0.52, 'Backend menyimpan\ndata aset ke PostgreSQL', fc='#FDEBD0', ec='#CA6F1E')
arr(ax, 0, 10.52, 0, 9.95)
rect(ax, 0, 9.68, W, 0.52, 'Backend mengumpulkan\nfitur aset (merek, kategori,\ntipe, lokasi, kekritisan)', fc='#FDEBD0', ec='#CA6F1E')
arr(ax, 0, 9.42, 0, 8.82)
rect(ax, 0, 8.55, W, 0.52, 'HTTP POST /predict\nke AI Engine (FastAPI)', fc='#EDE7F6', ec='#7B1FA2')
arr(ax, 0, 8.29, 0, 7.72)
rect(ax, 0, 7.45, W, 0.52, 'AI Engine: One-Hot\nEncoding fitur kategorikal', fc='#EDE7F6', ec='#7B1FA2')
arr(ax, 0, 7.19, 0, 6.62)
rect(ax, 0, 6.35, W, 0.52, 'Gradient Boosting\nRegressor memprediksi RUL', fc='#EDE7F6', ec='#7B1FA2', bold=True)
arr(ax, 0, 6.09, 0, 5.5)
rect(ax, 0, 5.23, W, 0.52, 'AI Engine mengembalikan\nnilai RUL (dalam bulan)', fc='#EDE7F6', ec='#7B1FA2')
arr(ax, 0, 4.97, 0, 4.4)
rect(ax, 0, 4.13, W, 0.52, 'Backend menyimpan\nAssetPredictionHistory\nke PostgreSQL', fc='#FDEBD0', ec='#CA6F1E')
arr(ax, 0, 3.87, 0, 3.3)
diamond(ax, 0, 2.92, DW, DH, 'RUL <= 6\nbulan?')
arr(ax, DW/2, 2.92, 1.9, 2.92, 'Ya', lx=1.4, ly=3.04)
rect(ax, 1.9, 2.35, 1.7, 0.52, 'Status:\nKritis', fc='#FFEBEE', ec='#C62828', fs=7.5)

arr(ax, 0, 2.56, 0, 1.95, 'Tidak', lx=0.22, ly=2.28)
rect(ax, 0, 1.68, W, 0.52, 'Tampilkan hasil prediksi\nRUL ke pengguna', fc='#E3F2FD', ec='#1565C0')
arr(ax, 0, 1.42, 0, 0.82)
terminal(ax, 0, 0.58, W, 0.5, 'SELESAI')

# ═══════════════════════════════════════════════════════════════════════════════
# DIAGRAM 3 — Alur Auto-Retraining Model
# ═══════════════════════════════════════════════════════════════════════════════
ax = axes[2]
setup_ax(ax, 'Alur 3: Auto-Retraining Model AI', (-2.2, 2.2), (0, 13.5))

terminal(ax, 0, 13.0, W, 0.5, 'MULAI (Tiap 5 Menit)')
arr(ax, 0, 12.75, 0, 12.15)
rect(ax, 0, 11.9, W, 0.52, 'APScheduler memicu\nproses pelatihan ulang', fc='#EDE7F6', ec='#7B1FA2')
arr(ax, 0, 11.64, 0, 11.05)
rect(ax, 0, 10.78, W, 0.52, 'AI Engine mengambil data\nAssetPredictionHistory\ndari PostgreSQL (SQLAlchemy)', fc='#EDE7F6', ec='#7B1FA2')
arr(ax, 0, 10.52, 0, 9.95)
diamond(ax, 0, 9.58, DW, DH, 'Data\ncukup?')
arr(ax, DW/2, 9.58, 1.9, 9.58, 'Tidak', lx=1.45, ly=9.70)
rect(ax, 1.9, 8.95, 1.8, 0.52, 'Lewati\npelatihan', fc='#FFEBEE', ec='#C62828', fs=7.5)
ax.annotate('', xy=(1.9, 9.58), xytext=(1.9, 9.21),
            arrowprops=dict(arrowstyle='->', color='#C62828', lw=1.2, mutation_scale=11))

arr(ax, 0, 9.22, 0, 8.62, 'Ya', lx=0.2, ly=8.95)
rect(ax, 0, 8.35, W, 0.52, 'Feature engineering:\nOne-Hot Encoding\nfitur kategorikal', fc='#EDE7F6', ec='#7B1FA2')
arr(ax, 0, 8.09, 0, 7.52)
rect(ax, 0, 7.25, W, 0.52, 'Latih model baru:\nGradient Boosting\nRegressor', fc='#EDE7F6', ec='#7B1FA2', bold=True)
arr(ax, 0, 6.99, 0, 6.42)
rect(ax, 0, 6.15, W, 0.52, 'Evaluasi model:\nMAE, MSE, R2 Score', fc='#EDE7F6', ec='#7B1FA2')
arr(ax, 0, 5.89, 0, 5.32)
rect(ax, 0, 5.05, W, 0.52, 'Simpan model baru\nauto_retrained_model.joblib', fc='#EDE7F6', ec='#7B1FA2')
arr(ax, 0, 4.79, 0, 4.22)
rect(ax, 0, 3.95, W, 0.52, 'Hot-swap model aktif\ndi memori (tanpa restart)', fc='#D5F5E3', ec='#1E8449', bold=True)
arr(ax, 0, 3.69, 0, 3.12)
rect(ax, 0, 2.85, W, 0.52, 'Model baru siap\nmenerima request\n/predict berikutnya', fc='#D5F5E3', ec='#1E8449')
arr(ax, 0, 2.59, 0, 1.95)
rect(ax, 0, 1.68, W, 0.52, 'Catat log pelatihan\n(durasi, metrik, waktu)', fc='#FDEBD0', ec='#CA6F1E')
arr(ax, 0, 1.42, 0, 0.82)
terminal(ax, 0, 0.58, W, 0.5, 'SELESAI')

# ── Legend shared ─────────────────────────────────────────────────────────────
legend_items = [
    ('#37474F', '#263238', 'Mulai / Selesai'),
    ('#E3F2FD', '#1565C0', 'Aksi Pengguna / Frontend'),
    ('#FDEBD0', '#CA6F1E', 'Backend (Express.js)'),
    ('#EDE7F6', '#7B1FA2', 'AI Engine (FastAPI)'),
    ('#FFF9C4', '#F9A825', 'Keputusan (Decision)'),
    ('#D5F5E3', '#1E8449', 'Output Sukses'),
]

leg_x = [0.06, 0.21, 0.36, 0.51, 0.66, 0.81]
for i, (fc, ec, label) in enumerate(legend_items):
    lx = leg_x[i]
    rect_patch = mpatches.FancyBboxPatch((lx, 0.005), 0.06, 0.022,
                                          boxstyle='round,pad=0.003',
                                          fc=fc, ec=ec, lw=1.2,
                                          transform=fig.transFigure, zorder=6)
    fig.add_artist(rect_patch)
    fig.text(lx + 0.068, 0.016, label, fontsize=7.5, color='#333333',
             va='center', transform=fig.transFigure)

plt.tight_layout(rect=[0, 0.04, 1, 0.97])
plt.savefig('workflow_diagram.png', dpi=300, bbox_inches='tight',
            facecolor=fig.get_facecolor())
plt.savefig('workflow_diagram.svg', bbox_inches='tight',
            facecolor=fig.get_facecolor())

print("Done: workflow_diagram.png  (300 DPI)")
print("Done: workflow_diagram.svg  (vector)")

import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
import matplotlib.patheffects as pe

fig, ax = plt.subplots(1, 1, figsize=(16, 11))
ax.set_xlim(0, 16)
ax.set_ylim(0, 11)
ax.axis('off')
fig.patch.set_facecolor('#FAFAFA')

# ── Layer bands ──────────────────────────────────────────────────────────────
layers = [
    (9.8,  10.8, '#E8F4FD', 'USER LAYER'),
    (7.9,   9.6, '#E8F8F0', 'PRESENTATION\nLAYER'),
    (5.2,   7.7, '#FFF3E0', 'APPLICATION\nLAYER'),
    (2.7,   5.0, '#F3E5F5', 'AI / ML\nLAYER'),
    (0.2,   2.5, '#F5F5F5', 'DATA &\nEXTERNAL\nLAYER'),
]

for y0, y1, color, label in layers:
    band = FancyBboxPatch((0.3, y0), 15.4, y1 - y0,
                          boxstyle='round,pad=0.05',
                          facecolor=color, edgecolor='#CCCCCC',
                          linewidth=0.8, zorder=1)
    ax.add_patch(band)
    ax.text(0.72, (y0 + y1) / 2, label,
            fontsize=7.5, fontweight='bold', color='#555555',
            va='center', ha='left', linespacing=1.4, zorder=2)

# ── Helper: draw a rounded-rect component box ─────────────────────────────────
def box(ax, x, y, w, h, title, subtitle='', fc='#FFFFFF', ec='#999999', lw=1.4):
    patch = FancyBboxPatch((x, y), w, h,
                           boxstyle='round,pad=0.12',
                           facecolor=fc, edgecolor=ec,
                           linewidth=lw, zorder=3)
    ax.add_patch(patch)
    cx, cy = x + w / 2, y + h / 2
    if subtitle:
        ax.text(cx, cy + 0.13, title,
                fontsize=9.5, fontweight='bold', color='#222222',
                ha='center', va='center', zorder=4)
        ax.text(cx, cy - 0.20, subtitle,
                fontsize=7.2, color='#555555',
                ha='center', va='center', zorder=4, style='italic')
    else:
        ax.text(cx, cy, title,
                fontsize=9.5, fontweight='bold', color='#222222',
                ha='center', va='center', zorder=4)

# ── Component boxes ───────────────────────────────────────────────────────────

# User
box(ax, 6.2, 9.88, 3.6, 0.78,
    'Web Browser / End User',
    fc='#D6EAF8', ec='#2E86C1', lw=1.8)

# Frontend
box(ax, 4.5, 8.0, 7.0, 1.38,
    'Next.js 16  Frontend',
    'React 19  ·  Tailwind CSS  ·  Chart.js  ·  Recharts  ·  Framer Motion',
    fc='#D5F5E3', ec='#1E8449', lw=1.8)

# Backend
box(ax, 2.8, 5.35, 10.4, 2.1,
    'Express.js  Backend API  (Node.js + TypeScript)',
    'Prisma 7 ORM  ·  Passport.js  ·  JWT Auth  ·  CORS\n'
    'Routes: /assets · /maintenance · /dashboard · /alerts · /predict-rul · /summarize',
    fc='#FDEBD0', ec='#CA6F1E', lw=1.8)

# AI Engine
box(ax, 2.8, 2.82, 10.4, 1.98,
    'FastAPI  AI Engine  (Python)',
    'Gradient Boosting (scikit-learn)  ·  Random Forest  ·  APScheduler (retrain tiap 5 menit)\n'
    'Endpoints: /predict · /summarize · /retrain · /training-status',
    fc='#EDE7F6', ec='#7B1FA2', lw=1.8)

# PostgreSQL
box(ax, 1.2, 0.35, 4.0, 1.9,
    'PostgreSQL',
    'Prisma ORM (Backend)\nSQLAlchemy (AI Engine)',
    fc='#E3F2FD', ec='#1565C0', lw=1.8)

# Google OAuth
box(ax, 6.0, 0.35, 3.5, 1.9,
    'Google OAuth 2.0',
    'Passport-Google-OAuth20\nJWT (7-day expiry)',
    fc='#FCE4EC', ec='#C62828', lw=1.8)

# HuggingFace
box(ax, 10.3, 0.35, 4.5, 1.9,
    'HuggingFace  LLMs',
    'Llama 3.1 · Qwen · Zephyr\nRingkasan aset (Bahasa Indonesia)',
    fc='#FFF9C4', ec='#F9A825', lw=1.8)

# ── Arrows ────────────────────────────────────────────────────────────────────
arrow_style = dict(arrowstyle='->', color='#444444',
                   lw=1.5, connectionstyle='arc3,rad=0.0',
                   mutation_scale=14, zorder=5)

def arrow(ax, x1, y1, x2, y2, label='', rad=0.0, lx=None, ly=None, la='center'):
    style = dict(arrowstyle='->', color='#444444', lw=1.5,
                 connectionstyle=f'arc3,rad={rad}',
                 mutation_scale=14, zorder=5)
    ax.annotate('', xy=(x2, y2), xytext=(x1, y1),
                arrowprops=style)
    if label:
        mx = lx if lx is not None else (x1 + x2) / 2
        my = ly if ly is not None else (y1 + y2) / 2
        ax.text(mx, my, label, fontsize=7, color='#333333',
                ha=la, va='center', zorder=6,
                bbox=dict(fc='white', ec='none', pad=1.5))

def darrow(ax, x1, y1, x2, y2, label='', lx=None, ly=None):
    """Double-headed arrow."""
    style = dict(arrowstyle='<->', color='#444444', lw=1.5,
                 connectionstyle='arc3,rad=0.0',
                 mutation_scale=14, zorder=5)
    ax.annotate('', xy=(x2, y2), xytext=(x1, y1),
                arrowprops=style)
    if label:
        mx = lx if lx is not None else (x1 + x2) / 2
        my = ly if ly is not None else (y1 + y2) / 2
        ax.text(mx, my, label, fontsize=7, color='#333333',
                ha='center', va='center', zorder=6,
                bbox=dict(fc='white', ec='none', pad=1.5))

# User ↔ Frontend
darrow(ax, 8.0, 9.88, 8.0, 9.38, 'HTTPS', lx=8.4)

# Frontend → Backend
arrow(ax, 8.0, 8.0, 8.0, 7.45, 'REST API + JWT', lx=8.55)

# Backend → AI Engine (right side)
arrow(ax, 12.5, 5.35, 12.5, 4.80, 'HTTP POST\n/predict · /summarize', lx=13.5, ly=5.1)

# Backend → PostgreSQL (left side)
arrow(ax, 4.5, 5.35, 3.8, 2.25, 'Prisma ORM', lx=3.1, ly=3.9, rad=-0.25)

# AI Engine → PostgreSQL
arrow(ax, 5.8, 2.82, 3.8, 2.25, 'SQLAlchemy\n(Auto-retrain)', lx=4.1, ly=2.35)

# Backend ↔ Google OAuth
darrow(ax, 7.75, 5.35, 7.75, 2.25, 'OAuth 2.0', lx=8.3, ly=3.8)

# AI Engine → HuggingFace
arrow(ax, 12.5, 2.82, 12.55, 2.25, 'API Call\n(LLM)', lx=13.4, ly=2.55)

# ── Title ─────────────────────────────────────────────────────────────────────
ax.text(8.0, 10.72,
        'Arsitektur Sistem KIRA — AI-Powered Asset RUL Prediction',
        fontsize=13, fontweight='bold', color='#1A1A2E',
        ha='center', va='center', zorder=6)

# ── Legend ────────────────────────────────────────────────────────────────────
legend_items = [
    ('#D6EAF8', '#2E86C1', 'User Interface'),
    ('#D5F5E3', '#1E8449', 'Frontend (Next.js)'),
    ('#FDEBD0', '#CA6F1E', 'Backend API (Express.js)'),
    ('#EDE7F6', '#7B1FA2', 'AI / ML Engine (FastAPI)'),
    ('#E3F2FD', '#1565C0', 'Database (PostgreSQL)'),
    ('#FCE4EC', '#C62828', 'Auth Service'),
    ('#FFF9C4', '#F9A825', 'LLM Service'),
]

lx_start = 1.2
for i, (fc, ec, label) in enumerate(legend_items):
    lx = lx_start + i * 2.1
    patch = mpatches.FancyBboxPatch((lx, 0.0), 0.35, 0.22,
                                     boxstyle='round,pad=0.03',
                                     fc=fc, ec=ec, lw=1.2, zorder=6)
    ax.add_patch(patch)
    ax.text(lx + 0.42, 0.11, label, fontsize=6.5, color='#333333',
            va='center', zorder=7)

plt.tight_layout(pad=0.3)
plt.savefig('architecture_diagram.png', dpi=300, bbox_inches='tight',
            facecolor=fig.get_facecolor())
plt.savefig('architecture_diagram.svg', bbox_inches='tight',
            facecolor=fig.get_facecolor())

print("Done: architecture_diagram.png  (300 DPI)")
print("Done: architecture_diagram.svg  (vector)")

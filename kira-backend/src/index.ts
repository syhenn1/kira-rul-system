import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import http from 'http';
import cors from 'cors';
import passport from 'passport';
import { WebSocketServer, WebSocket } from 'ws';
import './passport.config';
import authRoutes from './auth/auth.routes';
import { authenticateJWT } from './middleware/auth.middleware';
import prisma from './lib/prisma';
import bcrypt from 'bcryptjs';

const app = express();
const httpServer = http.createServer(app);

// ── WebSocket server ─────────────────────────────────────────────────────────
const wss = new WebSocketServer({ server: httpServer });

// Map companyId → active WebSocket clients in that company's "room"
const wsRooms = new Map<string, Set<WebSocket>>();

export function wsBroadcast(companyId: string, event: string, data: unknown) {
  const msg = JSON.stringify({ event, data });
  const clients = wsRooms.get(companyId);
  if (!clients) return;
  clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(msg);
  });
}

wss.on('connection', (ws) => {
  ws.on('message', async (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      // Client sends { type:'auth', token:'...' } → server verifies JWT and joins company room
      if (msg.type === 'auth' && msg.token) {
        const jwt = await import('jsonwebtoken');
        const payload = jwt.default.verify(msg.token, process.env.JWT_SECRET || 'kira_secret_key') as any;
        const userId = payload.id || payload.sub;
        const company = await findUserCompany(userId);
        if (company) {
          if (!wsRooms.has(company.id)) wsRooms.set(company.id, new Set());
          wsRooms.get(company.id)!.add(ws);
          ws.send(JSON.stringify({ event: 'connected', data: { companyId: company.id } }));
        }
      }
    } catch { /* invalid token or parse error — ignore */ }
  });

  ws.on('close', () => {
    wsRooms.forEach((clients) => clients.delete(ws));
  });
});

const isLocalNetworkOrigin = (origin: string) =>
  /^http:\/\/(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(origin);

app.use(
  cors({
    origin: (origin, callback) => {
      const allowed = (process.env.FRONTEND_URL || 'http://localhost:3000')
        .split(',')
        .map((u) => u.trim());
      // Allow: no-origin requests, configured origins, and local network IPs (for mobile dev access)
      if (!origin || allowed.some((u) => origin.startsWith(u)) || isLocalNetworkOrigin(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(passport.initialize());

const PORT = process.env.PORT || 3001;

// ── Helper: Prisma company filter — owner OR member OR direct FK (teknisi) ───
function companyFilter(userId: string) {
  return {
    OR: [
      { owner_id:   userId },
      { members:     { some: { id_user: userId } } },
      { direktUsers: { some: { id: userId } } },
    ],
  };
}

// ── Helper: find user's company (direct FK → owner → CompanyMember) ─────────
async function findUserCompany(userId: string) {
  // Priority 1: direct id_perusahaan on the user row (set for teknisi)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id_perusahaan: true },
  });
  if (user?.id_perusahaan) {
    return prisma.company.findUnique({ where: { id: user.id_perusahaan } });
  }
  // Priority 2: owner or CompanyMember (admin / regular member)
  return prisma.company.findFirst({
    where: {
      OR: [
        { owner_id: userId },
        { members: { some: { id_user: userId } } },
      ],
    },
  });
}

// Maintenance tidak lagi menyimpan status/scheduled_date/start_date/completion_date secara
// langsung — semua nilai ini diturunkan dari riwayat status di maintenance_logs: status
// "saat ini" = status entri log paling baru, dan setiap tanggal = created_at entri terakhir
// yang berstatus terkait (created_at adalah satu-satunya patokan waktu di sebuah log).
function deriveMaintenanceFields(logs: any[] | undefined | null) {
  // Urutkan menaik berdasarkan created_at agar tidak bergantung pada urutan query (asc/desc)
  const list = [...(logs || [])].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  const lastWithStatus = (status: string) => {
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i]?.status === status) return list[i];
    }
    return null;
  };

  return {
    status: list[list.length - 1]?.status ?? 'Scheduled',
    scheduled_date: lastWithStatus('Scheduled')?.created_at ?? null,
    start_date: lastWithStatus('In Progress')?.created_at ?? null,
    completion_date: lastWithStatus('Completed')?.created_at ?? null,
  };
}

function withDerivedMaintenanceFields<T extends { logs?: any[]; teknisi?: any; assignedTechnician?: any }>(maintenance: T) {
  const result: any = { ...maintenance, ...deriveMaintenanceFields(maintenance.logs) };
  // Alias 'teknisi' → 'technician' for frontend backward-compat
  if ('teknisi' in result) result.technician = result.teknisi;
  // Alias assignedTechnician.teknisi_status → status for backward-compat
  if (result.assignedTechnician?.teknisi_status !== undefined) {
    result.assignedTechnician = { ...result.assignedTechnician, status: result.assignedTechnician.teknisi_status };
  }
  // Same alias in logs
  if (Array.isArray(result.logs)) {
    result.logs = result.logs.map((log: any) => {
      const l = { ...log };
      if ('teknisi' in l) l.technician = l.teknisi;
      if (l.technician?.teknisi_status !== undefined) l.technician = { ...l.technician, status: l.technician.teknisi_status };
      return l;
    });
  }
  return result;
}

// Auth routes
app.use('/api/auth', authRoutes);

app.get('/api/assets', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const {
      search = '', status = '', page = '1', limit = '10',
      sort_by = 'name_asc',
      rul_min = '', rul_max = '',
      category = '', criticality = '', gedung_id = '',
    } = req.query;

    const fetchAll    = String(limit).trim().toLowerCase() === 'all';
    const pageNumber  = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNumber = fetchAll ? Infinity : Math.min(100, Math.max(1, parseInt(String(limit), 10) || 10));
    const skip        = fetchAll ? 0 : (pageNumber - 1) * limitNumber;
    const searchText      = String(search).trim();
    const statusText      = String(status).trim();
    const sortByText      = String(sort_by).trim();
    const rulMinNum       = rul_min !== '' ? parseFloat(String(rul_min)) : null;
    const rulMaxNum       = rul_max !== '' ? parseFloat(String(rul_max)) : null;
    const categoryText    = String(category).trim();
    const criticalityText = String(criticality).trim();
    const gedungIdText    = String(gedung_id).trim();

    const companyWhere = companyFilter(userId);

    // Build Prisma WHERE using AND so multiple conditions compose correctly
    const andClauses: any[] = [];

    if (searchText) {
      andClauses.push({
        OR: [
          { asset_name:  { contains: searchText, mode: 'insensitive' } },
          { merk:        { nama: { contains: searchText, mode: 'insensitive' } } },
          { kategori:    { nama: { contains: searchText, mode: 'insensitive' } } },
          { subKategori: { nama: { contains: searchText, mode: 'insensitive' } } },
          { tipe:        { nama: { contains: searchText, mode: 'insensitive' } } },
        ],
      });
    }
    if (statusText && statusText !== 'All Status') {
      andClauses.push({ status: statusText });
    }
    if (categoryText) {
      andClauses.push({ kategori: { nama: { equals: categoryText, mode: 'insensitive' } } });
    }
    if (criticalityText) {
      andClauses.push({ criticality_level: criticalityText });
    }
    if (gedungIdText) {
      andClauses.push({ gedung_id: gedungIdText });
    }

    const assetWhere: any = {
      company: companyWhere,
      ...(andClauses.length > 0 ? { AND: andClauses } : {}),
    };

    // Fetch all matching assets (no pagination yet — RUL sort/filter happens in JS)
    const [allAssets, statusCounts] = await Promise.all([
      prisma.asset.findMany({
        where: assetWhere,
        include: {
          gedung:      { select: { nama: true, kode: true } },
          merk:        { select: { nama: true } },
          kategori:    { select: { nama: true } },
          subKategori: { select: { nama: true } },
          tipe:        { select: { nama: true } },
          prediction_history: {
            orderBy: { recorded_at: 'desc' },
            take: 1,
            select: { predicted_rul: true },
          },
          maintenances: {
            orderBy: { created_at: 'desc' },
            take: 1,
            select: { created_at: true },
          },
        },
      }),
      prisma.asset.groupBy({
        by: ['status'],
        where: { company: companyWhere },
        _count: { id: true },
      }),
    ]);

    // Map to response shape
    let mapped: any[] = (allAssets as any[]).map((a) => ({
      id: a.id,
      asset_name: a.asset_name,
      brand: a.merk?.nama ?? '',
      category: a.kategori?.nama ?? '',
      sub_category: a.subKategori?.nama ?? '',
      type: a.tipe?.nama ?? '',
      status: a.status,
      criticality_level: a.criticality_level,
      purchase_date: a.purchase_date,
      gedung: a.gedung,
      predicted_rul: a.prediction_history[0]?.predicted_rul ?? null,
      last_action: a.maintenances[0]?.created_at ?? a.purchase_date,
    }));

    // Apply RUL range filter in JS (predicted_rul lives in a related table)
    if (rulMinNum !== null) {
      mapped = mapped.filter((a) => a.predicted_rul !== null && a.predicted_rul >= rulMinNum);
    }
    if (rulMaxNum !== null) {
      mapped = mapped.filter((a) => a.predicted_rul !== null && a.predicted_rul <= rulMaxNum);
    }

    // Sort in JS
    switch (sortByText) {
      case 'name_desc':
        mapped.sort((a, b) => b.asset_name.localeCompare(a.asset_name));
        break;
      case 'rul_asc':
        mapped.sort((a, b) => {
          if (a.predicted_rul === null) return 1;
          if (b.predicted_rul === null) return -1;
          return a.predicted_rul - b.predicted_rul;
        });
        break;
      case 'rul_desc':
        mapped.sort((a, b) => {
          if (a.predicted_rul === null) return 1;
          if (b.predicted_rul === null) return -1;
          return b.predicted_rul - a.predicted_rul;
        });
        break;
      case 'date_desc':
        mapped.sort((a, b) => new Date(b.last_action).getTime() - new Date(a.last_action).getTime());
        break;
      case 'date_asc':
        mapped.sort((a, b) => new Date(a.last_action).getTime() - new Date(b.last_action).getTime());
        break;
      default: // name_asc
        mapped.sort((a, b) => a.asset_name.localeCompare(b.asset_name));
    }

    const filteredTotal = mapped.length;
    const paginated     = mapped.slice(skip, skip + limitNumber);

    const byStatus = (statusCounts as any[]).reduce((acc: Record<string, number>, item: any) => {
      acc[item.status] = item._count.id;
      return acc;
    }, {});

    return res.status(200).json({
      data: paginated,
      stats: {
        total: (statusCounts as any[]).reduce((s: number, r: any) => s + r._count.id, 0),
        by_status: byStatus,
      },
      pagination: {
        page: pageNumber,
        limit: fetchAll ? filteredTotal : limitNumber,
        total: filteredTotal,
        totalPages: fetchAll ? 1 : (Math.ceil(filteredTotal / limitNumber) || 1),
      },
    });
  } catch (error) {
    console.error('Error fetching assets:', error);
    return res.status(500).json({ error: 'Failed to fetch assets', details: (error as Error).message });
  }
});

app.get('/api/assets/:id', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    const asset = await prisma.asset.findFirst({
      where: {
        id,
        company: companyFilter(userId),
      },
      include: {
        gedung:      true,
        merk:        true,
        kategori:    true,
        subKategori: true,
        tipe:        true,
        maintenances: {
          orderBy: { created_at: 'desc' },
          include: {
            user: { select: { id: true, name: true } },
            logs: {
              orderBy: { created_at: 'asc' },
              include: { user: { select: { id: true, name: true } } },
            },
          },
        },
        prediction_history: {
          orderBy: { recorded_at: 'desc' },
        },
      },
    });

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found or inaccessible' });
    }

    const latestPrediction = (asset as any).prediction_history[0] ?? null;

    return res.status(200).json({
      data: {
        id:                  asset.id,
        asset_name:          asset.asset_name,
        status:              asset.status,
        criticality_level:   asset.criticality_level,
        purchase_date:       asset.purchase_date,
        initial_useful_life: asset.initial_useful_life,
        asset_image:         (asset as any).asset_image ?? null,
        gedung:              asset.gedung,
        brand:               (asset as any).merk?.nama        ?? '-',
        category:            (asset as any).kategori?.nama    ?? '-',
        sub_category:        (asset as any).subKategori?.nama ?? '-',
        type:                (asset as any).tipe?.nama        ?? '-',
        predicted_rul:       latestPrediction?.predicted_rul ?? null,
        maintenance_count:   (asset as any).maintenances.length,
        maintenances:        (asset as any).maintenances.map(withDerivedMaintenanceFields),
        prediction_history:  (asset as any).prediction_history,
      },
    });
  } catch (error) {
    console.error('Error fetching asset detail:', error);
    return res.status(500).json({ error: 'Failed to fetch asset', details: (error as Error).message });
  }
});

app.patch('/api/assets/:id', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;
    const { asset_name, purchase_date, brand, category, sub_category, type, criticality_level, status, gedung_id } = req.body;

    const asset = await prisma.asset.findFirst({
      where: { id, company: { owner_id: userId } },
      select: { id: true },
    });

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found or inaccessible' });
    }

    const hasField = (f: string) => Object.prototype.hasOwnProperty.call(req.body, f);
    const updateData: any = {};
    if (hasField('asset_name') && asset_name) updateData.asset_name = asset_name;
    if (hasField('purchase_date') && purchase_date) updateData.purchase_date = new Date(purchase_date);
    if (hasField('brand')) updateData.brand = brand;
    if (hasField('category')) updateData.category = category;
    if (hasField('sub_category')) updateData.sub_category = sub_category;
    if (hasField('type')) updateData.type = type;
    if (hasField('criticality_level')) updateData.criticality_level = criticality_level;
    if (hasField('status')) updateData.status = status;
    if (hasField('gedung_id')) updateData.gedung_id = gedung_id || null;

    const updated = await prisma.asset.update({
      where: { id },
      data: updateData,
      include: { gedung: { select: { id: true, nama: true, kode: true } } },
    });

    return res.status(200).json({ message: 'Asset berhasil diperbarui', data: updated });
  } catch (error) {
    console.error('Error updating asset:', error);
    return res.status(500).json({ error: 'Failed to update asset', details: (error as Error).message });
  }
});

app.delete('/api/assets/:id', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    const asset = await prisma.asset.findFirst({
      where: { id, company: { owner_id: userId } },
      select: { id: true },
    });

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found or inaccessible' });
    }

    await prisma.$transaction(async (tx: any) => {
      const maintenances = await tx.maintenance.findMany({
        where: { id_asset: id },
        select: { id: true },
      });
      const mIds = maintenances.map((m: any) => m.id);
      if (mIds.length > 0) {
        await tx.maintenanceLog.deleteMany({ where: { id_maintenance: { in: mIds } } });
        await tx.assetPredictionHistory.deleteMany({ where: { id_maintenance: { in: mIds } } });
      }
      await tx.assetPredictionHistory.deleteMany({ where: { id_asset: id } });
      await tx.maintenance.deleteMany({ where: { id_asset: id } });
      await tx.asset.delete({ where: { id } });
    });

    return res.status(200).json({ message: 'Asset berhasil dihapus' });
  } catch (error) {
    console.error('Error deleting asset:', error);
    return res.status(500).json({ error: 'Failed to delete asset', details: (error as Error).message });
  }
});

// GET /api/lookup/merk|kategori|sub_kategori|tipe
app.get('/api/lookup/:table', authenticateJWT, async (req: Request, res: Response) => {
  const { table } = req.params;
  try {
    let data: any[];
    switch (table) {
      case 'merk':         data = await prisma.merk.findMany({ orderBy: { nama: 'asc' } }); break;
      case 'kategori':     data = await prisma.kategori.findMany({ orderBy: { nama: 'asc' } }); break;
      case 'sub_kategori': data = await prisma.subKategori.findMany({ orderBy: { nama: 'asc' } }); break;
      case 'tipe':         data = await prisma.tipe.findMany({ orderBy: { nama: 'asc' } }); break;
      default: return res.status(400).json({ error: 'Invalid lookup table' });
    }
    return res.status(200).json({ data });
  } catch (error) {
    console.error(`Error fetching lookup ${table}:`, error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// API endpoint untuk menambahkan asset
app.post('/api/assets', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const {
      asset_name,
      purchase_date,
      status,
      criticality_level,
      gedung_id,
      merk_id,
      kategori_id,
      sub_kategori_id,
      tipe_id,
    } = req.body;

    if (!asset_name || !purchase_date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const finalStatus = status || 'Active';

    const userId = (req as any).user.id;
    const userCompany = await findUserCompany(userId);

    if (!userCompany) {
      return res.status(400).json({ error: 'User does not belong to any company. Please contact your administrator.' });
    }

    const companyId = userCompany.id;

    // Resolve names from FK IDs for AI engine call (not stored in assets table)
    const [merkRow, kategoriRow, subKategoriRow, tipeRow] = await Promise.all([
      merk_id        ? prisma.merk.findUnique({ where: { id: merk_id } })               : null,
      kategori_id    ? prisma.kategori.findUnique({ where: { id: kategori_id } })        : null,
      sub_kategori_id? prisma.subKategori.findUnique({ where: { id: sub_kategori_id } }) : null,
      tipe_id        ? prisma.tipe.findUnique({ where: { id: tipe_id } })                : null,
    ]);

    // Fallback RUL saat AI tidak tersedia — berdasarkan tingkat kekritisan (dalam hari)
    const criticalityFallbackRUL: Record<string, number> = {
      'Critical': 90,
      'Major':    180,
      'Minor':    365,
    };
    const finalCriticality = criticality_level || 'Minor';
    const fallbackRUL = criticalityFallbackRUL[finalCriticality] ?? 365;

    const newAsset = await prisma.asset.create({
      data: {
        asset_name,
        purchase_date: new Date(purchase_date),
        initial_useful_life: fallbackRUL,          // simpan fallback sebagai useful life awal
        criticality_level: finalCriticality,
        status: finalStatus,
        company: { connect: { id: companyId } },
        ...(gedung_id       ? { gedung:      { connect: { id: gedung_id } } }       : {}),
        ...(merk_id         ? { merk:        { connect: { id: merk_id } } }         : {}),
        ...(kategori_id     ? { kategori:    { connect: { id: kategori_id } } }     : {}),
        ...(sub_kategori_id ? { subKategori: { connect: { id: sub_kategori_id } } } : {}),
        ...(tipe_id         ? { tipe:        { connect: { id: tipe_id } } }         : {}),
      },
    });

    // Resolve gedung nama for AI (optional enrichment)
    const gedungRow = gedung_id
      ? await (prisma as any).gedung.findUnique({ where: { id: gedung_id }, select: { nama: true } })
      : null;

    // Prediksi RUL — fallback ke nilai berdasarkan kekritisan jika AI tidak tersedia
    let predicted_rul = fallbackRUL;
    try {
      const aiEngineBase = (process.env.AI_ENGINE_URL || 'http://localhost:8000').replace(/\/$/, '');
      const aiEngineUrl = `${aiEngineBase}/predict`;
      const aiResponse = await fetch(aiEngineUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merek:                 merkRow?.nama        || 'Generic',
          kategori:              kategoriRow?.nama    || 'Mechanical',
          sub_kategori:          subKategoriRow?.nama || 'Tata Udara',
          tipe:                  tipeRow?.nama        || 'General Equipment',
          tingkat_kekritisan:    finalCriticality,
          count_nama_aset:       0,
          average_down_time:     0.0,
          sum_biaya_perbaikan:   0.0,
          mode_severity:         '',           // kosong untuk aset baru tanpa riwayat
          maximum_biaya_perbaikan: 0.0,
          lokasi_gedung:         gedungRow?.nama || '',
        }),
      });

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        if (aiData && typeof aiData.predicted_rul === 'number' && aiData.predicted_rul > 0) {
          predicted_rul = Math.round(aiData.predicted_rul);
        }
      } else {
        console.warn(`AI Engine returned non-OK status ${aiResponse.status} — using fallback RUL ${fallbackRUL}`);
      }
    } catch (e) {
      console.warn(`AI Engine predict failed — using fallback RUL ${fallbackRUL} (${finalCriticality}):`, e);
    }

    // Save initial prediction history (non-fatal — asset creation already succeeded)
    try {
      await prisma.assetPredictionHistory.create({
        data: {
          id_asset:               newAsset.id,
          predicted_rul:          predicted_rul,
          maintenance_count:      0,
          average_down_time:      0.0,
          total_maintenance_cost: 0.0,
          max_maintenance_cost:   0.0,
          mode_severity:          '',
        }
      });
    } catch (histErr) {
      // Log but don't fail the request — the asset was already created
      console.warn('Warning: Could not save initial prediction history:', histErr);
    }

    console.log(`[POST /api/assets] SUCCESS — asset "${asset_name}" created, predicted_rul=${predicted_rul}`);
    return res.status(201).json({
      message: 'Asset berhasil ditambahkan',
      data: {
        ...newAsset,
        predicted_rul
      }
    });
  } catch (error) {
    console.error('[POST /api/assets] Error adding asset:', error);
    return res.status(500).json({ error: 'Internal Server Error', details: (error as Error).message });
  }
});

// Endpoint untuk prediksi RUL
app.post('/api/predict-rul', async (req: Request, res: Response) => {
  try {
    const aiEngineBase = (process.env.AI_ENGINE_URL || 'http://localhost:8000').replace(/\/$/, '');
    const aiEngineUrl = `${aiEngineBase}/predict`;

    const response = await fetch(aiEngineUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI Engine responded with status ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('Error in predict-rul endpoint:', error);
    return res.status(500).json({ error: 'Failed to predict RUL', details: (error as Error).message });
  }
});

// Proxy endpoint prediksi severity ke AI engine
app.post('/api/predict-severity', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const aiEngineBase = (process.env.AI_ENGINE_URL || 'http://localhost:8000').replace(/\/$/, '');
    const response = await fetch(`${aiEngineBase}/predict-severity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json(data);
    }
    return res.status(200).json(data);
  } catch (error) {
    console.error('Error in predict-severity endpoint:', error);
    return res.status(500).json({ error: 'Failed to predict severity', details: (error as Error).message });
  }
});

app.get('/api/maintenances', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const {
      search = '',
      status = '',
      severity = '',
      sort_by = 'date_desc',
      page = '1',
      limit = '10',
    } = req.query;

    const pageNumber = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNumber = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 10));
    const skip = (pageNumber - 1) * limitNumber;
    const searchText = String(search).trim();
    const statusText = String(status).trim();
    const severityText = String(severity).trim();
    const sortByText = String(sort_by).trim();

    const where: any = {
      AND: [
        { asset: { company: companyFilter(userId) } },
      ],
    };

    if (searchText) {
      where.AND.push({
        OR: [
          { maintenance_type: { contains: searchText, mode: 'insensitive' } },
          { severity: { contains: searchText, mode: 'insensitive' } },
          { asset: { asset_name: { contains: searchText, mode: 'insensitive' } } },
          { user: { name: { contains: searchText, mode: 'insensitive' } } },
        ],
      });
    }

    if (severityText && severityText !== 'All Priority' && severityText !== 'All Severity') {
      where.AND.push({ severity: severityText });
    }

    // Status kini diturunkan dari maintenance_logs (bukan kolom langsung), jadi tidak bisa
    // difilter di level DB — fetch semua yang cocok kriteria lain, derive status, lalu
    // filter & paginasi di JS (pola yang sama dipakai endpoint /api/assets untuk RUL).
    const allMaintenances = await prisma.maintenance.findMany({
      where,
      orderBy: { created_at: 'desc' },
      include: {
        asset: {
          include: {
            merk:        true,
            kategori:    true,
            subKategori: true,
            tipe:        true,
          },
        },
        user: {
          select: { id: true, name: true, email: true },
        },
        assignedTechnician: {
          select: { id: true, name: true, email: true, specialization: true, phone: true, teknisi_status: true },
        },
        teknisi: {
          select: { id: true, name: true, email: true, specialization: true, phone: true },
        },
        logs: {
          orderBy: { created_at: 'asc' },
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
            teknisi: {
              select: { id: true, name: true, email: true, specialization: true, phone: true, teknisi_status: true },
            },
          },
        },
        prediction_history: {
          orderBy: { recorded_at: 'desc' },
          take: 1,
        },
      },
    });

    let withDerived = allMaintenances.map((maintenance: any) => withDerivedMaintenanceFields(maintenance));

    if (statusText && statusText !== 'All Status') {
      withDerived = withDerived.filter((m: any) => m.status === statusText);
    }

    withDerived.sort((a: any, b: any) => {
      switch (sortByText) {
        case 'date_asc':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'name_asc':
          return String(a.asset?.asset_name ?? '').localeCompare(String(b.asset?.asset_name ?? ''));
        case 'name_desc':
          return String(b.asset?.asset_name ?? '').localeCompare(String(a.asset?.asset_name ?? ''));
        case 'cost_desc':
          return Number(b.cost ?? 0) - Number(a.cost ?? 0);
        case 'cost_asc':
          return Number(a.cost ?? 0) - Number(b.cost ?? 0);
        case 'date_desc':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    const filteredTotal = withDerived.length;
    const paginated     = withDerived.slice(skip, skip + limitNumber);

    return res.status(200).json({
      data: paginated,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total: filteredTotal,
        totalPages: Math.ceil(filteredTotal / limitNumber) || 1,
      },
    });
  } catch (error) {
    console.error('Error fetching maintenances:', error);
    return res.status(500).json({ error: 'Failed to fetch maintenances', details: (error as Error).message });
  }
});

// API endpoint untuk menambahkan maintenance
app.post('/api/maintenances', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const {
      id_asset,
      maintenance_type,
      cost,
      assigned_technician_id,
      id_teknisi,
      note,
      jenis_kerusakan,
      penyebab,
      spare_part_digunakan,
    } = req.body;

    if (!id_asset || !id_teknisi) {
      return res.status(400).json({ error: 'Missing required fields (id_asset, id_teknisi)' });
    }

    // Gunakan user yang sedang login
    const userId = (req as any).user.id;

    const asset = await prisma.asset.findFirst({
      where: {
        id: id_asset,
        company: companyFilter(userId),
      },
      include: { gedung: true, merk: true, kategori: true, subKategori: true, tipe: true },
    });

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    // Prediksi severity via AI engine (opsional — hanya jika field teks tersedia)
    let predicted_severity: string | null = null;
    let severity_confidence: number | null = null;
    if (jenis_kerusakan && penyebab) {
      try {
        const aiEngineBase = (process.env.AI_ENGINE_URL || 'http://localhost:8000').replace(/\/$/, '');
        const sevResponse = await fetch(`${aiEngineBase}/predict-severity`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jenis_kerusakan:  jenis_kerusakan,
            penyebab:         penyebab,
            spare_part:       spare_part_digunakan || '',
            kategori:         (asset as any).kategori?.nama    || '',
            sub_kategori:     (asset as any).subKategori?.nama || '',
            tipe:             (asset as any).tipe?.nama        || '',
            biaya_perbaikan:  cost ? parseFloat(cost) : 0,
          }),
        });
        if (sevResponse.ok) {
          const sevData = await sevResponse.json();
          predicted_severity  = sevData.predicted_severity  ?? null;
          severity_confidence = sevData.confidence          ?? null;
        }
      } catch (e) {
        console.warn("AI Engine predict-severity failed (non-fatal):", e);
      }
    }

    // Insert maintenance into DB — maintenance baru selalu mulai berstatus "Scheduled"
    // (tanggal "dijadwalkan" = created_at log ini); progres berikutnya dicatat lewat maintenance_logs.
    const newMaintenance = await prisma.maintenance.create({
      data: {
        id_asset,
        id_user: userId,
        assigned_technician_id: assigned_technician_id || null,
        id_teknisi,
        maintenance_type: maintenance_type || 'Preventive',
        severity: predicted_severity || 'Medium',
        down_time: 0,
        cost: cost ? parseFloat(cost) : 0.0,
        jenis_kerusakan:      jenis_kerusakan      || null,
        penyebab:             penyebab             || null,
        spare_part_digunakan: spare_part_digunakan || null,
      }
    });

    // Aset yang sedang dijadwalkan maintenance otomatis menjadi tidak aktif
    await prisma.asset.update({
      where: { id: id_asset },
      data: { status: 'Inactive' },
    });

    let createdMaintenanceLog;
    try {
      console.log("ABOUT TO CREATE MAINTENANCE LOG");
      createdMaintenanceLog = await prisma.maintenanceLog.create({
        data: {
          id_maintenance: newMaintenance.id,
          id_user: userId,
          technician_id: assigned_technician_id || null,
          status: 'Scheduled',
          note: note || '',
          down_time: 0,
          cost: cost ? parseFloat(cost) : 0.0,
        }
      });
      console.log("CREATED MAINTENANCE LOG", createdMaintenanceLog);
    } catch (logError) {
      console.error("FAILED TO CREATE MAINTENANCE LOG", logError);
      throw logError;
    }

    // Hitung aggregasi maintenance untuk Asset ini
    const aggregations = await prisma.maintenance.aggregate({
      where: { id_asset: id_asset },
      _count: { id: true },
      _avg: { down_time: true },
      _sum: { cost: true },
      _max: { cost: true },
    });

    const severityGroupBy = await prisma.maintenance.groupBy({
      by: ['severity'],
      where: { id_asset: id_asset },
      _count: { severity: true },
      orderBy: { _count: { severity: 'desc' } },
      take: 1
    });

    const count = aggregations._count.id || 0;
    const avg_down_time = aggregations._avg.down_time || 0.0;
    const sum_cost = aggregations._sum.cost || 0.0;
    const max_cost = aggregations._max.cost || 0.0;
    const mode_severity = severityGroupBy[0]?.severity || "0";

    let predicted_rul = asset.initial_useful_life;
    
    try {
      const aiEngineBase = (process.env.AI_ENGINE_URL || 'http://localhost:8000').replace(/\/$/, '');
      const aiEngineUrl = `${aiEngineBase}/predict`;

      // Mengirim payload ke AI engine dengan nilai agregat aktual
      const aiResponse = await fetch(aiEngineUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merek:        (asset as any).merk?.nama        || 'Generic',
          kategori:     (asset as any).kategori?.nama    || 'Mechanical',
          sub_kategori: (asset as any).subKategori?.nama || 'General',
          tipe:         (asset as any).tipe?.nama        || 'General Equipment',
          tingkat_kekritisan: asset.criticality_level,
          count_nama_aset: count,
          average_down_time: avg_down_time,
          sum_biaya_perbaikan: sum_cost,
          mode_severity: mode_severity,
          maximum_biaya_perbaikan: max_cost,
          lokasi_gedung: (asset as any).gedung?.nama || '',
        }),
      });

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        if (aiData && typeof aiData.predicted_rul === 'number' && aiData.predicted_rul > 0) {
          predicted_rul = Math.round(aiData.predicted_rul);
        }
      } else {
         console.warn("AI Engine predict non-OK response:", await aiResponse.text());
      }
    } catch (e) {
      console.warn("AI Engine predict failed during maintenance creation:", e);
    }

    // Save history with the predicted RUL and actual aggregates
    await prisma.assetPredictionHistory.create({
      data: {
        id_asset: id_asset,
        id_maintenance: newMaintenance.id,
        predicted_rul: predicted_rul,
        maintenance_count: count,
        average_down_time: avg_down_time,
        total_maintenance_cost: sum_cost,
        max_maintenance_cost: max_cost,
        mode_severity: mode_severity
      }
    });

    const createdMaintenance = await prisma.maintenance.findUniqueOrThrow({
      where: { id: newMaintenance.id },
      include: {
        assignedTechnician: {
          select: { id: true, name: true, email: true, specialization: true, phone: true, teknisi_status: true }
        },
        teknisi: {
          select: { id: true, name: true, email: true, specialization: true, phone: true }
        },
        logs: {
          orderBy: { created_at: 'asc' },
          include: {
            user: { select: { id: true, name: true, email: true } },
            teknisi: { select: { id: true, name: true, email: true } }
          }
        }
      }
    });

    return res.status(201).json({
      message: 'Maintenance berhasil ditambahkan',
      data: {
        ...withDerivedMaintenanceFields(createdMaintenance),
        predicted_rul,
        predicted_severity,
        severity_confidence,
      }
    });
  } catch (error) {
    console.error('Error adding maintenance:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.patch('/api/maintenances/:id', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;
    const {
      id_asset,
      assigned_technician_id,
      id_teknisi,
      maintenance_type,
      severity,
      down_time,
      cost,
    } = req.body;

    const maintenance = await prisma.maintenance.findFirst({
      where: {
        id,
        asset: { company: companyFilter(userId) },
      },
    });

    if (!maintenance) {
      return res.status(404).json({ error: 'Maintenance not found or inaccessible' });
    }

    if (id_asset && id_asset !== maintenance.id_asset) {
      const accessibleAsset = await prisma.asset.findFirst({
        where: { id: id_asset, company: companyFilter(userId) },
        select: { id: true },
      });

      if (!accessibleAsset) {
        return res.status(404).json({ error: 'Asset not found or inaccessible' });
      }
    }

    const updateData: any = {};
    const hasField = (field: string) => Object.prototype.hasOwnProperty.call(req.body, field);

    if (hasField('id_asset') && id_asset) updateData.id_asset = id_asset;
    if (hasField('assigned_technician_id')) updateData.assigned_technician_id = assigned_technician_id || null;
    if (hasField('id_teknisi')) updateData.id_teknisi = id_teknisi || null;
    if (hasField('maintenance_type')) updateData.maintenance_type = maintenance_type;
    if (hasField('severity')) updateData.severity = severity;
    if (hasField('down_time')) updateData.down_time = down_time !== undefined && down_time !== '' ? parseInt(down_time, 10) : 0;
    if (hasField('cost')) updateData.cost = cost !== undefined && cost !== '' ? parseFloat(cost) : 0.0;

    // Status tidak lagi diedit lewat endpoint ini — itu hanya bisa berubah lewat
    // "Add Status Log" (POST /api/maintenances/:id/logs), satu-satunya sumber kebenaran.
    await prisma.maintenance.update({
      where: { id: maintenance.id },
      data: updateData,
    });

    const updatedMaintenance = await prisma.maintenance.findUniqueOrThrow({
      where: { id: maintenance.id },
      include: {
        asset: true,
        user: { select: { id: true, name: true, email: true } },
        assignedTechnician: { select: { id: true, name: true, email: true, specialization: true, phone: true, teknisi_status: true } },
        teknisi: { select: { id: true, name: true, email: true, specialization: true, phone: true } },
        logs: {
          orderBy: { created_at: 'asc' },
          include: {
            user: { select: { id: true, name: true, email: true } },
            teknisi: { select: { id: true, name: true, email: true } },
          },
        },
        prediction_history: { orderBy: { recorded_at: 'desc' } },
      },
    });

    return res.status(200).json({
      message: 'Maintenance updated successfully',
      data: withDerivedMaintenanceFields(updatedMaintenance),
    });
  } catch (error) {
    console.error('Error updating maintenance:', error);
    return res.status(500).json({
      error: 'Failed to update maintenance',
      details: (error as Error).message,
      code: (error as any).code,
    });
  }
});

app.post('/api/maintenances/:id/logs', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;
    const {
      status,
      note,
      technician_id,
      cost,
    } = req.body;

    if (!status || !note) {
      return res.status(400).json({ error: 'status and note are required' });
    }

    const maintenance = await prisma.maintenance.findUnique({
      where: { id },
      include: {
        asset: {
          include: {
            company: {
              include: {
                members:     true,
                direktUsers: true,
              },
            },
            merk:        true,
            kategori:    true,
            subKategori: true,
            tipe:        true,
          },
        },
        logs: { orderBy: { created_at: 'asc' } },
      },
    });

    if (!maintenance) {
      console.log('Maintenance log lookup returned no row', {
        maintenanceId: id,
        userId,
      });
      return res.status(404).json({ error: 'Maintenance not found' });
    }

    const hasAccess =
      maintenance.asset.company.owner_id === userId ||
      maintenance.asset.company.members.some((member: any) => member.id_user === userId) ||
      maintenance.asset.company.direktUsers.some((u: any) => u.id === userId);

    if (!hasAccess) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Down time hanya bermakna saat menutup pekerjaan: dihitung dari created_at log
    // "In Progress" terakhir (mulai dikerjakan) sampai sekarang (selesai dicatat).
    let down_time = 0;
    let hasDownTime = false;
    if (status === 'Completed') {
      const lastInProgress = [...maintenance.logs].reverse().find((l: any) => l.status === 'In Progress');
      if (lastInProgress) {
        const start = new Date(lastInProgress.created_at).getTime();
        down_time = Math.max(0, Math.floor((Date.now() - start) / (1000 * 60 * 60 * 24)));
        hasDownTime = true;
      }
    }

    await prisma.maintenanceLog.create({
      data: {
        id_maintenance: maintenance.id,
        id_user: userId,
        technician_id: technician_id || null,
        status,
        note,
        down_time,
        cost: cost !== undefined && cost !== '' ? parseFloat(cost) : 0.0,
      },
    });

    const updateData: any = {};

    if (technician_id) updateData.assigned_technician_id = technician_id;
    if (cost !== undefined && cost !== '') updateData.cost = parseFloat(cost);
    if (hasDownTime) updateData.down_time = down_time;

    const updatedMaintenance = await prisma.maintenance.update({
      where: { id: maintenance.id },
      data: updateData,
    });

    if (status === 'Completed') {
      const aggregations = await prisma.maintenance.aggregate({
        where: { id_asset: maintenance.id_asset },
        _count: { id: true },
        _avg: { down_time: true },
        _sum: { cost: true },
        _max: { cost: true },
      });

      const severityGroupBy = await prisma.maintenance.groupBy({
        by: ['severity'],
        where: { id_asset: maintenance.id_asset },
        _count: { severity: true },
        orderBy: { _count: { severity: 'desc' } },
        take: 1,
      });

      const count = aggregations._count.id || 0;
      const avg_down_time = aggregations._avg.down_time || 0.0;
      const sum_cost = aggregations._sum.cost || 0.0;
      const max_cost = aggregations._max.cost || 0.0;
      const mode_severity = severityGroupBy[0]?.severity || "0";
      let predicted_rul = maintenance.asset.initial_useful_life;

      try {
        const aiEngineBase = (process.env.AI_ENGINE_URL || 'http://localhost:8000').replace(/\/$/, '');
        const aiEngineUrl = `${aiEngineBase}/predict`;
        const aiResponse = await fetch(aiEngineUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            merek:        (maintenance.asset as any).merk?.nama        || 'Generic',
            kategori:     (maintenance.asset as any).kategori?.nama    || 'Mechanical',
            sub_kategori: (maintenance.asset as any).subKategori?.nama || '',
            tipe:         (maintenance.asset as any).tipe?.nama        || '',
            tingkat_kekritisan: maintenance.asset.criticality_level,
            count_nama_aset: count,
            average_down_time: avg_down_time,
            sum_biaya_perbaikan: sum_cost,
            mode_severity,
            maximum_biaya_perbaikan: max_cost,
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          if (aiData && aiData.predicted_rul !== undefined) {
            predicted_rul = Math.round(aiData.predicted_rul);
          }
        } else {
          console.warn("AI Engine predict non-OK response during log completion:", await aiResponse.text());
        }
      } catch (e) {
        console.warn("AI Engine predict failed during log completion:", e);
      }

      await prisma.assetPredictionHistory.create({
        data: {
          id_asset: maintenance.id_asset,
          id_maintenance: updatedMaintenance.id,
          predicted_rul,
          maintenance_count: count,
          average_down_time: avg_down_time,
          total_maintenance_cost: sum_cost,
          max_maintenance_cost: max_cost,
          mode_severity,
        },
      });
    }

    const result = await prisma.maintenance.findUniqueOrThrow({
      where: { id: maintenance.id },
      include: {
        asset: {
          include: {
            merk:        true,
            kategori:    true,
            subKategori: true,
            tipe:        true,
          },
        },
        user: {
          select: { id: true, name: true, email: true },
        },
        assignedTechnician: {
          select: { id: true, name: true, email: true, specialization: true, phone: true, teknisi_status: true },
        },
        logs: {
          orderBy: { created_at: 'desc' },
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
            teknisi: {
              select: { id: true, name: true, email: true, specialization: true, phone: true, teknisi_status: true },
            },
          },
        },
        prediction_history: {
          orderBy: { recorded_at: 'desc' },
        },
      },
    });

    return res.status(201).json({
      message: 'Maintenance log berhasil ditambahkan',
      data: withDerivedMaintenanceFields(result),
    });
  } catch (error) {
    console.error('Error adding maintenance log:', error);
    return res.status(500).json({ error: 'Failed to add maintenance log', details: (error as Error).message });
  }
});

app.delete('/api/maintenances/:id', authenticateJWT, async (req: Request, res: Response) => {
  try {
    console.log('DELETE maintenance route hit', req.params.id);

    const userId = (req as any).user.id;
    const { id } = req.params;

    const maintenance = await prisma.maintenance.findFirst({
      where: {
        id,
        asset: { company: companyFilter(userId) },
      },
      select: { id: true },
    });

    if (!maintenance) {
      console.log('DELETE maintenance lookup returned no accessible row', {
        maintenanceId: id,
        userId,
      });
      return res.status(404).json({ error: 'Maintenance not found or inaccessible' });
    }

    const deleteResult = await prisma.$transaction(async (tx: any) => {
      const predictionHistory = await tx.assetPredictionHistory.deleteMany({
        where: { id_maintenance: maintenance.id },
      });
      const logs = await tx.maintenanceLog.deleteMany({
        where: { id_maintenance: maintenance.id },
      });
      const deletedMaintenance = await tx.maintenance.deleteMany({
        where: { id: maintenance.id },
      });

      return {
        predictionHistoryDeleted: predictionHistory.count,
        logsDeleted: logs.count,
        maintenancesDeleted: deletedMaintenance.count,
      };
    });

    console.log('Maintenance delete result:', {
      maintenanceId: maintenance.id,
      ...deleteResult,
    });

    return res.status(200).json({
      message: 'Maintenance deleted successfully',
      data: deleteResult,
    });
  } catch (error) {
    console.error('Error deleting maintenance:', error);
    return res.status(500).json({
      error: 'Failed to delete maintenance',
      details: (error as Error).message,
      code: (error as any).code,
    });
  }
});

// Endpoint untuk ringkasan maintenance / asset summary
app.post('/api/summarize', authenticateJWT, async (req: Request, res: Response) => {
  try {
    let { limit, temperature, dashboardSnapshot } = req.body ?? {};

    const userCompany = await findUserCompany((req as any).user.id);

    if (!userCompany) {
      return res.status(404).json({ error: 'No company found for summarization' });
    }
    const company_id = userCompany.id;

    // Use snapshot sent from the frontend (what the user actually sees on screen) if available,
    // otherwise fall back to a fresh DB query.
    const dashboardData = dashboardSnapshot ?? await buildDashboardData(company_id);

    const aiEngineBase = (process.env.AI_ENGINE_URL || 'http://localhost:8000').replace(/\/$/, '');
    const aiEngineUrl = `${aiEngineBase}/summarize`;
    const response = await fetch(aiEngineUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        company_id,
        assets: dashboardData.asset_insights,
        critical_count: dashboardData.alerts_summary?.critical ?? 0,
        stats: dashboardData.stats,
        monthly_trend: dashboardData.monthly_trend,
        by_category: dashboardData.by_category,
        upcoming_maintenances: dashboardData.upcoming_maintenances,
        limit: limit ?? 10,
        temperature: temperature ?? 0.2,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI Engine responded with status ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('Error in summarize endpoint:', error);
    return res.status(500).json({ error: 'Failed to summarize', details: (error as Error).message });
  }
});

// GET /api/gedung — daftar gedung milik perusahaan user (owner ATAU member)
app.get('/api/gedung', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const userCompany = await findUserCompany(userId);
    if (!userCompany) return res.status(404).json({ error: 'No company found' });

    const gedung = await (prisma as any).gedung.findMany({
      where: { id_perusahaan: userCompany.id },
      orderBy: { kode: 'asc' },
    });
    return res.status(200).json({ gedung });
  } catch (error) {
    console.error('Error fetching gedung:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/gedung — tambah gedung baru
app.post('/api/gedung', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const { nama, kode } = req.body;
    if (!nama || !kode) return res.status(400).json({ error: 'nama dan kode wajib diisi' });
    const uid = (req as any).user.id;
    const userCompany = await prisma.company.findFirst({
      where: {
        OR: [
          { owner_id: uid },
          { members: { some: { id_user: uid } } },
        ],
      },
    });
    if (!userCompany) return res.status(404).json({ error: 'No company found' });
    const gedung = await (prisma as any).gedung.create({
      data: { nama, kode: kode.toUpperCase(), id_perusahaan: userCompany.id },
    });
    return res.status(201).json({ gedung });
  } catch (error: any) {
    if (error?.code === 'P2002') return res.status(409).json({ error: 'Kode gedung sudah digunakan' });
    console.error('Error creating gedung:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PATCH /api/gedung/:id — update gedung
app.patch('/api/gedung/:id', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const { nama, kode } = req.body;
    const gedung = await (prisma as any).gedung.update({
      where: { id: req.params.id },
      data: { ...(nama && { nama }), ...(kode && { kode: kode.toUpperCase() }) },
    });
    return res.status(200).json({ gedung });
  } catch (error: any) {
    if (error?.code === 'P2025') return res.status(404).json({ error: 'Gedung tidak ditemukan' });
    if (error?.code === 'P2002') return res.status(409).json({ error: 'Kode gedung sudah digunakan' });
    console.error('Error updating gedung:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// DELETE /api/gedung/:id — hapus gedung
app.delete('/api/gedung/:id', authenticateJWT, async (req: Request, res: Response) => {
  try {
    // Lepaskan relasi aset sebelum hapus gedung
    const gedungId = String(req.params.id);
    await prisma.asset.updateMany({ where: { gedung_id: gedungId }, data: { gedung_id: null } });
    await (prisma as any).gedung.delete({ where: { id: gedungId } });
    return res.status(200).json({ message: 'Gedung berhasil dihapus' });
  } catch (error: any) {
    if (error?.code === 'P2025') return res.status(404).json({ error: 'Gedung tidak ditemukan' });
    console.error('Error deleting gedung:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/technicians — daftar teknisi milik perusahaan user (users dengan role='teknisi')
app.get('/api/technicians', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const userCompany = await findUserCompany((req as any).user.id);
    if (!userCompany) return res.status(404).json({ error: 'No company found' });

    const { status, specialization } = req.query as { status?: string; specialization?: string };

    const teknisiUsers = await prisma.user.findMany({
      where: {
        role: 'teknisi',
        memberships: { some: { id_perusahaan: userCompany.id } },
        ...(status ? { teknisi_status: status } : {}),
        ...(specialization ? { specialization } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        specialization: true,
        teknisi_status: true,
        experience_years: true,
      },
      orderBy: [{ teknisi_status: 'asc' }, { name: 'asc' }],
    });

    // Map teknisi_status → status untuk backward compat dengan frontend
    const technicians = teknisiUsers.map((u: typeof teknisiUsers[0]) => ({ ...u, status: u.teknisi_status }));
    return res.status(200).json({ technicians });
  } catch (error) {
    console.error('Error fetching technicians:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/technicians — buat akun teknisi baru (admin only)
app.post('/api/technicians', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const adminId = (req as any).user.id;
    const adminUser = await prisma.user.findUnique({ where: { id: adminId }, select: { role: true } });
    if (adminUser?.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

    const adminCompany = await findUserCompany(adminId);
    if (!adminCompany) return res.status(400).json({ error: 'Admin does not belong to any company' });

    const { name, email, password, phone, specialization, experience_years } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email, dan password wajib diisi' });
    }

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return res.status(409).json({ error: 'Email sudah digunakan' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const teknisi = await prisma.user.create({
      data: {
        name,
        email,
        password:         hashedPassword,
        phone:            phone || null,
        specialization:   specialization || null,
        experience_years: experience_years ? parseInt(experience_years, 10) : 0,
        role:             'teknisi',
        teknisi_status:   'Tersedia',
        id_perusahaan:    adminCompany.id,
      },
      select: {
        id: true, name: true, email: true, phone: true,
        specialization: true, experience_years: true,
        teknisi_status: true, role: true, id_perusahaan: true,
      },
    });

    // Also add to CompanyMember for backwards compatibility
    await prisma.companyMember.upsert({
      where: { id_user_id_perusahaan: { id_user: teknisi.id, id_perusahaan: adminCompany.id } },
      create: { id_user: teknisi.id, id_perusahaan: adminCompany.id, role: 'teknisi' },
      update: {},
    });

    return res.status(201).json({ teknisi });
  } catch (error) {
    console.error('Error creating technician:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PATCH /api/technicians/:id/status — ubah status teknisi
app.patch('/api/technicians/:id/status', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const allowed = ['Tersedia', 'Ditugaskan', 'Tidak Aktif'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: 'Status tidak valid' });
    }

    const updated = await prisma.user.update({
      where: { id, role: 'teknisi' },
      data: { teknisi_status: status },
      select: { id: true, name: true, email: true, phone: true, specialization: true, teknisi_status: true, experience_years: true },
    });
    return res.status(200).json({ technician: { ...updated, status: updated.teknisi_status } });
  } catch (error) {
    console.error('Error updating technician status:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/alerts — aset dengan predicted_rul <= 730 hari (latest prediction per asset)
// ── TICKET ROUTES ────────────────────────────────────────────────────────────

// GET /api/tickets — daftar ticket milik perusahaan user
app.get('/api/tickets', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const userCompany = await findUserCompany((req as any).user.id);
    if (!userCompany) return res.status(404).json({ error: 'No company found' });

    const { status, priority, page = '1', limit = '20' } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {
      id_perusahaan: userCompany.id,
      ...(status && status !== 'All' ? { status } : {}),
      ...(priority && priority !== 'All' ? { priority } : {}),
    };

    const [tickets, total] = await Promise.all([
      (prisma as any).ticket.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { created_at: 'desc' },
        include: {
          asset: { select: { id: true, asset_name: true, status: true } },
          reporter: { select: { id: true, name: true, email: true } },
          assigned: { select: { id: true, name: true, email: true, specialization: true, teknisi_status: true } },
          maintenance: { select: { id: true, maintenance_type: true, severity: true } },
        },
      }),
      (prisma as any).ticket.count({ where }),
    ]);

    return res.status(200).json({
      data: tickets,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) || 1 },
    });
  } catch (error) {
    console.error('Error fetching tickets:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/tickets — buat ticket baru
app.post('/api/tickets', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const userCompany = await findUserCompany(userId);
    if (!userCompany) return res.status(404).json({ error: 'No company found' });

    const { id_asset, title, description, priority = 'Medium', id_assigned } = req.body;
    if (!id_asset || !title || !description) {
      return res.status(400).json({ error: 'id_asset, title, dan description wajib diisi' });
    }

    const asset = await prisma.asset.findFirst({
      where: { id: id_asset, id_perusahaan: userCompany.id },
    });
    if (!asset) return res.status(404).json({ error: 'Asset tidak ditemukan' });

    const ticket = await (prisma as any).ticket.create({
      data: {
        id_perusahaan: userCompany.id,
        id_asset,
        id_reporter: userId,
        id_assigned: id_assigned || null,
        title,
        description,
        priority,
        status: 'Open',
      },
      include: {
        asset: { select: { id: true, asset_name: true } },
        reporter: { select: { id: true, name: true, email: true } },
        assigned: { select: { id: true, name: true, email: true, specialization: true } },
      },
    });

    wsBroadcast(userCompany.id, 'ticket:created', ticket);
    return res.status(201).json({ message: 'Ticket berhasil dibuat', data: ticket });
  } catch (error) {
    console.error('Error creating ticket:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PATCH /api/tickets/:id — update status, assigned, dll
app.patch('/api/tickets/:id', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;
    const userCompany = await findUserCompany(userId);
    if (!userCompany) return res.status(404).json({ error: 'No company found' });

    const existing = await (prisma as any).ticket.findFirst({
      where: { id, id_perusahaan: userCompany.id },
    });
    if (!existing) return res.status(404).json({ error: 'Ticket tidak ditemukan' });

    const { status, id_assigned, priority, title, description } = req.body;
    const updateData: any = {};
    if (status) {
      updateData.status = status;
      if (status === 'Resolved' || status === 'Closed') {
        updateData.resolved_at = new Date();
      }
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'id_assigned')) updateData.id_assigned = id_assigned || null;
    if (priority) updateData.priority = priority;
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    updateData.updated_at = new Date();

    const updated = await (prisma as any).ticket.update({
      where: { id },
      data: updateData,
      include: {
        asset: { select: { id: true, asset_name: true } },
        reporter: { select: { id: true, name: true, email: true } },
        assigned: { select: { id: true, name: true, email: true, specialization: true } },
        maintenance: { select: { id: true, maintenance_type: true } },
      },
    });

    wsBroadcast(userCompany.id, 'ticket:updated', updated);
    return res.status(200).json({ message: 'Ticket berhasil diupdate', data: updated });
  } catch (error) {
    console.error('Error updating ticket:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/tickets/:id/create-maintenance — buat maintenance dari ticket
app.post('/api/tickets/:id/create-maintenance', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id: ticketId } = req.params;
    const userCompany = await findUserCompany(userId);
    if (!userCompany) return res.status(404).json({ error: 'No company found' });

    const ticket = await (prisma as any).ticket.findFirst({
      where: { id: ticketId, id_perusahaan: userCompany.id },
      include: { asset: true },
    });
    if (!ticket) return res.status(404).json({ error: 'Ticket tidak ditemukan' });
    if (ticket.maintenance_id) return res.status(400).json({ error: 'Ticket sudah memiliki maintenance terkait' });

    const {
      maintenance_type = 'Corrective',
      severity,
      note,
      id_teknisi,
      jenis_kerusakan,
      penyebab,
      spare_part_digunakan,
    } = req.body;

    // Auto-predict severity if not provided
    let finalSeverity = severity || 'Medium';
    let predictedSeverity: string | null = null;
    let severityConfidence: number | null = null;
    if (!severity && (jenis_kerusakan || penyebab)) {
      try {
        const aiResp = await fetch(`${process.env.AI_ENGINE_URL || 'http://localhost:8000'}/predict-severity`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jenis_kerusakan: jenis_kerusakan || '', penyebab: penyebab || '', asset_category: ticket.asset.kategori_id || '' }),
        });
        if (aiResp.ok) {
          const aiData = await aiResp.json();
          if (aiData.severity) {
            finalSeverity      = aiData.severity;
            predictedSeverity  = aiData.severity;
            severityConfidence = aiData.confidence ?? null;
          }
        }
      } catch { /* fallback to 'Medium' */ }
    }

    const newMaintenance = await prisma.maintenance.create({
      data: {
        id_asset: ticket.id_asset,
        id_user: userId,
        id_teknisi: id_teknisi || ticket.id_assigned || null,
        maintenance_type,
        severity: finalSeverity,
        jenis_kerusakan: jenis_kerusakan || ticket.title,
        penyebab: penyebab || null,
        spare_part_digunakan: spare_part_digunakan || null,
      },
    });

    await prisma.maintenanceLog.create({
      data: {
        id_maintenance: newMaintenance.id,
        id_user: userId,
        technician_id: id_teknisi || ticket.id_assigned || null,
        status: 'Scheduled',
        note: note || `Maintenance dibuat dari ticket: ${ticket.title}`,
      },
    });

    // Link ticket → maintenance dan update status ticket
    await (prisma as any).ticket.update({
      where: { id: ticketId },
      data: {
        maintenance_id: newMaintenance.id,
        status: 'In Progress',
        updated_at: new Date(),
      },
    });

    // Set asset ke Inactive
    await prisma.asset.update({
      where: { id: ticket.id_asset },
      data: { status: 'Maintenance' },
    });

    // Ambil latest RUL dari history aset untuk ditampilkan di modal hasil
    const latestPrediction = await prisma.assetPredictionHistory.findFirst({
      where: { id_asset: ticket.id_asset },
      orderBy: { recorded_at: 'desc' },
      select: { predicted_rul: true },
    });

    const assetFull = await prisma.asset.findUnique({
      where: { id: ticket.id_asset },
      include: {
        merk:        { select: { nama: true } },
        kategori:    { select: { nama: true } },
        subKategori: { select: { nama: true } },
        gedung:      { select: { nama: true } },
      },
    });

    wsBroadcast(userCompany.id, 'ticket:maintenance_created', {
      ticket_id: ticketId,
      maintenance_id: newMaintenance.id,
    });
    return res.status(201).json({
      message: 'Maintenance berhasil dibuat dari ticket',
      data: {
        ticket_id:          ticketId,
        maintenance_id:     newMaintenance.id,
        predicted_severity: predictedSeverity,
        severity_confidence: severityConfidence,
        predicted_rul:      latestPrediction?.predicted_rul ?? null,
        asset_name:         (assetFull as any)?.asset_name ?? '',
        brand:              (assetFull as any)?.merk?.nama ?? '',
        category:           (assetFull as any)?.kategori?.nama ?? '',
        sub_category:       (assetFull as any)?.subKategori?.nama ?? '',
        gedung_nama:        (assetFull as any)?.gedung?.nama ?? '',
        criticality_level:  (assetFull as any)?.criticality_level ?? '',
      },
    });
  } catch (error) {
    console.error('Error creating maintenance from ticket:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// DELETE /api/tickets/:id
app.delete('/api/tickets/:id', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;
    const userCompany = await findUserCompany(userId);
    if (!userCompany) return res.status(404).json({ error: 'No company found' });

    const ticket = await (prisma as any).ticket.findFirst({
      where: { id, id_perusahaan: userCompany.id },
    });
    if (!ticket) return res.status(404).json({ error: 'Ticket tidak ditemukan' });

    await (prisma as any).ticket.delete({ where: { id } });
    return res.status(200).json({ message: 'Ticket berhasil dihapus' });
  } catch (error) {
    console.error('Error deleting ticket:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/alerts — aset dengan predicted_rul <= 730 hari (latest prediction per asset)
app.get('/api/alerts', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const userCompany = await findUserCompany((req as any).user.id);

    if (!userCompany) {
      return res.status(404).json({ error: 'No company found' });
    }

    const companyId = userCompany.id;

    const alerts: any[] = await prisma.$queryRaw`
      SELECT DISTINCT ON (a.id)
        a.id, a.asset_name,
        m.nama  AS merk_nama,
        k.nama  AS kategori_nama,
        sk.nama AS sub_kategori_nama,
        t.nama  AS tipe_nama,
        a.criticality_level, a.status,
        aph.predicted_rul, aph.mode_severity, aph.maintenance_count, aph.recorded_at
      FROM assets a
      LEFT JOIN merk         m  ON m.id  = a.merk_id
      LEFT JOIN kategori     k  ON k.id  = a.kategori_id
      LEFT JOIN sub_kategori sk ON sk.id = a.sub_kategori_id
      LEFT JOIN tipe         t  ON t.id  = a.tipe_id
      JOIN asset_prediction_history aph ON aph.id_asset = a.id
      WHERE a.id_perusahaan = ${companyId}
        AND aph.predicted_rul <= 730
      ORDER BY a.id, aph.recorded_at DESC
    `;

    return res.status(200).json({ alerts });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Builds the full aggregated dashboard payload for a company. Shared by GET /api/dashboard
// (rendering the dashboard UI) and POST /api/summarize (feeding the AI summarizer) — both
// read the SAME aggregated business-process view, so the summary the AI generates always
// matches what the user sees on the dashboard instead of being computed from a separate,
// potentially-divergent raw query.
async function buildDashboardData(companyId: string) {
    // Asset counts total + per status
    const totalAssets = await prisma.asset.count({ where: { id_perusahaan: companyId } });
    const statusCounts: any[] = await prisma.$queryRaw`
      SELECT status, COUNT(*)::int AS count
      FROM assets WHERE id_perusahaan = ${companyId}
      GROUP BY status
    `;

    // Top categories for donut chart
    const categoryCounts: any[] = await prisma.$queryRaw`
      SELECT COALESCE(k.nama, 'Tidak Diketahui') AS category, COUNT(*)::int AS count
      FROM assets a
      LEFT JOIN kategori k ON k.id = a.kategori_id
      WHERE a.id_perusahaan = ${companyId}
      GROUP BY k.nama ORDER BY count DESC LIMIT 7
    `;

    // Monthly maintenance count — last 6 months (scheduled_date diturunkan dari maintenance_logs)
    const monthlyTrend: any[] = await prisma.$queryRaw`
      SELECT
        TO_CHAR(DATE_TRUNC('month', s.scheduled_date), 'Mon YY') AS month,
        DATE_TRUNC('month', s.scheduled_date) AS month_ts,
        COUNT(*)::int AS count
      FROM maintenances m
      JOIN assets a ON a.id = m.id_asset
      JOIN LATERAL (
        SELECT created_at AS scheduled_date FROM maintenance_logs
        WHERE id_maintenance = m.id AND status = 'Scheduled'
        ORDER BY created_at DESC LIMIT 1
      ) s ON true
      WHERE a.id_perusahaan = ${companyId}
        AND s.scheduled_date >= NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', s.scheduled_date)
      ORDER BY month_ts
    `;

    // Alerts summary (latest predicted_rul per asset) — satuan HARI
    // Critical ≤180 hari, High ≤365 hari, Watch ≤730 hari
    const alertsSummary: any[] = await prisma.$queryRaw`
      SELECT
        SUM(CASE WHEN aph.predicted_rul <= 180  THEN 1 ELSE 0 END)::int  AS critical,
        SUM(CASE WHEN aph.predicted_rul > 180 AND aph.predicted_rul <= 365 THEN 1 ELSE 0 END)::int AS high,
        SUM(CASE WHEN aph.predicted_rul > 365 AND aph.predicted_rul <= 730 THEN 1 ELSE 0 END)::int AS watch
      FROM (
        SELECT DISTINCT ON (a.id) a.id, aph.predicted_rul
        FROM assets a
        JOIN asset_prediction_history aph ON aph.id_asset = a.id
        WHERE a.id_perusahaan = ${companyId}
        ORDER BY a.id, aph.recorded_at DESC
      ) aph
    `;

    // Maintenance aktif terbaru (5 yang belum selesai, diurutkan dari yang paling baru dibuat).
    // Catatan: tidak ada lagi konsep "tanggal mendatang" — scheduled_date kini = created_at
    // log 'Scheduled' (selalu di masa lalu/sekarang), jadi widget ini menampilkan pekerjaan
    // yang masih berjalan/menunggu, bukan yang dijadwalkan untuk tanggal di masa depan.
    const activeRecent: any[] = await prisma.$queryRaw`
      SELECT m.id, a.asset_name, s.scheduled_date, m.severity, cur.status, m.maintenance_type
      FROM maintenances m
      JOIN assets a ON a.id = m.id_asset
      JOIN LATERAL (
        SELECT created_at AS scheduled_date FROM maintenance_logs
        WHERE id_maintenance = m.id AND status = 'Scheduled'
        ORDER BY created_at DESC LIMIT 1
      ) s ON true
      JOIN LATERAL (
        SELECT status FROM maintenance_logs
        WHERE id_maintenance = m.id
        ORDER BY created_at DESC LIMIT 1
      ) cur ON true
      WHERE a.id_perusahaan = ${companyId}
        AND cur.status != 'Completed'
      ORDER BY m.created_at DESC
      LIMIT 5
    `;

    // Recent maintenance activity (last 5 by created_at)
    const recent: any[] = await prisma.$queryRaw`
      SELECT m.id, a.asset_name, m.maintenance_type, m.severity, cur.status, m.cost,
             u.name AS user_name, s.scheduled_date
      FROM maintenances m
      JOIN assets a ON a.id = m.id_asset
      JOIN users u ON u.id = m.id_user
      LEFT JOIN LATERAL (
        SELECT created_at AS scheduled_date FROM maintenance_logs
        WHERE id_maintenance = m.id AND status = 'Scheduled'
        ORDER BY created_at DESC LIMIT 1
      ) s ON true
      LEFT JOIN LATERAL (
        SELECT status FROM maintenance_logs
        WHERE id_maintenance = m.id
        ORDER BY created_at DESC LIMIT 1
      ) cur ON true
      WHERE a.id_perusahaan = ${companyId}
      ORDER BY m.created_at DESC
      LIMIT 5
    `;

    // Per-asset business insight feed — latest prediction-history aggregate joined with
    // brand/category/status, ordered by remaining-useful-life (most urgent first). This is
    // the detailed "what needs a decision" view: it's what powers the AI summary and could
    // equally drive business processes like prioritized maintenance scheduling, procurement
    // planning (via total/max maintenance cost), or vendor/brand reliability reviews
    // (via maintenance_count + mode_severity per brand/category).
    const assetInsights: any[] = await prisma.$queryRaw`
      SELECT a.id, a.asset_name,
             COALESCE(mk.nama, 'Generic') AS brand,
             COALESCE(k.nama, 'Mekanik') AS category,
             a.status,
             aph.maintenance_count, aph.average_down_time, aph.total_maintenance_cost,
             aph.max_maintenance_cost, aph.mode_severity, aph.predicted_rul, aph.recorded_at
      FROM (
        SELECT DISTINCT ON (id_asset)
               id_asset, maintenance_count, average_down_time, total_maintenance_cost,
               max_maintenance_cost, mode_severity, predicted_rul, recorded_at
        FROM asset_prediction_history
        ORDER BY id_asset, recorded_at DESC
      ) aph
      JOIN assets a ON aph.id_asset = a.id
      LEFT JOIN merk mk ON mk.id = a.merk_id
      LEFT JOIN kategori k ON k.id = a.kategori_id
      WHERE a.id_perusahaan = ${companyId}
      ORDER BY aph.predicted_rul ASC NULLS LAST
      LIMIT 20
    `;

    const alerts = alertsSummary[0] ?? { critical: 0, high: 0, watch: 0 };

    return {
      stats: {
        total: totalAssets,
        by_status: statusCounts,
      },
      by_category: categoryCounts,
      monthly_trend: monthlyTrend.map((r) => ({ month: r.month, count: r.count })),
      alerts_summary: {
        critical: Number(alerts.critical) || 0,
        high: Number(alerts.high) || 0,
        watch: Number(alerts.watch) || 0,
      },
      upcoming_maintenances: activeRecent.map((m: any) => ({
        id: m.id,
        asset_name: m.asset_name,
        scheduled_date: m.scheduled_date,
        severity: m.severity,
        status: m.status,
        maintenance_type: m.maintenance_type,
      })),
      recent_maintenances: recent.map((m: any) => ({
        id: m.id,
        asset_name: m.asset_name,
        maintenance_type: m.maintenance_type,
        severity: m.severity,
        status: m.status,
        scheduled_date: m.scheduled_date,
        cost: m.cost,
        user_name: m.user_name,
      })),
      asset_insights: assetInsights.map((a: any) => ({
        id: a.id,
        name: a.asset_name,
        brand: a.brand,
        category: a.category,
        status: a.status,
        maintenance_count: a.maintenance_count,
        average_down_time: a.average_down_time,
        total_maintenance_cost: a.total_maintenance_cost,
        max_maintenance_cost: a.max_maintenance_cost,
        mode_severity: a.mode_severity,
        predicted_rul: a.predicted_rul,
        recorded_at: a.recorded_at,
      })),
    };
}

// GET /api/dashboard — aggregated stats for the dashboard
app.get('/api/dashboard', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const userCompany = await findUserCompany((req as any).user.id);
    if (!userCompany) return res.status(404).json({ error: 'No company found' });

    const dashboardData = await buildDashboardData(userCompany.id);
    return res.status(200).json(dashboardData);
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/reports/assets — asset report with latest RUL per asset
app.get('/api/reports/assets', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const userCompany = await findUserCompany((req as any).user.id);
    if (!userCompany) return res.status(404).json({ error: 'No company found' });
    const companyId = userCompany.id;

    const assets: any[] = await prisma.$queryRaw`
      SELECT DISTINCT ON (a.id)
        a.id, a.asset_name,
        m.nama  AS merk_nama,
        k.nama  AS kategori_nama,
        sk.nama AS sub_kategori_nama,
        t.nama  AS tipe_nama,
        a.criticality_level, a.status, a.purchase_date,
        COALESCE(aph.predicted_rul, a.initial_useful_life) AS predicted_rul,
        COALESCE(aph.maintenance_count, 0) AS maintenance_count,
        COALESCE(aph.total_maintenance_cost, 0) AS total_cost,
        aph.recorded_at
      FROM assets a
      LEFT JOIN merk         m  ON m.id  = a.merk_id
      LEFT JOIN kategori     k  ON k.id  = a.kategori_id
      LEFT JOIN sub_kategori sk ON sk.id = a.sub_kategori_id
      LEFT JOIN tipe         t  ON t.id  = a.tipe_id
      LEFT JOIN asset_prediction_history aph ON aph.id_asset = a.id
      WHERE a.id_perusahaan = ${companyId}
      ORDER BY a.id, aph.recorded_at DESC NULLS LAST
    `;

    return res.status(200).json({ assets });
  } catch (error) {
    console.error('Error fetching asset report:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/reports/maintenance — full maintenance history
app.get('/api/reports/maintenance', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const userCompany = await findUserCompany((req as any).user.id);
    if (!userCompany) return res.status(404).json({ error: 'No company found' });
    const companyId = userCompany.id;

    const maintenances = await prisma.maintenance.findMany({
      where: { asset: { id_perusahaan: companyId } },
      include: {
        asset: {
          select: {
            asset_name: true,
            kategori: { select: { nama: true } },
          },
        },
        user: { select: { name: true } },
        logs: { select: { status: true, created_at: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    return res.status(200).json({
      maintenances: maintenances.map((m: any) => {
        const derived = deriveMaintenanceFields(m.logs);
        return {
          id: m.id,
          asset_name: m.asset.asset_name,
          kategori_nama: m.asset.kategori?.nama ?? null,
          maintenance_type: m.maintenance_type,
          severity: m.severity,
          status: derived.status,
          scheduled_date: derived.scheduled_date,
          completion_date: derived.completion_date,
          cost: m.cost,
          down_time: m.down_time,
          user_name: m.user.name,
        };
      }),
    });
  } catch (error) {
    console.error('Error fetching maintenance report:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/auth/change-password
app.post('/api/auth/change-password', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'current_password and new_password required' });
    }

    const user = await prisma.user.findUnique({ where: { id: (req as any).user.id } });
    if (!user || !user.password) {
      return res.status(400).json({ error: 'Password login not available for this account' });
    }

    const bcrypt = await import('bcryptjs');
    const valid = await bcrypt.compare(current_password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Password saat ini salah' });
    }

    const hashed = await bcrypt.hash(new_password, 10);
    await prisma.user.update({ where: { id: user.id }, data: { password: hashed } as any });

    return res.status(200).json({ message: 'Password berhasil diubah' });
  } catch (error) {
    console.error('Error changing password:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Endpoint untuk testing API
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK' });
});

// Debug endpoint: list columns of users table
app.get('/debug/users-columns', async (req, res) => {
  try {
    const cols: any = await prisma.$queryRawUnsafe("SELECT column_name FROM information_schema.columns WHERE table_name='users'");
    return res.json(cols);
  } catch (err) {
    console.error('Debug columns error:', err);
    return res.status(500).json({ error: 'Failed to query columns', details: (err as Error).message });
  }
});

// Debug endpoint: add google_id column if missing
app.post('/debug/add-google-column', async (req, res) => {
  try {
    await prisma.$executeRawUnsafe("ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id TEXT");
    return res.json({ ok: true });
  } catch (err) {
    console.error('Add column error:', err);
    return res.status(500).json({ error: 'Failed to add column', details: (err as Error).message });
  }
});

// Debug endpoint: set user password (hashes using bcrypt)
app.post('/debug/set-password', async (req, res) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });
    const hashed = await import('bcryptjs').then(m => m.hash(password, 10));
    await prisma.user.update({ where: { email }, data: { password: hashed } as any });
    return res.json({ ok: true });
  } catch (err) {
    console.error('Set password error:', err);
    return res.status(500).json({ error: 'Failed to set password', details: (err as Error).message });
  }
});

app.get('/debug/maintenance-log-test', async (req, res) => {
  console.log("DEBUG MAINTENANCE LOG TEST HIT");

  try {
    const maintenanceLogCount = await prisma.maintenanceLog.count();
    const maintenanceLogs = await prisma.maintenanceLog.findMany({
      orderBy: { created_at: 'desc' },
      take: 5,
    });
    const maintenanceCount = await prisma.maintenance.count();
    const maintenances = await prisma.maintenance.findMany({
      orderBy: { scheduled_date: 'desc' },
      take: 5,
    });

    return res.json({
      maintenanceLogCount,
      maintenanceLogs,
      maintenanceCount,
      maintenances,
    });
  } catch (err) {
    console.error('Maintenance log debug error:', err);
    return res.status(500).json({ error: 'Failed to query maintenance logs', details: (err as Error).message });
  }
});

console.log("RUNNING CURRENT INDEX TS WITH MAINTENANCE LOG VERSION");
console.log('Registered maintenance delete route: DELETE /api/maintenances/:id');

if (require.main === module) {
  httpServer.listen(Number(PORT), '0.0.0.0', () => {
    const os = require('os');
    const nets: Record<string, { family: string; internal: boolean; address: string }[]> = os.networkInterfaces();
    let networkIP = 'localhost';
    outer: for (const ifaces of Object.values(nets)) {
      for (const iface of ifaces) {
        if (iface.family === 'IPv4' && !iface.internal) { networkIP = iface.address; break outer; }
      }
    }
    console.log(`
┌─────────────────────────────────────────────┐
│         KIRA Backend — Running              │
├─────────────────────────────────────────────┤
│  Local:   http://localhost:${PORT}               │
│  Network: http://${networkIP}:${PORT}       │
│                                             │
│  HP: pastikan sambung WiFi yang sama,       │
│  buka URL Network di browser HP.            │
└─────────────────────────────────────────────┘`);
  });
}

export { app };

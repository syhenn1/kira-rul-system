import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import cors from 'cors';
import passport from 'passport';
import './passport.config';
import authRoutes from './auth/auth.routes';
import { authenticateJWT } from './middleware/auth.middleware';
import prisma from './lib/prisma';

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  })
);
app.use(express.json());
app.use(passport.initialize());

const PORT = process.env.PORT || 3001;

// ── Helper: find user's company (owner OR member) ────────────────────────────
async function findUserCompany(userId: string) {
  return prisma.company.findFirst({
    where: {
      OR: [
        { owner_id: userId },
        { members: { some: { id_user: userId } } },
      ],
    },
  });
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

    const pageNumber  = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNumber = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 10));
    const skip        = (pageNumber - 1) * limitNumber;
    const searchText      = String(search).trim();
    const statusText      = String(status).trim();
    const sortByText      = String(sort_by).trim();
    const rulMinNum       = rul_min !== '' ? parseFloat(String(rul_min)) : null;
    const rulMaxNum       = rul_max !== '' ? parseFloat(String(rul_max)) : null;
    const categoryText    = String(category).trim();
    const criticalityText = String(criticality).trim();
    const gedungIdText    = String(gedung_id).trim();

    const companyWhere = {
      OR: [
        { owner_id: userId },
        { members: { some: { id_user: userId } } },
      ],
    };

    // Build Prisma WHERE using AND so multiple conditions compose correctly
    const andClauses: any[] = [];

    if (searchText) {
      andClauses.push({
        OR: [
          { asset_name: { contains: searchText, mode: 'insensitive' } },
          { merk:     { nama: { contains: searchText, mode: 'insensitive' } } },
          { kategori: { nama: { contains: searchText, mode: 'insensitive' } } },
          { tipe:     { nama: { contains: searchText, mode: 'insensitive' } } },
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
            orderBy: { scheduled_date: 'desc' },
            take: 1,
            select: { scheduled_date: true, status: true },
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
      last_action: a.maintenances[0]?.scheduled_date ?? a.purchase_date,
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
        limit: limitNumber,
        total: filteredTotal,
        totalPages: Math.ceil(filteredTotal / limitNumber) || 1,
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
        company: {
          OR: [
            { owner_id: userId },
            { members: { some: { id_user: userId } } },
          ],
        },
      },
      include: {
        gedung:      true,
        merk:        true,
        kategori:    true,
        subKategori: true,
        tipe:        true,
        maintenances: {
          orderBy: { scheduled_date: 'desc' },
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
        maintenances:        (asset as any).maintenances,
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
    const userCompany = await prisma.company.findFirst({
      where: {
        OR: [
          { owner_id: userId },
          { members: { some: { id_user: userId } } },
        ],
      },
    });

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
      page = '1',
      limit = '10',
    } = req.query;

    const pageNumber = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNumber = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 10));
    const skip = (pageNumber - 1) * limitNumber;
    const searchText = String(search).trim();
    const statusText = String(status).trim();
    const severityText = String(severity).trim();

    const where: any = {
      AND: [
        {
          asset: {
            company: {
              OR: [
                { owner_id: userId },
                { members: { some: { id_user: userId } } },
              ],
            },
          },
        },
      ],
    };

    if (searchText) {
      where.AND.push({
        OR: [
          { maintenance_type: { contains: searchText, mode: 'insensitive' } },
          { severity: { contains: searchText, mode: 'insensitive' } },
          { status: { contains: searchText, mode: 'insensitive' } },
          { asset: { asset_name: { contains: searchText, mode: 'insensitive' } } },
          { user: { name: { contains: searchText, mode: 'insensitive' } } },
        ],
      });
    }

    if (statusText && statusText !== 'All Status') {
      where.AND.push({ status: statusText });
    }

    if (severityText && severityText !== 'All Priority' && severityText !== 'All Severity') {
      where.AND.push({ severity: severityText });
    }

    const [total, maintenances] = await Promise.all([
      prisma.maintenance.count({ where }),
      prisma.maintenance.findMany({
        where,
        orderBy: { scheduled_date: 'desc' },
        skip,
        take: limitNumber,
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
            select: { id: true, name: true, email: true },
          },
          technician: {
            select: { id: true, name: true, email: true, specialization: true, phone: true },
          },
          logs: {
            orderBy: { created_at: 'asc' },
            include: {
              user: {
                select: { id: true, name: true, email: true },
              },
              technician: {
                select: { id: true, name: true, email: true },
              },
            },
          },
          prediction_history: {
            orderBy: { recorded_at: 'desc' },
            take: 1,
          },
        },
      }),
    ]);

    const maintenancesWithLatestStatus = maintenances.map((maintenance: any) => ({
      ...maintenance,
      latestStatus: maintenance.logs[maintenance.logs.length - 1]?.status || maintenance.status,
      currentStatusFromLog: maintenance.logs[maintenance.logs.length - 1]?.status || maintenance.status,
    }));

    return res.status(200).json({
      data: maintenancesWithLatestStatus,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        totalPages: Math.ceil(total / limitNumber),
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
      severity,
      scheduled_date,
      completion_date,
      cost,
      status,
      assigned_technician_id,
      id_teknisi,
      note,
      id_user,
      jenis_kerusakan,
      penyebab,
      spare_part_digunakan,
    } = req.body;

    if (!id_asset || !scheduled_date) {
      return res.status(400).json({ error: 'Missing required fields (id_asset, scheduled_date)' });
    }

    // Gunakan user yang sedang login
    const userId = (req as any).user.id;

    const asset = await prisma.asset.findFirst({
      where: {
        id: id_asset,
        company: {
          OR: [
            { owner_id: userId },
            { members: { some: { id_user: userId } } },
          ],
        },
      },
      include: { gedung: true, merk: true, kategori: true, subKategori: true, tipe: true },
    });

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    // Hitung down_time: tanggal selesai - tanggal direncanakan (dalam hari)
    let down_time = 0;
    if (scheduled_date && completion_date) {
      const start = new Date(scheduled_date).getTime();
      const end = new Date(completion_date).getTime();
      down_time = Math.max(0, Math.floor((end - start) / (1000 * 60 * 60 * 24)));
    }

    // Insert maintenance into DB
    const newMaintenance = await prisma.maintenance.create({
      data: {
        id_asset,
        id_user: userId,
        assigned_technician_id: assigned_technician_id || null,
        id_teknisi: id_teknisi || null,
        maintenance_type: maintenance_type || 'Preventive',
        severity: severity || 'Medium',
        scheduled_date: new Date(scheduled_date),
        completion_date: completion_date ? new Date(completion_date) : null,
        down_time: down_time,
        cost: cost ? parseFloat(cost) : 0.0,
        status: status || 'Scheduled',
        jenis_kerusakan:      jenis_kerusakan      || null,
        penyebab:             penyebab             || null,
        spare_part_digunakan: spare_part_digunakan || null,
      }
    });

    let createdMaintenanceLog;
    try {
      console.log("ABOUT TO CREATE MAINTENANCE LOG");
      createdMaintenanceLog = await prisma.maintenanceLog.create({
        data: {
          id_maintenance: newMaintenance.id,
          id_user: userId,
          technician_id: assigned_technician_id || null,
          status: status || 'Scheduled',
          note: note || '',
          completion_date: completion_date ? new Date(completion_date) : null,
          down_time: down_time,
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
          select: { id: true, name: true, email: true }
        },
        technician: {
          select: { id: true, name: true, email: true, specialization: true, phone: true }
        },
        logs: {
          orderBy: { created_at: 'asc' },
          include: {
            user: { select: { id: true, name: true, email: true } },
            technician: { select: { id: true, name: true, email: true } }
          }
        }
      }
    });

    return res.status(201).json({
      message: 'Maintenance berhasil ditambahkan',
      data: {
        ...createdMaintenance,
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
      scheduled_date,
      start_date,
      completion_date,
      down_time,
      cost,
      status,
      note,
    } = req.body;

    const maintenance = await prisma.maintenance.findFirst({
      where: {
        id,
        asset: {
          company: {
            OR: [
              { owner_id: userId },
              { members: { some: { id_user: userId } } },
            ],
          },
        },
      },
      include: {
        logs: {
          orderBy: { created_at: 'desc' },
          take: 1,
        },
      },
    });

    if (!maintenance) {
      return res.status(404).json({ error: 'Maintenance not found or inaccessible' });
    }

    if (id_asset && id_asset !== maintenance.id_asset) {
      const accessibleAsset = await prisma.asset.findFirst({
        where: {
          id: id_asset,
          company: {
            OR: [
              { owner_id: userId },
              { members: { some: { id_user: userId } } },
            ],
          },
        },
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
    if (hasField('scheduled_date')) {
      if (!scheduled_date) return res.status(400).json({ error: 'scheduled_date cannot be empty' });
      updateData.scheduled_date = new Date(scheduled_date);
    }
    if (hasField('start_date')) updateData.start_date = start_date ? new Date(start_date) : null;
    if (hasField('completion_date')) updateData.completion_date = completion_date ? new Date(completion_date) : null;
    if (hasField('down_time')) updateData.down_time = down_time !== undefined && down_time !== '' ? parseInt(down_time, 10) : 0;
    if (hasField('cost')) updateData.cost = cost !== undefined && cost !== '' ? parseFloat(cost) : 0.0;

    const latestStatus = maintenance.logs[0]?.status || maintenance.status;
    const hasStatus = hasField('status') && status;
    const statusChanged = Boolean(hasStatus && status !== latestStatus);

    if (hasStatus) {
      updateData.status = status;
    }

    const updatedMaintenance = await prisma.$transaction(async (tx: any) => {
      await tx.maintenance.update({
        where: { id: maintenance.id },
        data: updateData,
      });

      if (statusChanged) {
        await tx.maintenanceLog.create({
          data: {
            id_maintenance: maintenance.id,
            id_user: userId,
            technician_id: hasField('assigned_technician_id')
              ? assigned_technician_id || null
              : maintenance.assigned_technician_id,
            status,
            note: note || `Status changed from ${latestStatus} to ${status}`,
            start_date: hasField('start_date') ? (start_date ? new Date(start_date) : null) : maintenance.start_date,
            completion_date: hasField('completion_date') ? (completion_date ? new Date(completion_date) : null) : maintenance.completion_date,
            down_time: hasField('down_time') && down_time !== undefined && down_time !== '' ? parseInt(down_time, 10) : maintenance.down_time,
            cost: hasField('cost') && cost !== undefined && cost !== '' ? parseFloat(cost) : maintenance.cost,
          },
        });
      }

      return tx.maintenance.findUniqueOrThrow({
        where: { id: maintenance.id },
        include: {
          asset: true,
          user: { select: { id: true, name: true, email: true } },
          assignedTechnician: { select: { id: true, name: true, email: true } },
          technician: { select: { id: true, name: true, email: true, specialization: true, phone: true } },
          logs: {
            orderBy: { created_at: 'asc' },
            include: {
              user: { select: { id: true, name: true, email: true } },
              technician: { select: { id: true, name: true, email: true } },
            },
          },
          prediction_history: { orderBy: { recorded_at: 'desc' } },
        },
      });
    });

    return res.status(200).json({
      message: 'Maintenance updated successfully',
      data: {
        ...updatedMaintenance,
        latestStatus: updatedMaintenance.logs[0]?.status || updatedMaintenance.status,
        currentStatusFromLog: updatedMaintenance.logs[0]?.status || updatedMaintenance.status,
      },
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
      start_date,
      completion_date,
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
                members: true,
              },
            },
            merk:        true,
            kategori:    true,
            subKategori: true,
            tipe:        true,
          },
        },
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
      maintenance.asset.company.members.some((member: any) => member.id_user === userId);

    if (!hasAccess) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    let down_time = 0;
    if (start_date && completion_date) {
      const start = new Date(start_date).getTime();
      const end = new Date(completion_date).getTime();
      down_time = Math.max(0, Math.floor((end - start) / (1000 * 60 * 60 * 24)));
    }

    await prisma.maintenanceLog.create({
      data: {
        id_maintenance: maintenance.id,
        id_user: userId,
        technician_id: technician_id || null,
        status,
        note,
        start_date: start_date ? new Date(start_date) : null,
        completion_date: completion_date ? new Date(completion_date) : null,
        down_time,
        cost: cost !== undefined && cost !== '' ? parseFloat(cost) : 0.0,
      },
    });

    const updateData: any = {
      status,
    };

    if (technician_id) updateData.assigned_technician_id = technician_id;
    if (start_date) updateData.start_date = new Date(start_date);
    if (completion_date) updateData.completion_date = new Date(completion_date);
    if (cost !== undefined && cost !== '') updateData.cost = parseFloat(cost);
    if (start_date && completion_date) updateData.down_time = down_time;

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
          select: { id: true, name: true, email: true },
        },
        logs: {
          orderBy: { created_at: 'desc' },
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
            technician: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        prediction_history: {
          orderBy: { recorded_at: 'desc' },
        },
      },
    });

    const resultWithLatestStatus = {
      ...result,
      latestStatus: result.logs[0]?.status || result.status,
      currentStatusFromLog: result.logs[0]?.status || result.status,
    };

    return res.status(201).json({
      message: 'Maintenance log berhasil ditambahkan',
      data: resultWithLatestStatus,
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
        asset: {
          company: {
            OR: [
              { owner_id: userId },
              { members: { some: { id_user: userId } } },
            ],
          },
        },
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
    let { limit, temperature } = req.body ?? {};

    const userCompany = await findUserCompany((req as any).user.id);

    if (!userCompany) {
      return res.status(404).json({ error: 'No company found for summarization' });
    }
    const company_id = userCompany.id;

    const aiEngineBase = (process.env.AI_ENGINE_URL || 'http://localhost:8000').replace(/\/$/, '');
    const aiEngineUrl = `${aiEngineBase}/summarize`;
    const response = await fetch(aiEngineUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        company_id,
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
    const userCompany = await prisma.company.findFirst({
      where: {
        OR: [
          { owner_id: userId },
          { members: { some: { id_user: userId } } },
        ],
      },
    });
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

// GET /api/technicians — daftar teknisi milik perusahaan user
app.get('/api/technicians', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const userCompany = await findUserCompany((req as any).user.id);
    if (!userCompany) return res.status(404).json({ error: 'No company found' });

    const { status, specialization } = req.query as { status?: string; specialization?: string };

    const technicians = await (prisma as any).technician.findMany({
      where: {
        id_perusahaan: userCompany.id,
        ...(status ? { status } : {}),
        ...(specialization ? { specialization } : {}),
      },
      orderBy: [{ status: 'asc' }, { name: 'asc' }],
    });

    return res.status(200).json({ technicians });
  } catch (error) {
    console.error('Error fetching technicians:', error);
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

    const updated = await (prisma as any).technician.update({
      where: { id },
      data: { status },
    });
    return res.status(200).json({ technician: updated });
  } catch (error) {
    console.error('Error updating technician status:', error);
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

// GET /api/dashboard — aggregated stats for the dashboard
app.get('/api/dashboard', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const userCompany = await findUserCompany((req as any).user.id);
    if (!userCompany) return res.status(404).json({ error: 'No company found' });
    const companyId = userCompany.id;

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

    // Monthly maintenance count — last 6 months
    const monthlyTrend: any[] = await prisma.$queryRaw`
      SELECT
        TO_CHAR(DATE_TRUNC('month', m.scheduled_date), 'Mon YY') AS month,
        DATE_TRUNC('month', m.scheduled_date) AS month_ts,
        COUNT(*)::int AS count
      FROM maintenances m
      JOIN assets a ON a.id = m.id_asset
      WHERE a.id_perusahaan = ${companyId}
        AND m.scheduled_date >= NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', m.scheduled_date)
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

    // Upcoming maintenances (next 5 by scheduled_date)
    const upcoming = await prisma.maintenance.findMany({
      where: {
        asset: { id_perusahaan: companyId },
        scheduled_date: { gte: new Date() },
        status: { not: 'Completed' },
      },
      include: { asset: { select: { asset_name: true } } },
      orderBy: { scheduled_date: 'asc' },
      take: 5,
    });

    // Recent maintenance activity (last 5)
    const recent = await prisma.maintenance.findMany({
      where: { asset: { id_perusahaan: companyId } },
      include: {
        asset: { select: { asset_name: true } },
        user: { select: { name: true } },
      },
      orderBy: { scheduled_date: 'desc' },
      take: 5,
    });

    const alerts = alertsSummary[0] ?? { critical: 0, high: 0, watch: 0 };

    return res.status(200).json({
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
      upcoming_maintenances: upcoming.map((m: any) => ({
        id: m.id,
        asset_name: m.asset.asset_name,
        scheduled_date: m.scheduled_date,
        severity: m.severity,
        status: m.status,
        maintenance_type: m.maintenance_type,
      })),
      recent_maintenances: recent.map((m: any) => ({
        id: m.id,
        asset_name: m.asset.asset_name,
        maintenance_type: m.maintenance_type,
        severity: m.severity,
        status: m.status,
        scheduled_date: m.scheduled_date,
        cost: m.cost,
        user_name: m.user.name,
      })),
    });
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
      },
      orderBy: { scheduled_date: 'desc' },
    });

    return res.status(200).json({
      maintenances: maintenances.map((m: any) => ({
        id: m.id,
        asset_name: m.asset.asset_name,
        kategori_nama: m.asset.kategori?.nama ?? null,
        maintenance_type: m.maintenance_type,
        severity: m.severity,
        status: m.status,
        scheduled_date: m.scheduled_date,
        completion_date: m.completion_date,
        cost: m.cost,
        down_time: m.down_time,
        user_name: m.user.name,
      })),
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
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export { app };

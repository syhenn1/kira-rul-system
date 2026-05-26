import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import passport from 'passport';
import './passport.config';
import authRoutes from './auth/auth.routes';
import { authenticateJWT } from './middleware/auth.middleware';

const app = express();
const prisma = new PrismaClient({
  adapter: new PrismaPg(process.env.DATABASE_URL || ''),
});

app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  })
);
app.use(express.json());
app.use(passport.initialize());

const PORT = process.env.PORT || 3001;

// Auth routes
app.use('/api/auth', authRoutes);

// API endpoint untuk menambahkan asset
app.post('/api/assets', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const {
      asset_name,
      purchase_date,
      initial_useful_life,
      status,
      id_perusahaan,
      brand,
      category,
      sub_category,
      type,
      criticality_level,
      gedung_id
    } = req.body;

    // Pastikan data yang diperlukan ada
    if (!asset_name || !purchase_date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Default values for fields removed from frontend
    const finalInitialUsefulLife = initial_useful_life !== undefined ? initial_useful_life : 0;
    const finalStatus = status || 'Active';

    // Dapatkan company id dari user yang sedang login
    const userCompany = await prisma.company.findFirst({
      where: { owner_id: (req as any).user.id },
    });

    if (!userCompany) {
      return res.status(400).json({ error: 'User does not belong to any company' });
    }
    
    let companyId = userCompany.id;

    const newAsset = await prisma.asset.create({
      data: {
        asset_name,
        purchase_date: new Date(purchase_date),
        initial_useful_life: parseInt(finalInitialUsefulLife as string) || 0,
        brand: brand || 'Generic',
        category: category || 'Mechanical',
        sub_category: sub_category || 'General',
        type: type || 'General Equipment',
        criticality_level: criticality_level || 'Medium',
        status: finalStatus,
        company: { connect: { id: companyId } },
        ...(gedung_id ? { gedung: { connect: { id: gedung_id } } } : {}),
      }
    });

    // Coba memprediksi RUL untuk asset baru
    let predicted_rul = parseInt(finalInitialUsefulLife as string) || 0;
    try {
      const aiEngineUrl = process.env.AI_ENGINE_URL || 'http://localhost:8000/predict';
      const aiResponse = await fetch(aiEngineUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merek: newAsset.brand,
          kategori: newAsset.category,
          sub_kategori: newAsset.sub_category,
          tipe: newAsset.type,
          tingkat_kekritisan: newAsset.criticality_level,
          count_nama_aset: 0,
          average_down_time: 0.0,
          sum_biaya_perbaikan: 0.0,
          mode_severity: "0",
          maximum_biaya_perbaikan: 0.0
        }),
      });

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        if (aiData && aiData.predicted_rul !== undefined) {
          predicted_rul = Math.round(aiData.predicted_rul);
        }
      }
    } catch (e) {
      console.warn("AI Engine predict failed, using initial_useful_life for RUL:", e);
    }

    // Save initial prediction history
    await prisma.assetPredictionHistory.create({
      data: {
        id_asset: newAsset.id,
        predicted_rul: predicted_rul,
        maintenance_count: 0,
        average_down_time: 0.0,
        total_maintenance_cost: 0.0,
        max_maintenance_cost: 0.0,
        mode_severity: "0"
      }
    });

    return res.status(201).json({
      message: 'Asset berhasil ditambahkan',
      data: {
        ...newAsset,
        predicted_rul
      }
    });
  } catch (error) {
    console.error('Error adding asset:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Endpoint untuk prediksi RUL
app.post('/api/predict-rul', async (req: Request, res: Response) => {
  try {
    const aiEngineUrl = process.env.AI_ENGINE_URL || 'http://localhost:8000/predict';

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
      id_user
    } = req.body;

    if (!id_asset || !scheduled_date) {
      return res.status(400).json({ error: 'Missing required fields (id_asset, scheduled_date)' });
    }

    // Cek apakah asset ada
    const asset = await prisma.asset.findUnique({ where: { id: id_asset } });
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    // Gunakan user yang sedang login
    let userId = (req as any).user.id;

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
        maintenance_type: maintenance_type || 'Preventive',
        severity: severity || 'Medium',
        scheduled_date: new Date(scheduled_date),
        completion_date: completion_date ? new Date(completion_date) : null,
        down_time: down_time,
        cost: cost ? parseFloat(cost) : 0.0,
        status: status || 'Scheduled',
      }
    });

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
      const aiEngineUrl = process.env.AI_ENGINE_URL || 'http://localhost:8000/predict';
      
      // Mengirim payload ke AI engine dengan nilai agregat aktual
      const aiResponse = await fetch(aiEngineUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merek: asset.brand,
          kategori: asset.category,
          sub_kategori: asset.sub_category,
          tipe: asset.type,
          tingkat_kekritisan: asset.criticality_level,
          count_nama_aset: count,
          average_down_time: avg_down_time,
          sum_biaya_perbaikan: sum_cost,
          mode_severity: mode_severity,
          maximum_biaya_perbaikan: max_cost
        }),
      });

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        if (aiData && aiData.predicted_rul !== undefined) {
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

    return res.status(201).json({
      message: 'Maintenance berhasil ditambahkan',
      data: {
        ...newMaintenance,
        predicted_rul
      }
    });
  } catch (error) {
    console.error('Error adding maintenance:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Endpoint untuk ringkasan maintenance / asset summary
app.post('/api/summarize', authenticateJWT, async (req: Request, res: Response) => {
  try {
    let { limit, temperature } = req.body ?? {};

    const userCompany = await prisma.company.findFirst({
      where: { owner_id: (req as any).user.id }
    });

    if (!userCompany) {
      return res.status(404).json({ error: 'No company found for summarization' });
    }
    const company_id = userCompany.id;

    const aiEngineUrl = process.env.AI_ENGINE_URL || 'http://localhost:8000/summarize';
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

// GET /api/gedung — daftar gedung milik perusahaan user
app.get('/api/gedung', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const userCompany = await prisma.company.findFirst({
      where: { owner_id: (req as any).user.id },
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
    const userCompany = await prisma.company.findFirst({ where: { owner_id: (req as any).user.id } });
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
    const userCompany = await prisma.company.findFirst({
      where: { owner_id: (req as any).user.id },
    });
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

// GET /api/alerts — aset dengan predicted_rul <= 24 bulan (latest prediction per asset)
app.get('/api/alerts', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const userCompany = await prisma.company.findFirst({
      where: { owner_id: (req as any).user.id },
    });

    if (!userCompany) {
      return res.status(404).json({ error: 'No company found' });
    }

    const companyId = userCompany.id;

    const alerts: any[] = await prisma.$queryRaw`
      SELECT DISTINCT ON (a.id)
        a.id, a.asset_name, a.brand, a.category, a.sub_category, a.type,
        a.criticality_level, a.status,
        aph.predicted_rul, aph.mode_severity, aph.maintenance_count, aph.recorded_at
      FROM assets a
      JOIN asset_prediction_history aph ON aph.id_asset = a.id
      WHERE a.id_perusahaan = ${companyId}
        AND aph.predicted_rul <= 24
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
    const userCompany = await prisma.company.findFirst({
      where: { owner_id: (req as any).user.id },
    });
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
      SELECT category, COUNT(*)::int AS count
      FROM assets WHERE id_perusahaan = ${companyId}
      GROUP BY category ORDER BY count DESC LIMIT 7
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

    // Alerts summary (latest predicted_rul per asset)
    const alertsSummary: any[] = await prisma.$queryRaw`
      SELECT
        SUM(CASE WHEN aph.predicted_rul <= 6  THEN 1 ELSE 0 END)::int  AS critical,
        SUM(CASE WHEN aph.predicted_rul > 6  AND aph.predicted_rul <= 12 THEN 1 ELSE 0 END)::int AS high,
        SUM(CASE WHEN aph.predicted_rul > 12 AND aph.predicted_rul <= 24 THEN 1 ELSE 0 END)::int AS watch
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
      upcoming_maintenances: upcoming.map((m) => ({
        id: m.id,
        asset_name: m.asset.asset_name,
        scheduled_date: m.scheduled_date,
        severity: m.severity,
        status: m.status,
        maintenance_type: m.maintenance_type,
      })),
      recent_maintenances: recent.map((m) => ({
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
    const userCompany = await prisma.company.findFirst({
      where: { owner_id: (req as any).user.id },
    });
    if (!userCompany) return res.status(404).json({ error: 'No company found' });
    const companyId = userCompany.id;

    const assets: any[] = await prisma.$queryRaw`
      SELECT DISTINCT ON (a.id)
        a.id, a.asset_name, a.brand, a.category, a.sub_category, a.type,
        a.criticality_level, a.status, a.purchase_date,
        COALESCE(aph.predicted_rul, a.initial_useful_life) AS predicted_rul,
        COALESCE(aph.maintenance_count, 0) AS maintenance_count,
        COALESCE(aph.total_maintenance_cost, 0) AS total_cost,
        aph.recorded_at
      FROM assets a
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
    const userCompany = await prisma.company.findFirst({
      where: { owner_id: (req as any).user.id },
    });
    if (!userCompany) return res.status(404).json({ error: 'No company found' });
    const companyId = userCompany.id;

    const maintenances = await prisma.maintenance.findMany({
      where: { asset: { id_perusahaan: companyId } },
      include: {
        asset: { select: { asset_name: true, category: true } },
        user: { select: { name: true } },
      },
      orderBy: { scheduled_date: 'desc' },
    });

    return res.status(200).json({
      maintenances: maintenances.map((m) => ({
        id: m.id,
        asset_name: m.asset.asset_name,
        category: m.asset.category,
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

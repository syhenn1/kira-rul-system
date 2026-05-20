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
      criticality_level
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
        company: {
          connect: { id: companyId },
        },
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

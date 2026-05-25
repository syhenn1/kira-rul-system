import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import cors from 'cors';
const { PrismaClient } = require('@prisma/client');
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

app.get('/api/assets', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const assets = await prisma.asset.findMany({
      where: {
        company: {
          OR: [
            { owner_id: userId },
            { members: { some: { id_user: userId } } },
          ],
        },
      },
      orderBy: { asset_name: 'asc' },
      select: {
        id: true,
        asset_name: true,
        brand: true,
        category: true,
        sub_category: true,
        type: true,
        status: true,
        criticality_level: true,
      },
    });

    return res.status(200).json({ data: assets });
  } catch (error) {
    console.error('Error fetching assets:', error);
    return res.status(500).json({ error: 'Failed to fetch assets', details: (error as Error).message });
  }
});

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
          asset: true,
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
            take: 1,
          },
        },
      }),
    ]);

    const maintenancesWithLatestStatus = maintenances.map((maintenance: any) => ({
      ...maintenance,
      latestStatus: maintenance.logs[0]?.status || maintenance.status,
      currentStatusFromLog: maintenance.logs[0]?.status || maintenance.status,
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
      note,
      id_user
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
        maintenance_type: maintenance_type || 'Preventive',
        severity: severity || 'Medium',
        scheduled_date: new Date(scheduled_date),
        completion_date: completion_date ? new Date(completion_date) : null,
        down_time: down_time,
        cost: cost ? parseFloat(cost) : 0.0,
        status: status || 'Scheduled',
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

    const createdMaintenance = await prisma.maintenance.findUniqueOrThrow({
      where: { id: newMaintenance.id },
      include: {
        assignedTechnician: {
          select: { id: true, name: true, email: true }
        },
        logs: {
          orderBy: { created_at: 'desc' },
          include: {
            user: {
              select: { id: true, name: true, email: true }
            },
            technician: {
              select: { id: true, name: true, email: true }
            }
          }
        }
      }
    });

    return res.status(201).json({
      message: 'Maintenance berhasil ditambahkan',
      data: {
        ...createdMaintenance,
        predicted_rul
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
        const aiEngineUrl = process.env.AI_ENGINE_URL || 'http://localhost:8000/predict';
        const aiResponse = await fetch(aiEngineUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            merek: maintenance.asset.brand,
            kategori: maintenance.asset.category,
            sub_kategori: maintenance.asset.sub_category,
            tipe: maintenance.asset.type,
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
        asset: true,
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

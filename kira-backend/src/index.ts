import express, { Request, Response } from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// API endpoint untuk menambahkan asset
app.post('/api/assets', async (req: Request, res: Response) => {
  try {
    const { 
      asset_name, 
      purchase_date, 
      initial_useful_life, 
      current_rul, 
      status, 
      id_perusahaan 
    } = req.body;

    // Pastikan data yang diperlukan ada
    if (!asset_name || !purchase_date || initial_useful_life === undefined || current_rul === undefined || !status) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Untuk keperluan simulasi, jika id_perusahaan kosong, buatkan dummy user dan company
    let companyId = id_perusahaan;
    
    if (!companyId) {
      // Cek apakah ada dummy company
      const dummyCompany = await prisma.company.findFirst({
        where: { company_name: 'Dummy Company' }
      });
      
      if (dummyCompany) {
        companyId = dummyCompany.id;
      } else {
        // Buat dummy user & company
        const dummyUser = await prisma.user.create({
          data: {
            name: 'Dummy Owner',
            email: 'dummy@example.com',
            password: 'password123'
          }
        });
        
        const newCompany = await prisma.company.create({
          data: {
            company_name: 'Dummy Company',
            license_status: 'Active',
            owner_id: dummyUser.id
          }
        });
        
        companyId = newCompany.id;
      }
    }

    // Insert data asset ke DB
    const newAsset = await prisma.asset.create({
      data: {
        asset_name,
        purchase_date: new Date(purchase_date),
        initial_useful_life: parseInt(initial_useful_life),
        current_rul: parseInt(current_rul),
        status,
        id_perusahaan: companyId
      }
    });

    return res.status(201).json({
      message: 'Asset berhasil ditambahkan',
      data: newAsset
    });
  } catch (error) {
    console.error('Error adding asset:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Endpoint untuk testing API
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

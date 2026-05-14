import express, { Request, Response } from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// Mock data for assets
const mockAssets: any[] = [];

// API endpoint untuk menambahkan asset
app.post('/api/assets', (req: Request, res: Response) => {
  try {
    const { 
      asset_name, 
      purchase_date, 
      initial_useful_life, 
      current_rul, 
      status
    } = req.body;

    if (!asset_name || !purchase_date || initial_useful_life === undefined || current_rul === undefined || !status) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const newAsset = {
      id: Math.random().toString(36).substr(2, 9),
      asset_name,
      purchase_date,
      initial_useful_life: parseInt(initial_useful_life),
      current_rul: parseInt(current_rul),
      status,
      created_at: new Date()
    };

    mockAssets.push(newAsset);

    return res.status(201).json({
      message: 'Asset berhasil ditambahkan',
      data: newAsset
    });
  } catch (error) {
    console.error('Error adding asset:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Endpoint untuk prediksi RUL dengan meneruskan request ke AI Engine
app.post('/api/predict-rul', async (req: Request, res: Response) => {
  try {
    const aiEngineUrl = process.env.AI_ENGINE_URL || 'http://localhost:8000/predict';
    
    const response = await fetch(aiEngineUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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

// Endpoint untuk testing API
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK' });
});

// Get all assets
app.get('/api/assets', (req, res) => {
  res.json(mockAssets);
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

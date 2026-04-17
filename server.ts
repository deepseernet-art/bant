import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(process.cwd(), 'orders.json');

async function ensureDb() {
  try {
    await fs.access(DB_PATH);
    console.log('Database file found at:', DB_PATH);
  } catch {
    console.log('Database file not found, creating new one at:', DB_PATH);
    await fs.writeFile(DB_PATH, JSON.stringify([]));
  }
}

async function getOrders() {
  try {
    const data = await fs.readFile(DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading database:', error);
    return [];
  }
}

async function saveOrders(orders: any[]) {
  try {
    await fs.writeFile(DB_PATH, JSON.stringify(orders, null, 2));
  } catch (error) {
    console.error('Error saving to database:', error);
  }
}

async function startServer() {
  console.log('Starting server in', process.env.NODE_ENV || 'development', 'mode...');
  await ensureDb();
  
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Logging middleware
  app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    next();
  });

  // Health check route
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // --- API Routes ---
  
  // Get all orders
  app.get('/api/orders', async (req, res) => {
    try {
      const orders = await getOrders();
      // Sort by createdAt descending
      const sorted = orders.sort((a: any, b: any) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      res.json(sorted);
    } catch (error) {
      console.error('GET /api/orders failed:', error);
      res.status(500).json({ error: 'Failed to fetch orders' });
    }
  });

  // Create an order
  app.post('/api/orders', async (req, res) => {
    try {
      const { studentName, shirtSize, nickname } = req.body;
      if (!studentName || !shirtSize || !nickname) {
        console.warn('POST /api/orders matched, but body is missing fields:', req.body);
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const newOrder = {
        id: Date.now().toString(),
        studentName,
        shirtSize,
        nickname,
        createdAt: new Date().toISOString()
      };
      
      const orders = await getOrders();
      orders.push(newOrder);
      await saveOrders(orders);
      
      console.log('Order created successfully:', newOrder.id);
      res.status(201).json(newOrder);
    } catch (error) {
      console.error('POST /api/orders failed:', error);
      res.status(500).json({ error: 'Failed to create order' });
    }
  });

  // Delete an order
  app.delete('/api/orders/:id', async (req, res) => {
    const { id } = req.params;
    try {
      let orders = await getOrders();
      const initialLength = orders.length;
      orders = orders.filter((o: any) => o.id !== id);
      
      if (orders.length === initialLength) {
        return res.status(404).json({ error: 'Order not found' });
      }
      
      await saveOrders(orders);
      console.log('Order deleted successfully:', id);
      res.json({ success: true });
    } catch (error) {
      console.error('DELETE /api/orders failed:', error);
      res.status(500).json({ error: 'Failed to delete order' });
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    console.log('Vite serves frontend as middleware in development mode.');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log('Serving frontend from dist folder in production mode.');
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`>>> Server is listening on port ${PORT}`);
  });
}

startServer();

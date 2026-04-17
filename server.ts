import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, 'orders.json');

async function ensureDb() {
  try {
    await fs.access(DB_PATH);
  } catch {
    await fs.writeFile(DB_PATH, JSON.stringify([]));
  }
}

async function getOrders() {
  const data = await fs.readFile(DB_PATH, 'utf-8');
  return JSON.parse(data);
}

async function saveOrders(orders: any[]) {
  await fs.writeFile(DB_PATH, JSON.stringify(orders, null, 2));
}

async function startServer() {
  await ensureDb();
  
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Logging middleware
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });

  // --- API Routes ---
  
  // Get all orders
  app.get('/api/orders', async (req, res) => {
    try {
      const orders = await getOrders();
      res.json(orders);
    } catch (error) {
      console.error('API Error /api/orders:', error);
      res.status(500).json({ error: 'Failed to fetch orders' });
    }
  });

  // Create an order
  app.post('/api/orders', async (req, res) => {
    try {
      const { studentName, shirtSize, nickname } = req.body;
      if (!studentName || !shirtSize || !nickname) {
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
      
      console.log('Order created:', newOrder.id);
      res.status(201).json(newOrder);
    } catch (error) {
      console.error('API Error POST /api/orders:', error);
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
      console.log('Order deleted:', id);
      res.json({ success: true });
    } catch (error) {
      console.error('API Error DELETE /api/orders:', error);
      res.status(500).json({ error: 'Failed to delete order' });
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    console.log('Initializing Vite middleware...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

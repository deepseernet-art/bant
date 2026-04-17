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
      res.status(500).json({ error: 'Failed to fetch orders' });
    }
  });

  // Create an order
  app.post('/api/orders', async (req, res) => {
    try {
      const newOrder = {
        id: Date.now().toString(),
        ...req.body,
        createdAt: new Date().toISOString()
      };
      const orders = await getOrders();
      orders.push(newOrder);
      await saveOrders(orders);
      res.status(201).json(newOrder);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create order' });
    }
  });

  // Delete an order (Admin check on client, but we'll allow it here)
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
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete order' });
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
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

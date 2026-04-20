import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import firebaseConfig from "./firebase-applet-config.json" assert { type: "json" };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  console.log("HydroFlow Server starting...");
  
  const app = express();
  const PORT = 3000;

  // 1. Initialise SQLite FIRST - this must succeed
  console.log("Setting up SQLite local storage...");
  const db = new Database("hydroflow.db");
  db.exec(`
    CREATE TABLE IF NOT EXISTS sensor_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      temp REAL,
      humidity REAL,
      soil_moisture REAL,
      timestamp TEXT
    );
    CREATE TABLE IF NOT EXISTS system_config (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  // 2. LAZY Firestore Initialization
  let firestore: any = null;
  let firestoreAttempted = false;

  const getFirestoreClient = () => {
    if (firestore) return firestore;
    if (firestoreAttempted) return null;
    
    console.log("Attempting Lazy Firestore initialization...");
    try {
      firestoreAttempted = true;
      // Force initialization with the correct project ID to avoid falling back to the host project
      if (admin.apps.length === 0) {
        admin.initializeApp({
          projectId: firebaseConfig.projectId
        });
      }
      // Use the specific provisioned database ID
      firestore = getFirestore("ai-studio-5978721b-264c-4753-bf67-c56895b45ed0");
      console.log("Firestore Admin SDK initialized (target: xodecrushers).");
    } catch (e: any) {
      console.error("Firestore Init failed:", e.message);
    }
    return firestore;
  };

  app.use(express.json());

  // Data helpers
  const getSystemStatus = async () => {
    let status: any = null;
    const client = getFirestoreClient();
    
    if (client) {
      try {
        const doc = await client.collection('system_config').doc('status').get();
        if (doc.exists) status = doc.data();
      } catch (e: any) {
        // Silently handle common cloud-level blocking issues
        if (e.message.includes("PERMISSION_DENIED") || e.message.includes("not been used in project")) {
          // No log spam for expected cloud permission/API gates
        } else {
          console.warn("Firestore fetch error:", e.message);
        }
      }
    }

    if (!status) {
      const row = db.prepare("SELECT value FROM system_config WHERE key = 'status'").get() as any;
      status = row ? JSON.parse(row.value) : { is_watering: false, is_auto_mode: true, lastUpdated: new Date().toISOString() };
    }
    return status;
  };

  const updateSystemStatus = async (update: any) => {
    const current = await getSystemStatus();
    const merged = { ...current, ...update, lastUpdated: new Date().toISOString() };
    
    db.prepare("INSERT OR REPLACE INTO system_config (key, value) VALUES (?, ?)").run('status', JSON.stringify(merged));
    
    const client = getFirestoreClient();
    if (client) {
      try {
        await client.collection('system_config').doc('status').set(merged, { merge: true });
      } catch (e: any) {
        // Silently handle expected cloud permission issues
        if (!e.message.includes("PERMISSION_DENIED") && !e.message.includes("not been used in project")) {
          console.warn("Firestore sync update error:", e.message);
        }
      }
    }
    return merged;
  };

  // API Routes
  app.get("/api/system-status", async (req, res) => {
    try {
      const status = await getSystemStatus();
      res.json(status);
    } catch (e: any) {
      res.status(500).json({ error: "API Internal Error", details: e.message });
    }
  });

  app.post("/api/system-control", async (req, res) => {
    const { is_watering, is_auto_mode } = req.body;
    try {
      const updateData: any = {};
      if (is_watering !== undefined) updateData.is_watering = !!is_watering;
      if (is_auto_mode !== undefined) updateData.is_auto_mode = !!is_auto_mode;
      const status = await updateSystemStatus(updateData);
      res.json({ success: true, ...status });
    } catch (e: any) {
      res.status(500).json({ error: "API Internal Error", details: e.message });
    }
  });

  app.get("/api/sensor-data", async (req, res) => {
    const { limit } = req.query;
    try {
      const rows = db.prepare("SELECT * FROM sensor_data ORDER BY timestamp DESC LIMIT ?").all(Number(limit) || 24) as any[];
      const data = rows.map(r => ({
        time: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        temp: r.temp,
        humidity: r.humidity,
        soil_moisture: r.soil_moisture,
        fullTimestamp: r.timestamp
      })).reverse();
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch telemetry" });
    }
  });

  app.post("/api/sensor-data", async (req, res) => {
    const { temp, humidity, soil_moisture } = req.body;
    try {
      const timestamp = new Date().toISOString();
      db.prepare("INSERT INTO sensor_data (temp, humidity, soil_moisture, timestamp) VALUES (?, ?, ?, ?)").run(temp, humidity, soil_moisture || 0, timestamp);
      
      const client = getFirestoreClient();
      if (client) {
        client.collection('sensor_data').add({ temp, humidity, soil_moisture: soil_moisture || 0, timestamp }).catch(() => {});
      }
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed to push telemetry" });
    }
  });

  // Vite
  console.log("Initializing Vite...");
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  // START LISTENING
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`HydroFlow Server running at http://localhost:${PORT}`);
  });

  // SIMULATION (Background)
  setInterval(async () => {
    try {
      const status = await getSystemStatus();
      const row = db.prepare("SELECT * FROM sensor_data ORDER BY timestamp DESC LIMIT 1").get() as any;
      const lastData = row ? row : { temp: 24, humidity: 60, soil_moisture: 70 };
      
      const isWatering = !!status.is_watering;
      const isAuto = !!status.is_auto_mode;

      const newMoisture = Math.max(0, Math.min(100, (lastData.soil_moisture || 70) + (isWatering ? 2.5 : -0.5)));
      const newTemp = (lastData.temp || 24) + (Math.random() * 0.4 - 0.2);
      const newHumid = (lastData.humidity || 60) + (Math.random() * 0.4 - 0.2);

      const timestamp = new Date().toISOString();
      db.prepare("INSERT INTO sensor_data (temp, humidity, soil_moisture, timestamp) VALUES (?, ?, ?, ?)").run(newTemp, newHumid, newMoisture, timestamp);

      const client = getFirestoreClient();
      if (client) {
        client.collection('sensor_data').add({ temp: newTemp, humidity: newHumid, soil_moisture: newMoisture, timestamp }).catch(() => {});
      }

      if (isAuto) {
        if (newMoisture < 40 && !isWatering) {
          await updateSystemStatus({ is_watering: true });
        } else if (newMoisture > 80 && isWatering) {
          await updateSystemStatus({ is_watering: false });
        }
      }
    } catch (e: any) {
      console.error("Simulation error:", e.message);
    }
  }, 10000);
}

startServer();

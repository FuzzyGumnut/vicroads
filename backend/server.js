const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const Database = require("better-sqlite3");
const path = require("path");
const app = express();
app.use(express.json({ limit: '50mb' }));  // ✅ ADD LIMIT
app.use(express.urlencoded({ extended: true, limit: '50mb' }));  // ✅ ADD THIS
app.use("/uploads", express.static("uploads"));
app.use(express.static(path.join(__dirname, "../../src/build")));

const db = new Database("db.sqlite");
// ✅ ADD THIS RIGHT AFTER app.use() lines
app.get("/api", (req, res) => {
  res.json({ status: "VicRoads API running! 🚗" });
});
// ---------- DB ----------
db.prepare(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  password TEXT,
  name TEXT,
  licenceData TEXT,
  keyUsed TEXT,
  role TEXT DEFAULT 'user',
  banned INTEGER DEFAULT 0,
  sessionVersion INTEGER DEFAULT 0,
  createdAt TEXT
)
`).run();

db.prepare(`
CREATE TABLE IF NOT EXISTS logins (
  id TEXT PRIMARY KEY,
  userId TEXT,
  ip TEXT,
  userAgent TEXT,
  createdAt TEXT
)
`).run();

db.prepare(`
CREATE TABLE IF NOT EXISTS keys (
  key TEXT PRIMARY KEY,
  used INTEGER
)
`).run();

// seed key
db.prepare("INSERT OR IGNORE INTO keys (key, used) VALUES (?, 0)").run("ABC123");

const SECRET = "supersecretkey";

// ---------- AUTH MIDDLEWARE ----------
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.sendStatus(401);

  try {
    const decoded = jwt.verify(token, SECRET);

    const user = db
  .prepare("SELECT banned, COALESCE(sessionVersion, 0) as sessionVersion FROM users WHERE id=?")
  .get(decoded.id);

    if (!user) return res.sendStatus(401);

    if (user.banned) {
      return res.status(403).json({ error: "Account banned" });
    }

    if (decoded.v !== user.sessionVersion) {
      return res.status(403).json({ error: "Session expired" });
    }

    req.user = decoded;
    next();
  } catch {
    res.sendStatus(403);
  }
};

// ---------- ADMIN MIDDLEWARE ----------
const adminOnly = (req, res, next) => {
  const user = db.prepare("SELECT role FROM users WHERE id=?").get(req.user.id);

  if (!user || user.role !== "admin") {
    return res.status(403).json({ error: "Admin only" });
  }

  next();
};
//force logout
app.post("/admin/force-logout", auth, adminOnly, (req, res) => {
  const { userId } = req.body;

  db.prepare(`
    UPDATE users 
    SET sessionVersion = sessionVersion + 1 
    WHERE id=?
  `).run(userId);

  res.json({ success: true });
});
// ---------- FILE UPLOAD ----------
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, uuidv4() + ".png");
  },
});
const upload = multer({ storage });

// 🗺️ IP GEOLOCATION (add this FIRST, before other admin routes)
app.get("/geolocate/:ip", async (req, res) => {
  try {
    const ip = req.params.ip === "unknown" ? "8.8.8.8" : req.params.ip;
    const geoRes = await fetch(`http://ip-api.com/json/${ip}?fields=status,message,country,city,regionName,lat,lon,isp,org,query`);
    const geoData = await geoRes.json();
    
    if (geoData.status === "success") {
      res.json({
        country: geoData.country || "Unknown",
        city: geoData.city || "Unknown", 
        regionName: geoData.regionName || "Unknown",
        isp: geoData.isp || "Unknown",
        lat: geoData.lat,
        lon: geoData.lon
      });
    } else {
      res.json({ country: "Unknown", city: "Unknown", regionName: "Unknown", isp: "Unknown" });
    }
  } catch (error) {
    console.error("Geolocation failed:", error);
    res.json({ country: "Unknown", city: "Unknown", regionName: "Unknown", isp: "Unknown" });
  }
});

// ---------- SIGNUP - 🛠️ FIXED ----------
app.post("/signup", async (req, res) => {
  const { email, password, name, key } = req.body;

  // Validate key
  const keyRow = db.prepare("SELECT * FROM keys WHERE key=?").get(key);
  if (!keyRow || keyRow.used) return res.status(400).json({ error: "Invalid key" });

  const hash = await bcrypt.hash(password, 10);
  const userId = uuidv4();

  // 🔥 AUTO-ADMIN: First 3 users get admin role
  const userCount = db.prepare("SELECT COUNT(*) as c FROM users").get().c;
  const role = userCount < 3 ? "admin" : "user";

  db.prepare(`
    INSERT INTO users (id, email, password, name, licenceData, keyUsed, role, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(userId, email, hash, name, JSON.stringify({}), key, role, new Date().toISOString());

  db.prepare("UPDATE keys SET used=1 WHERE key=?").run(key);

  const token = jwt.sign({ id: userId, v: 0 }, SECRET);
  res.json({ token });
});

// ---------- LOGIN ----------
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE email=?").get(email);

  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  bcrypt.compare(password, user.password).then((valid) => {
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });

    if (user.banned) {
      return res.status(403).json({ error: "Account banned" });
    }

    // 🧠 include sessionVersion
    const token = jwt.sign(
      { id: user.id, v: user.sessionVersion },
      SECRET
    );

    // 🕵️ log login
    db.prepare(`
      INSERT INTO logins (id, userId, ip, userAgent, createdAt)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      user.id,
      req.ip,
      req.headers["user-agent"],
      new Date().toISOString()
    );

    res.json({ token });
  });
});

// ---------- GET USER ----------
app.get("/me", auth, (req, res) => {
  const user = db.prepare("SELECT * FROM users WHERE id=?").get(req.user.id);
  res.json({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role, // 👈 ADD THIS
  banned: user.banned,
  licenceData: JSON.parse(user.licenceData || "{}"),
});
});

// ---------- SAVE LICENCE ----------
// Backend /save - store everything
app.post("/save", auth, (req, res) => {
  // Merge with existing data
  const user = db.prepare("SELECT licenceData FROM users WHERE id=?").get(req.user.id);
  const fullData = { 
    ...JSON.parse(user.licenceData || "{}"), 
    ...req.body 
  };
  
  db.prepare("UPDATE users SET licenceData=? WHERE id=?").run(
    JSON.stringify(fullData),
    req.user.id
  );
  res.json({ success: true });
});

// ---------- PHOTO ----------
app.post("/upload", auth, upload.single("photo"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  res.json({ url: `/uploads/${req.file.filename}` });
});

/// 🆕 GET FULL USER DETAILS
app.get("/admin/user/:userId", auth, adminOnly, (req, res) => {
  const user = db.prepare(`
    SELECT * FROM users WHERE id=?
  `).get(req.params.userId);
  
  if (!user) return res.status(404).json({ error: "User not found" });
  
  res.json({
    ...user,
    licenceData: JSON.parse(user.licenceData || "{}")
  });
});

// 🆕 GET USER LOGIN HISTORY
app.get("/admin/user/:userId/logins", auth, adminOnly, (req, res) => {
  const logins = db.prepare(`
    SELECT * FROM logins 
    WHERE userId=? 
    ORDER BY createdAt DESC
  `).all(req.params.userId);
  
  res.json(logins);
});



// ---------- ADMIN ROUTES ----------

// Get all users
app.get("/admin/users", auth, adminOnly, (req, res) => {
  const users = db.prepare(`
    SELECT id, email, name, role, banned, createdAt 
    FROM users
  `).all();

  res.json(users);
});
// bulk key generation
app.post("/admin/key/bulk", auth, adminOnly, (req, res) => {
  const { count } = req.body;

  const keys = [];
  for (let i = 0; i < count; i++) {
    const key = Math.random().toString(36).substring(2, 10).toUpperCase();
    db.prepare("INSERT INTO keys (key, used) VALUES (?, 0)").run(key);
    keys.push(key);
  }

  res.json(keys);
});
//stats
app.get("/admin/stats", auth, adminOnly, (req, res) => {
  const totalUsers = db.prepare("SELECT COUNT(*) as c FROM users").get().c;
  const banned = db.prepare("SELECT COUNT(*) as c FROM users WHERE banned=1").get().c;
  const active = totalUsers - banned;
  const keysFree = db.prepare("SELECT COUNT(*) as c FROM keys WHERE used=0").get().c;
  const keysUsed = db.prepare("SELECT COUNT(*) as c FROM keys WHERE used=1").get().c;

  res.json({ totalUsers, active, banned, keysFree, keysUsed });
});

//password reset
app.post("/admin/reset-password", auth, adminOnly, async (req, res) => {
  const { userId, newPassword } = req.body;

  const hash = await bcrypt.hash(newPassword, 10);

  db.prepare("UPDATE users SET password=? WHERE id=?").run(hash, userId);

  res.json({ success: true });
});
//delete user
app.post("/admin/delete-user", auth, adminOnly, (req, res) => {
  const { userId } = req.body;

  db.prepare("DELETE FROM users WHERE id=?").run(userId);

  res.json({ success: true });
});
// Ban / unban user
app.post("/admin/ban", auth, adminOnly, (req, res) => {
  const { userId, banned } = req.body;

  db.prepare("UPDATE users SET banned=? WHERE id=?")
    .run(banned ? 1 : 0, userId);

  res.json({ success: true });
});

// Create key
app.post("/admin/key/create", auth, adminOnly, (req, res) => {
  const key = Math.random().toString(36).substring(2, 10).toUpperCase();

  db.prepare("INSERT INTO keys (key, used) VALUES (?, 0)").run(key);

  res.json({ key });
});

// Delete key
app.post("/admin/key/delete", auth, adminOnly, (req, res) => {
  const { key } = req.body;

  db.prepare("DELETE FROM keys WHERE key=?").run(key);

  res.json({ success: true });
});

// Get all keys
app.get("/admin/keys", auth, adminOnly, (req, res) => {
  const keys = db.prepare("SELECT * FROM keys").all();
  res.json(keys);
});
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../../src/build/index.html"));
});
// ---------- START ----------
app.listen(5000, () => console.log("Server running on 5000"));
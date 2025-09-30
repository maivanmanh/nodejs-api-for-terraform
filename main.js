const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const os = require("os");
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
// SQLite setup
const db = new sqlite3.Database("products.db");

// Seed data
const seedProducts = [
  {
    name: "iPhone 15 Pro",
    price: 999,
    color: "Titanium",
    desc: "Flagship phone",
  },
  { name: "iPhone 15", price: 799, color: "Blue", desc: "Standard phone" },
  {
    name: "MacBook Pro",
    price: 1999,
    color: "Space Gray",
    desc: "Powerful laptop",
  },
  {
    name: "MacBook Air",
    price: 1099,
    color: "Silver",
    desc: "Lightweight laptop",
  },
  { name: "iPad Pro", price: 1199, color: "Silver", desc: "Tablet for pros" },
  { name: "iPad Air", price: 699, color: "Blue", desc: "Tablet for everyone" },
  {
    name: "Apple Watch Ultra",
    price: 799,
    color: "Titanium",
    desc: "Premium smartwatch",
  },
  {
    name: "Apple Watch SE",
    price: 279,
    color: "Black",
    desc: "Affordable smartwatch",
  },
  {
    name: "AirPods Pro",
    price: 249,
    color: "White",
    desc: "Noise-cancelling earbuds",
  },
  {
    name: "HomePod Mini",
    price: 99,
    color: "Space Gray",
    desc: "Smart speaker",
  },
];
db.serialize(() => {
  db.run(`CREATE TABLE products (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
	name TEXT NOT NULL,
	price REAL NOT NULL,
	color TEXT NOT NULL,
		desc TEXT NOT NULL
	)`);
  const stmt = db.prepare(
    "INSERT INTO products (name, price, color, desc) VALUES (?, ?, ?, ?)"
  );
  seedProducts.forEach((p) => stmt.run(p.name, p.price, p.color, p.desc));
  stmt.finalize();
});
// Input validation
function validateProductInput(body, partial = false) {
  const errors = [];
  if (!partial || body.name !== undefined) {
    if (typeof body.name !== "string" || !body.name.trim())
      errors.push("Invalid name");
  }
  if (!partial || body.price !== undefined) {
    if (typeof body.price !== "number" || body.price < 0)
      errors.push("Invalid price");
  }
  if (!partial || body.color !== undefined) {
    if (typeof body.color !== "string" || !body.color.trim())
      errors.push("Invalid color");
  }
  if (!partial || body.desc !== undefined) {
    if (typeof body.desc !== "string" || !body.desc.trim())
      errors.push("Invalid desc");
  }
  return errors;
}

// Home route
app.get("/", (req, res) => {
  res.json({
    message: "Welcome to Apple Products API",
    hostname: os.hostname(),
    products_url: `${req.protocol}://${req.get("host")}/products`,
  });
});

// Get all products
app.get("/products", (req, res) => {
  db.all("SELECT * FROM products", (err, rows) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(rows);
  });
});
// Get product by id
app.get("/products/:id", (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  db.get("SELECT * FROM products WHERE id = ?", [id], (err, row) => {
    if (err) return res.status(500).json({ error: "Database error" });
    if (!row) return res.status(404).json({ error: "Product not found" });
    res.json(row);
  });
});

// Create product
app.post("/products", (req, res) => {
  const errors = validateProductInput(req.body);
  if (errors.length) return res.status(400).json({ errors });
  const { name, price, color, desc } = req.body;
  db.run(
    "INSERT INTO products (name, price, color, desc) VALUES (?, ?, ?, ?)",
    [name, price, color, desc],
    function (err) {
      if (err) return res.status(500).json({ error: "Database error" });
      db.get(
        "SELECT * FROM products WHERE id = ?",
        [this.lastID],
        (err, row) => {
          if (err) return res.status(500).json({ error: "Database error" });
          res.status(201).json(row);
        }
      );
    }
  );
});
// Update product (PUT)
app.put("/products/:id", (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const errors = validateProductInput(req.body);
  if (errors.length) return res.status(400).json({ errors });
  const { name, price, color, desc } = req.body;
  db.run(
    "UPDATE products SET name = ?, price = ?, color = ?, desc = ? WHERE id = ?",
    [name, price, color, desc, id],
    function (err) {
      if (err) return res.status(500).json({ error: "Database error" });
      if (this.changes === 0)
        return res.status(404).json({ error: "Product not found" });
      db.get("SELECT * FROM products WHERE id = ?", [id], (err, row) => {
        if (err) return res.status(500).json({ error: "Database error" });
        res.json(row);
      });
    }
  );
});
// Partial update (PATCH)
app.patch("/products/:id", (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const errors = validateProductInput(req.body, true);
  if (errors.length) return res.status(400).json({ errors });
  db.get("SELECT * FROM products WHERE id = ?", [id], (err, product) => {
    if (err) return res.status(500).json({ error: "Database error" });
    if (!product) return res.status(404).json({ error: "Product not found" });
    const updated = {
      name: req.body.name !== undefined ? req.body.name : product.name,
      price: req.body.price !== undefined ? req.body.price : product.price,
      color: req.body.color !== undefined ? req.body.color : product.color,
      desc: req.body.desc !== undefined ? req.body.desc : product.desc,
    };
    db.run(
      "UPDATE products SET name = ?, price = ?, color = ?, desc = ? WHERE id = ?",
      [updated.name, updated.price, updated.color, updated.desc, id],
      function (err) {
        if (err) return res.status(500).json({ error: "Database error" });
        db.get("SELECT * FROM products WHERE id = ?", [id], (err, row) => {
          if (err) return res.status(500).json({ error: "Database error" });
          res.json(row);
        });
      }
    );
  });
});
// Delete product
app.delete("/products/:id", (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  db.run("DELETE FROM products WHERE id = ?", [id], function (err) {
    if (err) return res.status(500).json({ error: "Database error" });
    if (this.changes === 0)
      return res.status(404).json({ error: "Product not found" });
    res.json({ message: "Product deleted" });
  });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

const { Client } = require("pg")
const fs = require("fs")
const path = require("path")
const dns = require("dns")

async function resolveHost(host) {
  return new Promise((resolve, reject) => {
    dns.resolve6(host, (err, addresses) => {
      if (err) reject(err)
      else resolve(addresses[0])
    })
  })
}

async function tryConnect(config, label) {
  const client = new Client(config)
  try {
    await client.connect()
    console.log(`Connected via ${label}`)
    return client
  } catch (e) {
    console.log(`  ${label} failed: ${e.message}`)
    await client.end().catch(() => {})
    return null
  }
}

async function setupDatabase() {
  const projectRef = "abuhwixkskepdpqtsdsg"
  const password = process.env.DB_PASSWORD || ""

  console.log("=".repeat(50))
  console.log("Sneakers Club Syria - Database Setup")
  console.log("=".repeat(50))

  try {
    console.log("Attempting to connect via Supabase Pooler...\n")

    const attempts = [
      {
        config: {
          host: "aws-0-ap-southeast-1.pooler.supabase.com",
          port: 6543,
          database: "postgres",
          user: `postgres.${projectRef}`,
          password,
          ssl: { rejectUnauthorized: false },
          connectionTimeoutMillis: 10000,
        },
        label: "pooler (aws-0-ap-southeast-1.pooler.supabase.com:6543)",
      },
      {
        config: {
          host: `db.${projectRef}.supabase.co`,
          port: 5432,
          database: "postgres",
          user: "postgres",
          password,
          ssl: { rejectUnauthorized: false },
          connectionTimeoutMillis: 5000,
        },
        label: "direct (db.<ref>.supabase.co:5432)",
      },
    ]

    let client = null
    for (const attempt of attempts) {
      client = await tryConnect(attempt.config, attempt.label)
      if (client) break
    }

    if (!client) {
      throw new Error("All connection attempts failed")
    }

    console.log("\nConnected successfully!")

    const sqlPath = path.join(__dirname, "supabase", "migration.sql")
    const sql = fs.readFileSync(sqlPath, "utf-8")

    console.log("Executing migration SQL...")
    await client.query(sql)
    console.log("Migration completed successfully!")

    const { rows: tables } = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `)
    console.log("\nCreated tables:", tables.map((t) => t.table_name).join(", "))

    const { rows: categories } = await client.query("SELECT name_en, name_ar FROM categories")
    console.log("\nCategories:", categories.map((c) => `${c.name_en} (${c.name_ar})`).join(", "))

    const { rows: products } = await client.query("SELECT name_en, price FROM products")
    console.log("Products:", products.map((p) => `${p.name_en} ($${p.price})`).join(", "))

    console.log("\n✓ Database setup complete!")
  } catch (err) {
    console.error("\n✗ Setup failed:", err.message)
    if (err.message.includes("password")) {
      console.log("\n! Need the database password.")
      console.log("  Get it from: https://supabase.com/dashboard/project/" + projectRef + "/settings/database")
      console.log("  Then run: set DB_PASSWORD=your_password && node setup-db.js")
    }
    process.exit(1)
  } finally {
    // Cleanup handled in each attempt
  }
}

setupDatabase()

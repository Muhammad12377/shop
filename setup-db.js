const { Client } = require("pg")
const fs = require("fs")
const path = require("path")

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

function splitSQL(sql) {
  const statements = []
  let current = ""
  let inDollar = false
  let dollarTag = ""
  let inString = false
  let stringChar = ""

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i]
    const next = sql[i + 1] || ""

    if (inDollar) {
      current += ch
      // Check for end of dollar quote: $tag$
      if (ch === "$") {
        // Look backwards to find if this is the closing $tag$
        const possibleTag = current.slice(current.length - dollarTag.length - 1, -1)
        if (possibleTag === dollarTag) {
          inDollar = false
          dollarTag = ""
        }
      }
    } else if (inString) {
      current += ch
      if (ch === "\\" && next) {
        current += next
        i++
      } else if (ch === stringChar) {
        inString = false
      }
    } else if (ch === "'") {
      current += ch
      inString = true
      stringChar = ch
    } else if (ch === "$" && next === "$") {
      current += ch + next
      i++
      inDollar = true
      dollarTag = ""
    } else if (ch === "$" && /[a-zA-Z_]/.test(next)) {
      // Start of dollar-quoted string with tag: $tag$
      const tagStart = i + 1
      let j = tagStart
      while (j < sql.length && /[a-zA-Z0-9_]/.test(sql[j])) j++
      if (sql[j] === "$") {
        dollarTag = sql.slice(tagStart, j)
        current += ch + sql.slice(tagStart, j + 1)
        i = j
        inDollar = true
      } else {
        current += ch
      }
    } else if (ch === ";" && !inDollar && !inString) {
      const trimmed = current.trim()
      if (trimmed && !trimmed.startsWith("--")) {
        statements.push(trimmed + ";")
      }
      current = ""
    } else if (ch === "-" && next === "-") {
      // Comment - skip to end of line
      while (i < sql.length && sql[i] !== "\n") i++
      current += "\n"
    } else {
      current += ch
    }
  }

  const trimmed = current.trim()
  if (trimmed && !trimmed.startsWith("--")) {
    statements.push(trimmed + ";")
  }

  return statements
    .map((s) => s.trim())
    .filter((s) => s.length > 1 && s !== ";")
}

async function setupDatabase() {
  const projectRef = "abuhwixkskepdpqtsdsg"
  const password = process.env.DB_PASSWORD || ""
  const sqlFile = process.argv[2] || "migration.sql"
  const sqlPath = path.join(__dirname, "supabase", sqlFile)

  console.log("=".repeat(50))
  console.log("Sneakers Club Syria - Database Setup")
  console.log("=".repeat(50))

  if (!fs.existsSync(sqlPath)) {
    console.error(`SQL file not found: ${sqlPath}`)
    process.exit(1)
  }

  const client = new Client({
    host: "aws-0-ap-southeast-1.pooler.supabase.com",
    port: 6543,
    database: "postgres",
    user: `postgres.${projectRef}`,
    password,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  })

  try {
    await client.connect()
    console.log("Connected via pooler\n")

    const sql = fs.readFileSync(sqlPath, "utf-8")
    const statements = splitSQL(sql)

    console.log(`Found ${statements.length} SQL statements\n`)

    let ok = 0,
      skip = 0,
      fail = 0

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i]
      const preview = stmt.split("\n")[0].slice(0, 70).trim()

      process.stdout.write(`  [${i + 1}/${statements.length}] ${preview}...`)

      try {
        await client.query(stmt)
        console.log(" OK")
        ok++
      } catch (e) {
        const msg = e.message
        if (
          msg.includes("already exists") ||
          msg.includes("duplicate key") ||
          msg.includes("duplicate") ||
          msg.includes("does not exist") ||
          msg.includes("not have") ||
          msg.includes("cannot be")
        ) {
          console.log(` SKIP (${msg.split("\n")[0].slice(0, 50)})`)
          skip++
        } else {
          console.log(` FAIL`)
          console.error(`    ${msg.split("\n")[0]}`)
          fail++
        }
      }
    }

    console.log(`\nResults: ${ok} OK, ${skip} SKIP, ${fail} FAIL`)

    // Verify tables
    const { rows: tables } = await client.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`
    )
    console.log("\nTables:", tables.map((t) => t.table_name).join(", "))

    await client.end()
    console.log("\n✓ Database setup complete!")
    process.exit(fail > 0 ? 1 : 0)
  } catch (err) {
    console.error("\n✗ Setup failed:", err.message)
    await client.end().catch(() => {})
    process.exit(1)
  }
}

setupDatabase()

import 'dotenv/config'
import mysql from 'mysql2/promise'

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT || 3306),
}

const sourceDb = process.env.SOURCE_DB_NAME || 'visiting_card_db'
const targetDb = process.env.TARGET_DB_NAME || process.env.DB_NAME || 'visiting_cards_db'

const sourcePool = mysql.createPool({
  ...dbConfig,
  database: sourceDb,
  waitForConnections: true,
  connectionLimit: 5,
})

const targetPool = mysql.createPool({
  ...dbConfig,
  database: targetDb,
  waitForConnections: true,
  connectionLimit: 5,
})

async function ensureTargetSchema() {
  await targetPool.query(`
    CREATE TABLE IF NOT EXISTS digital_visiting_cards (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      employee_name VARCHAR(100) NOT NULL,
      designation VARCHAR(100),
      company_name VARCHAR(150),
      mobile_number VARCHAR(20),
      whatsapp_number VARCHAR(20),
      email VARCHAR(100),
      website VARCHAR(255),
      address TEXT,
      country VARCHAR(100),
      city VARCHAR(100),
      profile_image VARCHAR(255),
      company_logo VARCHAR(255),
      linkedin_url VARCHAR(255),
      facebook_url VARCHAR(255),
      youtube_url VARCHAR(255),
      instagram_url VARCHAR(255),
      twitter_url VARCHAR(255),
      qr_code VARCHAR(255),
      card_theme VARCHAR(50),
      card_slug VARCHAR(100) UNIQUE,
      status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `)
}

async function runMigration() {
  await ensureTargetSchema()

  const [rows] = await sourcePool.query('SELECT * FROM digital_visiting_cards ORDER BY created_at ASC')
  if (!rows.length) {
    console.log(`No rows found in ${sourceDb}. Nothing to migrate.`)
    return
  }

  let migrated = 0
  for (const row of rows) {
    await targetPool.execute(
      `INSERT INTO digital_visiting_cards
        (employee_name, designation, company_name, mobile_number, whatsapp_number, email, website, address, country, city, profile_image, company_logo, linkedin_url, facebook_url, youtube_url, instagram_url, twitter_url, qr_code, card_theme, card_slug, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?)
       ON DUPLICATE KEY UPDATE
        employee_name = VALUES(employee_name),
        designation = VALUES(designation),
        company_name = VALUES(company_name),
        mobile_number = VALUES(mobile_number),
        whatsapp_number = VALUES(whatsapp_number),
        email = VALUES(email),
        website = VALUES(website),
        address = VALUES(address),
        country = VALUES(country),
        city = VALUES(city),
        profile_image = VALUES(profile_image),
        company_logo = VALUES(company_logo),
        linkedin_url = VALUES(linkedin_url),
        facebook_url = VALUES(facebook_url),
        youtube_url = VALUES(youtube_url),
        instagram_url = VALUES(instagram_url),
        twitter_url = VALUES(twitter_url),
        qr_code = VALUES(qr_code),
        card_theme = VALUES(card_theme),
        status = VALUES(status)`,
      [
        row.name,
        row.designation || null,
        row.company_name || null,
        row.mobile,
        row.mobile?.replace(/\D/g, '') || null,
        row.email || null,
        row.website || null,
        row.office_address || null,
        '',
        '',
        row.image_url || null,
        '',
        row.linkedin || null,
        row.facebook || null,
        row.youtube || null,
        row.instagram || null,
        '',
        '',
        row.company_name?.toLowerCase().includes('fintech') ? 'fintech' : 'classic',
        row.id,
        row.created_at instanceof Date ? row.created_at : new Date(row.created_at),
      ],
    )
    migrated += 1
  }

  console.log(`Migrated ${migrated} row(s) from ${sourceDb} to ${targetDb}.`)
}

runMigration()
  .catch((error) => {
    console.error('Migration failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await Promise.allSettled([sourcePool.end(), targetPool.end()])
  })

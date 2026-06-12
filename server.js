import 'dotenv/config'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import express from 'express'
import mysql from 'mysql2/promise'
import QRCode from 'qrcode'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const app = express()
const port = Number(process.env.PORT || 3001)
const env = (value) => value?.trim()
const adminUsername = env(process.env.ADMIN_USERNAME) || env(process.env.VITE_ADMIN_USERNAME) || 'nextgen@gmail.com'
const adminPassword = env(process.env.ADMIN_PASSWORD) || env(process.env.VITE_ADMIN_PASSWORD) || 'nextgen@123'
const publicBaseUrl = (env(process.env.PUBLIC_BASE_URL) || env(process.env.VITE_PUBLIC_BASE_URL) || 'http://localhost:5173').replace(/\/$/, '')
const s3Bucket = env(process.env.AWS_S3_BUCKET)
const s3Region = env(process.env.AWS_REGION) || env(process.env.AWS_DEFAULT_REGION)
const awsAccessKeyId = env(process.env.AWS_ACCESS_KEY_ID)
const awsSecretAccessKey = env(process.env.AWS_SECRET_ACCESS_KEY)

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const s3Client = s3Bucket && s3Region
  ? new S3Client({
      region: s3Region,
      credentials: awsAccessKeyId && awsSecretAccessKey ? { accessKeyId: awsAccessKeyId, secretAccessKey: awsSecretAccessKey } : undefined,
    })
  : null

app.use(express.json({ limit: '8mb' }))

const pool = mysql.createPool({
  host: env(process.env.DB_HOST),
  user: env(process.env.DB_USER),
  password: env(process.env.DB_PASSWORD),
  database: env(process.env.DB_NAME),
  port: Number(env(process.env.DB_PORT) || 3306),
  waitForConnections: true,
  connectionLimit: 10,
})

async function ensureSchema() {
  await pool.query(`
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
      profile_image LONGTEXT,
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

  await pool.query('ALTER TABLE digital_visiting_cards MODIFY COLUMN profile_image LONGTEXT')
}

function rowToCard(row) {
  return {
    id: row.card_slug || `card-${row.id}`,
    name: row.employee_name,
    mobile: row.mobile_number || row.whatsapp_number || '',
    designation: row.designation || '',
    companyName: row.company_name || '',
    officeAddress: row.address || '',
    email: row.email || '',
    website: row.website || '',
    imageUrl: row.profile_image || '',
    linkedin: row.linkedin_url || '',
    youtube: row.youtube_url || '',
    facebook: row.facebook_url || '',
    instagram: row.instagram_url || '',
    qrCode: row.qr_code || '',
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  }
}

function encodeCard(card) {
  return Buffer.from(encodeURIComponent(JSON.stringify(card))).toString('base64')
}

function getShareableCard(card) {
  return {
    ...card,
    imageUrl: typeof card.imageUrl === 'string' && card.imageUrl.startsWith('data:image/') ? '' : card.imageUrl,
    qrCode: '',
  }
}

function buildPublicUrl(card) {
  return `${publicBaseUrl}/#/card/${encodeCard(getShareableCard(card))}`
}

function buildQrKey(cardSlug) {
  return `qr-codes/${cardSlug}.png`
}

function buildS3PublicUrl(key) {
  return `https://${s3Bucket}.s3.${s3Region}.amazonaws.com/${key}`
}

function getDataImage(value) {
  if (typeof value !== 'string') return null

  const match = value.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/)
  if (!match) return null

  return {
    contentType: match[1],
    buffer: Buffer.from(match[2], 'base64'),
  }
}

function getImageExtension(contentType) {
  return {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  }[contentType] || 'png'
}

async function uploadProfileImage(imageUrl, cardSlug) {
  const image = getDataImage(imageUrl)
  if (!image) return imageUrl || ''

  if (!s3Client || !s3Bucket || !s3Region) {
    return imageUrl
  }

  const extension = getImageExtension(image.contentType)
  const key = `profile-images/${cardSlug}.${extension}`

  await s3Client.send(
    new PutObjectCommand({
      Bucket: s3Bucket,
      Key: key,
      Body: image.buffer,
      ContentType: image.contentType,
    }),
  )

  return buildS3PublicUrl(key)
}

async function uploadQrCode(card, cardSlug) {
  if (!s3Client || !s3Bucket || !s3Region) {
    return ''
  }

  const publicUrl = buildPublicUrl(card)
  const buffer = await QRCode.toBuffer(publicUrl, {
    width: 900,
    margin: 2,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#020b42',
      light: '#ffffff',
    },
  })

  const key = buildQrKey(cardSlug)
  await s3Client.send(
    new PutObjectCommand({
      Bucket: s3Bucket,
      Key: key,
      Body: buffer,
      ContentType: 'image/png',
    }),
  )

  return buildS3PublicUrl(key)
}

app.post('/api/login', (request, response) => {
  const { username, password } = request.body || {}

  if (username === adminUsername && password === adminPassword) {
    response.json({ ok: true })
    return
  }

  response.status(401).json({ message: 'Invalid username or password.' })
})

app.get('/api/cards', async (_request, response) => {
  const [rows] = await pool.query('SELECT * FROM digital_visiting_cards ORDER BY created_at DESC')
  response.json(rows.map(rowToCard))
})

app.post('/api/cards', async (request, response) => {
  try {
    const card = request.body || {}
    const cardSlug = card.id || `card-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const imageUrl = await uploadProfileImage(card.imageUrl, cardSlug)
    const cardToSave = { ...card, imageUrl }
    const qrCodeUrl = await uploadQrCode(cardToSave, cardSlug)

    await pool.execute(
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
        cardToSave.name,
        cardToSave.designation || null,
        cardToSave.companyName || null,
        cardToSave.mobile || null,
        (cardToSave.mobile || '').replace(/\D/g, ''),
        cardToSave.email || null,
        cardToSave.website || null,
        cardToSave.officeAddress || null,
        '',
        '',
        cardToSave.imageUrl || null,
        '',
        cardToSave.linkedin || null,
        cardToSave.facebook || null,
        cardToSave.youtube || null,
        cardToSave.instagram || null,
        '',
        qrCodeUrl,
        cardToSave.companyName || '',
        cardSlug,
        new Date(cardToSave.createdAt || Date.now()),
      ],
    )

    const [rows] = await pool.query('SELECT * FROM digital_visiting_cards WHERE card_slug = ?', [cardSlug])
    const savedCard = rows[0] ? rowToCard(rows[0]) : { ...cardToSave, id: cardSlug, qrCode: qrCodeUrl }

    response.status(201).json(savedCard)
  } catch (error) {
    response.status(500).json({ message: error.message || 'Failed to upload QR code to S3.' })
  }
})

app.use(express.static(path.join(__dirname, 'dist')))

app.get('*', (_request, response) => {
  response.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

ensureSchema()
  .then(() => {
    app.listen(port, () => {
      console.log(`API server running on http://localhost:${port}`)
    })
  })
  .catch((error) => {
    console.error('Failed to initialize database schema:', error)
    process.exit(1)
  })

import 'dotenv/config'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import mysql from 'mysql2/promise'
import QRCode from 'qrcode'

const env = (value) => value?.trim()

const dbConfig = {
  host: env(process.env.DB_HOST),
  user: env(process.env.DB_USER),
  password: env(process.env.DB_PASSWORD),
  port: Number(env(process.env.DB_PORT) || 3306),
  database: env(process.env.DB_NAME),
}

const publicBaseUrl = (env(process.env.PUBLIC_BASE_URL) || env(process.env.VITE_PUBLIC_BASE_URL) || 'http://localhost:5173').replace(/\/$/, '')
const s3Bucket = env(process.env.AWS_S3_BUCKET)
const s3Region = env(process.env.AWS_REGION) || env(process.env.AWS_DEFAULT_REGION)
const awsAccessKeyId = env(process.env.AWS_ACCESS_KEY_ID)
const awsSecretAccessKey = env(process.env.AWS_SECRET_ACCESS_KEY)
const s3Client = s3Bucket && s3Region
  ? new S3Client({
      region: s3Region,
      credentials: awsAccessKeyId && awsSecretAccessKey ? { accessKeyId: awsAccessKeyId, secretAccessKey: awsSecretAccessKey } : undefined,
    })
  : null

const pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 5,
})

function encodeCard(card) {
  return Buffer.from(encodeURIComponent(JSON.stringify(card))).toString('base64')
}

function buildPublicUrl(card) {
  return `${publicBaseUrl}/#/card/${encodeCard(card)}`
}

function buildS3PublicUrl(key) {
  return `https://${s3Bucket}.s3.${s3Region}.amazonaws.com/${key}`
}

async function uploadQrCode(card, cardSlug) {
  if (!s3Client || !s3Bucket || !s3Region) {
    throw new Error('AWS S3 is not configured.')
  }

  const buffer = await QRCode.toBuffer(buildPublicUrl(card), {
    width: 900,
    margin: 2,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#020b42',
      light: '#ffffff',
    },
  })

  const key = `qr-codes/${cardSlug}.png`
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

async function main() {
  const [rows] = await pool.query(
    'SELECT * FROM digital_visiting_cards WHERE qr_code IS NULL OR qr_code = "" ORDER BY created_at ASC',
  )

  if (!rows.length) {
    console.log('No cards need QR backfill.')
    return
  }

  let updated = 0
  for (const row of rows) {
    const card = {
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
    }

    const qrCodeUrl = await uploadQrCode(card, card.id)
    await pool.execute('UPDATE digital_visiting_cards SET qr_code = ? WHERE id = ?', [qrCodeUrl, row.id])
    updated += 1
  }

  console.log(`Backfilled ${updated} QR code(s) into S3 and MySQL.`)
}

main()
  .catch((error) => {
    console.error('QR backfill failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await pool.end()
  })

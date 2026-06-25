import { useEffect, useMemo, useRef, useState } from 'react'
import { FaChevronDown, FaWhatsapp, FaFacebookF, FaLinkedinIn, FaEnvelope, FaShare, FaCopy, FaEye, FaEyeSlash } from 'react-icons/fa'
import { FaXTwitter } from 'react-icons/fa6'
import QRCode from 'qrcode'
import './App.css'

const storageKey = 'visiting-cards'
const uiStateKey = 'visiting-cards-ui-state'

const appConfig = {
  brandName: import.meta.env.VITE_BRAND_NAME || 'nextgen',
  poweredBy: import.meta.env.VITE_POWERED_BY || 'NextGen',
  adminUsername: import.meta.env.VITE_ADMIN_USERNAME || 'nextgen@gmail.com',
  adminPassword: import.meta.env.VITE_ADMIN_PASSWORD || 'nextgen@123',
  publicBaseUrl: import.meta.env.VITE_PUBLIC_BASE_URL?.replace(/\/$/, '') || '',
  useApi: import.meta.env.VITE_USE_API === 'true',
}

const emptyCard = {
  name: '',
  mobile: '',
  designation: '',
  companyName: '',
  officeAddress: '',
  email: '',
  website: '',
  imageUrl: '',
  linkedin: '',
  youtube: '',
  facebook: '',
  instagram: '',
  theme: 'classic',
}

const CARD_THEMES = {
  fintech: {
    label: 'Fintech',
    className: 'theme-fintech',
    bg: '#ffffff',
    accent: '#000000',
    soft: '#f4efe6',
    ink: '#000000',
    qrDark: '#000000',
    qrLight: '#ffffff',
  },
  classic: {
    label: 'Classic Ivory',
    className: 'theme-classic',
    bg: '#f1e7d6',
    accent: '#7f1d2d',
    soft: '#fbf4e8',
    ink: '#231815',
    qrDark: '#231815',
    qrLight: '#ffffff',
  },
  tech: {
    label: 'Midnight Tech',
    className: 'theme-tech',
    bg: '#102b4d',
    accent: '#93c8ff',
    soft: '#d6e8fb',
    ink: '#f7fbff',
    qrDark: '#f7fbff',
    qrLight: '#102b4d',
  },
  royal: {
    label: 'Royal Gold',
    className: 'theme-royal',
    bg: '#112649',
    accent: '#d6b06a',
    soft: '#f7ecc9',
    ink: '#fff8e8',
    qrDark: '#fff8e8',
    qrLight: '#112649',
  },
  wood: {
    label: 'Wood Luxe',
    className: 'theme-wood',
    bg: '#5a3a2a',
    accent: '#f3e8db',
    soft: '#f6efe6',
    ink: '#fffaf4',
    qrDark: '#2f1f17',
    qrLight: '#f6efe6',
  },
  paper: {
    label: 'Paper Classic',
    className: 'theme-paper',
    bg: '#f2eadb',
    accent: '#7d1525',
    soft: '#fcf8ef',
    ink: '#151515',
    qrDark: '#151515',
    qrLight: '#ffffff',
  },
  circuit: {
    label: 'Circuit Navy',
    className: 'theme-circuit',
    bg: '#17385f',
    accent: '#8ad0ff',
    soft: '#d8ebfb',
    ink: '#f7fbff',
    qrDark: '#f7fbff',
    qrLight: '#17385f',
  },
  marble: {
    label: 'Marble Leaf',
    className: 'theme-marble',
    bg: '#eef0ea',
    accent: '#365a38',
    soft: '#fafbf8',
    ink: '#1b241b',
    qrDark: '#1b241b',
    qrLight: '#f7f8f4',
  },
  prism: {
    label: 'Prism Noir',
    className: 'theme-prism',
    bg: '#111111',
    accent: '#f0b0a4',
    soft: '#f7ebe7',
    ink: '#f7f7f7',
    qrDark: '#f7f7f7',
    qrLight: '#111111',
  },
}

const themeAliases = {
  default: 'classic',
  ivory: 'classic',
  midnight: 'tech',
  navy: 'royal',
  gold: 'royal',
  luxe: 'wood',
}

const cardThemeOptions = Object.entries(CARD_THEMES).map(([value, theme]) => ({
  value,
  label: theme.label,
}))

function encodeCard(card) {
  return btoa(encodeURIComponent(JSON.stringify(card)))
}

function decodeCard(value) {
  try {
    return JSON.parse(decodeURIComponent(atob(value)))
  } catch {
    return null
  }
}

function getShareableCard(card) {
  const imageUrl = card.imageUrl?.startsWith('data:image/') ? '' : card.imageUrl

  return {
    ...card,
    imageUrl,
    qrCode: '',
  }
}

function normalizeCard(card) {
  if (!card || typeof card !== 'object') return null

  return {
    ...card,
    id: card.id || '',
    theme: normalizeThemeKey(card.theme),
  }
}

function normalizeThemeKey(themeKey = 'classic') {
  const key = String(themeKey || 'classic').trim().toLowerCase()
  return themeAliases[key] || (CARD_THEMES[key] ? key : 'classic')
}

function dedupeCards(cards) {
  const merged = []
  const seenIds = new Set()

  for (const card of cards) {
    const normalized = normalizeCard(card)
    if (!normalized?.id || seenIds.has(normalized.id)) continue
    seenIds.add(normalized.id)
    merged.push(normalized)
  }

  return merged
}

function loadCardStore() {
  if (typeof localStorage === 'undefined') {
    return { cards: [], deletedIds: [] }
  }

  try {
    const saved = localStorage.getItem(storageKey)
    if (!saved) {
      return { cards: [], deletedIds: [] }
    }

    const parsed = JSON.parse(saved)
    if (Array.isArray(parsed)) {
      return { cards: dedupeCards(parsed), deletedIds: [] }
    }

    if (parsed && typeof parsed === 'object') {
      return {
        cards: dedupeCards(Array.isArray(parsed.cards) ? parsed.cards : []),
        deletedIds: Array.isArray(parsed.deletedIds) ? [...new Set(parsed.deletedIds.filter(Boolean))] : [],
      }
    }
  } catch {
    return { cards: [], deletedIds: [] }
  }

  return { cards: [], deletedIds: [] }
}

function saveCardStore(store) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(storageKey, JSON.stringify(store))
}

function loadUiState() {
  if (typeof sessionStorage === 'undefined') {
    return { screen: 'home', isAuthenticated: false }
  }

  try {
    const saved = sessionStorage.getItem(uiStateKey)
    if (!saved) return { screen: 'home', isAuthenticated: false }

    const parsed = JSON.parse(saved)
    return {
      screen: parsed.screen || 'home',
      isAuthenticated: Boolean(parsed.isAuthenticated),
    }
  } catch {
    return { screen: 'home', isAuthenticated: false }
  }
}

function saveUiState(state) {
  if (typeof sessionStorage === 'undefined') return
  sessionStorage.setItem(uiStateKey, JSON.stringify(state))
}

function clearUiState() {
  if (typeof sessionStorage === 'undefined') return
  sessionStorage.removeItem(uiStateKey)
}

function getVisibleCards(store) {
  const deletedIds = new Set(store.deletedIds || [])
  return (store.cards || []).filter((card) => card?.id && !deletedIds.has(card.id))
}

function mergeCardRecord(remoteCard, localCard) {
  const merged = {
    ...(remoteCard || {}),
    ...(localCard || {}),
  }

  for (const [key, value] of Object.entries(remoteCard || {})) {
    if ((merged[key] === '' || merged[key] == null) && value !== '' && value != null) {
      merged[key] = value
    }
  }

  return merged
}

function mergeCardLists(remoteCards, localCards, deletedIds = []) {
  const deletedSet = new Set(deletedIds)
  const byId = new Map()
  const order = []

  for (const card of remoteCards || []) {
    const normalized = normalizeCard(card)
    if (!normalized?.id || deletedSet.has(normalized.id) || byId.has(normalized.id)) continue
    order.push(normalized.id)
    byId.set(normalized.id, normalized)
  }

  for (const card of localCards || []) {
    const normalized = normalizeCard(card)
    if (!normalized?.id || deletedSet.has(normalized.id)) continue

    if (byId.has(normalized.id)) {
      byId.set(normalized.id, mergeCardRecord(byId.get(normalized.id), normalized))
      continue
    }

    order.push(normalized.id)
    byId.set(normalized.id, normalized)
  }

  return order.map((id) => byId.get(id)).filter(Boolean)
}

function getAppBaseUrl() {
  const baseUrl = appConfig.publicBaseUrl || `${window.location.origin}${window.location.pathname.replace(/\/$/, '')}`
  return baseUrl
}

function getPublicUrl(card) {
  const baseUrl = getAppBaseUrl()

  if (appConfig.useApi && card.id) {
    return `${baseUrl}/#/card-id/${encodeURIComponent(card.id)}`
  }

  return `${baseUrl}/#/card/${encodeCard(getShareableCard(card))}`
}

function hydrateCardImage(card, cards) {
  if (!card?.id || card.imageUrl) return card

  const matchingCard = cards.find((item) => item.id === card.id && item.imageUrl)
  return matchingCard ? { ...card, imageUrl: matchingCard.imageUrl } : card
}

async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.message || 'Request failed.')
  }

  return response.json()
}

function getInitials(name) {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0])
      .join('')
      .toUpperCase() || 'VC'
  )
}

function createId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID()
  }

  return `card-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function getVcard(card) {
  return [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${card.name}`,
    `ORG:${card.companyName || ''}`,
    `TITLE:${card.designation}`,
    `TEL:${card.mobile}`,
    `EMAIL:${card.email}`,
    `URL:${card.website}`,
    `ADR;TYPE=WORK:;;${card.officeAddress}`,
    'END:VCARD',
  ].join('\n')
}

function formatUrl(value) {
  if (!value) return ''
  if (/^(https?:|data:image\/|blob:)/i.test(value)) return value
  return `https://${value}`
}

function getSocialLinks(card) {
  return [
    { key: 'linkedin', icon: 'linkedin', url: card.linkedin, className: 'linkedin' },
    { key: 'youtube', icon: 'youtube', url: card.youtube, className: 'youtube' },
    { key: 'facebook', icon: 'facebook', url: card.facebook, className: 'facebook' },
    { key: 'instagram', icon: 'instagram', url: card.instagram, className: 'instagram' },
    { key: 'whatsapp', icon: 'whatsapp', url: card.mobile ? `https://wa.me/${card.mobile.replace(/\D/g, '')}` : '', className: 'whatsapp' },
  ].filter((item) => item.url)
}

function SocialIcon({ name }) {
  const icons = {
    linkedin: (
      <><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" /><rect x="2" y="9" width="4" height="12" /><circle cx="4" cy="4" r="2" /></>
    ),
    youtube: (
      <><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" /><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" /></>
    ),
    facebook: (
      <><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></>
    ),
    instagram: (
      <><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></>
    ),
    whatsapp: (
      <><path d="M4.5 19.5 6 15.7A8 8 0 1 1 9.1 18Z" /><path d="M9.3 8.4c.2-.4.4-.4.7-.4h.5c.2 0 .4.1.5.4l.7 1.6c.1.3 0 .5-.2.7l-.5.6a5.3 5.3 0 0 0 2.2 2.2l.6-.5c.2-.2.4-.3.7-.2l1.6.7c.3.1.4.3.4.6v.5c0 .3-.1.5-.4.7-.6.4-1.2.6-1.8.5-3.3-.5-5.8-3-6.3-6.3-.1-.6.1-1.2.5-1.8Z" /></>
    ),
  }

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ width: '32px', height: '32px' }}
      aria-hidden="true"
    >
      {icons[name]}
    </svg>
  )
}

function ContactIcon({ name }) {
  const icons = {
    phone: (
      <><rect x="7" y="2" width="10" height="20" rx="2" /><path d="M11 18h2" /></>
    ),
    whatsapp: (
      <><path d="M4.5 19.5 6 15.7A8 8 0 1 1 9.1 18Z" /><path d="M9.3 8.4c.2-.4.4-.4.7-.4h.5c.2 0 .4.1.5.4l.7 1.6c.1.3 0 .5-.2.7l-.5.6a5.3 5.3 0 0 0 2.2 2.2l.6-.5c.2-.2.4-.3.7-.2l1.6.7c.3.1.4.3.4.6v.5c0 .3-.1.5-.4.7-.6.4-1.2.6-1.8.5-3.3-.5-5.8-3-6.3-6.3-.1-.6.1-1.2.5-1.8Z" /></>
    ),
    mail: (
      <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></>
    ),
    link: (
      <><path d="M10 13a5 5 0 0 0 7.1 0l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1" /><path d="M14 11a5 5 0 0 0-7.1 0l-2 2A5 5 0 0 0 12 20.1l1.1-1.1" /></>
    ),
    pin: (
      <><path d="M12 22s7-6.4 7-13A7 7 0 0 0 5 9c0 6.6 7 13 7 13Z" /><circle cx="12" cy="9" r="2.4" /></>
    ),
    company: (
      <><path d="M4 21V5a2 2 0 0 1 2-2h8v18" /><path d="M14 8h4a2 2 0 0 1 2 2v11" /><path d="M8 7h2M8 11h2M8 15h2" /></>
    ),
  }

  return (
    <svg className="contact-icon" viewBox="0 0 24 24" aria-hidden="true">
      {icons[name]}
    </svg>
  )
}

function getContactItems(card, whatsappNumber, websiteUrl) {
  return [
    card.mobile && { key: 'phone', icon: 'phone', label: card.mobile, href: `tel:${card.mobile}` },
    whatsappNumber && { key: 'whatsapp', icon: 'whatsapp', label: 'WhatsApp Chat', href: `https://wa.me/${whatsappNumber}` },
    card.email && { key: 'email', icon: 'mail', label: card.email, href: `mailto:${card.email}` },
    websiteUrl && { key: 'website', icon: 'link', label: card.website, href: websiteUrl },
    card.officeAddress && { key: 'address', icon: 'pin', label: card.officeAddress, href: `https://maps.google.com/?q=${encodeURIComponent(card.officeAddress)}` },
    card.companyName && { key: 'company', icon: 'company', label: card.companyName, href: null },
  ].filter(Boolean)
}

function getCompanyTheme(themeKey = 'classic') {
  return CARD_THEMES[normalizeThemeKey(themeKey)] || CARD_THEMES.classic
}

function getThemeStyleVars(theme) {
  return {
    '--card-bg': theme.bg,
    '--card-accent': theme.accent,
    '--card-soft': theme.soft,
    '--theme-ink': theme.ink,
  }
}

function useQrCode(value, options = {}) {
  const [src, setSrc] = useState('')
  const dark = options.dark || '#000000'
  const light = options.light || '#ffffff'

  useEffect(() => {
    let isActive = true

    if (!value) {
      if (isActive) setSrc('')
      return () => {
        isActive = false
      }
    }

    QRCode.toDataURL(value, {
      width: 220,
      margin: 2,
      errorCorrectionLevel: 'H',
      color: {
        dark,
        light,
      },
    }).then((dataUrl) => {
      if (isActive) setSrc(dataUrl)
    }).catch(() => {
      if (isActive) setSrc('')
    })

    return () => {
      isActive = false
    }
  }, [value, dark, light])

  return src
}

function QrImage({ value, darkColor, lightColor }) {
  const src = useQrCode(value, { dark: darkColor, light: lightColor })

  return src ? <img className="qr-image" src={src} alt="Scan visiting card QR code" /> : null
}

function QrDisplay({ card, value }) {
  if (!value && card?.qrCode) {
    return <img className="qr-image" src={card.qrCode} alt="QR code stored in S3" />
  }

  const theme = getCompanyTheme(card.theme)

  return (
    <QrImage
      value={value}
      darkColor={theme.qrDark || '#000000'}
      lightColor={theme.qrLight || '#ffffff'}
    />
  )
}

function AdminHome({ onLogin }) {
  return (
    <main className="landing-clean">
      <section className="landing-process">
        <nav className="landing-nav">
          <strong>Digital Visiting Card</strong>
          <button onClick={onLogin}>Log in</button>
        </nav>

        <div className="landing-process-grid">
          <aside className="process-card process-card-image">
            <img src="/Sidebar.png?v=20260609-1410" alt="Digital visiting card process" />
          </aside>

          <section className="landing-connect-copy">
            <h1>Built to connect. Share your passion, not just a number.</h1>
            <div className="landing-avatar">
              <img src="/sidebar-avatar.png?v=20260609-1425" alt="Profile avatar" />
            </div>
            <div className="landing-console">
              <h2>Admin console data</h2>
              <p>Interactive analytics, admin controls, and profile management.</p>
              <div className="landing-console-window">
                <img src="/image.png" alt="Black QR visiting card held in hand" />
              </div>
            </div>
          </section>
        </div>
      </section>

      <section className="landing-hero">
        <div className="landing-card-preview">
          <div className="landing-team-panel">
            {['Software Engineer', 'Creative Director', 'Sales Employee', 'Core Executive'].map((role, index) => (
              <span key={role} className={`landing-person person-${index + 1}`}>
                <b>{role[0]}</b>
                <small>{role}</small>
              </span>
            ))}
          </div>
          <div className="landing-qr-grid" aria-hidden="true">
            {Array.from({ length: 64 }, (_, index) => (
              <span key={index} className={(index * 3 + index) % 4 < 2 ? 'dark' : ''} />
            ))}
          </div>
          <div className="landing-signature">Your Name</div>
          <div className="landing-phone">+91 XXXXX XXXXX</div>
        </div>

        <div className="landing-hero-copy">
          <p>Digital Visiting Card</p>
          <h2>Create and share your card</h2>
          <span>Admin can login and create multiple visiting cards with QR codes.</span>
          <button className="admin-login-button" onClick={onLogin}>
            Admin Login
          </button>
        </div>
      </section>
    </main>
  )
}

function LoginForm({ onSubmit, onBack, error }) {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <main className="admin-login-page">
      <section className="admin-login-stage">
        <button className="login-back-button" type="button" onClick={onBack} aria-label="Back">
          ‹
        </button>
        <div className="admin-brand">VisitingCard</div>
        <div className="dashed-route route-one" />
        <div className="dashed-route route-two" />
        <div className="decor decor-gear">⚙</div>
        <div className="decor decor-pin" />
        <div className="decor decor-warning">!</div>
        <div className="decor decor-lock" />
        <div className="decor decor-plane" />
        <div className="login-character" aria-hidden="true">
          <div className="character-head" />
          <div className="character-body" />
          <div className="character-card card-left" />
          <div className="character-card card-right" />
        </div>

        <form className="login-card" onSubmit={onSubmit}>
          <h1>Welcome back!</h1>
          <p>Please enter your details to sign in.</p>
          <label>
            <input name="username" type="email" placeholder="Username" required />
          </label>
          <label className="password-field">
            <input
              name="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              required
            />
            <button
              className="password-toggle"
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </label>
          {error && <p className="login-error">{error}</p>}
          <a className="forgot-link" href="#forgot">
            Forgot Password?
          </a>
          <div className="form-actions">
            <button type="submit">Sign In <span>→</span></button>
          </div>
          <div className="signin-divider"><span>Or Sign in with</span></div>
          <button className="google-button" type="button">
            <b>G</b> Continue with Google
          </button>
        </form>
        <div className="login-footer">
          <span>Privacy Settings</span>
          <span>|</span>
          <span>Terms & Conditions</span>
        </div>
      </section>
    </main>
  )
}

function CardBack({ card, publicUrl }) {
  if (card.theme === 'fintech') {
    return (
      <article className="physical-preview-card physical-preview-card-back theme-fintech">
      </article>
    )
  }

  const theme = getCompanyTheme(card.theme)

  return (
    <article className={`physical-preview-card physical-preview-card-back ${theme.className}`} style={getThemeStyleVars(theme)}>
      <div className="physical-back-logo" aria-label={`${card.name || 'Card'} logo`}>
        <strong>{getInitials(card.name)}</strong>
        <span>{card.name || 'VISITING CARD'}</span>
      </div>

      <div className="physical-back-title">
        <b>{card.designation || 'Designation'} - {card.companyName || 'Company Name'}</b>
      </div>

      <ul className="physical-back-list">
        <li>
          <span className="back-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M12 22s7-6.4 7-13A7 7 0 0 0 5 9c0 6.6 7 13 7 13Z" /><circle cx="12" cy="9" r="2.4" /></svg>
          </span>
          <b>{card.officeAddress || 'Office address'}</b>
        </li>
        <li>
          <span className="back-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M6.7 3.8 9.4 3c.7-.2 1.4.2 1.7.8l1.2 2.9c.2.6 0 1.2-.4 1.6l-1.5 1.2a13 13 0 0 0 4.1 4.1l1.2-1.5c.4-.5 1-.6 1.6-.4l2.9 1.2c.7.3 1 .9.8 1.7l-.8 2.7c-.2.8-.9 1.3-1.7 1.3C10.4 18.6 4 12.2 4 4.2c0-.8.5-1.5 1.3-1.7Z" /></svg>
          </span>
          <b>{card.mobile || '+91 XXXXX XXXXX'}</b>
        </li>
        <li>
          <span className="back-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M4 6h16v12H4Z" /><path d="m4 7 8 6 8-6" /></svg>
          </span>
          <b>{card.email || 'company@email.com'}</b>
        </li>
        <li>
          <span className="back-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M3.5 12h17M12 3.5c2.2 2.4 3.3 5.2 3.3 8.5s-1.1 6.1-3.3 8.5c-2.2-2.4-3.3-5.2-3.3-8.5S9.8 5.9 12 3.5Z" /></svg>
          </span>
          <b>{card.website || 'www.companyname.com'}</b>
        </li>
      </ul>
    </article>
  )
}

function CardFront({ card, publicUrl, showQr = false }) {
  const hasPhoto = !!card.imageUrl;
  const themeKey = normalizeThemeKey(card.theme)
  const theme = getCompanyTheme(themeKey)
  return (
    <article className={`physical-preview-card physical-preview-card-front ${themeKey === 'fintech' ? 'theme-fintech-front' : theme.className} ${!hasPhoto ? 'no-photo' : ''}`}>
      {themeKey === 'fintech' && (
        <img src="/fintech-logo.png" className="fintech-front-logo" alt="Fintech Logo" />
      )}
      {hasPhoto && (
        <div className="physical-preview-photo">
          <img src={formatUrl(card.imageUrl)} alt="" />
        </div>
      )}

      <div className="physical-preview-details">
        {showQr && (
          <div className="physical-preview-qr">
            <QrImage
              value={publicUrl}
              darkColor={themeKey === 'fintech' ? '#000000ff' : theme.qrDark}
              lightColor={themeKey === 'fintech' ? '#00000000' : theme.qrLight}
            />
          </div>
        )}
        <div>
          <div className="physical-signature">{card.name || 'Client Name'}</div>
          <div className="physical-role">{card.designation || 'Designation'}</div>
          {themeKey !== 'fintech' && <div className="physical-company">{card.companyName || 'Company Name'}</div>}
        </div>
        <div className="physical-contact-group">
          <div className="physical-phone">{card.mobile || '+91 XXXXX XXXXX'}</div>
          {card.email && <div className="physical-email">{card.email}</div>}
          {themeKey === 'fintech' && <div className="physical-company">{card.companyName || 'Company Name'}</div>}
          <div className="physical-address">{card.officeAddress || 'Office address'}</div>
        </div>
      </div>
    </article>
  )
}

function PublicCardFront({ card }) {
  const hasPhoto = !!card.imageUrl;
  return (
    <article className={`tapmo-card ${!hasPhoto ? 'no-photo' : ''}`}>
      {hasPhoto && (
        <div className="tapmo-photo">
          <img src={formatUrl(card.imageUrl)} alt={card.name} />
        </div>
      )}
      <div className="tapmo-info">
        <h1>{card.name}</h1>
        <p>{card.designation}</p>
        {card.companyName && <span className="tapmo-company">{card.companyName}</span>}
      </div>
    </article>
  )
}

function FlipCard({ front, back, className = '' }) {
  const [isFlipped, setIsFlipped] = useState(false)

  function handleKeyDown(event) {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    setIsFlipped((current) => !current)
  }

  return (
    <div className={`flip-card ${isFlipped ? 'is-flipped' : ''} ${className}`}>
      <div
        className="flip-card-stage"
        role="button"
        tabIndex={0}
        aria-label={isFlipped ? 'Show front side' : 'Show back side'}
        onClick={() => setIsFlipped((current) => !current)}
        onKeyDown={handleKeyDown}
      >
        <div className="flip-card-inner">
          <div className="flip-card-face flip-card-front-face">
            <span className="physical-side-label">Front</span>
            {front}
          </div>
          <div className="flip-card-face flip-card-back-face">
            <span className="physical-side-label">Back</span>
            {back}
          </div>
        </div>
      </div>
      <span className="flip-card-hint">{isFlipped ? 'Click to view front' : 'Click to view back'}</span>
    </div>
  )
}

function CardPreview({ card, showQr = false }) {
  const publicUrl = useMemo(() => getPublicUrl(card), [card])
  const theme = getCompanyTheme(card.theme)
  const themeKey = normalizeThemeKey(card.theme)

  return (
    <div
      className={`physical-card-set ${themeKey === 'fintech' ? '' : theme.className}`.trim()}
      style={themeKey === 'fintech' ? undefined : getThemeStyleVars(theme)}
    >
      <FlipCard front={<CardFront card={card} publicUrl={publicUrl} showQr={showQr} />} back={<CardBack card={card} publicUrl={publicUrl} />} />
    </div>
  )
}

function ShareCardModal({
  card,
  publicUrl,
  encodedShareText,
  encodedShareSubject,
  onClose,
  onCopy,
  onNativeShare,
}) {
  const qrSrc = useQrCode(publicUrl)
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(publicUrl)}`
  const xUrl = `https://twitter.com/intent/tweet?text=${encodedShareText}`
  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(publicUrl)}`

  return (
    <div className="share-modal-backdrop" role="presentation">
      <section className="share-modal" role="dialog" aria-modal="true" aria-labelledby="share-modal-title">
        <div className="share-modal-header">
          <h2 id="share-modal-title"><span aria-hidden="true">↗</span> Share My Digital Card</h2>
          <button className="share-modal-close" type="button" onClick={onClose} aria-label="Close share options">
            x
          </button>
        </div>

        <div className="share-modal-qr">
          {qrSrc ? <img src={qrSrc} alt="Digital card QR code" /> : <QrImage value={publicUrl} />}
        </div>

        {qrSrc && (
          <a className="share-download" href={qrSrc} download={`${card.name || 'digital-card'}-qr.png`}>
            Download My QR Code
          </a>
        )}

        <div className="share-social-grid" aria-label="Share destinations">
          <a className="share-social whatsapp" href={`https://wa.me/?text=${encodedShareText}`} aria-label="Share on WhatsApp"><FaWhatsapp /></a>
          <a className="share-social facebook" href={facebookUrl} aria-label="Share on Facebook"><FaFacebookF /></a>
          <a className="share-social x" href={xUrl} aria-label="Share on X"><FaXTwitter /></a>
          <a className="share-social linkedin" href={linkedInUrl} aria-label="Share on LinkedIn"><FaLinkedinIn /></a>
          <a className="share-social gmail" href={`mailto:?subject=${encodedShareSubject}&body=${encodedShareText}`} aria-label="Share by email"><FaEnvelope /></a>
          <button className="share-social native" type="button" onClick={onNativeShare} aria-label="More share options"><FaShare /></button>
        </div>

        <div className="share-link-box">
          <span>{publicUrl}</span>
          <button type="button" onClick={onCopy} aria-label="Copy card link"><FaCopy /></button>
        </div>
      </section>
    </div>
  )
}

function AdminDashboard({ cards, onCreate, onDelete, onLogout, onView, onEdit }) {
  const [card, setCard] = useState(emptyCard)
  const [cardToEdit, setCardToEdit] = useState(null)
  const [message, setMessage] = useState('')
  const [cardToPrint, setCardToPrint] = useState(null)
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false)
  const [themeSearch, setThemeSearch] = useState('')
  const cardsSectionRef = useRef(null)
  const imageInputRef = useRef(null)
  const editImageInputRef = useRef(null)
  const themeFieldRef = useRef(null)

  useEffect(() => {
    if (cardToPrint) {
      const timer = setTimeout(() => window.print(), 500)
      const handleAfterPrint = () => setCardToPrint(null)
      window.addEventListener('afterprint', handleAfterPrint)
      return () => {
        clearTimeout(timer)
        window.removeEventListener('afterprint', handleAfterPrint)
      }
    }
  }, [cardToPrint])

  useEffect(() => {
    if (!isThemeMenuOpen) return

    function handleClickOutside(event) {
      if (!themeFieldRef.current?.contains(event.target)) {
        setIsThemeMenuOpen(false)
      }
    }

    function handleEscape(event) {
      if (event.key === 'Escape') {
        setIsThemeMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isThemeMenuOpen])

  function updateField(event) {
    const { name, value } = event.target
    setCard((current) => {
      const updates = { [name]: value }
      if (name === 'theme' && value === 'fintech') {
        updates.officeAddress = 'Corporate Office\nFintech Cloud Pvt. Ltd.\nPlot No. 296, DLF Phase IV ,\nUDYOG VIHAR, Gurugram,\nHaryana - 122015'
      }
      return { ...current, ...updates }
    })
  }

  function selectTheme(themeKey) {
    setCard((current) => ({ ...current, theme: themeKey }))
    setThemeSearch('')
    setIsThemeMenuOpen(false)
  }

  const activeThemeKey = normalizeThemeKey(card.theme)
  const activeTheme = CARD_THEMES[activeThemeKey] || CARD_THEMES.classic
  const themeOptions = cardThemeOptions.filter((option) =>
    option.label.toLowerCase().includes(themeSearch.trim().toLowerCase())
  )

  function uploadImage(event) {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setMessage('Please upload an image file.')
      event.target.value = ''
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      setMessage('Please upload an image smaller than 2 MB.')
      event.target.value = ''
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setCard((current) => ({
        ...current,
        imageUrl: reader.result,
      }))
      setMessage('')
    }
    reader.onerror = () => {
      setMessage('Image could not be uploaded. Please try another file.')
      event.target.value = ''
    }
    reader.readAsDataURL(file)
  }

  function uploadEditImage(event) {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setMessage('Please upload an image file.')
      event.target.value = ''
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      setMessage('Please upload an image smaller than 2 MB.')
      event.target.value = ''
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setCardToEdit((current) => ({
        ...current,
        imageUrl: reader.result,
      }))
      setMessage('')
    }
    reader.onerror = () => {
      setMessage('Image could not be uploaded. Please try another file.')
      event.target.value = ''
    }
    reader.readAsDataURL(file)
  }

  async function createCard() {
    if (!card.name.trim() || !card.mobile.trim() || !card.designation.trim() || !card.companyName.trim() || !card.officeAddress.trim()) {
      setMessage('Please fill name, mobile number, designation, company name, and office address.')
      return
    }

    const nextCard = {
      ...Object.fromEntries(Object.entries(card).map(([key, value]) => [key, value.trim()])),
      id: createId(),
      createdAt: new Date().toISOString(),
    }

    try {
      await onCreate(nextCard)
      setCard(emptyCard)
      if (imageInputRef.current) imageInputRef.current.value = ''
      setMessage('Card created successfully and saved in database.')
      setTimeout(() => {
        cardsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 50)
    } catch (error) {
      setMessage(error.message || 'Card could not be saved. Please try again.')
    }
  }

  return (
    <main className="dashboard">
      <header className="dashboard-header">
        <div>
          <p>Admin Panel</p>
          <h1>Create Visiting Card</h1>
        </div>
        <button className="secondary-button" onClick={onLogout}>
          Logout
        </button>
      </header>

      <section className="builder-grid">
        <form className="builder-form" noValidate>
          <div className="theme-field" ref={themeFieldRef}>
            <label className="field-label" htmlFor="theme-picker-button">Theme</label>
            <div className="theme-dropdown">
              <button
                id="theme-picker-button"
                type="button"
                className={`theme-dropdown-trigger ${isThemeMenuOpen ? 'is-open' : ''}`}
                aria-haspopup="listbox"
                aria-expanded={isThemeMenuOpen}
                onClick={() => setIsThemeMenuOpen((current) => !current)}
              >
                <span className="theme-dropdown-value">
                  <span className="theme-dropdown-swatch" aria-hidden="true" style={{ background: activeTheme.bg }} />
                  <span>{activeTheme.label}</span>
                </span>
                <FaChevronDown className="theme-dropdown-chevron" aria-hidden="true" />
              </button>

              {isThemeMenuOpen && (
                <div className="theme-dropdown-panel" role="listbox" aria-label="Theme options">
                  <label className="theme-dropdown-search">
                    <span className="sr-only">Search theme</span>
                    <input
                      type="text"
                      value={themeSearch}
                      onChange={(event) => setThemeSearch(event.target.value)}
                      placeholder="Search or type theme..."
                    />
                  </label>
                  <div className="theme-dropdown-list">
                    {themeOptions.length === 0 ? (
                      <div className="theme-dropdown-empty">No themes found</div>
                    ) : (
                      themeOptions.map((option) => {
                        const isActive = activeThemeKey === option.value

                        return (
                          <button
                            key={option.value}
                            type="button"
                            className={`theme-dropdown-option ${isActive ? 'is-active' : ''}`}
                            aria-pressed={isActive}
                            onClick={() => selectTheme(option.value)}
                          >
                            <span className="theme-dropdown-swatch" aria-hidden="true" style={{ background: CARD_THEMES[option.value]?.bg || '#fff' }} />
                            <span className="theme-dropdown-label">{option.label}</span>
                          </button>
                        )
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          <label>
            Full Name
            <input name="name" value={card.name} onChange={updateField} placeholder="Enter client name" />
          </label>
          <label>
            Mobile Number
            <input name="mobile" value={card.mobile} onChange={updateField} placeholder="+91 99999 99999" />
          </label>
          <label>
            Designation
            <input name="designation" value={card.designation} onChange={updateField} placeholder="Founder, Manager, Intern" />
          </label>
          <label>
            Company Name
            <input name="companyName" value={card.companyName} onChange={updateField} placeholder="Company name" />
          </label>
          <label>
            Office Address
            <textarea name="officeAddress" value={card.officeAddress} onChange={updateField} placeholder="Office address" rows={4} />
          </label>
          <label>
            Email
            <input name="email" value={card.email} onChange={updateField} placeholder="name@example.com" />
          </label>
          <label>
            Website
            <input name="website" value={card.website} onChange={updateField} placeholder="www.example.com" />
          </label>
          <label>
            Image URL or Upload
            <input name="imageUrl" value={card.imageUrl} onChange={updateField} placeholder="https://example.com/photo.jpg" />
            <span className="image-upload-row">
              <input ref={imageInputRef} type="file" accept="image/*" onChange={uploadImage} />
            </span>
          </label>
          <label>
            LinkedIn
            <input name="linkedin" value={card.linkedin} onChange={updateField} placeholder="linkedin.com/in/profile" />
          </label>
          <label>
            YouTube
            <input name="youtube" value={card.youtube} onChange={updateField} placeholder="youtube.com/@channel" />
          </label>
          <label>
            Facebook
            <input name="facebook" value={card.facebook} onChange={updateField} placeholder="facebook.com/profile" />
          </label>
          <label>
            Instagram
            <input name="instagram" value={card.instagram} onChange={updateField} placeholder="instagram.com/profile" />
          </label>
          <button className="admin-login-button save-button" onClick={createCard} type="button">
            Create Card
          </button>
          {message && <p className="success-message">{message}</p>}
        </form>

        <div className="preview-panel">
          <CardPreview card={card} showQr />
        </div>
      </section>

      <section className="cards-section" ref={cardsSectionRef}>
        <h2>Created Visiting Cards ({cards.length})</h2>
        <div className="cards-list">
          {cards.length === 0 ? (
            <p className="empty-state">No visiting cards created yet.</p>
          ) : (
            cards.map((savedCard) => (
              <article className="saved-card" key={savedCard.id}>
                <div>
                  <h3>{savedCard.name}</h3>
                  <p>{savedCard.mobile}</p>
                  <span>{savedCard.designation}</span>
                  <span>{savedCard.companyName}</span>
                  <div className="saved-card-sides">
                    <b>Front</b>
                    <b>Back</b>
                  </div>
                </div>
                <QrDisplay card={savedCard} value={getPublicUrl(savedCard)} />
                <div className="saved-card-actions">
                  <button className="secondary-button" onClick={() => onView(savedCard)}>
                    Open
                  </button>
                  <button className="secondary-button" onClick={() => setCardToPrint(savedCard)}>
                    Print
                  </button>
                  <button className="secondary-button" onClick={() => setCardToEdit(savedCard)}>
                    Edit
                  </button>
                  <button className="danger-button" onClick={() => onDelete(savedCard)}>
                    Delete
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      {cardToPrint && (
        <div className="print-only">
          <div className="print-page">
            <CardFront card={cardToPrint} publicUrl={getPublicUrl(cardToPrint)} showQr />
            <div className="print-gap"></div>
            <CardBack card={cardToPrint} publicUrl={getPublicUrl(cardToPrint)} />
          </div>
        </div>
      )}

      {cardToEdit && (
        <div className="modal-overlay" onClick={() => setCardToEdit(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Card</h2>
              <button className="modal-close" onClick={() => setCardToEdit(null)} type="button">×</button>
            </div>
            <div className="modal-body">
              <form noValidate>
                <label>
                  Name
                  <input 
                    name="name" 
                    value={cardToEdit.name} 
                    onChange={(e) => setCardToEdit({...cardToEdit, name: e.target.value})} 
                    placeholder="Full Name" 
                  />
                </label>
                <label>
                  Mobile
                  <input 
                    name="mobile" 
                    value={cardToEdit.mobile} 
                    onChange={(e) => setCardToEdit({...cardToEdit, mobile: e.target.value})} 
                    placeholder="Mobile Number" 
                  />
                </label>
                <label>
                  Designation
                  <input 
                    name="designation" 
                    value={cardToEdit.designation} 
                    onChange={(e) => setCardToEdit({...cardToEdit, designation: e.target.value})} 
                    placeholder="Job Title" 
                  />
                </label>
                <label>
                  Company Name
                  <input 
                    name="companyName" 
                    value={cardToEdit.companyName} 
                    onChange={(e) => setCardToEdit({...cardToEdit, companyName: e.target.value})} 
                    placeholder="Company Name" 
                  />
                </label>
                <label>
                  Email
                  <input 
                    name="email" 
                    type="email"
                    value={cardToEdit.email} 
                    onChange={(e) => setCardToEdit({...cardToEdit, email: e.target.value})} 
                    placeholder="Email Address" 
                  />
                </label>
                <label>
                  Website
                  <input 
                    name="website" 
                    value={cardToEdit.website} 
                    onChange={(e) => setCardToEdit({...cardToEdit, website: e.target.value})} 
                    placeholder="Website URL" 
                  />
                </label>
                <label>
                  Image URL or Upload
                  <input
                    name="imageUrl"
                    value={cardToEdit.imageUrl || ''}
                    onChange={(e) => setCardToEdit((current) => ({ ...current, imageUrl: e.target.value }))}
                    placeholder="https://example.com/photo.jpg"
                  />
                  <span className="image-upload-row">
                    <input
                      ref={editImageInputRef}
                      type="file"
                      accept="image/*"
                      onChange={uploadEditImage}
                    />
                    {cardToEdit.imageUrl && (
                      <button
                        type="button"
                        className="secondary-button remove-image-button"
                        onClick={() => {
                          setCardToEdit((current) => ({ ...current, imageUrl: '' }))
                          if (editImageInputRef.current) editImageInputRef.current.value = ''
                        }}
                      >
                        Remove image
                      </button>
                    )}
                  </span>
                </label>
                {cardToEdit.imageUrl && (
                  <div className="edit-image-preview">
                    <img src={formatUrl(cardToEdit.imageUrl)} alt="Card image preview" />
                  </div>
                )}
                <label>
                  Office Address
                  <textarea 
                    name="officeAddress" 
                    value={cardToEdit.officeAddress} 
                    onChange={(e) => setCardToEdit({...cardToEdit, officeAddress: e.target.value})} 
                    placeholder="Full Address"
                    rows="3"
                  />
                </label>
              </form>
            </div>
            <div className="modal-actions">
              <button className="secondary-button" onClick={() => setCardToEdit(null)}>Cancel</button>
              <button className="admin-login-button" onClick={() => {
                onCreate(cardToEdit)
                setCardToEdit(null)
              }} type="button">Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

function PublicCardPage({ card, onClose }) {
  const [shareMessage, setShareMessage] = useState('')
  const [isShareOpen, setIsShareOpen] = useState(false)
  const publicUrl = useMemo(() => getPublicUrl(card), [card])
  const theme = getCompanyTheme(card.theme)

  const shareText = `${card.name || 'Visiting card'}${card.designation ? ` - ${card.designation}` : ''}\n${publicUrl}`
  const encodedShareText = encodeURIComponent(shareText)
  const encodedShareSubject = encodeURIComponent(`${card.name || 'Visiting card'} - Digital visiting card`)
  const whatsappNumber = card.mobile?.replace(/\D/g, '')
  const websiteUrl = card.website ? formatUrl(card.website) : ''
  const contactItems = getContactItems(card, whatsappNumber, websiteUrl)
  const socialLinks = getSocialLinks(card)

  async function shareNative() {
    const shareData = {
      title: card.name || 'Visiting card',
      text: card.designation ? `${card.name} - ${card.designation}` : card.name || 'Visiting card',
      url: publicUrl,
    }

    try {
      if (navigator.share && window.isSecureContext) {
        await navigator.share(shareData)
        setShareMessage('')
        return
      }

      setShareMessage('More share options need HTTPS. Use any option below.')
    } catch (error) {
      if (error.name === 'AbortError') return
      setShareMessage('More share options need HTTPS. Use any option below.')
    }
  }

  async function copyCardLink() {
    try {
      await navigator.clipboard.writeText(publicUrl)
      setShareMessage('Card link copied.')
    } catch {
      setShareMessage('Copy this link from the browser address bar.')
    }
  }

  async function shareCard() {
    setShareMessage('')
    setIsShareOpen(true)
  }

  async function exchangeContact() {
    if (navigator.share && window.isSecureContext) {
      await shareNative()
      return
    }

    shareCard()
  }

  function downloadVcard() {
    const vcardText = getVcard(card)
    const blob = new Blob([vcardText], { type: 'text/vcard;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${card.name ? card.name.replace(/\s+/g, '_') : 'contact'}.vcf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <main className="tapmo-page">
      <header className="tapmo-topbar">
        <button className="tapmo-round" onClick={onClose} aria-label="Close">
          x
        </button>
        <strong>{appConfig.brandName}</strong>
        <button className="tapmo-round menu-icon" aria-label="Menu">
          =
        </button>
      </header>

      <section className={`tapmo-hero ${theme.className}`} style={getThemeStyleVars(theme)}>
        {!isShareOpen && (
          <div className="tapmo-share-row">
            <button type="button" className="tapmo-share-button" onClick={shareCard}>Share My Card</button>
          </div>
        )}
        {shareMessage && <p className="share-status">{shareMessage}</p>}
        <div className="tapmo-card-set">
          <CardPreview card={card} showQr={true} />
        </div>
        {!isShareOpen && (
          <div className="tapmo-action-row tapmo-card-actions">
            <button type="button" className="tapmo-secondary-button" onClick={downloadVcard}>Save Contact</button>
            <button type="button" className="tapmo-primary-button" onClick={exchangeContact}>Exchange Contact</button>
          </div>
        )}

        {socialLinks.length > 0 && (
          <>
            <h2 className="tapmo-section-title">Social networks</h2>
            <div className="tapmo-socials">
              {socialLinks.map((link) => (
                <a key={link.key} className={link.className} href={link.url} target="_blank" rel="noreferrer noopener" aria-label={link.key}>
                  <SocialIcon name={link.icon} />
                </a>
              ))}
            </div>
          </>
        )}

        {contactItems.length > 0 && (
          <>
            <h2 className="tapmo-section-title">Contact info.</h2>
            <div className="tapmo-contact-list">
              {contactItems.map((item) => (
                item.href ? (
                  <a key={item.key} href={item.href} target="_blank" rel="noreferrer noopener">
                    <span className="contact-icon-wrap"><ContactIcon name={item.icon} /></span>
                    <div>
                      <b>{item.label}</b>
                    </div>
                    <span className="tapmo-contact-arrow">›</span>
                  </a>
                ) : (
                  <div key={item.key} className="tapmo-contact-static">
                    <span className="contact-icon-wrap"><ContactIcon name={item.icon} /></span>
                    <div>
                      <b>{item.label}</b>
                    </div>
                    <span className="tapmo-contact-arrow">›</span>
                  </div>
                )
              ))}
            </div>
          </>
        )}
      </section>

      {isShareOpen && (
        <ShareCardModal
          card={card}
          publicUrl={publicUrl}
          encodedShareText={encodedShareText}
          encodedShareSubject={encodedShareSubject}
          onClose={() => setIsShareOpen(false)}
          onCopy={copyCardLink}
          onNativeShare={shareNative}
        />
      )}

      <footer className="tapmo-powered">
        <span>Powered by</span>
        <strong>{appConfig.poweredBy}</strong>
      </footer>
    </main>
  )
}

function App() {
  const initialUiState = loadUiState()
  const [screen, setScreen] = useState(() => initialUiState.screen || 'home')
  const [isAuthenticated, setIsAuthenticated] = useState(() => initialUiState.isAuthenticated)
  const [publicCard, setPublicCard] = useState(null)
  const [loginError, setLoginError] = useState('')
  const [cardToDelete, setCardToDelete] = useState(null)
  const [cardStore, setCardStore] = useState(() => loadCardStore())
  const cards = useMemo(() => getVisibleCards(cardStore), [cardStore])

  useEffect(() => {
    saveCardStore(cardStore)
  }, [cardStore])

  useEffect(() => {
    if (screen === 'public' || screen === 'dashboard' || screen === 'login') {
      saveUiState({ screen, isAuthenticated })
      return
    }

    clearUiState()
  }, [screen, isAuthenticated])

  useEffect(() => {
    if (!appConfig.useApi || screen === 'home' || screen === 'login') return

    let isActive = true

    async function syncCards() {
      const localStore = loadCardStore()

      try {
        const databaseCards = await apiRequest('/api/cards')
        const mergedCards = mergeCardLists(databaseCards, localStore.cards, localStore.deletedIds)
        if (isActive) {
          setCardStore({ cards: mergedCards, deletedIds: [...localStore.deletedIds] })
        }

        const pendingDeletedIds = new Set(localStore.deletedIds)
        const syncedCards = []

        for (const card of mergedCards) {
          try {
            const savedCard = await apiRequest('/api/cards', {
              method: 'POST',
              body: JSON.stringify(card),
            })
            syncedCards.push(savedCard)
          } catch (error) {
            console.warn(`Failed to sync card ${card.id}:`, error.message)
            syncedCards.push(card)
          }
        }

        for (const deletedId of pendingDeletedIds) {
          try {
            await apiRequest(`/api/cards/${encodeURIComponent(deletedId)}`, { method: 'DELETE' })
            pendingDeletedIds.delete(deletedId)
          } catch (error) {
            if (!/not found/i.test(error.message || '')) {
              console.warn(`Failed to sync delete for ${deletedId}:`, error.message)
            } else {
              pendingDeletedIds.delete(deletedId)
            }
          }
        }

        const refreshedRemoteCards = await apiRequest('/api/cards').catch(() => syncedCards)
        const finalCards = mergeCardLists(refreshedRemoteCards, syncedCards, [])

        if (isActive) {
          setCardStore({ cards: finalCards, deletedIds: [...pendingDeletedIds] })
        }
      } catch {
        // Keep the localStorage fallback when the API is not running.
      }
    }

    syncCards()

    return () => {
      isActive = false
    }
  }, [screen])

  useEffect(() => {
    let isActive = true

    function syncHashCard() {
      const cardIdMatch = window.location.hash.match(/^#\/card-id\/([^/?#]+)$/)
      if (cardIdMatch) {
        const cardId = decodeURIComponent(cardIdMatch[1])
        setScreen('public')
        apiRequest(`/api/cards/${encodeURIComponent(cardId)}`)
          .then((card) => {
            if (isActive) setPublicCard(card)
          })
          .catch(() => {
            if (!isActive) return
            const fallbackCard = cards.find((item) => item.id === cardId)
            if (fallbackCard) {
              setPublicCard(fallbackCard)
            } else {
              setPublicCard(null)
            }
          })
        return
      }

      const cardMatch = window.location.hash.match(/^#\/card\/(.+)$/)
      const card = cardMatch ? decodeCard(cardMatch[1]) : null
      if (isActive) {
        const hydratedCard = hydrateCardImage(card, cards)
        setPublicCard(hydratedCard)
        if (hydratedCard) setScreen('public')
      }
    }

    syncHashCard()
    window.addEventListener('hashchange', syncHashCard)
    return () => {
      isActive = false
      window.removeEventListener('hashchange', syncHashCard)
    }
  }, [cards])

  function goHome() {
    window.history.replaceState(null, '', window.location.pathname)
    setPublicCard(null)
    setIsAuthenticated(false)
    setScreen('home')
  }

  if (screen === 'login') {
    return (
      <LoginForm
        onBack={goHome}
        error={loginError}
        onSubmit={async (event) => {
          event.preventDefault()
          const formData = new FormData(event.currentTarget)
          const username = formData.get('username')
          const password = formData.get('password')

          if (username === appConfig.adminUsername && password === appConfig.adminPassword) {
            setLoginError('')
            setIsAuthenticated(true)
            setScreen('dashboard')
            return
          }

          if (!appConfig.useApi) {
            setLoginError('Invalid username or password.')
            return
          }

          try {
            await apiRequest('/api/login', {
              method: 'POST',
              body: JSON.stringify({ username, password }),
            })
            setLoginError('')
            setIsAuthenticated(true)
            setScreen('dashboard')
          } catch {
            if (username !== appConfig.adminUsername || password !== appConfig.adminPassword) {
              setLoginError('Invalid username or password.')
              return
            }

            setLoginError('')
            setIsAuthenticated(true)
            setScreen('dashboard')
          }
        }}
      />
    )
  }

  if (screen === 'dashboard') {
    if (!isAuthenticated) {
      return <LoginForm onBack={goHome} error={loginError} onSubmit={() => { }} />
    }

    return (
      <>
        <AdminDashboard
          cards={cards}
          onLogout={() => {
            clearUiState()
            goHome()
          }}
          onCreate={async (card) => {
            const nextCard = appConfig.useApi
              ? await apiRequest('/api/cards', {
                method: 'POST',
                body: JSON.stringify(card),
              }).catch(() => card)
              : card

            setCardStore((current) => {
              const remainingCards = (current.cards || []).filter((item) => item.id !== nextCard.id)
              const remainingDeletedIds = (current.deletedIds || []).filter((id) => id !== nextCard.id)
              return {
                cards: [nextCard, ...remainingCards],
                deletedIds: remainingDeletedIds,
              }
            })

            return nextCard
          }}
          onDelete={(card) => {
            setCardToDelete(card)
          }}
          onView={(card) => {
            const publicCard = card
            setPublicCard(publicCard)
            window.location.hash = appConfig.useApi && card.id
              ? `/card-id/${encodeURIComponent(card.id)}`
              : `/card/${encodeCard(getShareableCard(publicCard))}`
            setScreen('public')
          }}
        />
        {cardToDelete && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3>Delete Card</h3>
              <p>Are you sure you want to delete {cardToDelete.name}'s visiting card?</p>
              <div className="modal-actions">
                <button className="secondary-button" onClick={() => setCardToDelete(null)}>Cancel</button>
                <button className="danger-button" onClick={async () => {
                  const card = cardToDelete;
                  setCardToDelete(null);
                  try {
                    setCardStore((current) => {
                      const nextCards = (current.cards || []).filter((c) => c.id !== card.id)
                      const nextDeletedIds = [...new Set([...(current.deletedIds || []), card.id])]
                      return {
                        cards: nextCards,
                        deletedIds: appConfig.useApi ? nextDeletedIds : [],
                      }
                    })

                    if (appConfig.useApi) {
                      await apiRequest(`/api/cards/${card.id}`, { method: 'DELETE' }).catch((error) => {
                        if (!/not found/i.test(error.message || '')) throw error
                      })
                      setCardStore((current) => ({
                        cards: current.cards || [],
                        deletedIds: (current.deletedIds || []).filter((id) => id !== card.id),
                      }))
                    }
                  } catch (error) {
                    alert(error.message || 'Failed to delete card.')
                  }
                }}>Delete</button>
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

  if (screen === 'public' && publicCard) {
    return (
      <PublicCardPage
        card={publicCard}
        onClose={() => {
          window.history.replaceState(null, '', window.location.pathname)
          setPublicCard(null)
          setScreen(isAuthenticated ? 'dashboard' : 'home')
        }}
      />
    )
  }

  if (screen === 'public') {
    return (
      <main className="tapmo-page">
        <header className="tapmo-topbar">
          <button className="tapmo-round" onClick={goHome} aria-label="Close">
            x
          </button>
          <strong>{appConfig.brandName}</strong>
          <span />
        </header>
        <section className="tapmo-section public-loading">
          <h2>Loading card...</h2>
        </section>
      </main>
    )
  }

  return <AdminHome onLogin={() => setScreen('login')} />
}

export default App

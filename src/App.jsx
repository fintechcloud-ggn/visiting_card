import { useEffect, useMemo, useRef, useState } from 'react'
import QRCode from 'qrcode'
import './App.css'

const storageKey = 'visiting-cards'

const appConfig = {
  brandName: import.meta.env.VITE_BRAND_NAME || 'nextgen',
  poweredBy: import.meta.env.VITE_POWERED_BY || 'NextGen',
  adminUsername: import.meta.env.VITE_ADMIN_USERNAME || 'admin@example.com',
  adminPassword: import.meta.env.VITE_ADMIN_PASSWORD || 'admin123',
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
}

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

function getPublicUrl(card) {
  return `${window.location.origin}${window.location.pathname}#/card/${encodeCard(card)}`
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
  return value.startsWith('http') ? value : `https://${value}`
}

function getSocialLinks(card) {
  return [
    { key: 'linkedin', label: 'in', url: card.linkedin, className: 'linkedin' },
    { key: 'youtube', label: 'YouTube', url: card.youtube, className: 'youtube' },
    { key: 'facebook', label: 'f', url: card.facebook, className: 'facebook' },
    { key: 'instagram', label: 'IG', url: card.instagram, className: 'instagram' },
    { key: 'whatsapp', label: 'WA', url: card.mobile ? `https://wa.me/${card.mobile.replace(/\D/g, '')}` : '', className: 'whatsapp' },
  ].filter((item) => item.url)
}

function getCompanyTheme(companyName = '') {
  const normalizedName = companyName.trim().toLowerCase() || 'visiting-card'
  const score = normalizedName
    .split('')
    .reduce((total, char) => ((total << 5) - total + char.charCodeAt(0)) >>> 0, 0)
  const hue = score % 360

  return {
    bg: `hsl(${hue} 74% 16%)`,
    accent: `hsl(${(hue + 38) % 360} 86% 72%)`,
    soft: `hsl(${hue} 72% 96%)`,
  }
}

function useQrCode(value) {
  const [src, setSrc] = useState('')

  useEffect(() => {
    let isActive = true

    QRCode.toDataURL(value, {
      width: 220,
      margin: 2,
      color: {
        dark: '#020b42',
        light: '#ffffff',
      },
    }).then((dataUrl) => {
      if (isActive) setSrc(dataUrl)
    })

    return () => {
      isActive = false
    }
  }, [value])

  return src
}

function QrImage({ value }) {
  const src = useQrCode(value)

  return src ? <img className="qr-image" src={src} alt="Scan visiting card QR code" /> : null
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
        <label>
          <input name="password" type="password" placeholder="Password" required />
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

function CardBack({ card }) {
  return (
    <article className="physical-preview-card physical-preview-card-back">
      <div className="physical-back-logo" aria-label="VC stands for Visiting Card">
        <strong>VC</strong>
        <span>VISITING CARD</span>
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
  return (
    <article className="physical-preview-card physical-preview-card-front">
      <div className="physical-preview-photo">
        {card.imageUrl ? (
          <img src={formatUrl(card.imageUrl)} alt="" />
        ) : (
          <div className="ai-portrait" aria-label="AI generated portrait placeholder">
            <span>{getInitials(card.name)[0]}</span>
          </div>
        )}
      </div>

      <div className="physical-preview-details">
        {showQr && (
          <div className="physical-preview-qr">
            <QrImage value={publicUrl} />
          </div>
        )}
        <div>
          <div className="physical-signature">{card.name || 'Client Name'}</div>
          <div className="physical-role">{card.designation || 'Designation'}</div>
          <div className="physical-company">{card.companyName || 'Company Name'}</div>
        </div>
        <div className="physical-phone">{card.mobile || '+91 XXXXX XXXXX'}</div>
        <div className="physical-address">{card.officeAddress || 'Office address'}</div>
        <div className="physical-chip">{getInitials(card.name)}</div>
      </div>
    </article>
  )
}

function PublicCardFront({ card }) {
  return (
    <article className="tapmo-card">
      <div className="tapmo-photo">
        {card.imageUrl ? <img src={formatUrl(card.imageUrl)} alt={card.name} /> : <span>{getInitials(card.name)[0]}</span>}
      </div>
      <div className="tapmo-info">
        <h1>{card.name}</h1>
        <p>{card.designation}</p>
        {card.companyName && <span className="tapmo-company">{card.companyName}</span>}
        <div className="tapmo-logo">{getInitials(card.name)}</div>
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
  const theme = getCompanyTheme(card.companyName)

  return (
    <div className="physical-card-set" style={{ '--card-bg': theme.bg, '--card-accent': theme.accent }}>
      <FlipCard front={<CardFront card={card} publicUrl={publicUrl} showQr={showQr} />} back={<CardBack card={card} />} />
    </div>
  )
}

function AdminDashboard({ cards, onCreate, onLogout, onView }) {
  const [card, setCard] = useState(emptyCard)
  const [message, setMessage] = useState('')
  const cardsSectionRef = useRef(null)

  function updateField(event) {
    setCard((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }))
  }

  function createCard() {
    if (!card.name.trim() || !card.mobile.trim() || !card.designation.trim() || !card.companyName.trim() || !card.officeAddress.trim()) {
      setMessage('Please fill name, mobile number, designation, company name, and office address.')
      return
    }

    const nextCard = {
      ...Object.fromEntries(Object.entries(card).map(([key, value]) => [key, value.trim()])),
      id: createId(),
      createdAt: new Date().toISOString(),
    }

    onCreate(nextCard)
    setCard(emptyCard)
    setMessage('Card created successfully. You can create another card now.')
    setTimeout(() => {
      cardsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
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
            <input name="officeAddress" value={card.officeAddress} onChange={updateField} placeholder="Office address" />
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
            Image URL
            <input name="imageUrl" value={card.imageUrl} onChange={updateField} placeholder="https://example.com/photo.jpg" />
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
                <QrImage value={getPublicUrl(savedCard)} />
                <button className="secondary-button" onClick={() => onView(savedCard)}>
                  Open
                </button>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  )
}

function PublicCardPage({ card, onClose }) {
  const publicUrl = useMemo(() => getPublicUrl(card), [card])
  const vcardUrl = `data:text/vcard;charset=utf-8,${encodeURIComponent(getVcard(card))}`
  const whatsappNumber = card.mobile.replace(/\D/g, '')
  const websiteUrl = formatUrl(card.website)
  const socialLinks = getSocialLinks(card)
  const theme = getCompanyTheme(card.companyName)

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

      <section className="tapmo-hero" style={{ '--card-bg': theme.bg, '--card-accent': theme.accent, '--card-soft': theme.soft }}>
        <div className="share-row">
          <button onClick={() => navigator.share?.({ title: card.name, url: publicUrl })}>Share My Card</button>
        </div>
        <div className="tapmo-card-set">
          <FlipCard className="tapmo-flip-card" front={<PublicCardFront card={card} />} back={<CardBack card={card} />} />
        </div>
      </section>

      <section className="tapmo-actions">
        <a href={vcardUrl} download={`${card.name || 'visiting-card'}.vcf`}>
          Save Contact
        </a>
        <a className="primary" href={`mailto:${card.email || ''}?subject=Exchange Contact&body=Hi ${card.name},`}>
          Exchange Contact
        </a>
      </section>

      {socialLinks.length > 0 && (
        <section className="tapmo-section">
          <h2>Social networks</h2>
          <div className="tapmo-socials">
            {socialLinks.map((social) => (
              <a key={social.key} className={social.className} href={formatUrl(social.url)} aria-label={social.key}>
                {social.label}
              </a>
            ))}
          </div>
        </section>
      )}

      <section className="tapmo-section">
        <h2>Contact info.</h2>
        <div className="tapmo-list">
          <a href={`tel:${card.mobile}`}><span className="line-icon">Phone</span><b>{card.mobile}</b><i>›</i></a>
          {card.companyName && <a href="#company"><span className="line-icon">Co</span><b>{card.companyName}</b><i>›</i></a>}
          <a href={`https://wa.me/${whatsappNumber}`}><span className="line-icon">WA</span><b>WhatsApp Chat</b><i>›</i></a>
          {card.email && <a href={`mailto:${card.email}`}><span className="line-icon">Mail</span><b>{card.email}</b><i>›</i></a>}
          {websiteUrl && <a href={websiteUrl}><span className="line-icon">Link</span><b>{card.website}</b><i>›</i></a>}
          <a href={`https://maps.google.com/?q=${encodeURIComponent(card.officeAddress)}`}><span className="line-icon">Pin</span><b>{card.officeAddress}</b><i>›</i></a>
        </div>
      </section>

      <footer className="tapmo-powered">
        <span>Powered by</span>
        <strong>{appConfig.poweredBy}</strong>
      </footer>
    </main>
  )
}

function App() {
  const [screen, setScreen] = useState('home')
  const [publicCard, setPublicCard] = useState(null)
  const [loginError, setLoginError] = useState('')
  const [cards, setCards] = useState(() => {
    const savedCards = localStorage.getItem(storageKey)
    return savedCards ? JSON.parse(savedCards) : []
  })

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(cards))
  }, [cards])

  useEffect(() => {
    function syncHashCard() {
      const match = window.location.hash.match(/^#\/card\/(.+)$/)
      const card = match ? decodeCard(match[1]) : null
      setPublicCard(card)
      if (card) setScreen('public')
    }

    syncHashCard()
    window.addEventListener('hashchange', syncHashCard)
    return () => window.removeEventListener('hashchange', syncHashCard)
  }, [])

  function goHome() {
    window.history.replaceState(null, '', window.location.pathname)
    setPublicCard(null)
    setScreen('home')
  }

  if (screen === 'login') {
    return (
      <LoginForm
        onBack={goHome}
        error={loginError}
        onSubmit={(event) => {
          event.preventDefault()
          const formData = new FormData(event.currentTarget)
          const username = formData.get('username')
          const password = formData.get('password')

          if (username !== appConfig.adminUsername || password !== appConfig.adminPassword) {
            setLoginError('Invalid username or password.')
            return
          }

          setLoginError('')
          setScreen('dashboard')
        }}
      />
    )
  }

  if (screen === 'dashboard') {
    return (
      <AdminDashboard
        cards={cards}
        onLogout={goHome}
        onCreate={(card) => {
          setCards((current) => [card, ...current])
        }}
        onView={(card) => {
          setPublicCard(card)
          window.location.hash = `/card/${encodeCard(card)}`
          setScreen('public')
        }}
      />
    )
  }

  if (screen === 'public' && publicCard) {
    return (
      <PublicCardPage
        card={publicCard}
        onClose={() => {
          window.history.replaceState(null, '', window.location.pathname)
          setPublicCard(null)
          setScreen('dashboard')
        }}
      />
    )
  }

  return <AdminHome onLogin={() => setScreen('login')} />
}

export default App

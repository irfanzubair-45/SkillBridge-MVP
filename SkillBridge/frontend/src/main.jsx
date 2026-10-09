import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

const API = '/api'

const skills = [
  'Python', 'AI/ML', 'Cloud', 'UI/UX', 'Figma', 'IoT', 'Electronics',
  'Product Strategy', 'Research', 'React', 'Node.js', 'Data Analysis',
  'Mobile Development', 'Cybersecurity', 'Public Speaking',
]

const interests = ['Sustainability', 'Smart cities', 'Accessibility', 'Social impact', 'Education', 'Robotics', 'Entrepreneurship']
const readinessSkills = ['Python', 'AI/ML', 'Cloud', 'UI/UX', 'Figma', 'IoT', 'Electronics', 'Product Strategy', 'Research']
const blankProfile = () => ({ name: '', college: '', skills: [], interests: [], availability: 'Flexible', experience: 'Beginner' })
const initials = name => name.trim().split(/\s+/).filter(Boolean).map(word => word[0]).join('').slice(0, 2).toUpperCase() || '?'

function Icon({ name, size = 20 }) {
  const paths = {
    spark: 'M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2zm7 13l.7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15z',
    users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m18-6v-2a4 4 0 0 0-3-3.87M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm6-4a4 4 0 0 1 0 7.75',
    arrow: 'M5 12h14m-6-6 6 6-6 6',
    check: 'm5 12 4 4L19 6',
    plus: 'M12 5v14M5 12h14',
    x: 'M18 6 6 18M6 6l12 12',
    bolt: 'm13 2-9 12h7l-1 8 10-13h-7l0-7z',
    compass: 'm16.24 7.76-1.71 4.78-4.78 1.71 1.71-4.78 4.78-1.71zM22 12A10 10 0 1 1 12 2a10 10 0 0 1 10 10z',
    activity: 'M3 12h4l3-8 4 16 3-8h4',
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>
}

function Chip({ children, active, onClick, small = false }) {
  return <button type="button" onClick={onClick} className={`chip ${active ? 'active' : ''} ${small ? 'small' : ''}`}>{active && <Icon name="check" size={14} />}{children}</button>
}

function Meter({ value }) {
  return <div className="meter" aria-label={`${value}% ready`}><div className="meter-fill" style={{ width: `${value}%` }} /></div>
}

function ClickSpark({
  sparkColor = '#b8ff6c',
  sparkSize = 10,
  sparkRadius = 15,
  sparkCount = 8,
  duration = 400,
  easing = 'ease-out',
  extraScale = 1,
  children,
}) {
  const canvasRef = useRef(null)
  const sparksRef = useRef([])
  const animationFrameRef = useRef(null)

  const easeFunc = useCallback((progress) => {
    switch (easing) {
      case 'linear':
        return progress
      case 'ease-in':
        return progress * progress
      case 'ease-in-out':
        return progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress
      default:
        return progress * (2 - progress)
    }
  }, [easing])

  useEffect(() => {
    const canvas = canvasRef.current
    const parent = canvas?.parentElement
    if (!canvas || !parent) return undefined

    const resizeCanvas = () => {
      const { width, height } = parent.getBoundingClientRect()
      const pixelRatio = window.devicePixelRatio || 1
      canvas.width = Math.max(1, Math.round(width * pixelRatio))
      canvas.height = Math.max(1, Math.round(height * pixelRatio))
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      canvas.getContext('2d')?.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
    }

    const observer = new ResizeObserver(resizeCanvas)
    observer.observe(parent)
    resizeCanvas()

    return () => observer.disconnect()
  }, [])

  const draw = useCallback((timestamp) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    context.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight)

    sparksRef.current = sparksRef.current.filter((spark) => {
      const elapsed = timestamp - spark.startTime
      if (elapsed >= duration) return false

      const progress = elapsed / duration
      const eased = easeFunc(progress)
      const distance = eased * sparkRadius * extraScale
      const lineLength = sparkSize * (1 - eased)
      const x1 = spark.x + distance * Math.cos(spark.angle)
      const y1 = spark.y + distance * Math.sin(spark.angle)
      const x2 = spark.x + (distance + lineLength) * Math.cos(spark.angle)
      const y2 = spark.y + (distance + lineLength) * Math.sin(spark.angle)

      context.strokeStyle = sparkColor
      context.globalAlpha = 1 - eased
      context.lineWidth = 2
      context.beginPath()
      context.moveTo(x1, y1)
      context.lineTo(x2, y2)
      context.stroke()
      return true
    })

    context.globalAlpha = 1
    animationFrameRef.current = sparksRef.current.length > 0 ? requestAnimationFrame(draw) : null
  }, [duration, easeFunc, extraScale, sparkColor, sparkRadius, sparkSize])

  useEffect(() => () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
  }, [])

  const handleClick = (event) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const now = performance.now()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    sparksRef.current.push(...Array.from({ length: sparkCount }, (_, index) => ({
      x,
      y,
      angle: (2 * Math.PI * index) / sparkCount,
      startTime: now,
    })))

    if (!animationFrameRef.current) animationFrameRef.current = requestAnimationFrame(draw)
  }

  return <div className="click-spark" onClick={handleClick}><canvas ref={canvasRef} aria-hidden="true" />{children}</div>
}

function ParticleField() {
  const canvasRef = useRef(null)
  const frameRef = useRef(null)
  const pointerRef = useRef({ x: -1000, y: -1000, previousX: -1000, previousY: -1000 })

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    const container = canvas?.parentElement
    if (!canvas || !context || !container) return undefined

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const palette = ['#B6FF4F', '#8B5CF6', '#2DD4BF']
    const trail = []
    let width = 0
    let height = 0
    let scale = 1
    let time = 0
    let lastTime = 0
    let gridOffset = 0
    let isVisible = !document.hidden

    const resize = () => {
      width = container.clientWidth
      height = container.clientHeight
      scale = Math.min(window.devicePixelRatio || 1, 1.5)
      canvas.width = Math.max(1, Math.round(width * scale))
      canvas.height = Math.max(1, Math.round(height * scale))
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      context.setTransform(scale, 0, 0, scale, 0, 0)
    }

    const drawGrid = () => {
      const size = window.innerWidth < 600 ? 34 : 46
      context.lineWidth = 0.65
      context.strokeStyle = 'rgba(139, 92, 246, 0.12)'
      context.beginPath()
      for (let x = -height; x < width + height; x += size) {
        const offset = (gridOffset + x * 0.14) % (size * 2)
        context.moveTo(x + offset, 0)
        context.lineTo(x + offset + height, height)
      }
      context.stroke()
      context.strokeStyle = 'rgba(45, 212, 191, 0.06)'
      context.beginPath()
      for (let x = -height; x < width + height; x += size * 2) {
        const offset = (gridOffset * 0.55 + x * 0.08) % (size * 2)
        context.moveTo(x + offset, 0)
        context.lineTo(x + offset - height, height)
      }
      context.stroke()
    }

    const drawWaves = () => {
      const gap = window.innerWidth < 600 ? 42 : 54
      for (let row = -2; row < Math.ceil(height / gap) + 2; row += 1) {
        const baseY = row * gap + 14
        context.beginPath()
        for (let x = -20; x <= width + 20; x += 18) {
          const wave = Math.sin(x * 0.009 + time * 0.00055 + row * 0.7) * 8 + Math.sin(x * 0.019 - time * 0.00032) * 4
          const dx = x - pointerRef.current.x
          const dy = baseY - pointerRef.current.y
          const distance = Math.hypot(dx, dy)
          const cursorPush = distance < 155 ? (1 - distance / 155) * 13 : 0
          const y = baseY + wave + (dy / Math.max(distance, 1)) * cursorPush
          if (x === -20) context.moveTo(x, y)
          else context.lineTo(x, y)
        }
        context.strokeStyle = row % 4 === 0 ? 'rgba(182, 255, 79, 0.17)' : 'rgba(168, 179, 207, 0.08)'
        context.lineWidth = row % 4 === 0 ? 1 : 0.55
        context.stroke()
      }
    }

    const drawThreads = () => {
      const count = window.innerWidth < 600 ? 5 : 8
      for (let index = 0; index < count; index += 1) {
        const progress = index / Math.max(count - 1, 1)
        const y = height * (0.18 + progress * 0.68)
        const amplitude = 16 + progress * 30
        context.beginPath()
        for (let x = -30; x <= width + 30; x += 20) {
          const drift = Math.sin(x * 0.006 + time * 0.0003 + index) * amplitude + Math.sin(x * 0.014 - time * 0.00018) * 8
          const dx = x - pointerRef.current.x
          const distance = Math.abs(dx)
          const pull = distance < 190 ? (1 - distance / 190) * 18 : 0
          const pointY = y + drift + (pointerRef.current.y - y) * (pull / 1200)
          if (x === -30) context.moveTo(x, pointY)
          else context.lineTo(x, pointY)
        }
        const gradient = context.createLinearGradient(0, 0, width, 0)
        gradient.addColorStop(0, 'rgba(182,255,79,0)')
        gradient.addColorStop(.3, `${palette[index % palette.length]}55`)
        gradient.addColorStop(.7, `${palette[(index + 1) % palette.length]}44`)
        gradient.addColorStop(1, 'rgba(45,212,191,0)')
        context.strokeStyle = gradient
        context.lineWidth = index % 3 === 0 ? 1.2 : 0.7
        context.stroke()
      }
    }

    const drawTrail = () => {
      trail.forEach((point, index) => {
        const alpha = (1 - index / trail.length) * 0.22
        context.fillStyle = palette[index % palette.length]
        context.globalAlpha = alpha
        context.beginPath()
        context.arc(point.x, point.y, Math.max(1.5, 5 - index * 0.4), 0, Math.PI * 2)
        context.fill()
      })
      context.globalAlpha = 1
    }

    const draw = (timestamp = 0) => {
      if (!isVisible) return
      const delta = Math.min(timestamp - lastTime || 16, 42)
      lastTime = timestamp
      if (!reducedMotion.matches) {
        time += delta
        gridOffset = (gridOffset + delta * 0.012) % 92
      }
      context.clearRect(0, 0, width, height)
      drawGrid()
      drawWaves()
      drawThreads()
      drawTrail()
      if (!reducedMotion.matches) frameRef.current = requestAnimationFrame(draw)
    }

    const onVisibilityChange = () => {
      isVisible = !document.hidden
      if (isVisible && !reducedMotion.matches) frameRef.current = requestAnimationFrame(draw)
    }
    const onPointerMove = (event) => {
      const rect = canvas.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      pointerRef.current = { x, y, previousX: pointerRef.current.x, previousY: pointerRef.current.y }
      if (!reducedMotion.matches) trail.unshift({ x, y })
      if (trail.length > 12) trail.length = 12
    }
    const onPointerLeave = () => { pointerRef.current = { x: -1000, y: -1000, previousX: -1000, previousY: -1000 }; trail.length = 0 }

    resize()
    draw()
    const observer = new ResizeObserver(resize)
    observer.observe(container)
    document.addEventListener('visibilitychange', onVisibilityChange)
    container.addEventListener('pointermove', onPointerMove)
    container.addEventListener('pointerleave', onPointerLeave)
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
      observer.disconnect()
      document.removeEventListener('visibilitychange', onVisibilityChange)
      container.removeEventListener('pointermove', onPointerMove)
      container.removeEventListener('pointerleave', onPointerLeave)
    }
  }, [])

  return <canvas className="particle-field" ref={canvasRef} aria-hidden="true" />
}

function GlassIcon({ name, size = 22 }) {
  const paths = {
    discover: 'M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1m0-12.8-2.1 2.1m-8.6 8.6-2.1 2.1M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z',
    match: 'M7 17 17 7m-7-2H7a2 2 0 0 0-2 2v3m12 6h-3a2 2 0 0 1-2-2v-3',
    create: 'm13 2-8 11h6l-1 9 8-11h-6l1-9Z',
    design: 'M4 19.5V5.8A1.8 1.8 0 0 1 5.8 4h12.4A1.8 1.8 0 0 1 20 5.8v8.4M4 19.5h13a3 3 0 0 0 3-3M4 19.5a3 3 0 0 0 3 3h9m-7-14h7m-7 4h4',
    code: 'm8 9-3 3 3 3m8-6 3 3-3 3m-3-10-4 14',
    research: 'M10.5 19a7.5 7.5 0 1 1 5.3-12.8L21 11.4M15 15l5.5 5.5M8 10h5m-5 3h3',
    startup: 'M12 2c4 3 7 6.6 7 11a7 7 0 1 1-14 0c0-4.4 3-8 7-11Zm0 8c1.7 1.3 2.5 2.7 2.5 4a2.5 2.5 0 1 1-5 0c0-1.3.8-2.7 2.5-4Z',
    verified: 'm5 12 4 4L19 6m-7-4 2 2 3-.2.8 3 2.2 2-2.2 2 .2 3-3 .8-2 2-2-2-3 .2-.8-3-2-2Z',
  }
  return <span className={`glass-icon glass-icon-${name}`}><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg></span>
}

function ScoreRing({ value }) {
  return <div className="feature-score" style={{ '--score': `${value * 3.6}deg` }}><strong>{value}<small>%</small></strong></div>
}

function App() {
  const [view, setView] = useState('home')
  const [profile, setProfile] = useState(blankProfile)
  const [candidateDraft, setCandidateDraft] = useState(blankProfile)
  const [candidates, setCandidates] = useState([])
  const [discoveredProfiles, setDiscoveredProfiles] = useState([])
  const [publishedProfileId, setPublishedProfileId] = useState('')
  const [matches, setMatches] = useState([])
  const [team, setTeam] = useState([])
  const [health, setHealth] = useState({ loading: true, status: 'Checking API' })
  const [error, setError] = useState('')
  const [isMatching, setIsMatching] = useState(false)
  const [idea, setIdea] = useState(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [isDiscovering, setIsDiscovering] = useState(false)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    fetch(`${API}/health`)
      .then(response => response.ok ? response.json() : Promise.reject(new Error('Health check failed')))
      .then(data => setHealth({ loading: false, status: data.status, source: data.matching_source }))
      .catch(() => setHealth({ loading: false, status: 'offline' }))
  }, [])

  const updateSelection = (setValue, field, value) => {
    setValue(current => ({
      ...current,
      [field]: current[field].includes(value)
        ? current[field].filter(item => item !== value)
        : [...current[field], value],
    }))
  }

  const addCandidate = () => {
    if (candidateDraft.name.trim().length < 2 || candidateDraft.skills.length === 0) {
      setError('Each candidate needs a name and at least one skill before they can join the runtime pool.')
      return
    }
    setCandidates(current => [...current, {
      ...candidateDraft,
      name: candidateDraft.name.trim(),
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `candidate-${Date.now()}-${current.length}`,
    }])
    setCandidateDraft(blankProfile())
    setError('')
    setNotice('')
  }

  const loadProfiles = async () => {
    setIsDiscovering(true)
    setError('')
    try {
      const response = await fetch(`${API}/profiles`)
      if (!response.ok) throw new Error('Published profiles are unavailable. Check that the backend is running.')
      const data = await response.json()
      setDiscoveredProfiles(data.profiles)
      setNotice(data.profiles.length ? `${data.profiles.length} published profile${data.profiles.length === 1 ? '' : 's'} found.` : 'No profiles have been published yet. Add one above to get started.')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsDiscovering(false)
    }
  }

  const publishProfile = async () => {
    if (profile.name.trim().length < 2 || profile.skills.length === 0) {
      setError('Add your name and at least one skill before publishing your profile.')
      return
    }
    setIsPublishing(true)
    setError('')
    setNotice('')
    try {
      const response = await fetch(`${API}/profiles`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(profile),
      })
      if (!response.ok) throw new Error('Your profile could not be published.')
      const data = await response.json()
      setPublishedProfileId(data.profile.id)
      setNotice(data.message)
      await loadProfiles()
    } catch (requestError) {
      setError(requestError.message || 'Your profile could not be published.')
    } finally {
      setIsPublishing(false)
    }
  }

  const addDiscoveredProfile = candidate => {
    if (candidate.id === publishedProfileId || candidate.name.trim().toLocaleLowerCase() === profile.name.trim().toLocaleLowerCase()) {
      setError('Your own profile cannot be added as a teammate.')
      return
    }
    setCandidates(current => current.some(item => item.id === candidate.id) ? current : [...current, candidate])
    setError('')
    setNotice(`${candidate.name} was added from published profiles.`)
  }

  const findMatches = async () => {
    if (profile.name.trim().length < 2 || profile.skills.length === 0) {
      setError('Add your name and at least one skill to find a strong team fit.')
      return
    }
    if (candidates.length === 0) {
      setError('Add at least one available candidate to the runtime pool before matching.')
      return
    }
    setError('')
    setIsMatching(true)
    try {
      const response = await fetch(`${API}/matches`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ student: profile, candidates }),
      })
      if (!response.ok) throw new Error('The matching service could not respond.')
      const data = await response.json()
      setMatches(data.matches)
      setTeam([])
      setIdea(null)
      setView('matches')
    } catch (requestError) {
      setError(requestError.message || 'Unable to find matches. Check that the backend is running.')
    } finally {
      setIsMatching(false)
    }
  }

  const addToTeam = match => {
    setTeam(current => current.some(member => member.id === match.candidate.id) ? current : [...current, match.candidate])
    setIdea(null)
  }

  const removeFromTeam = id => {
    setTeam(current => current.filter(member => member.id !== id))
    setIdea(null)
  }

  const allTeamSkills = useMemo(() => [...new Set([...profile.skills, ...team.flatMap(member => member.skills)])], [profile.skills, team])
  const coveredSkills = readinessSkills.filter(skill => allTeamSkills.includes(skill))
  const gaps = readinessSkills.filter(skill => !allTeamSkills.includes(skill))
  const readiness = Math.round((coveredSkills.length / readinessSkills.length) * 100)

  const generateIdea = async () => {
    setIsGenerating(true)
    setError('')
    try {
      const response = await fetch(`${API}/project-idea`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ team_skills: allTeamSkills }),
      })
      if (!response.ok) throw new Error('The project generator is unavailable.')
      setIdea(await response.json())
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsGenerating(false)
    }
  }

  const navTo = target => {
    if (target === 'matches' && matches.length === 0) return setView('profile')
    setView(target)
  }

  const clearProfiles = () => {
    setProfile(blankProfile())
    setCandidateDraft(blankProfile())
    setCandidates([])
    setDiscoveredProfiles([])
    setPublishedProfileId('')
    setMatches([])
    setTeam([])
    setIdea(null)
    setError('')
    setNotice('')
  }

  return <ClickSpark>
    <main>
    <nav className="nav wrap">
      <button className="brand" onClick={() => setView('home')} aria-label="SkillBridge home"><span className="brand-mark"><Icon name="spark" size={18} /></span>SkillBridge</button>
      <div className="nav-links">
        <button className={view === 'profile' ? 'selected' : ''} onClick={() => navTo('profile')}>Profile</button>
        <button className={view === 'matches' ? 'selected' : ''} onClick={() => navTo('matches')}>Matches</button>
        <button className={view === 'team' ? 'selected' : ''} onClick={() => navTo('team')}>Team <span className="team-count">{team.length}</span></button>
      </div>
      <div className={`api-status ${health.status === 'ok' ? 'online' : ''}`}><span className="status-dot" />{health.loading ? 'Checking API' : health.status === 'ok' ? 'API live · Runtime profiles' : 'API offline'}</div>
    </nav>

    {view === 'home' && <>
      <section className="home wrap home-hero">
        <ParticleField />
        <div className="hero-copy reveal">
          <p className="eyebrow"><span className="live-dot" />TEAM FORMATION, REIMAGINED</p>
          <h1>Build the team<br /><em>your idea needs.</em></h1>
          <p className="hero-description">Discover collaborators who fill your gaps—not people who mirror your résumé. SkillBridge makes complementary skills visible in minutes.</p>
          <div className="hero-actions"><button className="button primary" onClick={() => setView('profile')}>Start matching <Icon name="arrow" size={18} /></button><button className="button secondary" onClick={() => setView('profile')}>Create your profile</button></div>
          <p className="demo-note"><Icon name="spark" size={16} />Runtime profiles · Project generator uses a clearly labelled demo / fallback mode</p>
        </div>
        <div className="hero-panel reveal delay-one">
          <div className="hero-glow" /><div className="orbit orbit-one" /><div className="orbit orbit-two" />
          <div className="connection c-one"><i /></div><div className="connection c-two"><i /></div>
          <div className="person-card card-main"><span className="avatar avatar-you"><GlassIcon name="verified" size={18} /></span><div><strong>Your profile</strong><small>Skills you enter</small></div><span className="node-status" /></div>
          <div className="person-card card-design"><span className="avatar avatar-design"><GlassIcon name="design" size={18} /></span><div><strong>Design profile</strong><small>Runtime candidate</small></div><span className="fit-pill">Live input</span></div>
          <div className="person-card card-iot"><span className="avatar avatar-iot"><GlassIcon name="code" size={18} /></span><div><strong>Builder profile</strong><small>Runtime candidate</small></div><span className="fit-pill">Live input</span></div>
          <div className="panel-caption"><Icon name="spark" size={17} />Complementary strengths, connected.</div>
        </div>
        <div className="steps reveal delay-two">
          <div><span>01</span><GlassIcon name="discover" /><h3>Discover</h3><p>Show what you bring.</p></div>
          <div><span>02</span><GlassIcon name="match" /><h3>Match</h3><p>Find what you need.</p></div>
          <div><span>03</span><GlassIcon name="create" /><h3>Create</h3><p>Build something meaningful.</p></div>
        </div>
      </section>
      <section className="home-section wrap reveal"><div className="section-heading"><div><p className="eyebrow">SIGNALS FROM THE NETWORK</p><h2>Small teams. Bigger range.</h2></div><p>SkillBridge makes the missing capability visible before your project gets stuck.</p></div><div className="stats-grid"><div className="stat-card"><strong>65<span>%</span></strong><p>of every match is driven by complementary skill coverage.</p></div><div className="stat-card"><strong>3<span>×</span></strong><p>signals combine to find a more useful collaborator.</p></div><div className="stat-card"><strong>24<span>/7</span></strong><p>runtime profiles ready to become your next teammate.</p></div></div></section>
      <section className="home-section wrap reveal"><div className="section-heading"><div><p className="eyebrow">FEATURED PROJECTS</p><h2>Ideas with room to grow.</h2></div><button className="button ghost" onClick={() => setView('profile')}>Build your team <Icon name="arrow" size={16} /></button></div><div className="project-grid"><article className="project-card"><div className="project-top"><span className="project-kicker"><GlassIcon name="startup" size={16} />Smart campus</span><ScoreRing value={92} /></div><h3>WasteLess Campus</h3><p>IoT signals, civic design, and a clear path to a cleaner campus.</p><div className="project-tags"><span>IoT</span><span>UI/UX</span><span>Research</span></div></article><article className="project-card project-purple"><div className="project-top"><span className="project-kicker"><GlassIcon name="research" size={16} />Accessibility</span><ScoreRing value={86} /></div><h3>OpenRoute</h3><p>Make everyday routes more legible, inclusive, and community-led.</p><div className="project-tags"><span>React</span><span>Research</span><span>Strategy</span></div></article><article className="project-card project-teal"><div className="project-top"><span className="project-kicker"><GlassIcon name="code" size={16} />Climate data</span><ScoreRing value={79} /></div><h3>CityPulse</h3><p>Turn local climate data into actions people can actually feel.</p><div className="project-tags"><span>Python</span><span>Cloud</span><span>Data</span></div></article></div></section>
      <section className="home-section wrap category-section reveal"><div className="section-heading"><div><p className="eyebrow">SKILL CATEGORIES</p><h2>Find the missing shape.</h2></div><p>Teams become stronger when different disciplines have a seat at the table.</p></div><div className="category-grid"><div><GlassIcon name="design" /><strong>Design & experience</strong><span>UI/UX · Figma · Research</span></div><div><GlassIcon name="code" /><strong>Build & systems</strong><span>React · Python · Cloud</span></div><div><GlassIcon name="research" /><strong>Insight & strategy</strong><span>Product · Data · Speaking</span></div><div><GlassIcon name="startup" /><strong>Purpose & impact</strong><span>Sustainability · Education</span></div></div></section>
      <section className="cta-band wrap reveal"><div><p className="eyebrow">YOUR NEXT COLLABORATION STARTS HERE</p><h2>Don’t build alone by default.</h2><p>Bring your strengths. We’ll help reveal the people who make the idea possible.</p></div><button className="button primary" onClick={() => setView('profile')}>Start matching <Icon name="arrow" size={18} /></button></section>
    </>}

    {view === 'profile' && <section className="page wrap narrow">
      <div className="page-heading"><p className="eyebrow">STEP 01 · YOUR PROFILE</p><h1>What do you bring to the table?</h1><p>Choose the skills and causes that make your best collaboration click.</p></div>
      <div className="form-card">
        <label>Your name<input value={profile.name} onChange={event => setProfile({ ...profile, name: event.target.value })} placeholder="Enter your name" maxLength="40" /></label>
        <label>College or university <input value={profile.college} onChange={event => setProfile({ ...profile, college: event.target.value })} placeholder="Optional" maxLength="80" /></label>
        <fieldset><legend>Your skills <span>Choose all that apply</span></legend><div className="chip-grid">{skills.map(skill => <Chip key={skill} active={profile.skills.includes(skill)} onClick={() => updateSelection(setProfile, 'skills', skill)}>{skill}</Chip>)}</div></fieldset>
        <fieldset><legend>What do you care about? <span>Optional, but improves matches</span></legend><div className="chip-grid">{interests.map(interest => <Chip key={interest} active={profile.interests.includes(interest)} onClick={() => updateSelection(setProfile, 'interests', interest)}>{interest}</Chip>)}</div></fieldset>
        <label>Your best time to collaborate<select value={profile.availability} onChange={event => setProfile({ ...profile, availability: event.target.value })}>{['Flexible', 'Weekdays', 'Evenings', 'Weekends'].map(option => <option key={option}>{option}</option>)}</select></label>
        <label>Experience level<select value={profile.experience} onChange={event => setProfile({ ...profile, experience: event.target.value })}>{['Beginner', 'Intermediate', 'Advanced'].map(option => <option key={option}>{option}</option>)}</select></label>
        <section className="publish-section">
          <div><p className="eyebrow">SAVE FOR DISCOVERY</p><h2>Make your profile discoverable</h2><p>Publish voluntarily to the local SkillBridge database. Nothing is preloaded, and you can still match without publishing.</p></div>
          <div className="publish-actions"><button type="button" className="button secondary" onClick={loadProfiles} disabled={isDiscovering}>{isDiscovering ? 'Checking…' : 'Discover published profiles'}</button><button type="button" className="button primary" onClick={publishProfile} disabled={isPublishing}>{isPublishing ? 'Publishing…' : <>Publish my profile <Icon name="arrow" size={17} /></>}</button></div>
          {discoveredProfiles.length > 0 && <div className="discovery-list">{discoveredProfiles.map(candidate => {
            const inPool = candidates.some(item => item.id === candidate.id)
            const isSelf = candidate.id === publishedProfileId || candidate.name.trim().toLocaleLowerCase() === profile.name.trim().toLocaleLowerCase()
            return <div className="discovery-member" key={candidate.id}><span className="avatar">{initials(candidate.name)}</span><div><strong>{candidate.name}</strong><small>{[candidate.college, candidate.experience, candidate.skills.join(' · ')].filter(Boolean).join(' · ')}</small></div><button type="button" className={`button ${inPool ? 'added' : 'secondary'} compact`} onClick={() => addDiscoveredProfile(candidate)} disabled={inPool || isSelf}>{isSelf ? 'Your profile' : inPool ? 'In pool' : 'Add'}</button></div>
          })}</div>}
        </section>
        <section className="candidate-section">
          <div className="candidate-section-heading"><div><p className="eyebrow">RUNTIME CANDIDATE POOL</p><h2>Add people available now</h2><p>Add a person manually, or pull published profiles into the same matching pool.</p></div><span className="pool-count">{candidates.length} added</span></div>
          <div className="candidate-draft">
            <label>Candidate name<input value={candidateDraft.name} onChange={event => setCandidateDraft({ ...candidateDraft, name: event.target.value })} placeholder="Enter a name" maxLength="40" /></label>
            <fieldset><legend>Candidate skills</legend><div className="chip-grid">{skills.map(skill => <Chip key={skill} small active={candidateDraft.skills.includes(skill)} onClick={() => updateSelection(setCandidateDraft, 'skills', skill)}>{skill}</Chip>)}</div></fieldset>
            <fieldset><legend>Candidate interests <span>Optional</span></legend><div className="chip-grid">{interests.map(interest => <Chip key={interest} small active={candidateDraft.interests.includes(interest)} onClick={() => updateSelection(setCandidateDraft, 'interests', interest)}>{interest}</Chip>)}</div></fieldset>
            <label>Candidate availability<select value={candidateDraft.availability} onChange={event => setCandidateDraft({ ...candidateDraft, availability: event.target.value })}>{['Flexible', 'Weekdays', 'Evenings', 'Weekends'].map(option => <option key={option}>{option}</option>)}</select></label>
            <button type="button" className="button secondary" onClick={addCandidate}><Icon name="plus" size={17} />Add to pool</button>
          </div>
          {candidates.length > 0 && <div className="candidate-pool">{candidates.map(candidate => <div className="pool-member" key={candidate.id}><span className="avatar">{initials(candidate.name)}</span><div><strong>{candidate.name}</strong><small>{candidate.skills.join(' · ')}</small></div><button className="remove" onClick={() => setCandidates(current => current.filter(item => item.id !== candidate.id))} aria-label={`Remove ${candidate.name}`}><Icon name="x" size={17} /></button></div>)}</div>}
        </section>
        {error && <div className="alert"><Icon name="x" size={17} />{error}</div>}
        {notice && <div className="notice"><Icon name="check" size={17} />{notice}</div>}
        <div className="form-actions"><button className="button ghost" onClick={clearProfiles}>Clear profiles</button><button className="button primary" onClick={findMatches} disabled={isMatching}>{isMatching ? 'Finding your bridge…' : <>Find runtime matches <Icon name="arrow" size={18} /></>}</button></div>
      </div>
    </section>}

    {view === 'matches' && <section className="page wrap">
      <div className="matches-header"><div className="page-heading"><p className="eyebrow">STEP 02 · COMPLEMENTARY MATCHES</p><h1>Your strongest bridges</h1><p>We prioritize the skills you do not yet have, then factor in shared interests and availability.</p></div><button className="button secondary" onClick={() => setView('team')}>View team <span className="team-count dark">{team.length}</span></button></div>
      {matches.length === 0 ? <Empty icon="compass" title="No matches yet" description="Build your profile first and we’ll look for the skills that complete it." action={() => setView('profile')} actionText="Create profile" /> : <>
        <div className="algorithm-banner"><span className="algorithm-icon"><Icon name="activity" /></span><div><strong>Transparent matching</strong><p>Complementary coverage carries the most weight: 65%, followed by shared interests (20%) and availability (15%).</p></div></div>
        <div className="match-grid">{matches.map((match, index) => {
          const selected = team.some(member => member.id === match.candidate.id)
          return <article className="match-card" key={match.candidate.id}>
            <div className="match-top"><span className={`rank rank-${index + 1}`}>#{index + 1}</span><div className="score-ring" style={{ '--score': `${match.score * 3.6}deg` }}><b>{match.score}<small>%</small></b></div></div>
            <div className="candidate"><span className="avatar">{initials(match.candidate.name)}</span><div><h2>{match.candidate.name}</h2><p>{match.candidate.availability} availability</p></div></div>
            <p className="headline">{match.complementary_skills.length ? `Adds ${match.complementary_skills.join(', ')} to your current skill coverage.` : 'Shares your interests and brings a different collaboration perspective.'}</p>
            <div className="skills-row">{match.candidate.skills.map(skill => <span key={skill}>{skill}</span>)}</div>
            <div className="why"><span><Icon name="spark" size={16} /></span><p>{match.why}</p></div>
            <div className="breakdown"><span>Gap coverage <b>{match.score_breakdown.complementary_coverage}</b></span><span>Shared interest <b>{match.score_breakdown.shared_interests}</b></span><span>Availability <b>{match.score_breakdown.availability}</b></span></div>
            <button className={`button ${selected ? 'added' : 'secondary'} full`} onClick={() => selected ? removeFromTeam(match.candidate.id) : addToTeam(match)}>{selected ? <><Icon name="check" size={17} />Added to team</> : <><Icon name="plus" size={17} />Add teammate</>}</button>
          </article>
        })}</div>
      </>}
    </section>}

    {view === 'team' && <section className="page wrap">
      <div className="matches-header"><div className="page-heading"><p className="eyebrow">STEP 03 · TEAM DASHBOARD</p><h1>From strengths to a ship-ready idea.</h1><p>See what this team can make, then turn it into a focused hackathon build.</p></div><button className="button secondary" onClick={() => navTo('matches')}>Browse matches</button></div>
      {team.length === 0 ? <Empty icon="users" title="Your team is waiting" description="Add complementary teammates to reveal your combined strengths and project readiness." action={() => navTo('matches')} actionText="Find teammates" /> : <>
        <div className="team-layout">
          <section className="team-roster panel"><div className="panel-title"><div><p className="eyebrow">YOUR CREW</p><h2>{profile.name || 'You'} + {team.length}</h2></div><span className="crew-total">{team.length + 1} people</span></div>
            <div className="member-list"><MemberCard member={{ ...profile, id: 'you' }} owner /><>{team.map(member => <MemberCard key={member.id} member={member} remove={() => removeFromTeam(member.id)} />)}</></div>
          </section>
          <section className="readiness panel"><p className="eyebrow">SKILL COVERAGE</p><div className="readiness-value"><span>{readiness}%</span><p>project ready</p></div><Meter value={readiness} /><p className="readiness-description">{readiness === 100 ? 'Your team covers every core capability for the demo build.' : `${gaps.length} core ${gaps.length === 1 ? 'capability still needs' : 'capabilities still need'} coverage.`}</p><div className="coverage-list">{readinessSkills.map(skill => <div key={skill} className={coveredSkills.includes(skill) ? 'covered' : ''}><span>{coveredSkills.includes(skill) ? <Icon name="check" size={14} /> : '+'}</span>{skill}</div>)}</div></section>
        </div>
        <div className="strengths-grid"><section className="panel"><p className="eyebrow">TEAM STRENGTHS</p><h2>What you can own now</h2><div className="tag-wall">{allTeamSkills.map(skill => <span key={skill}>{skill}</span>)}</div></section><section className="panel gap-panel"><p className="eyebrow">REMAINING GAPS</p><h2>{gaps.length ? 'Where a mentor can help' : 'No core gaps left'}</h2>{gaps.length ? <div className="tag-wall muted">{gaps.map(skill => <span key={skill}>{skill}</span>)}</div> : <p className="success-copy"><Icon name="check" size={17} />This is a well-rounded hackathon team.</p>}</section></div>
        <section className="generator"><div><p className="eyebrow">DEMO / FALLBACK MODE</p><h2>Generate a project worth building.</h2><p>Get a transparent, deterministic concept shaped around the capabilities your team has assembled.</p></div><button className="button primary" onClick={generateIdea} disabled={isGenerating}>{isGenerating ? 'Generating…' : <><Icon name="spark" size={18} />Generate project</>}</button></section>
        {error && <div className="alert"><Icon name="x" size={17} />{error}</div>}
        {idea && <ProjectIdea idea={idea} />}
      </>}
    </section>}
    <footer className="wrap"><span className="brand-mark mini"><Icon name="spark" size={13} /></span> SkillBridge · Build complementary teams, transparently.</footer>
    </main>
  </ClickSpark>
}

function MemberCard({ member, owner, remove }) {
  return <div className="member-card"><span className="avatar">{initials(member.name)}</span><div className="member-info"><strong>{member.name} {owner && <small>You</small>}</strong><span>{member.skills.join(' · ')}</span></div>{remove && <button className="remove" onClick={remove} aria-label={`Remove ${member.name}`}><Icon name="x" size={17} /></button>}</div>
}

function Empty({ icon, title, description, action, actionText }) {
  return <div className="empty"><span className="empty-icon"><Icon name={icon} size={28} /></span><h2>{title}</h2><p>{description}</p><button className="button primary" onClick={action}>{actionText} <Icon name="arrow" size={17} /></button></div>
}

function ProjectIdea({ idea }) {
  const project = idea.idea
  return <section className="idea-card"><div className="idea-title"><div><p className="eyebrow">PROJECT BRIEF · DEMO OUTPUT</p><h2>{project.title}</h2><p>{project.tagline}</p></div><span className="readiness-badge">{idea.readiness}% skill fit</span></div><div className="idea-body"><div><h3>The opportunity</h3><p>{project.problem}</p></div><div><h3>The concept</h3><p>{project.solution}</p></div></div><div className="idea-columns"><div><h3>Key features</h3><ul>{project.features.map(feature => <li key={feature}><Icon name="check" size={15} />{feature}</li>)}</ul></div><div><h3>Technology</h3><div className="tag-wall">{project.technology.map(item => <span key={item}>{item}</span>)}</div></div><div><h3>Prototype plan</h3><ol>{project.prototype_plan.map(step => <li key={step}>{step}</li>)}</ol></div></div><p className="fallback-text"><Icon name="spark" size={14} />{idea.disclaimer}</p></section>
}

createRoot(document.getElementById('root')).render(<App />)

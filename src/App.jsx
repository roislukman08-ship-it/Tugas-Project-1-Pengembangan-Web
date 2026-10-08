import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import './App.css'

// Cek apakah pengguna meminta animasi dikurangi (pengaturan sistem)
const kurangiGerak = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches
// Jika "kurangi gerak" aktif, semua durasi animasi dibuat 0
const t = (detik) => (kurangiGerak() ? 0 : detik)

// Komponen noise "semut": menggambar pixel acak abu-abu di <canvas>
function Semut({ aktif }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!aktif) return
    const kanvas = ref.current
    const ctx = kanvas.getContext('2d')
    const img = ctx.createImageData(kanvas.width, kanvas.height)
    let id
    const gambar = () => {
      const d = img.data
      for (let i = 0; i < d.length; i += 4) {
        d[i] = d[i + 1] = d[i + 2] = Math.random() * 255 // abu-abu acak
        d[i + 3] = 255
      }
      ctx.putImageData(img, 0, 0)
      // Kalau kurangi gerak: gambar sekali saja (statis)
      if (!kurangiGerak()) id = requestAnimationFrame(gambar)
    }
    gambar()
    return () => cancelAnimationFrame(id) // berhenti saat komponen tidak aktif
  }, [aktif])
  return <canvas ref={ref} className="semut" width="96" height="72" aria-hidden="true" />
}

// Teks petunjuk untuk tiap fase
const PETUNJUK = {
  mati: 'Putar knob untuk menyalakan TV',
  menyala: 'Menyetel siaran…',
  tayang: 'Isi data, lalu tekan Login',
  sukses: 'Putar knob lagi untuk mematikan TV',
}

export default function App() {
  // Fase: 'mati' | 'menyala' | 'tayang' | 'sukses'
  const [fase, setFase] = useState('mati')
  const [user, setUser] = useState('')
  const [sandi, setSandi] = useState('')
  const [galat, setGalat] = useState('')
  const [sibuk, setSibuk] = useState(false) // true saat animasi berjalan
  const [daya, setDaya] = useState(false) // true = TV hidup (dipakai lampu indikator)

  // Ref ke elemen yang dianimasikan GSAP
  const crt = useRef(null) // seluruh isi layar
  const kilat = useRef(null) // lapisan putih (garis / kilatan)
  const semutEl = useRef(null) // pembungkus noise
  const titik = useRef(null) // titik putih saat TV padam
  const knob = useRef(null) // knob power
  const cahaya = useRef(null) // cahaya biru ke dinding
  const tl = useRef(null)

  // Hentikan animasi kalau komponen dilepas
  useEffect(() => () => tl.current?.kill(), [])

  // FASE 1 -> 2: TV menyala
  const nyalakan = () => {
    setSibuk(true)
    setDaya(true) // lampu indikator langsung menyala
    setFase('menyala')
    const a = gsap.timeline({
      onComplete: () => {
        setFase('tayang')
        setSibuk(false)
      },
    })
    tl.current = a
    a.set(crt.current, { autoAlpha: 1, scaleX: 0, scaleY: 0.008 }) // mulai dari garis
      .set(kilat.current, { autoAlpha: 1 })
      .set(semutEl.current, { autoAlpha: 1 })
      .to(crt.current, { scaleX: 1, duration: t(0.35), ease: 'power2.out' }) // garis melebar
      .to(crt.current, { scaleY: 1, duration: t(0.4), ease: 'power3.inOut' }) // garis memenuhi layar
      .to(kilat.current, { autoAlpha: 0, duration: t(0.4) }, '<0.1') // putih memudar -> noise
      .to({}, { duration: kurangiGerak() ? 0.4 : 1.2 }) // noise ±1,2 detik
      .to(semutEl.current, { autoAlpha: 0, duration: t(0.3) })
      .set(crt.current, { clearProps: 'transform' })
      .to(knob.current, { rotation: 100, duration: t(0.5), ease: 'back.out(1.7)' }, 0)
      .to(cahaya.current, { opacity: 1, duration: t(1.6) }, 0.3)
  }

  // FASE 4 -> 1: TV dimatikan ala TV lama, lalu reset
  const matikan = () => {
    setSibuk(true)
    setDaya(false) // lampu indikator langsung padam
    const a = gsap.timeline({
      onComplete: () => {
        setUser('')
        setSandi('')
        setGalat('')
        setFase('mati')
        setSibuk(false)
      },
    })
    tl.current = a
    a.to(crt.current, { scaleY: 0.008, duration: t(0.25), ease: 'power3.in' }) // mengecil jadi garis
      .to(kilat.current, { autoAlpha: 1, duration: t(0.12) }, 0)
      .to(crt.current, { scaleX: 0.01, duration: t(0.2), ease: 'power3.in' }) // garis jadi titik
      .set(crt.current, { autoAlpha: 0 })
      .fromTo(titik.current, { autoAlpha: 1, scale: 1 }, { scale: 0.6, duration: t(0.15) })
      .to(titik.current, { autoAlpha: 0, scale: 0.2, duration: t(0.5), ease: 'power2.in' }, '+=0.15')
      .set(crt.current, { clearProps: 'transform' })
      .to(knob.current, { rotation: 0, duration: t(0.5), ease: 'power2.out' }, 0)
      .to(cahaya.current, { opacity: 0, duration: t(0.6) }, 0.2)
  }

  // Knob power: dipakai untuk menyalakan dan mematikan
  const putarKnob = () => {
    if (sibuk) return // abaikan saat animasi masih jalan
    if (fase === 'mati') nyalakan()
    else matikan()
  }

  // Validasi sederhana saat tombol Masuk ditekan
  const kirim = (e) => {
    e.preventDefault()
    if (!user.trim()) return setGalat('! Username belum diisi')
    if (!sandi) return setGalat('! Password belum diisi')
    setGalat('')
    setFase('sukses')
  }

  return (
    <main className="halaman">
      <div className="cahaya" ref={cahaya} aria-hidden="true" />
      <h1 className="judul">Silahkan Masuk </h1>
      <p className="subjudul">Nyalakan TV, lalu masuk ke siaran.</p>

      <div className={`tv ${fase !== 'mati' ? 'hidup' : ''}`}>
        {/* Dua antena kelinci berbentuk V */}
        <div className="antena" aria-hidden="true"><i /><i /></div>

        <div className="badan">
          <div className="bingkai">
            <div className="layar">
              {/* Isi layar yang "menyala" */}
              <div className="crt" ref={crt}>
                <div className="siaran">
                  {fase === 'tayang' && (
                    <form className="formulir" onSubmit={kirim} noValidate>
                      <h2>CH 03 · LOGIN</h2>
                      <label>
                        Username
                        <input
                          value={user}
                          onChange={(e) => setUser(e.target.value)}
                          autoComplete="username"
                          autoFocus
                        />
                      </label>
                      <label>
                        Password
                        <input
                          type="password"
                          value={sandi}
                          onChange={(e) => setSandi(e.target.value)}
                          autoComplete="current-password"
                        />
                      </label>
                      {galat && <p className="galat" role="alert">{galat}</p>}
                      <button type="submit" className="masuk">Login</button>
                    </form>
                  )}
                  {fase === 'sukses' && (
                    <div className="sukses">
                      <div className="bars" />
                      <div className="salam">
                        <span>Selamat datang</span>
                        <strong>{user}</strong>
                      </div>
                    </div>
                  )}
                </div>
                <div className="semut-wrap" ref={semutEl}>
                  <Semut aktif={fase === 'menyala'} />
                </div>
                <div className="scan" />
                <div className="kilat" ref={kilat} />
              </div>
              <div className="titik" ref={titik} />
              <div className="vinyet" />
              <div className="pantul" />
            </div>
          </div>

          {/* Panel samping: 2 knob + grille speaker */}
          <div className="panel">
            <button
              type="button"
              className="knob"
              ref={knob}
              onClick={putarKnob}
              aria-label={fase === 'mati' ? 'Putar knob power untuk menyalakan TV' : 'Putar knob power untuk mematikan TV'}
            />
            {/* Lampu indikator: menyala saat TV hidup, padam saat TV mati */}
            <span className={`lampu ${daya ? 'nyala' : ''}`} aria-hidden="true" />
            <div className="grille" aria-hidden="true" />
          </div>
        </div>

        <div className="kaki" aria-hidden="true"><i /><i /></div>
      </div>

      <p className="petunjuk" aria-live="polite">{PETUNJUK[fase]}</p>
    </main>
  )
}
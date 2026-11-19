import "./styles.css"
import { startAurora } from "./aurora"

const root = document.documentElement
root.classList.add("js")
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches

// ---------- Background ----------
const canvas = document.getElementById("aurora")
if (canvas instanceof HTMLCanvasElement) startAurora(canvas)

// ---------- Intro (one orchestrated moment) ----------
requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add("ready")))

// ---------- Year ----------
const year = document.getElementById("year")
if (year) year.textContent = String(new Date().getFullYear())

// ---------- Light that follows the pointer across glass ----------
if (window.matchMedia("(hover: hover)").matches) {
  document.querySelectorAll<HTMLElement>(".glass").forEach((el) => {
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect()
      el.style.setProperty("--mx", `${e.clientX - r.left}px`)
      el.style.setProperty("--my", `${e.clientY - r.top}px`)
      el.style.setProperty("--glow", "1")
    })
    el.addEventListener("pointerleave", () => el.style.setProperty("--glow", "0"))
  })
}

// ---------- Count-up for metrics, once, when visible ----------
const counters = document.querySelectorAll<HTMLElement>("[data-count]")
if (!reduceMotion && "IntersectionObserver" in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return
      const el = entry.target as HTMLElement
      io.unobserve(el)
      const target = Number(el.dataset.count)
      const duration = 1400
      const start = performance.now()
      const tick = (now: number) => {
        const p = Math.min(1, (now - start) / duration)
        const eased = 1 - Math.pow(1 - p, 3)
        el.textContent = String(Math.round(target * eased))
        if (p < 1) requestAnimationFrame(tick)
      }
      el.textContent = "0"
      requestAnimationFrame(tick)
    })
  }, { threshold: 0.6 })
  counters.forEach((c) => io.observe(c))
}

// ---------- Case study tabs (WAI-ARIA tabs pattern) ----------
const tabs = Array.from(document.querySelectorAll<HTMLButtonElement>('[role="tab"]'))
const selectTab = (tab: HTMLButtonElement, focus = false) => {
  tabs.forEach((t) => {
    const selected = t === tab
    t.setAttribute("aria-selected", String(selected))
    t.tabIndex = selected ? 0 : -1
    const panel = document.getElementById(t.getAttribute("aria-controls") || "")
    if (panel) panel.hidden = !selected
  })
  if (focus) tab.focus()
}
tabs.forEach((tab, i) => {
  tab.addEventListener("click", () => selectTab(tab))
  tab.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault()
      const next = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length]
      selectTab(next, true)
    }
  })
})

// ---------- Build filters ----------
const filterButtons = Array.from(document.querySelectorAll<HTMLButtonElement>("[data-filter]"))
const builds = Array.from(document.querySelectorAll<HTMLElement>(".build"))
filterButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const filter = btn.dataset.filter || "all"
    filterButtons.forEach((b) => b.setAttribute("aria-pressed", String(b === btn)))
    builds.forEach((card) => {
      const tags = (card.dataset.tags || "").split(" ")
      const match = filter === "all" || tags.includes(filter)
      card.classList.toggle("is-dimmed", !match)
      card.setAttribute("aria-hidden", String(!match))
      card.querySelectorAll("a").forEach((a) => (a.tabIndex = match ? 0 : -1))
    })
  })
})

// ---------- Nav: mark the section in view ----------
const navLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>('.nav ul a[href^="#"]'))
const sections = navLinks
  .map((a) => document.querySelector<HTMLElement>(a.getAttribute("href") || ""))
  .filter((s): s is HTMLElement => s !== null)
if ("IntersectionObserver" in window) {
  const navIO = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return
      navLinks.forEach((a) => a.setAttribute("aria-current", String(a.getAttribute("href") === `#${entry.target.id}`)))
    })
  }, { rootMargin: "-45% 0px -50% 0px" })
  sections.forEach((s) => navIO.observe(s))
}

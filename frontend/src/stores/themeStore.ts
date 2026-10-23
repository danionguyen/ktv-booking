import { create } from 'zustand'

/** 3 theme trong Figma "KTV Booking – UI" — token ở src/index.css. */
export type Theme = 'gold' | 'violet' | 'ivory'

export const THEMES: {
  value: Theme
  label: string
  dark: boolean
  swatch: [string, string, string]
}[] = [
  { value: 'gold', label: 'Đen & Vàng', dark: true, swatch: ['#0e0b07', '#d4af37', '#f8f0dc'] },
  { value: 'violet', label: 'Tím cổ điển', dark: false, swatch: ['#f5f5f7', '#722ed1', '#1f1f24'] },
  { value: 'ivory', label: 'Ivory & Gold', dark: false, swatch: ['#faf7f0', '#1b2a4a', '#c9a227'] },
]

export const DEFAULT_THEME: Theme = 'gold'
const STORAGE_KEY = 'ktv-theme' // script đầu index.html cũng đọc key này

function readTheme(): Theme {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return THEMES.some((t) => t.value === v) ? (v as Theme) : DEFAULT_THEME
  } catch {
    return DEFAULT_THEME
  }
}

function apply(theme: Theme) {
  const root = document.documentElement
  root.dataset.theme = theme
  root.classList.toggle('dark', THEMES.find((t) => t.value === theme)!.dark)
}

interface ThemeState {
  theme: Theme
  isDark: boolean
  setTheme: (theme: Theme) => void
}

const initial = readTheme()
apply(initial)

export const useThemeStore = create<ThemeState>((set) => ({
  theme: initial,
  isDark: THEMES.find((t) => t.value === initial)!.dark,
  setTheme: (theme) => {
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // không lưu được thì vẫn đổi theme cho phiên hiện tại
    }
    apply(theme)
    set({ theme, isDark: THEMES.find((t) => t.value === theme)!.dark })
  },
}))

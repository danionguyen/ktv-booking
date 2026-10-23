import { CheckIcon, PaletteIcon } from 'lucide-react'
import { Button } from '@components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@components/ui/dropdown-menu'
import { THEMES, useThemeStore } from '@stores/themeStore'

/** Chọn 1 trong 3 theme Figma; ô màu = nền · màu chính · chữ của theme. */
export function ThemeToggle() {
  const { theme, setTheme } = useThemeStore()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Đổi giao diện">
          <PaletteIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>Giao diện</DropdownMenuLabel>
        {THEMES.map((t) => (
          <DropdownMenuItem key={t.value} onSelect={() => setTheme(t.value)}>
            <span className="flex overflow-hidden rounded-full border" aria-hidden>
              {t.swatch.map((c) => (
                <span key={c} className="size-3.5" style={{ background: c }} />
              ))}
            </span>
            {t.label}
            {theme === t.value && <CheckIcon className="ml-auto" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

import { Check, Languages } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { languages, setLang, useLang, t } from "@/lib/i18n"
import { toast } from "@/lib/toast"

// Globe button in the top bar: pick the app's language.
export function LanguageMenu() {
  const lang = useLang()
  const current = languages.find((l) => l.code === lang) ?? languages[1]
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" className="h-11 gap-1.5 px-2.5" aria-label={`${t("Language")}: ${current.label}`}>
            <Languages className="size-5" aria-hidden="true" />
            <span className="text-sm font-medium">{current.short}</span>
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t("Language")}</DropdownMenuLabel>
          {languages.map((l) => (
            <DropdownMenuItem
              key={l.code}
              lang={l.code}
              className="min-h-11 justify-between text-base"
              onClick={() => {
                setLang(l.code)
                toast.success(l.label)
              }}
            >
              {l.label}
              {l.code === lang && <Check className="size-4 text-primary" aria-label="✓" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

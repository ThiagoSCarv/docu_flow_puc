// Campo de período (RF14): aceita "janeiro de 2026" ou AAAA-MM e converte entre os dois formatos.
import { useId, useState } from 'react'

// Fusos do Brasil; neles (ou em UTC) os meses aparecem em português, nos demais em inglês.
const brazilianTimeZones = new Set([
  'America/Araguaina',
  'America/Bahia',
  'America/Belem',
  'America/Boa_Vista',
  'America/Campo_Grande',
  'America/Cuiaba',
  'America/Eirunepe',
  'America/Fortaleza',
  'America/Maceio',
  'America/Manaus',
  'America/Noronha',
  'America/Porto_Velho',
  'America/Recife',
  'America/Rio_Branco',
  'America/Santarem',
  'America/Sao_Paulo',
  'Brazil/Acre',
  'Brazil/DeNoronha',
  'Brazil/East',
  'Brazil/West',
])

// Escolhe o idioma dos nomes de mês a partir do fuso horário do navegador.
export function periodLocale(
  timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone,
): 'pt-BR' | 'en-US' {
  return !timeZone || timeZone === 'UTC' || brazilianTimeZones.has(timeZone) ? 'pt-BR' : 'en-US'
}

// Um dia de cada mês em UTC, base para gerar os nomes dos meses com Intl.
const monthDates = Array.from({ length: 12 }, (_, month) => new Date(Date.UTC(2000, month, 1)))
function localizedMonths(locale: string) {
  const formatter = new Intl.DateTimeFormat(locale, { month: 'long', timeZone: 'UTC' })
  return monthDates.map((date) => formatter.format(date))
}

// Nomes dos meses calculados uma vez por idioma.
const monthNames = { 'pt-BR': localizedMonths('pt-BR'), 'en-US': localizedMonths('en-US') }

// Período no formato aceito pela API: AAAA-MM com mês de 01 a 12.
const isoPeriod = /^([0-9]{4})-(0[1-9]|1[0-2])$/

// Converte AAAA-MM em texto legível ("janeiro de 2026"); valor fora do padrão volta como veio.
export function formatPeriod(period: string, locale = periodLocale()) {
  const match = isoPeriod.exec(period)
  if (!match) return period
  const [, year, month] = match
  const name = monthNames[locale][Number(month) - 1]
  return locale === 'pt-BR' ? `${name} de ${year}` : `${name} ${year}`
}

// Converte AAAA-MM ou "mês [de] ano" (pt ou en) em AAAA-MM; undefined se não reconhecer.
export function parsePeriod(input: string) {
  const value = input.trim().toLowerCase().normalize('NFC')
  if (isoPeriod.test(value)) return value
  const match = /^(.+?)\s+(?:de\s+)?([0-9]{4})$/.exec(value)
  if (!match) return undefined
  const [, name, year] = match
  const month = monthNames['pt-BR'].findIndex(
    (word, index) => word === name || monthNames['en-US'][index].toLowerCase() === name,
  )
  if (month >= 0) return `${year}-${String(month + 1).padStart(2, '0')}`
}

type Props = {
  id: string
  required?: boolean
  value?: string
  onChange?: (value: string) => void
}

// Input de texto com sugestões dos últimos três anos; acusa período inválido só ao sair do campo.
export function PeriodField({ id, value, onChange, required }: Props) {
  const listId = useId()
  const [invalidOnBlur, setInvalid] = useState(false)
  const invalid = invalidOnBlur && value !== ''
  const year = new Date().getFullYear()
  const locale = periodLocale()
  const example = formatPeriod(`${year}-01`, locale)

  return (
    <>
      <input
        id={id}
        name="period"
        type="text"
        list={listId}
        placeholder={`Ex.: ${example}`}
        autoComplete="off"
        required={required}
        value={value}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? `${id}-error` : undefined}
        onChange={(event) => {
          setInvalid(false)
          onChange?.(event.target.value)
        }}
        onBlur={(event) => {
          const text = event.target.value.trim()
          setInvalid(Boolean(text && !parsePeriod(text)))
        }}
      />
      <datalist id={listId}>
        {[year, year - 1, year - 2].flatMap((optionYear) =>
          monthDates.map((date) => {
            const month = String(date.getUTCMonth() + 1).padStart(2, '0')
            const period = formatPeriod(`${optionYear}-${month}`, locale)
            return <option key={period} value={period} />
          }),
        )}
      </datalist>
      {invalid && (
        <small id={`${id}-error`}>Informe o período como {example} ou no formato AAAA-MM.</small>
      )}
    </>
  )
}

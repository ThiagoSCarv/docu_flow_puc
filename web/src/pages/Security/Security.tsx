// Tela de segurança (RF28): orientações educativas servidas pela API, em cartões com checklist.
import { useQuery } from '@tanstack/react-query'
import {
  CheckCircle2,
  HardDrive,
  KeyRound,
  Lock,
  type LucideIcon,
  MailWarning,
  MonitorSmartphone,
  Shield,
  ShieldCheck,
  UserCheck,
} from 'lucide-react'
import { api } from '../../api'
import { QueryStatus } from '../../components'
import './Security.css'

type Guideline = { id: string; title: string; summary: string; practices: string[] }

// Ícone por palavra-chave no id ou título da orientação; vale a primeira regra que casar.
const iconRules: { keywords: string[]; icon: LucideIcon }[] = [
  { keywords: ['senha'], icon: KeyRound },
  { keywords: ['golpe', 'phishing', 'e-mail', 'email'], icon: MailWarning },
  { keywords: ['acesso', 'permiss'], icon: Lock },
  { keywords: ['backup', 'copia'], icon: HardDrive },
  { keywords: ['cliente', 'dados', 'lgpd'], icon: UserCheck },
  { keywords: ['dispositivo', 'atualiza'], icon: MonitorSmartphone },
]

// Remove acentos e caixa para comparar as palavras-chave ("cópia" casa com "copia").
function normalize(text: string) {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

// Ícone da orientação, com escudo genérico quando nenhuma palavra-chave casa.
function guidelineIcon(guideline: Guideline) {
  const text = normalize(`${guideline.id} ${guideline.title}`)
  return (
    iconRules.find(({ keywords }) => keywords.some((keyword) => text.includes(keyword)))?.icon ??
    Shield
  )
}

// Página com o aviso geral e a grade de orientações.
function Security() {
  const guidelines = useQuery({
    queryKey: ['security-guidelines'],
    queryFn: ({ signal }) => api<Guideline[]>('/security-guidelines', { signal }),
  })
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="breadcrumb">Página inicial / Segurança</span>
          <h1>Segurança</h1>
          <p>Orientações para organizar e proteger informações digitais.</p>
        </div>
      </div>

      <div className="security-callout">
        <ShieldCheck size={20} aria-hidden="true" />
        <p>
          Estas são recomendações gerais. Os procedimentos específicos devem ser validados com o
          responsável pelo escritório.
        </p>
      </div>

      <QueryStatus pending={guidelines.isPending} error={guidelines.error} />
      {guidelines.data?.length === 0 && (
        <p className="security-empty">Nenhuma orientação disponível.</p>
      )}
      <div className="security-grid">
        {guidelines.data?.map((guideline) => {
          const Icon = guidelineIcon(guideline)
          const count = guideline.practices.length
          return (
            <article className="security-card" key={guideline.id}>
              <header className="security-card-header">
                <span className="security-card-icon">
                  <Icon size={22} aria-hidden="true" />
                </span>
                <div>
                  <h2>{guideline.title}</h2>
                  <span className="security-card-count">
                    {count === 1 ? '1 prática' : `${count} práticas`}
                  </span>
                </div>
              </header>
              <p className="security-card-summary">{guideline.summary}</p>
              <ul className="security-checklist">
                {guideline.practices.map((practice) => (
                  <li key={practice}>
                    <CheckCircle2 size={18} aria-hidden="true" />
                    <span>{practice}</span>
                  </li>
                ))}
              </ul>
            </article>
          )
        })}
      </div>
    </>
  )
}

export default Security

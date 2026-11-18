import { useQuery } from '@tanstack/react-query'
import { api } from '../../api'
import { QueryStatus } from '../../components'
import './Security.css'

type Guideline = { id: string; title: string; summary: string; practices: string[] }

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

      <div className="security-notice">
        Estas são recomendações gerais. Os procedimentos específicos devem ser validados com o
        responsável pelo escritório.
      </div>

      <QueryStatus pending={guidelines.isPending} error={guidelines.error} />
      {guidelines.data?.length === 0 && <p>Nenhuma orientação disponível.</p>}
      <div className="security-grid">
        {guidelines.data?.map((guideline) => (
          <article className="security-card" key={guideline.id}>
            <h2>{guideline.title}</h2>
            <p>{guideline.summary}</p>
            <ul>
              {guideline.practices.map((practice) => (
                <li key={practice}>{practice}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </>
  )
}

export default Security

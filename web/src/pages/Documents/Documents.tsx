import { useState } from 'react'
import './Documents.css'

const documents = [
  {
    id: '1',
    name: 'EMPRESA-EXEMPLO_CONT_2026-03_balanco-patrimonial',
    client: 'Empresa Exemplo',
    category: 'Contábeis',
    period: '2026-03',
  },
  {
    id: '2',
    name: 'CLIENTE-A_FIS_2026-04_guia-de-imposto',
    client: 'Cliente A',
    category: 'Fiscais',
    period: '2026-04',
  },
  {
    id: '3',
    name: 'CLIENTE-B_FIN_2026-04_contas-a-pagar',
    client: 'Cliente B',
    category: 'Financeiros',
    period: '2026-04',
  },
]

function Documents() {
  const [search, setSearch] = useState('')
  const [client, setClient] = useState('')
  const [category, setCategory] = useState('')
  const [period, setPeriod] = useState('')

  const filteredDocuments = documents.filter((document) => {
    const matchesSearch = document.name.toLowerCase().includes(search.trim().toLowerCase())

    const matchesClient = client === '' || document.client === client
    const matchesCategory = category === '' || document.category === category
    const matchesPeriod = period === '' || document.period === period

    return matchesSearch && matchesClient && matchesCategory && matchesPeriod
  })
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="breadcrumb">Página inicial / Documentos</span>
          <h1>Documentos</h1>
          <p>Consulte os registros dos documentos digitais do escritório.</p>
        </div>
      </div>

      <p className="documents-notice">
        Dados fictícios para demonstração. A conexão com o servidor será implementada depois.
      </p>

      <div className="documents-filters">
        <div className="documents-filter">
          <label htmlFor="document-search">Pesquisar por nome</label>
          <input
            id="document-search"
            type="search"
            placeholder="Ex.: balanco ou guia"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="documents-filter">
          <label htmlFor="document-client">Cliente</label>
          <select
            id="document-client"
            value={client}
            onChange={(event) => setClient(event.target.value)}
          >
            <option value="">Todos os clientes</option>
            <option value="Empresa Exemplo">Empresa Exemplo</option>
            <option value="Cliente A">Cliente A</option>
            <option value="Cliente B">Cliente B</option>
          </select>
        </div>

        <div className="documents-filter">
          <label htmlFor="document-category">Categoria</label>
          <select
            id="document-category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option value="">Todas as categorias</option>
            <option value="Contábeis">Contábeis</option>
            <option value="Fiscais">Fiscais</option>
            <option value="Financeiros">Financeiros</option>
          </select>
        </div>

        <div className="documents-filter">
          <label htmlFor="document-period">Período</label>
          <input
            id="document-period"
            type="month"
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
          />
        </div>

        <button
          type="button"
          className="documents-clear"
          onClick={() => {
            setSearch('')
            setClient('')
            setCategory('')
            setPeriod('')
          }}
        >
          Limpar filtros
        </button>
      </div>

      <p className="documents-count" role="status">
        {filteredDocuments.length} documento(s) encontrado(s)
      </p>

      <div className="documents-table-container">
        <table className="documents-table">
          <caption>Catálogo de documentos — dados fictícios</caption>
          <thead>
            <tr>
              <th scope="col">Nome padronizado</th>
              <th scope="col">Cliente</th>
              <th scope="col">Categoria</th>
              <th scope="col">Período</th>
            </tr>
          </thead>

          <tbody>
            {filteredDocuments.map((document) => (
              <tr key={document.id}>
                <td>{document.name}</td>
                <td>{document.client}</td>
                <td>{document.category}</td>
                <td>{document.period}</td>
              </tr>
            ))}

            {filteredDocuments.length === 0 && (
              <tr>
                <td colSpan={4} className="documents-empty">
                  Nenhum documento encontrado. Revise a pesquisa ou os filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}

export default Documents

import { useQuery } from '@tanstack/react-query'
import { useDeferredValue, useState } from 'react'
import {
  api,
  type Document,
  type Page,
  pageSize,
  useCategories,
  useClientOptions,
  useCurrentUser,
} from '../../api'
import { Pagination, QueryStatus, RecordForm } from '../../components'
import './Documents.css'

function Documents() {
  const clients = useClientOptions()
  const categories = useCategories()
  const { data: user } = useCurrentUser()
  const [offset, setOffset] = useState(0)
  const [search, setSearch] = useState('')
  const [client, setClient] = useState('')
  const [category, setCategory] = useState('')
  const [period, setPeriod] = useState('')

  const term = useDeferredValue(search.trim())
  const params = new URLSearchParams({ limit: String(pageSize), offset: String(offset) })
  if (term) params.set('search', term)
  if (client) params.set('clientId', client)
  if (category) params.set('categoryId', category)
  if (period) params.set('period', period)

  const documents = useQuery({
    queryKey: ['documents', params.toString()],
    queryFn: ({ signal }) => api<Page<Document>>(`/documents?${params.toString()}`, { signal }),
  })
  const clientNames = new Map(clients.data?.map(({ id, name }) => [id, name]))
  const categoryNames = new Map(categories.data?.map(({ id, name }) => [id, name]))
  const allowedCategories = categories.data?.filter(
    ({ id }) => user?.role === 'ADMIN' || user?.allowedCategoryIds.includes(id),
  )
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="breadcrumb">Página inicial / Documentos</span>
          <h1>Documentos</h1>
          <p>Consulte os registros dos documentos digitais do escritório.</p>
        </div>
      </div>

      <QueryStatus
        pending={clients.isPending || categories.isPending}
        error={clients.error ?? categories.error}
      />
      {user?.role !== 'CONSULTA' &&
        allowedCategories &&
        allowedCategories.length > 0 &&
        clients.data?.some(({ active }) => active) && (
          <RecordForm
            title="Cadastrar documento"
            path="/documents"
            resource="documents"
            fields={(data) => ({
              clientId: data.get('clientId'),
              categoryId: data.get('categoryId'),
              period: data.get('period'),
              description: data.get('description'),
              cloudLocation: data.get('cloudLocation'),
            })}
          >
            <label>
              Cliente
              <select name="clientId" required defaultValue="">
                <option value="" disabled>
                  Selecione
                </option>
                {clients.data
                  .filter(({ active }) => active)
                  .map(({ id, name, code }) => (
                    <option key={id} value={id}>
                      {name} ({code})
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Categoria
              <select name="categoryId" required defaultValue="">
                <option value="" disabled>
                  Selecione
                </option>
                {allowedCategories.map(({ id, name }) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Período
              <input name="period" type="month" required />
            </label>
            <label>
              Descrição
              <textarea name="description" maxLength={200} required />
            </label>
            <label>
              Link HTTPS na nuvem
              <input name="cloudLocation" type="url" required />
            </label>
          </RecordForm>
        )}

      <div className="documents-filters">
        <div className="documents-filter">
          <label htmlFor="document-search">Pesquisar por nome</label>
          <input
            id="document-search"
            maxLength={100}
            type="search"
            placeholder="Ex.: balanco ou guia"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setOffset(0)
            }}
          />
        </div>

        <div className="documents-filter">
          <label htmlFor="document-client">Cliente</label>
          <select
            id="document-client"
            value={client}
            onChange={(event) => {
              setClient(event.target.value)
              setOffset(0)
            }}
          >
            <option value="">Todos os clientes</option>
            {clients.data?.map(({ id, name, code }) => (
              <option key={id} value={id}>
                {name} ({code})
              </option>
            ))}
          </select>
        </div>

        <div className="documents-filter">
          <label htmlFor="document-category">Categoria</label>
          <select
            id="document-category"
            value={category}
            onChange={(event) => {
              setCategory(event.target.value)
              setOffset(0)
            }}
          >
            <option value="">Todas as categorias</option>
            {allowedCategories?.map(({ id, name }) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </div>

        <div className="documents-filter">
          <label htmlFor="document-period">Período</label>
          <input
            id="document-period"
            type="month"
            value={period}
            onChange={(event) => {
              setPeriod(event.target.value)
              setOffset(0)
            }}
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
            setOffset(0)
          }}
        >
          Limpar filtros
        </button>
      </div>

      <QueryStatus pending={documents.isPending} error={documents.error} />
      {documents.data && (
        <>
          <p className="documents-count" role="status">
            {documents.data.total} documento(s) encontrado(s)
          </p>

          <div className="documents-table-container">
            <table className="documents-table">
              <caption>Catálogo de documentos</caption>
              <thead>
                <tr>
                  <th scope="col">Nome padronizado</th>
                  <th scope="col">Cliente</th>
                  <th scope="col">Categoria</th>
                  <th scope="col">Período</th>
                </tr>
              </thead>

              <tbody>
                {documents.data.items.map((document) => (
                  <tr key={document.id}>
                    <td>
                      <a href={document.cloudLocation} target="_blank" rel="noreferrer">
                        {document.name}
                      </a>
                    </td>
                    <td>{clientNames.get(document.clientId) ?? '—'}</td>
                    <td>{categoryNames.get(document.categoryId) ?? '—'}</td>
                    <td>{document.period}</td>
                  </tr>
                ))}

                {documents.data.items.length === 0 && (
                  <tr>
                    <td colSpan={4} className="documents-empty">
                      Nenhum documento encontrado. Revise a pesquisa ou os filtros.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination offset={offset} total={documents.data.total} onChange={setOffset} />
        </>
      )}
    </>
  )
}

export default Documents

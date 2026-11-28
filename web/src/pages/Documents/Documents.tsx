// Tela de documentos (RF09–RF19, RF31): catálogo com filtros, link na nuvem e cadastro em modal.
import { useQuery } from '@tanstack/react-query'
import { ExternalLink, FileText, Plus, Search, X } from 'lucide-react'
import { useDeferredValue, useState } from 'react'
import {
  ApiError,
  api,
  type Document,
  type Page,
  pageSize,
  useCategories,
  useClientOptions,
  useCurrentUser,
} from '../../api'
import {
  CategoryBadge,
  IconButton,
  Modal,
  Pagination,
  QueryStatus,
  RecordForm,
} from '../../components'
import { formatPeriod, PeriodField, parsePeriod } from './PeriodField'

// Mês atual em AAAA-MM, valor inicial do campo de período no cadastro.
function currentMonth() {
  const today = new Date()
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
}

import './Documents.css'

// Extrai a descrição do nome padronizado CLIENTE_CATEGORIA_AAAA-MM_descricao para exibição (RF31).
function readableDescription(name: string) {
  const words = (name.split('_').at(-1) ?? '').replaceAll('-', ' ').trim()
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : ''
}

function Documents() {
  const clients = useClientOptions()
  const categories = useCategories()
  const { data: user } = useCurrentUser()
  const [offset, setOffset] = useState(0)
  const [search, setSearch] = useState('')
  const [client, setClient] = useState('')
  const [category, setCategory] = useState('')
  const [periodInput, setPeriodInput] = useState('')
  const [creating, setCreating] = useState(false)

  // Filtros vão na query string e o servidor filtra (RF15, RF19); a busca é adiada ao digitar.
  const term = useDeferredValue(search.trim())
  const params = new URLSearchParams({ limit: String(pageSize), offset: String(offset) })
  if (term) params.set('search', term)
  if (client) params.set('clientId', client)
  if (category) params.set('categoryId', category)
  const period = parsePeriod(periodInput)
  if (period) params.set('period', period)

  const documents = useQuery({
    queryKey: ['documents', params.toString()],
    queryFn: ({ signal }) => api<Page<Document>>(`/documents?${params.toString()}`, { signal }),
  })
  // Mapas id → nome para mostrar cliente e categoria em cada linha.
  const clientNames = new Map(clients.data?.map(({ id, name }) => [id, name]))
  const categoryNames = new Map(categories.data?.map(({ id, name }) => [id, name]))
  // Só oferece as categorias do perfil; ADMIN vê todas (RF19).
  const allowedCategories = categories.data?.filter(
    ({ id }) => user?.role === 'ADMIN' || user?.allowedCategoryIds.includes(id),
  )
  const activeClients = clients.data?.filter(({ active }) => active) ?? []
  // CONSULTA não cadastra; sem categoria permitida ou cliente ativo o formulário não teria opções.
  const canCreate =
    user?.role !== 'CONSULTA' &&
    allowedCategories !== undefined &&
    allowedCategories.length > 0 &&
    activeClients.length > 0
  const hasFilters = search !== '' || client !== '' || category !== '' || periodInput !== ''
  const closeCreate = () => setCreating(false)

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="breadcrumb">Página inicial / Documentos</span>
          <h1>Documentos</h1>
          <p>Consulte os registros dos documentos digitais do escritório.</p>
        </div>
        {canCreate && (
          <button type="button" className="btn-primary" onClick={() => setCreating(true)}>
            <Plus size={18} aria-hidden="true" />
            Novo documento
          </button>
        )}
      </div>

      <QueryStatus
        pending={clients.isPending || categories.isPending}
        error={clients.error ?? categories.error}
      />

      {/* Modal de cadastro de documento (RF11, RF14, RF17). */}
      {canCreate && (
        <Modal open={creating} onClose={closeCreate} title="Novo documento" size="lg">
          <RecordForm
            path="/documents"
            resource="documents"
            onSuccess={closeCreate}
            onCancel={closeCreate}
            fields={(data) => {
              // O servidor monta o nome padronizado; o front envia os dados e o período validado.
              const period = parsePeriod(String(data.get('period')))
              if (!period) throw new ApiError('Informe um período válido no formato AAAA-MM.', 400)
              const description = String(data.get('description') ?? '').trim()
              if (!description) throw new ApiError('Informe uma descrição para o documento.', 400)
              return {
                clientId: data.get('clientId'),
                categoryId: data.get('categoryId'),
                period,
                description,
                cloudLocation: data.get('cloudLocation'),
              }
            }}
          >
            <div className="form-grid">
              <label>
                Cliente
                <select name="clientId" required defaultValue="">
                  <option value="" disabled>
                    Selecione
                  </option>
                  {activeClients.map(({ id, name, code }) => (
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
                <input name="period" type="month" required defaultValue={currentMonth()} />
              </label>
              <label>
                Link HTTPS na nuvem
                <input
                  name="cloudLocation"
                  type="url"
                  required
                  pattern="https://.+"
                  placeholder="https://"
                  title="Informe um endereço HTTPS válido"
                />
              </label>
              <label className="full">
                Descrição
                <textarea name="description" maxLength={200} required />
              </label>
            </div>
          </RecordForm>
        </Modal>
      )}

      {/* Barra de filtros: cada mudança volta para a primeira página. */}
      <search className="documents-filters" aria-label="Filtros de documentos">
        <div className="documents-filter documents-filter-search">
          <label htmlFor="document-search">Pesquisar por nome</label>
          <div className="documents-search-input">
            <Search size={16} aria-hidden="true" />
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
          <PeriodField
            id="document-period"
            value={periodInput}
            onChange={(value) => {
              setPeriodInput(value)
              setOffset(0)
            }}
          />
        </div>

        {hasFilters && (
          <button
            type="button"
            className="btn-ghost documents-clear"
            onClick={() => {
              setSearch('')
              setClient('')
              setCategory('')
              setPeriodInput('')
              setOffset(0)
            }}
          >
            <X size={16} aria-hidden="true" />
            Limpar
          </button>
        )}
      </search>

      {/* Tabela do catálogo com link para abrir o arquivo na nuvem. */}
      <QueryStatus pending={documents.isPending} error={documents.error} />
      {documents.data && (
        <>
          <p className="documents-count" role="status">
            {documents.data.total.toLocaleString('pt-BR')} documento(s) encontrado(s)
          </p>

          <div className="documents-table-container">
            <table className="documents-table">
              <caption>Catálogo de documentos</caption>
              <thead>
                <tr>
                  <th scope="col">Documento</th>
                  <th scope="col">Cliente</th>
                  <th scope="col">Categoria</th>
                  <th scope="col">Período</th>
                  <th scope="col" className="actions-column">
                    Ações
                  </th>
                </tr>
              </thead>

              <tbody>
                {documents.data.items.map((document) => {
                  const categoryName = categoryNames.get(document.categoryId)
                  return (
                    <tr key={document.id}>
                      <td>
                        <div className="documents-name">
                          <FileText size={16} aria-hidden="true" />
                          <span>{document.name}</span>
                        </div>
                        <p className="documents-description">
                          {readableDescription(document.name)}
                        </p>
                      </td>
                      <td>{clientNames.get(document.clientId) ?? '—'}</td>
                      <td>{categoryName ? <CategoryBadge name={categoryName} /> : '—'}</td>
                      <td className="documents-period">{formatPeriod(document.period)}</td>
                      <td className="actions-column">
                        <IconButton
                          icon={ExternalLink}
                          label="Abrir na nuvem"
                          href={document.cloudLocation}
                        />
                      </td>
                    </tr>
                  )
                })}

                {documents.data.items.length === 0 && (
                  <tr>
                    <td colSpan={5} className="documents-empty">
                      <FileText size={32} aria-hidden="true" />
                      <p>Nenhum documento encontrado.</p>
                      <p className="documents-empty-hint">
                        {hasFilters
                          ? 'Revise a pesquisa ou limpe os filtros.'
                          : 'Os documentos cadastrados aparecem aqui.'}
                      </p>
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

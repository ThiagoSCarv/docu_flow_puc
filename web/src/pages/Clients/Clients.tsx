// Tela de clientes (RF06–RF08, RF10): consulta com busca; ADMIN cadastra, edita e inativa.
import { Ban, Pencil, Plus, RotateCcw, Search } from 'lucide-react'
import { useState } from 'react'
import { type Client, pageSize, useClientOptions, useCurrentUser, usePage } from '../../api'
import {
  ActionButton,
  IconButton,
  Modal,
  Pagination,
  QueryStatus,
  RecordForm,
  StatusBadge,
} from '../../components'
import './Clients.css'

// Estado do modal: fechado, cadastro ou edição de um cliente específico.
type ClientModal = { mode: 'create' } | { mode: 'edit'; client: Client } | null

function Clients() {
  const { data: user } = useCurrentUser()
  const [offset, setOffset] = useState(0)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<ClientModal>(null)

  // Com busca, carrega todos e filtra nome/código no cliente; sem busca, pagina no servidor.
  const term = search.trim().toLocaleLowerCase('pt-BR')
  const allClients = useClientOptions(Boolean(term))
  const page = usePage<Client>('clients', offset, !term)
  const query = term ? allClients : page
  const matching = allClients.data?.filter(
    (client) =>
      client.name.toLocaleLowerCase('pt-BR').includes(term) ||
      client.code.toLocaleLowerCase('pt-BR').includes(term),
  )
  const items = term ? matching?.slice(offset, offset + pageSize) : page.data?.items
  const total = (term ? matching?.length : page.data?.total) ?? 0
  const isAdmin = user?.role === 'ADMIN'
  const closeModal = () => setModal(null)

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="breadcrumb">Página inicial / Clientes</span>
          <h1>Clientes</h1>
          <p>Consulte os clientes cadastrados no catálogo. Inativar mantém os documentos.</p>
        </div>
        {isAdmin && (
          <button
            type="button"
            className="btn-primary"
            onClick={() => setModal({ mode: 'create' })}
          >
            <Plus size={18} aria-hidden="true" />
            Novo cliente
          </button>
        )}
      </div>

      <div className="clients-filter">
        <label htmlFor="client-search">Pesquisar por nome ou código</label>
        <div className="search-field">
          <Search size={18} aria-hidden="true" />
          <input
            id="client-search"
            type="search"
            placeholder="Ex.: Cliente A"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setOffset(0)
            }}
          />
        </div>
      </div>

      <QueryStatus pending={query.isPending} error={query.error} />
      {items && (
        <>
          <p className="clients-count" role="status">
            {total === 1 ? '1 cliente encontrado' : `${total} clientes encontrados`}
          </p>

          <div className="clients-table-container">
            <table className="clients-table">
              <caption>Clientes cadastrados</caption>
              <thead>
                <tr>
                  <th scope="col">Nome</th>
                  <th scope="col">Código</th>
                  <th scope="col">Situação</th>
                  {isAdmin && (
                    <th scope="col" className="actions-column">
                      Ações
                    </th>
                  )}
                </tr>
              </thead>

              <tbody>
                {items.map((client) => (
                  <tr key={client.id}>
                    <td>{client.name}</td>
                    <td>{client.code}</td>
                    <td>
                      <StatusBadge tone={client.active ? 'success' : 'danger'}>
                        {client.active ? 'Ativo' : 'Inativo'}
                      </StatusBadge>
                    </td>
                    {isAdmin && (
                      <td className="actions-column">
                        <div className="table-actions">
                          <IconButton
                            icon={Pencil}
                            label="Editar cliente"
                            onClick={() => setModal({ mode: 'edit', client })}
                          />
                          {/* Inativar pede confirmação; reativar é direto (RF10). */}
                          {client.active ? (
                            <ActionButton
                              icon={Ban}
                              variant="danger"
                              label="Inativar"
                              confirm={`Inativar ${client.name}? Os documentos são mantidos.`}
                              path={`/clients/${client.id}/status`}
                              body={{ active: false }}
                              resource="clients"
                            />
                          ) : (
                            <ActionButton
                              icon={RotateCcw}
                              label="Reativar"
                              path={`/clients/${client.id}/status`}
                              body={{ active: true }}
                              resource="clients"
                            />
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}

                {items.length === 0 && (
                  <tr>
                    <td colSpan={isAdmin ? 4 : 3} className="clients-empty">
                      Nenhum cliente encontrado. Revise a pesquisa.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination offset={offset} total={total} onChange={setOffset} />
        </>
      )}

      {/* Um só modal para cadastrar e editar; na edição o código fica bloqueado (RF07). */}
      {isAdmin && (
        <Modal
          open={modal !== null}
          onClose={closeModal}
          title={modal?.mode === 'edit' ? 'Editar cliente' : 'Novo cliente'}
          size="md"
        >
          {modal?.mode === 'create' && (
            <RecordForm
              path="/clients"
              resource="clients"
              fields={(data) => ({
                name: data.get('name'),
                code: data.get('code'),
              })}
              submitLabel="Cadastrar"
              onSuccess={closeModal}
              onCancel={closeModal}
            >
              <label>
                Nome
                <input name="name" required maxLength={200} pattern=".*\S.*" />
              </label>
              <label>
                Código
                <input
                  name="code"
                  required
                  maxLength={20}
                  pattern="[A-Za-z0-9-]+"
                  title="Use apenas letras, números e hífen"
                />
                <span className="field-hint">Até 20 caracteres: letras, números e hífen.</span>
              </label>
            </RecordForm>
          )}
          {modal?.mode === 'edit' && (
            <RecordForm
              key={modal.client.id}
              path={`/clients/${modal.client.id}`}
              resource="clients"
              method="PATCH"
              fields={(data) => ({ name: data.get('name') })}
              onSuccess={closeModal}
              onCancel={closeModal}
            >
              <label>
                Nome
                <input
                  name="name"
                  required
                  maxLength={200}
                  pattern=".*\S.*"
                  defaultValue={modal.client.name}
                />
              </label>
              <label>
                Código
                <input defaultValue={modal.client.code} disabled />
                <span className="field-hint">
                  O código não muda, porque faz parte do nome dos documentos.
                </span>
              </label>
            </RecordForm>
          )}
        </Modal>
      )}
    </>
  )
}

export default Clients

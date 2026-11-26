import { useState } from 'react'
import { type Client, pageSize, useClientOptions, useCurrentUser, usePage } from '../../api'
import { ActionButton, Pagination, QueryStatus, RecordForm } from '../../components'
import './Clients.css'

function Clients() {
  const { data: user } = useCurrentUser()
  const [offset, setOffset] = useState(0)
  const [search, setSearch] = useState('')

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
  const [editingClientId, setEditingClientId] = useState('')
  const editingClient = items?.find((client) => client.id === editingClientId)

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="breadcrumb">Página inicial / Clientes</span>
          <h1>Clientes</h1>
          <p>Consulte os clientes cadastrados no catálogo. Inativar mantém os documentos.</p>
        </div>
      </div>

      {isAdmin && (
        <RecordForm
          title="Cadastrar cliente"
          path="/clients"
          resource="clients"
          fields={(data) => ({
            name: data.get('name'),
            code: data.get('code'),
          })}
        >
          <label>
            Nome
            <input name="name" required maxLength={200} />
          </label>
          <label>
            Código
            <input name="code" required maxLength={20} />
          </label>
        </RecordForm>
      )}

      <div className="clients-filter">
        <label htmlFor="client-search">Pesquisar por nome ou código</label>
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
                  {isAdmin && <th scope="col">Ações</th>}
                </tr>
              </thead>

              <tbody>
                {items.map((client) => (
                  <tr key={client.id}>
                    <td>{client.name}</td>
                    <td>{client.code}</td>
                    <td>
                      <span
                        className={
                          client.active
                            ? 'client-status client-status-active'
                            : 'client-status client-status-inactive'
                        }
                      >
                        {client.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    {isAdmin && (
                      <td>
                        <div className="table-actions">
                          <button type="button" onClick={() => setEditingClientId(client.id)}>
                            Editar nome
                          </button>
                          <ActionButton
                            label={client.active ? 'Inativar' : 'Reativar'}
                            path={`/clients/${client.id}/status`}
                            body={{ active: !client.active }}
                            resource="clients"
                          />
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

      {editingClient && (
        <RecordForm
          key={`${editingClient.id}-${editingClient.name}`}
          title={`Editar nome de ${editingClient.name} (${editingClient.code})`}
          path={`/clients/${editingClient.id}`}
          resource="clients"
          method="PATCH"
          fields={(data) => ({ name: data.get('name') })}
        >
          <label>
            Novo nome
            <input name="name" required maxLength={200} defaultValue={editingClient.name} />
          </label>
          <p>O código do cliente não muda, porque faz parte do nome dos documentos.</p>
        </RecordForm>
      )}
    </>
  )
}

export default Clients

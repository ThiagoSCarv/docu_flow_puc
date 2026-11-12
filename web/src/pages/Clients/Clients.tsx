import { useState } from 'react'
import './Clients.css'

const clients = [
  {
    id: '1',
    name: 'Empresa Exemplo',
    code: 'EMPRESA-EXEMPLO',
    active: true,
  },
  {
    id: '2',
    name: 'Cliente A',
    code: 'CLIENTE-A',
    active: true,
  },
  {
    id: '3',
    name: 'Cliente B',
    code: 'CLIENTE-B',
    active: false,
  },
]

function Clients() {
  const [search, setSearch] = useState('')

  const filteredClients = clients.filter((client) => {
    const term = search.trim().toLocaleLowerCase('pt-BR')

    return (
      client.name.toLocaleLowerCase('pt-BR').includes(term) ||
      client.code.toLocaleLowerCase('pt-BR').includes(term)
    )
  })

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="breadcrumb">Página inicial / Clientes</span>
          <h1>Clientes</h1>
          <p>Consulte os clientes cadastrados no catálogo.</p>
        </div>
      </div>

      <p className="clients-notice">
        Dados fictícios para demonstração. Esta consulta ainda não está conectada ao servidor.
      </p>

      <div className="clients-filter">
        <label htmlFor="client-search">Pesquisar por nome ou código</label>
        <input
          id="client-search"
          type="search"
          placeholder="Ex.: Cliente A"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <p className="clients-count" role="status">
        {filteredClients.length === 1
          ? '1 cliente encontrado'
          : `${filteredClients.length} clientes encontrados`}
      </p>

      <div className="clients-table-container">
        <table className="clients-table">
          <caption>Clientes — dados fictícios</caption>
          <thead>
            <tr>
              <th scope="col">Nome</th>
              <th scope="col">Código</th>
              <th scope="col">Situação</th>
            </tr>
          </thead>

          <tbody>
            {filteredClients.map((client) => (
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
              </tr>
            ))}

            {filteredClients.length === 0 && (
              <tr>
                <td colSpan={3} className="clients-empty">
                  Nenhum cliente encontrado. Revise a pesquisa.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}

export default Clients

// Tela de acessos (RF20): lista quem acessa cada categoria de documentos; só ADMIN.
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { api, type Page, pageSize, roleLabels, type User, useCategories } from '../../api'
import { Pagination, QueryStatus } from '../../components'
import '../Clients/Clients.css'

function Access() {
  const categories = useCategories()
  const [categoryId, setCategoryId] = useState('')
  const [offset, setOffset] = useState(0)
  // Só consulta com categoria escolhida; a chave sob 'users' acompanha mudanças de usuário.
  const users = useQuery({
    queryKey: ['users', 'category-access', categoryId, offset],
    queryFn: ({ signal }) =>
      api<Page<User>>(`/categories/${categoryId}/users?limit=${pageSize}&offset=${offset}`, {
        signal,
      }),
    enabled: Boolean(categoryId),
  })

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="breadcrumb">Página inicial / Acessos</span>
          <h1>Acessos por categoria</h1>
          <p>
            Veja quem acessa cada categoria de documentos. Administradores acessam todas; para mudar
            o acesso de alguém, use a tela de Usuários.
          </p>
        </div>
      </div>

      <QueryStatus pending={categories.isPending} error={categories.error} />
      {categories.data && (
        <div className="clients-filter">
          <label htmlFor="access-category">Categoria</label>
          <select
            id="access-category"
            value={categoryId}
            onChange={(event) => {
              // Nova categoria recomeça a paginação.
              setCategoryId(event.target.value)
              setOffset(0)
            }}
          >
            <option value="">Selecione uma categoria</option>
            {categories.data.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {categoryId && <QueryStatus pending={users.isPending} error={users.error} />}
      {users.data && (
        <>
          <p className="clients-count" role="status">
            {users.data.total === 1
              ? '1 pessoa com acesso'
              : `${users.data.total} pessoas com acesso`}
          </p>
          <div className="clients-table-container">
            <table className="clients-table">
              <caption>Usuários com acesso à categoria</caption>
              <thead>
                <tr>
                  <th scope="col">Nome</th>
                  <th scope="col">E-mail</th>
                  <th scope="col">Perfil</th>
                  <th scope="col">Situação</th>
                </tr>
              </thead>
              <tbody>
                {users.data.items.map((user) => (
                  <tr key={user.id}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>{roleLabels[user.role]}</td>
                    <td>{user.active ? 'Ativo' : 'Inativo'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination offset={offset} total={users.data.total} onChange={setOffset} />
        </>
      )}
    </>
  )
}

export default Access

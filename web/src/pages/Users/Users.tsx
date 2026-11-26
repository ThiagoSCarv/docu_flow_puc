import { useState } from 'react'
import { type Role, roleLabels, type User, useCategories, useCurrentUser, usePage } from '../../api'
import { ActionButton, Pagination, QueryStatus, RecordForm } from '../../components'
import '../Clients/Clients.css'

const roleOptions: Role[] = ['CONSULTA', 'FUNCIONARIO', 'ADMIN']

function Users() {
  const { data: currentUser } = useCurrentUser()
  const [offset, setOffset] = useState(0)
  const [selectedUserId, setSelectedUserId] = useState('')
  const categories = useCategories()
  const users = usePage<User>('users', offset)
  const selectedUser = users.data?.items.find((user) => user.id === selectedUserId)

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="breadcrumb">Página inicial / Usuários</span>
          <h1>Usuários</h1>
          <p>Gerencie as contas, a situação e as permissões dos usuários do escritório.</p>
        </div>
      </div>

      <QueryStatus pending={categories.isPending} error={categories.error} />
      {categories.isSuccess && (
        <RecordForm
          title="Cadastrar usuário"
          path="/users"
          resource="users"
          fields={(data) => ({
            name: data.get('name'),
            email: data.get('email'),
            password: data.get('password'),
            role: data.get('role'),
            categoryIds: data.getAll('categoryIds'),
          })}
        >
          <label>
            Nome
            <input name="name" required />
          </label>
          <label>
            E-mail
            <input name="email" type="email" required />
          </label>
          <label>
            Senha inicial
            <input name="password" type="password" autoComplete="new-password" required />
          </label>
          <label>
            Perfil
            <select name="role">
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {roleLabels[role]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Categorias permitidas
            <select name="categoryIds" multiple size={Math.min(7, categories.data.length || 1)}>
              {categories.data.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
        </RecordForm>
      )}

      <QueryStatus pending={users.isPending} error={users.error} />
      {users.data && (
        <>
          <div className="clients-table-container">
            <table className="clients-table">
              <caption>{users.data.total} usuário(s) cadastrado(s)</caption>
              <thead>
                <tr>
                  <th scope="col">Nome</th>
                  <th scope="col">E-mail</th>
                  <th scope="col">Perfil</th>
                  <th scope="col">Situação</th>
                  <th scope="col">Ações</th>
                </tr>
              </thead>
              <tbody>
                {users.data.items.map((user) => (
                  <tr key={user.id}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>{roleLabels[user.role]}</td>
                    <td>{user.active ? 'Ativo' : 'Inativo'}</td>
                    <td>
                      <button type="button" onClick={() => setSelectedUserId(user.id)}>
                        Gerenciar
                      </button>
                    </td>
                  </tr>
                ))}
                {users.data.items.length === 0 && (
                  <tr>
                    <td colSpan={5}>Nenhum usuário nesta página.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            offset={offset}
            total={users.data.total}
            onChange={(next) => {
              setSelectedUserId('')
              setOffset(next)
            }}
          />
        </>
      )}
      {selectedUser && (
        <section className="record-form" aria-label={`Gerenciar ${selectedUser.name}`}>
          <h2>Gerenciar {selectedUser.name}</h2>
          {selectedUser.id === currentUser?.id ? (
            <p>Você não pode alterar o próprio acesso. Peça a outro administrador.</p>
          ) : (
            <>
              <p>
                Situação: <strong>{selectedUser.active ? 'Ativo' : 'Inativo'}</strong>{' '}
                <ActionButton
                  label={selectedUser.active ? 'Inativar usuário' : 'Reativar usuário'}
                  path={`/users/${selectedUser.id}/status`}
                  body={{ active: !selectedUser.active }}
                  resource="users"
                />
              </p>
              {categories.data && (
                <RecordForm
                  key={`${selectedUser.id}-${selectedUser.role}-${selectedUser.allowedCategoryIds.join()}`}
                  title="Alterar perfil e categorias"
                  path={`/users/${selectedUser.id}/permissions`}
                  resource="users"
                  method="PATCH"
                  fields={(data) => ({
                    role: data.get('role'),
                    categoryIds: data.getAll('categoryIds'),
                  })}
                >
                  <label>
                    Perfil
                    <select name="role" defaultValue={selectedUser.role}>
                      {roleOptions.map((role) => (
                        <option key={role} value={role}>
                          {roleLabels[role]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Categorias permitidas
                    <select
                      name="categoryIds"
                      multiple
                      size={Math.min(7, categories.data.length || 1)}
                      defaultValue={selectedUser.allowedCategoryIds}
                    >
                      {categories.data.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </RecordForm>
              )}
            </>
          )}
          <RecordForm
            key={selectedUser.id}
            title="Redefinir senha"
            path={`/users/${selectedUser.id}/password`}
            resource="users"
            method="PATCH"
            fields={(data) => ({ password: data.get('password') })}
          >
            <label>
              Nova senha
              <input name="password" type="password" autoComplete="new-password" required />
            </label>
          </RecordForm>
        </section>
      )}
    </>
  )
}

export default Users

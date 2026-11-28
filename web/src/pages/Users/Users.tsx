// Tela de usuários (RF01, RF04, RF05, RF20): ADMIN cadastra e gerencia situação, perfil e senha.
import { Ban, Plus, RotateCcw, UserCog } from 'lucide-react'
import { useState } from 'react'
import {
  type Category,
  type Role,
  roleLabels,
  type User,
  useCategories,
  useCurrentUser,
  usePage,
} from '../../api'
import {
  ActionButton,
  IconButton,
  Modal,
  Pagination,
  QueryStatus,
  RecordForm,
  StatusBadge,
} from '../../components'
import '../Clients/Clients.css'
import './Users.css'

// Perfis em ordem do menos ao mais privilegiado; o primeiro é o padrão no cadastro.
const roleOptions: Role[] = ['CONSULTA', 'FUNCIONARIO', 'ADMIN']

// Regra de senha validada pelo servidor (RNF15), repetida aqui como dica.
const passwordHint = 'Mínimo de 8 caracteres, com letras e números.'

// Select de perfil de acesso, usado no cadastro e na edição de permissões.
function RoleSelect({ defaultValue }: { defaultValue?: Role }) {
  return (
    <label>
      Perfil
      <select name="role" defaultValue={defaultValue}>
        {roleOptions.map((role) => (
          <option key={role} value={role}>
            {roleLabels[role]}
          </option>
        ))}
      </select>
    </label>
  )
}

// Checkboxes das categorias permitidas (RF19); todas com o mesmo name para virar lista no FormData.
function CategoryChecklist({
  categories,
  checkedIds = [],
  className,
}: {
  categories: Category[]
  checkedIds?: string[]
  className?: string
}) {
  return (
    <fieldset className={`category-checklist${className ? ` ${className}` : ''}`}>
      <legend>Categorias permitidas</legend>
      <div className="category-checklist-options">
        {categories.map((category) => (
          <label key={category.id} className="category-checklist-option">
            <input
              type="checkbox"
              name="categoryIds"
              value={category.id}
              defaultChecked={checkedIds.includes(category.id)}
            />
            {category.name}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

// Campo de senha nova com a dica da regra; new-password evita o preenchimento automático.
function PasswordField({ label }: { label: string }) {
  return (
    <label>
      {label}
      <input
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        pattern="(?=.*[A-Za-z])(?=.*[0-9]).{8,}"
        title="Use pelo menos 8 caracteres, incluindo letras e números"
      />
      <span className="field-hint">{passwordHint}</span>
    </label>
  )
}

function Users() {
  const { data: currentUser } = useCurrentUser()
  const [offset, setOffset] = useState(0)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [creating, setCreating] = useState(false)
  const categories = useCategories()
  const users = usePage<User>('users', offset)
  // Guarda só o id e busca na página atual, para o modal refletir os dados após cada alteração.
  const selectedUser = users.data?.items.find((user) => user.id === selectedUserId)
  const closeCreate = () => setCreating(false)

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="breadcrumb">Página inicial / Usuários</span>
          <h1>Usuários</h1>
          <p>Gerencie as contas, a situação e as permissões dos usuários do escritório.</p>
        </div>
        <button type="button" className="btn-primary" onClick={() => setCreating(true)}>
          <Plus size={18} aria-hidden="true" />
          Novo usuário
        </button>
      </div>

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
                  <th scope="col" className="actions-column">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.data.items.map((user) => (
                  <tr key={user.id}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>
                      <StatusBadge tone="neutral">{roleLabels[user.role]}</StatusBadge>
                    </td>
                    <td>
                      <StatusBadge tone={user.active ? 'success' : 'danger'}>
                        {user.active ? 'Ativo' : 'Inativo'}
                      </StatusBadge>
                    </td>
                    <td className="actions-column">
                      <IconButton
                        icon={UserCog}
                        label={`Gerenciar ${user.name}`}
                        onClick={() => setSelectedUserId(user.id)}
                      />
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
              // Mudar de página fecha o modal, pois o usuário selecionado pode não estar na nova.
              setSelectedUserId('')
              setOffset(next)
            }}
          />
        </>
      )}

      {/* Cadastro de usuário pelo administrador, sem autocadastro (RF01). */}
      <Modal open={creating} onClose={closeCreate} title="Novo usuário" size="lg">
        <QueryStatus pending={categories.isPending} error={categories.error} />
        {categories.data && (
          <RecordForm
            path="/users"
            resource="users"
            fields={(data) => ({
              name: data.get('name'),
              email: data.get('email'),
              password: data.get('password'),
              role: data.get('role'),
              categoryIds: data.getAll('categoryIds'),
            })}
            submitLabel="Cadastrar"
            onSuccess={closeCreate}
            onCancel={closeCreate}
          >
            <div className="form-grid">
              <label>
                Nome
                <input name="name" required maxLength={200} pattern=".*\S.*" />
              </label>
              <label>
                E-mail
                <input name="email" type="email" autoComplete="off" required />
              </label>
              <PasswordField label="Senha inicial" />
              <RoleSelect />
              <CategoryChecklist categories={categories.data} className="full" />
            </div>
          </RecordForm>
        )}
      </Modal>

      {/* Gerenciar: situação (RF04), perfil e categorias (RF20) e redefinição de senha. */}
      <Modal
        open={Boolean(selectedUser)}
        onClose={() => setSelectedUserId('')}
        title={selectedUser ? `Gerenciar ${selectedUser.name}` : 'Gerenciar usuário'}
        size="lg"
      >
        {selectedUser && (
          <div className="manage-user">
            {/* O admin não muda o próprio acesso, para não se trancar fora do sistema. */}
            {selectedUser.id === currentUser?.id ? (
              <p>Você não pode alterar o próprio acesso. Peça a outro administrador.</p>
            ) : (
              <>
                <section className="manage-block" aria-labelledby="manage-status">
                  <h3 id="manage-status">Situação</h3>
                  <div className="manage-status">
                    <StatusBadge tone={selectedUser.active ? 'success' : 'danger'}>
                      {selectedUser.active ? 'Ativo' : 'Inativo'}
                    </StatusBadge>
                    {selectedUser.active ? (
                      <ActionButton
                        icon={Ban}
                        variant="danger"
                        label="Inativar usuário"
                        confirm={`Inativar ${selectedUser.name}? A pessoa perde o acesso ao sistema, e o histórico é mantido.`}
                        path={`/users/${selectedUser.id}/status`}
                        body={{ active: false }}
                        resource="users"
                      />
                    ) : (
                      <ActionButton
                        icon={RotateCcw}
                        label="Reativar usuário"
                        path={`/users/${selectedUser.id}/status`}
                        body={{ active: true }}
                        resource="users"
                      />
                    )}
                  </div>
                </section>

                <section className="manage-block" aria-labelledby="manage-permissions">
                  <h3 id="manage-permissions">Perfil e categorias</h3>
                  <QueryStatus pending={categories.isPending} error={categories.error} />
                  {categories.data && (
                    <RecordForm
                      key={selectedUser.id}
                      path={`/users/${selectedUser.id}/permissions`}
                      resource="users"
                      method="PATCH"
                      fields={(data) => ({
                        role: data.get('role'),
                        categoryIds: data.getAll('categoryIds'),
                      })}
                    >
                      <RoleSelect defaultValue={selectedUser.role} />
                      <CategoryChecklist
                        categories={categories.data}
                        checkedIds={selectedUser.allowedCategoryIds}
                      />
                    </RecordForm>
                  )}
                </section>
              </>
            )}

            <section className="manage-block" aria-labelledby="manage-password">
              <h3 id="manage-password">Redefinir senha</h3>
              <RecordForm
                key={selectedUser.id}
                path={`/users/${selectedUser.id}/password`}
                resource="users"
                method="PATCH"
                fields={(data) => ({ password: data.get('password') })}
              >
                <PasswordField label="Nova senha" />
              </RecordForm>
            </section>
          </div>
        )}
      </Modal>
    </>
  )
}

export default Users

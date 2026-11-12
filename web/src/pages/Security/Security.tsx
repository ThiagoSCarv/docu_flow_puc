import './Security.css'

const guidelines = [
  {
    title: 'Proteja suas senhas',
    description:
      'Use senhas diferentes para cada serviço. Não compartilhe senhas por mensagens nem as registre em documentos de acesso coletivo.',
  },
  {
    title: 'Ative a autenticação em duas etapas',
    description:
      'Sempre que o serviço permitir, ative uma segunda etapa de verificação para proteger o acesso à conta.',
  },
  {
    title: 'Desconfie de mensagens urgentes',
    description:
      'Antes de abrir links, baixar anexos ou realizar pagamentos, confira o remetente e confirme a solicitação por um canal conhecido.',
  },
  {
    title: 'Confira as permissões de compartilhamento',
    description:
      'Compartilhe arquivos somente com as pessoas necessárias. Evite links públicos para informações restritas.',
  },
  {
    title: 'Organize os documentos digitais',
    description:
      'Siga o padrão de nomes e pastas combinado com o escritório. Confira o cliente, a categoria e o período antes de salvar.',
  },
  {
    title: 'Confira os backups',
    description:
      'Siga a rotina de backup definida pelo escritório e confirme se as cópias podem ser recuperadas. Sincronização na nuvem não garante, por si só, um backup independente.',
  },
]

function Security() {
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

      <div className="security-grid">
        {guidelines.map((guideline) => (
          <article className="security-card" key={guideline.title}>
            <h2>{guideline.title}</h2>
            <p>{guideline.description}</p>
          </article>
        ))}
      </div>
    </>
  )
}

export default Security

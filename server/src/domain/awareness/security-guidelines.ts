export type SecurityGuideline = {
  readonly id: string
  readonly title: string
  readonly summary: string
  readonly practices: readonly string[]
}

function guideline(content: SecurityGuideline): SecurityGuideline {
  return Object.freeze({ ...content, practices: Object.freeze([...content.practices]) })
}

export const SECURITY_GUIDELINES: readonly SecurityGuideline[] = Object.freeze([
  guideline({
    id: 'golpes-por-mensagem',
    title: 'Golpes por e-mail, SMS e WhatsApp',
    summary:
      'Mensagens falsas em nome da Receita Federal, de bancos ou de clientes tentam fazer você clicar em links, abrir anexos ou informar dados.',
    practices: [
      'Desconfie de urgência, ameaça de multa ou prêmio inesperado.',
      'Não clique em links nem abra anexos de remetentes desconhecidos; acesse o site oficial digitando o endereço.',
      'Confirme pedidos incomuns de clientes por outro canal, como uma ligação para o número já cadastrado.',
    ],
  }),
  guideline({
    id: 'boletos-e-pix',
    title: 'Boletos e PIX falsos',
    summary:
      'Golpistas alteram boletos ou enviam chaves PIX de terceiros se passando por clientes, fornecedores ou órgãos públicos.',
    practices: [
      'Antes de pagar, confira o nome do beneficiário e o CNPJ exibidos pelo banco.',
      'Desconfie de mudança de conta bancária comunicada só por mensagem.',
      'Guias de impostos devem ser emitidas nos sistemas oficiais, nunca recebidas por link.',
    ],
  }),
  guideline({
    id: 'senhas-e-gov-br',
    title: 'Senhas e conta gov.br',
    summary:
      'A senha gov.br e os certificados digitais dão acesso a dados fiscais dos clientes e precisam de cuidado especial.',
    practices: [
      'Nunca anote senhas gov.br de clientes em planilhas, papéis ou neste sistema.',
      'Use senhas longas e diferentes para cada serviço, com um gerenciador de senhas.',
      'Ative a verificação em duas etapas sempre que o serviço oferecer.',
      'Ninguém do suporte oficial pede sua senha ou o código de verificação.',
    ],
  }),
  guideline({
    id: 'links-na-nuvem',
    title: 'Compartilhamento de arquivos na nuvem',
    summary:
      'Os documentos ficam na nuvem do escritório; um link aberto demais expõe dados dos clientes a qualquer pessoa.',
    practices: [
      'Compartilhe pastas só com as pessoas que precisam, nunca com "qualquer pessoa com o link".',
      'Revise periodicamente quem tem acesso às pastas de cada cliente.',
      'Retire o acesso de quem saiu do escritório no mesmo dia.',
    ],
  }),
  guideline({
    id: 'dados-dos-clientes',
    title: 'Dados pessoais dos clientes (LGPD)',
    summary:
      'O escritório é responsável pelos dados que recebe; use apenas o necessário e só pelos canais do escritório.',
    practices: [
      'Não envie documentos de clientes por e-mail ou WhatsApp pessoal.',
      'Peça e guarde apenas os dados necessários para o serviço.',
      'Descarte cópias locais depois de salvar o arquivo na pasta correta da nuvem.',
    ],
  }),
  guideline({
    id: 'computador-e-celular',
    title: 'Computador e celular de trabalho',
    summary:
      'Um aparelho desatualizado ou desbloqueado é uma porta de entrada para invasões e vazamentos.',
    practices: [
      'Bloqueie a tela sempre que sair da mesa.',
      'Mantenha sistema, navegador e antivírus atualizados.',
      'Não instale programas de origem desconhecida nem use pendrives encontrados.',
    ],
  }),
  guideline({
    id: 'backups',
    title: 'Backups',
    summary:
      'Backup que nunca foi testado pode falhar justamente quando for preciso; registre e verifique cada um.',
    practices: [
      'Registre cada backup no OrganizaDoc com data, escopo e situação.',
      'Teste a restauração de alguns arquivos de tempos em tempos e registre como VERIFICADO.',
      'Mantenha ao menos uma cópia separada da conta principal da nuvem.',
    ],
  }),
  guideline({
    id: 'incidentes',
    title: 'O que fazer se algo der errado',
    summary:
      'Agir rápido limita o estrago: clicou em um link suspeito ou perdeu um aparelho, avise na hora.',
    practices: [
      'Comunique imediatamente o responsável pelo escritório.',
      'Troque as senhas afetadas a partir de outro aparelho.',
      'Não apague mensagens nem arquivos suspeitos: eles ajudam a entender o que aconteceu.',
    ],
  }),
])

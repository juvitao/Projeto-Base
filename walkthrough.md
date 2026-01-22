# Walkthrough - Separação de Funções e Níveis de Acesso

Implementamos uma separação clara entre **Funções de Trabalho** (tarefas/competências) e **Níveis de Acesso** (permissões do sistema).

## O que mudou?

### 1. Interface de Gestão (TeamConnections)
Agora existem dois fluxos de gestão independentes no topo da página de Equipe:
- **Criar Função**: Abre o modal para definir nomes de cargos e suas competências.
- **Níveis de Acesso**: Abre um gerenciador para definir perfis de permissão.
*A interface foi limpa para remover botões duplicados e organizar o cabeçalho.*

### 2. Clientes Arquivados (Settings)
- As ações de **Desarquivar** e **Excluir** foram agrupadas no final da linha.
- O botão de exclusão agora é apenas um ícone de lixeira, tornando o layout mais compacto.

### 2. Edição de Membros (EditMemberModal)
O modal de edição foi totalmente reformulado para permitir que um membro tenha:
- 1 Nível de Acesso Nativo (Admin, Operator, Restricted).
- Múltiplos **Níveis de Acesso** customizados (ampliando permissões).
- Múltiplas **Funções de Trabalho** (identificando suas responsabilidades).

### 3. Banco de Dados
Novas tabelas foram criadas para suportar essa estrutura:
- `agency_access_levels`: Armazena as configurações de permissão (`permissions_config`).
- `member_access_levels`: Tabela de junção vinculando membros aos seus níveis de acesso.
- `agency_roles`: Agora focada exclusivamente em `name` e `permissions` (competências).

## Como Testar?

1. Acesse a página **Equipe**.
2. Clique em **Níveis de Acesso** e crie um novo perfil configurando a matriz de permissões.
3. Clique em **Criar Função** e adicione um cargo com competências específicas.
4. No botão **Editar** de um membro existente:
    - Selecione um ou mais **Níveis de Acesso**.
    - Selecione uma ou mais **Funções de Trabalho**.
    - Clique em **Salvar**.

## Verificação Técnica
- [x] RLS habilitado nas novas tabelas.
- [x] Hooks `useAccessLevels` e `useAgencyRoles` funcionando de forma independente.
- [x] Linting e sintaxe JSX validados.

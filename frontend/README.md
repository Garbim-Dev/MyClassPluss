# 🎓 MyClassPluss — Frontend

Interface interativa e responsiva do ecossistema **MyClassPluss**, uma plataforma educacional para gestão acadêmica, avaliações formais e dinâmicas pedagógicas gamificadas em tempo real via WebSockets.

---

## 📌 Visão Geral do Sistema

O frontend do **MyClassPluss** atende a dois perfis principais em ambiente de sala de aula e laboratório:

1. **Painel do Instrutor / Professor (`TeacherDashboard`):**
   - **Gestão Acadêmica Centralizada:** Cadastro e controle de Unidades/Instituições, Cursos, Disciplinas, Ambientes Físicos (Salas), Turmas e Histórico de Sessões.
   - **Controle de Presença & Matrícula Ao Vivo:** Registro manual ou dinâmico via QR Code / PIN com detecção em tempo real e atualização de alunos conectados.
   - **Projetor de Dinâmicas & Arena Gamificada:** Lançamento de questões para telão com cronômetro, pontuação dinâmica por agilidade, combos de acerto e pódio instantâneo.
   - **Monitor de Avaliações Formais:** Acompanhamento do progresso da turma em provas individuais em tempo real.
   - **Dossiê Pedagógico & Prontuário:** Relatórios de desempenho, médias, taxas de aprovação e extratos detalhados de notas.
   - **Módulo de Prova Impressa / PDF:** Visualização formatada em padrão A4 institucional (SENAI) com folha de respostas destacável, diagrama de questões e suporte a impressão física ou salvamento em PDF.

2. **Portal do Aluno (`StudentJoin` & `FormalExamView`):**
   - **Acesso Híbrido Resiliente:** Entrada por leitura de QR Code ou digitação manual do Código/PIN da turma.
   - **Fluxo com Abas Inteligentes:** Alternância entre *Primeiro Acesso* (cadastro inicial com senha) e *Já sou Cadastrado* (autenticação rápida por Matrícula/CPF), evitando perfis duplicados.
   - **Arena de Respostas:** Controles táteis otimizados para smartphones com alternativas coloridas, Verdadeiro/Falso, Resposta Curta, Slider Numérico e Ordenação (Puzzle).
   - **Prova Formal Contínua:** Experiência de avaliação tradicional com régua/mapa de questões no topo, navegação não linear ("Pular Questão"), cronômetro regressivo com persistência de rascunho em cache e aviso inteligente de itens não preenchidos antes da entrega.
   - **Keep-Alive & Wake Lock:** Prevenção de bloqueio de tela do celular e reconexão automática em caso de oscilação de Wi-Fi.

---

## 🛠️ Tecnologias Utilizadas

- **Core:** [React 18](https://react.dev/) com [TypeScript](https://www.typescriptlang.org/)
- **Build Tool:** [Vite](https://vitejs.dev/) (compilação rápida e Hot Module Replacement)
- **Estilização:** [Tailwind CSS](https://tailwindcss.com/) com suporte a temas (Dark/Light/Zinc)
- **Comunicação em Tempo Real:** [Socket.IO Client](https://socket.io/)
- **Roteamento:** [React Router DOM v6](https://reactrouter.com/)
- **Requisições HTTP:** [Axios](https://axios-http.com/)
- **Ícones:** [Lucide React](https://lucide.dev/)

---

## 📂 Estrutura de Pastas

```text
frontend/
├── public/                 # Assets estáticos (logos, insígnias, senai.png)
├── src/
│   ├── components/         # Componentes compartilhados (ThemeToggle, Modais utilitários)
│   ├── contexts/           # Contextos globais (ThemeContext, etc.)
│   ├── pages/
│   │   ├── student/        # Visões do aluno (StudentJoin, FormalExamView, StudentLibrary)
│   │   └── teacher/        # Painel do instrutor e gerenciadores acadêmicos
│   │       ├── TeacherDashboard.tsx       # Cockpit principal do professor
│   │       ├── ClassesManager.tsx         # Gestor de turmas e módulos
│   │       ├── ClassStudentsModal.tsx     # Alunos matriculados
│   │       ├── LiveQrEnrollmentModal.tsx  # Matrícula projetada ao vivo
│   │       ├── QuizManager.tsx            # Gestão de questões e avaliações
│   │       ├── ExamPrintModal.tsx         # Layout de impressão A4 / PDF
│   │       ├── ExamMonitorModal.tsx       # Monitoramento síncrono de provas
│   │       └── ...
│   ├── services/           # Clientes de API REST (api.ts) e WebSocket (socket.ts)
│   ├── App.tsx             # Definição de rotas principais
│   └── main.tsx            # Ponto de entrada React
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts

Pré-requisitos para Instalação e Execução

Antes de iniciar, certifique-se de ter instalado em seu ambiente:

Node.js (versão 18.x ou superior recomendada)

Gerenciador de pacotes: npm, yarn ou pnpm

O serviço de backend do MyClassPluss configurado e em execução na porta 3000.

🚀 Instalação e Execução
1. Clonar o Repositório
Bash
git clone [https://github.com/SEU-USUARIO/SEU-REPOSITORIO.git](https://github.com/SEU-USUARIO/SEU-REPOSITORIO.git)
cd SEU-REPOSITORIO/frontend
2. Instalar as Dependências
Bash
npm install
3. Configurar as Variáveis de Ambiente
Crie um arquivo .env na raiz da pasta frontend (caso necessário apontar para outro IP ou domínio na rede local):

Snippet de código
VITE_API_URL=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3000
Nota: Em treinamentos presenciais onde os alunos acessam pelo celular no Wi-Fi da sala, utilize o IP local da máquina servidora (exemplo: http://192.168.100.182:3000).

4. Executar em Modo de Desenvolvimento
Bash
npm run dev -- --host
O parâmetro --host permite que o Vite exponha a aplicação na rede local para os dispositivos móveis dos alunos.

Acesse:

Painel do Instrutor: http://localhost:5173/dashboard

Entrada do Aluno: http://<SEU_IP_LOCAL>:5173/student/join

5. Compilação para Produção
Bash
npm run build
Os artefatos estáticos otimizados serão gerados na pasta dist/.

📋 Boas Práticas Adotadas
Normalização de Documentos: Tratamento automático de pontuação e formatação em Matrículas/CPFs para eliminar perfis duplicados.

Isolamento de Estilos de Impressão: Geração de provas impressas em janela isolada para evitar colapso de viewport e folhas em branco.

Resiliência de Rede: Persistência em cache de rascunhos de provas formais para proteção contra quedas de conexão ou recarregamentos acidentais de página.
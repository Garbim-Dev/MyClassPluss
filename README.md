# 🎓 MyClassPluss — Gestor Acadêmico Interativo & Gamificado

> Plataforma completa de gestão pedagógica, aplicação de avaliações em tempo real e gamificação interativa para salas de aula, oficinas e treinamentos técnicos.

---

## 🚀 Sobre o Projeto

O **MyClassPluss** une o dinamismo e o engajamento dos jogos ao vivo à precisão e seriedade do controle acadêmico formal. O sistema permite que instrutores gerenciem instituições, turmas e disciplinas, apliquem provas com gabarito protegido, coordenem checklists práticos de campo e projetem quizzes interativos com ranking em tempo real via WebSockets.

### 🌟 Principais Recursos

- **Entrada Rápida e Descomplicada:** Ingressão imediata de estudantes via QR Code ou PIN de 6 dígitos direto pelo navegador (sem necessidade de baixar apps em lojas).  
- **Três Modalidades Pedagógicas:**  
  - 🎮 **Quiz Interativo:** Competição ao vivo com contagem regressiva por rodada, combos de pontuação e pódio dinâmico.  
  - 📝 **Avaliação Formal:** Exame acadêmico com cronômetro global em minutos, pesos ponderados (escala 0,0 a 10,0) e justificativas comentadas pós-prova.  
  - 🛠️ **Práticas de Oficina / Campo:** Checklists operacionais (POP/NRs), medições com sliders de precisão e sequenciamento de passos com puzzles.  
- **Dossiê Consolidado da Turma:** Relatório de aproveitamento e frequência pronto para impressão e exportação em PDF.  
- **Portal Formativo do Estudante:** Consulta individual do boletim, extrato de entregas e espelho comentado das avaliações.  
- **Arena de Telão Customizável:** Interface de projeção em tela cheia com temas visuais (Cyber Blue, Graphite, Clean Light e Neon Arena) e marca d'água ambiente.

---

## 🛠️ Tecnologias Utilizadas

### Frontend

- **React** (TypeScript \+ Vite)  
- **Tailwind CSS** (Design system responsivo e moderno)  
- **Socket.io Client** (Sincronização em tempo real)  
- **Lucide React** (Ícones)  
- **Canvas-Confetti** (Efeitos de celebração do pódio)

### Backend

- **NestJS** (Arquitetura modular em TypeScript)  
- **Socket.io / WebSockets** (Gateway de comunicação bidirecional de baixa latência)  
- **Prisma ORM** (Modelagem de dados e integridade relacional)  
- **PostgreSQL** (Persistência segura e robusta)  
- **JWT \+ Bcrypt** (Autenticação e proteção de dados)

---

## 📦 Como Executar o Projeto Localmente

### Pré-requisitos

- Node.js (v18+)  
- PostgreSQL  
- Git

---

### 1\. Clonar o Repositório

git clone \<URL\_DO\_REPOSITORIO\>

cd MyClassPluss

---

### 2\. Configurar o Backend

cd backend

npm install

Crie o arquivo `.env` na raiz da pasta `backend`:

DATABASE\_URL="postgresql://postgres:SUA\_SENHA@localhost:5432/myclasspluss?schema=public"

JWT\_SECRET="sua\_chave\_secreta\_jwt"

PORT=3000

Execute as migrações do banco e inicie o servidor:

npx prisma db push

npm run start:dev

---

### 3\. Configurar o Frontend

Abra outro terminal e execute:

cd frontend

npm install

npm run dev \-- \--host

Acesse o sistema no seu navegador:

- **Painel do Instrutor:** `http://localhost:5173/`  
- **Acesso dos Alunos:** `http://localhost:5173/student/join`

---

## 📄 Licença

Este projeto é desenvolvido para fins educacionais e comerciais sob licença proprietária. Todos os direitos reservados.
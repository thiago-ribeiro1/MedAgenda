# MedAgenda — Plano de Testes e Validação

Projeto da disciplina **Elaborar Plano de Testes e Validação de um Software (2026.2)** — Sistemas de Informação, Unifacisa.
Prof. Bruno Rafael Araújo Vasconcelos.

## Sobre

Sistema web de uma clínica médica: agendamento de consultas, confirmação pela recepção, atendimento com prontuário,
emissão de receita, atestado e comprovante em PDF, notificações, assistente virtual, relatórios e gestão de usuários
por perfil (administrador, médico, secretária e paciente).

O **MedAgenda** foi disponibilizado pronto pelo professor como caso de estudo.

Atuaremos como equipe de qualidade — planejar os testes,
executá-los e documentar os resultados.
O sistema é testado como foi entregue, sem alteração do seu código.

| Entrega | Data | Conteúdo |
|---|---|---|
| Primeira | 14/11 | Planejamento: ideia, requisitos, escopo dos testes, diagramas e ferramentas |
| Segunda | 11/12 | Testes implementados e executados, bugs registrados e parecer final |

## Como executar (Docker)

```bash
docker compose up --build
```

| Serviço  | Endereço                     |
|----------|------------------------------|
| Sistema  | http://localhost:8080        |
| API      | http://localhost:3000/api    |
| MongoDB  | mongodb://localhost:27017    |

Na primeira execução o banco é populado com dados de demonstração. Para voltar ao estado inicial:

```bash
docker compose exec api npm run seed
```

## Contas de demonstração

| Perfil       | E-mail                         | Senha            |
|--------------|--------------------------------|------------------|
| Administrador| admin@medagenda.dev            | Admin@2026       |
| Médica       | helena.costa@medagenda.dev     | Medico@2026      |
| Médico       | ricardo.alves@medagenda.dev    | Medico@2026      |
| Médica       | marina.duarte@medagenda.dev    | Medico@2026      |
| Secretária   | joana.lima@medagenda.dev       | Secretaria@2026  |
| Paciente     | ana.souza@email.dev            | Paciente@2026    |
| Paciente     | carlos.lima@email.dev          | Paciente@2026    |
| Paciente     | fernanda.rocha@email.dev       | Paciente@2026    |
| Paciente     | luiza.costa@email.dev          | Paciente@2026    |

## Executar sem Docker

Requer Node.js 20+ e um MongoDB local na porta 27017.

```bash
cd api && npm install && npm run seed && npm start      # API em :3000
cd web && npm install && npm run dev                     # Front-end em :5173
```

## Estrutura

```
api/   Node.js + Express + Mongoose (REST, JWT, PDF com pdfkit)
web/   React 18 + Vite + React Router
docker-compose.yml
```

## Principais rotas da API

| Método | Rota | Descrição |
|---|---|---|
| POST | /api/auth/login | Login (retorna token JWT) |
| GET/PUT | /api/perfil | Dados do usuário logado |
| PUT | /api/perfil/senha | Troca de senha |
| GET/POST | /api/usuarios | Contas de acesso |
| PUT | /api/usuarios/:id | Editar conta |
| PATCH | /api/usuarios/:id/ativo | Ativar/desativar conta |
| POST | /api/usuarios/:id/senha | Redefinir senha |
| GET/POST | /api/pacientes | Fichas de pacientes |
| GET/PUT | /api/pacientes/:id | Ficha do paciente |
| GET | /api/pacientes/eu | Ficha do paciente logado |
| GET | /api/medicos | Médicos ativos |
| GET | /api/medicos/:id/horarios?data=AAAA-MM-DD | Horários livres |
| GET/POST | /api/consultas | Listar / agendar consultas |
| GET | /api/consultas/:id | Detalhe da consulta |
| PATCH | /api/consultas/:id/confirmar | Confirmar |
| PATCH | /api/consultas/:id/cancelar | Cancelar |
| PATCH | /api/consultas/:id/falta | Registrar falta |
| PATCH | /api/consultas/:id/iniciar | Iniciar atendimento |
| PUT | /api/consultas/:id/prontuario | Registrar prontuário |
| PATCH | /api/consultas/:id/finalizar | Finalizar atendimento |
| GET | /api/consultas/:id/{comprovante,receita,atestado}.pdf | Documentos em PDF |
| GET | /api/notificacoes | Notificações do usuário |
| GET | /api/notificacoes/contagem | Total de não lidas |
| PATCH | /api/notificacoes/:id/lida · /api/notificacoes/lidas | Marcar como lida(s) |
| GET/POST/DELETE | /api/chat | Assistente virtual |
| GET | /api/relatorios/consultas[.pdf] | Relatório de consultas |
| GET | /api/relatorios/financeiro[.pdf] | Relatório financeiro |
| GET | /api/dashboard | Painel inicial por perfil |

Todas as rotas, exceto o login, exigem o cabeçalho `Authorization: Bearer <token>`.

## Equipe

Diogo Diniz Spínola Ribeiro · João Vitor Silva Monteiro · Keven Max Bezerra de Sousa ·
Maria Gabriela Pereira da Silva · Thiago Ribeiro Ramos Silva

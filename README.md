# Ata de Pré-Implantação Técnica e Operacional — Grupo Burguês

Aplicação Web moderna, 100% autônoma e responsiva para auditoria de pré-implantação técnica em campo, checklist operacional de equipamentos e lojas, registro fotográfico de evidências e geração/download oficial de relatório em PDF com assinaturas digitais.

---

## ✨ Funcionalidades

- **Identificação Completa:** Dados da loja/unidade, CNPJ com validação e formatação automática, horários e marcas atendidas (*O Burguês*, *Ex-Touro*, *Seu Vidal*, *B de Burger*).
- **Checklist Técnico e Operacional:** Status detalhado de Conectividade/Internet, Terminais PDV, Impressoras, Cardápios, Integrações de Delivery e Desativação de PDV antigo.
- **Evidência Fotográfica:** Anexe imagens por seleção, arrastando o arquivo ou colando print direto (**Ctrl+V**), com compressão automática em Canvas e preservação de fundo branco para capturas de tela transparentes.
- **Assinaturas Digitais em Canvas:** Coleta de assinaturas digitais para Responsável de TI, Operações e Unidade Local, com suporte nativo a Touch (celular/tablet) e Mouse (desktop).
- **Auto-save no Navegador (LocalStorage):** Todo o progresso do formulário é salvo automaticamente no navegador em tempo real. Se a página for recarregada ou fechada por engano, o trabalho é preservado.
- **Download Direto em PDF (.pdf):** Gera e baixa o arquivo PDF com alta resolução diretamente para a pasta de Downloads sem depender de servidor externo.
- **Opção de Impressão Nativa:** Botão para abrir o diálogo nativo do navegador (`window.print()`).
- **Pré-visualização Oficial:** Modal interativo com espelho fiel do padrão A4 impresso antes de exportar.

---

## 📁 Estrutura de Arquivos

```
/
├── index.html                           # Ponto de entrada da aplicação e formulário interativo
├── README.md                            # Documentação do projeto
├── .gitignore                           # Arquivos ignorados pelo Git
└── src/
    └── assets/
        ├── css/
        │   └── style.css                # Estilização completa e regras de impressão (@media print)
        └── js/
            ├── html2pdf.bundle.min.js   # Biblioteca local para download direto de PDF offline
            ├── canvas.js                # Controle dos painéis de assinatura digital HiDPI
            ├── storage.js               # Gerenciamento de auto-save via LocalStorage
            └── main.js                  # Orquestrador da aplicação, upload, máscaras e exportação
```

---

## 🚀 Como Executar Localmente

### Opção 1: Execução Direta (Mais Rápida)
Basta dar **duplo clique no arquivo `index.html`** no Windows Explorer. Ele abre direto no seu navegador padrão (Chrome, Edge, Firefox), sem necessidade de instalar Node, Python ou qualquer servidor!

### Opção 2: Com Python
```bash
python -m http.server 8080
```
Acesse no navegador: [http://localhost:8080](http://localhost:8080)

### Opção 3: Extensão Live Server (VS Code)
Clique com o botão direito no `index.html` e selecione **"Open with Live Server"**.

---

## 📤 Como Subir no GitHub

Para publicar o projeto no seu GitHub pessoal ou corporativo:

1. **Inicialize o Git no repositório local:**
   ```bash
   git init
   git add .
   git commit -m "feat: Ata de Pré-Implantação Técnica e Operacional Grupo Burguês"
   ```

2. **Crie um repositório no GitHub** (por exemplo, `site_relatorio` ou `ata-pre-implantacao`).

3. **Vincule o repositório remoto e envie o código:**
   ```bash
   git branch -M main
   git remote add origin https://github.com/SEU_USUARIO/NOME_DO_REPOSITORIO.git
   git push -u origin main
   ```

---

## 🌐 Ativação do GitHub Pages (Opcional)

Para disponibilizar o link público do formulário para os técnicos de campo sem custo de servidor:

1. No seu repositório no GitHub, acesse **Settings** > **Pages**.
2. Na seção **Build and deployment**:
   - **Source:** selecione `Deploy from a branch`.
   - **Branch:** escolha `main` e a pasta `/ (root)`.
3. Clique em **Save**.
4. Em poucos instantes, o link público estará disponível (ex: `https://seu-usuario.github.io/nome-do-repositorio/`).

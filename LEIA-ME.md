# Maktub Go — Novos Arquivos para Adicionar ao Site

Este pacote contém **quatro pastas novas** que devem ser adicionadas ao repositório `Maktubgoviagens-main` no GitHub. Nada do site existente será alterado — estes são arquivos complementares.

## Estrutura final esperada no repositório

```
Maktubgoviagens-main/
├── index.html                      ← (já existe — não mexer)
├── trabalheconosco/
│   └── index.html                  ← (já existe — não mexer)
├── ativos/                         ← NOVA PASTA (logos da Maktub Go)
│   ├── simbolo-verde.png           ← Símbolo verde (fundos claros)
│   ├── simbolo-creme.png           ← Símbolo creme (fundos escuros)
│   ├── logo-verde-transparente.png ← Logo completa verde
│   ├── logo-creme-transparente.png ← Logo completa creme
│   ├── logo-fundo-creme.jpg        ← Logo original com fundo creme
│   ├── logo-fundo-verde.jpg        ← Logo original com fundo verde
│   └── logo-fundo-branco.jpg       ← Logo original com fundo branco
├── gestao-de-milhas/               ← NOVA PASTA
│   └── index.html                  ← Landing page do serviço Concierge
├── acesso/                         ← NOVA PASTA
│   └── index.html                  ← Tela de login
├── painel/                         ← NOVA PASTA
│   └── index.html                  ← Dashboard do cliente
├── assets/                         ← (já existe — não mexer)
├── CNAME                           ← (já existe)
├── sitemap.xml                     ← (já existe)
└── ...outros arquivos do site original
```

> **Importante sobre a pasta `ativos/`:** se o repositório atual já tem uma pasta com esse nome (visível no print do GitHub), os novos arquivos de logo podem ser adicionados dentro dela, sem substituir o que já está lá. Os nomes dos arquivos novos são únicos (`simbolo-*`, `logo-*-transparente`).

## URLs que serão criadas após o upload

- `https://maktubgo.com.br/gestao-de-milhas/` — Landing page pública do serviço Concierge
- `https://maktubgo.com.br/acesso/` — Tela de login privada do cliente
- `https://maktubgo.com.br/painel/` — Painel do cliente (Ricardo Almeida — perfil exemplo)

## Como subir no GitHub (passo a passo)

### Opção 1 — Pelo navegador (mais simples)

1. Acesse seu repositório `Maktubgoviagens-main` no GitHub
2. Clique em **"Add file"** → **"Upload files"**
3. Arraste as **quatro pastas** (`ativos`, `gestao-de-milhas`, `acesso`, `painel`) para a área de upload
   - Se já existe uma pasta `ativos/` no repositório, o GitHub vai mesclar automaticamente os arquivos novos com os existentes
4. Em "Commit changes", escreva: `Adiciona área de Gestão de Milhas Concierge`
5. Clique em **"Commit changes"**
6. Aguarde 1-2 minutos. O GitHub Pages publicará automaticamente em `maktubgo.com.br`

### Opção 2 — Via Git (se você tiver desenvolvedor)

```bash
git clone https://github.com/seu-usuario/Maktubgoviagens-main.git
cd Maktubgoviagens-main
# copiar as 4 pastas para dentro
git add ativos/ gestao-de-milhas/ acesso/ painel/
git commit -m "Adiciona área de Gestão de Milhas Concierge"
git push
```

## Próximo passo recomendado (opcional)

Adicionar um link para a nova página de Gestão de Milhas no menu principal do site (`index.html` raiz).

Na seção de navegação (linha ~191), adicione um item de menu antes de "Trabalhe Conosco":

```html
<li><a href="/gestao-de-milhas">Gestão de Milhas</a></li>
```

E no card "Gestão de Milhas" da seção de serviços, transforme em link para a nova página dedicada:

```html
<a href="/gestao-de-milhas" class="servico-card reveal d5" style="text-decoration:none">
  <!-- conteúdo do card -->
</a>
```

## Sobre o painel do cliente

**ATENÇÃO:** O painel atual é uma **demonstração estática** com dados fixos do cliente exemplo "Ricardo Almeida". Ele serve para:

- Apresentar o conceito a clientes potenciais
- Validar a identidade visual
- Servir de referência para o desenvolvedor que vai construir a versão real

Para que o painel funcione com **clientes reais e dados dinâmicos**, será necessário um próximo passo de desenvolvimento usando Supabase + autenticação. Esse passo deve ser feito quando você tiver:

1. Modelo comercial definido (preço da gestão concierge)
2. Validação do conceito com 1-2 clientes próximos
3. Definição de quem cuidará da manutenção técnica

Por enquanto, esse painel "modelo" já permite que você:
- Mostre a proposta para clientes interessados
- Capture clientes na página de Gestão de Milhas
- Tenha uma identidade pronta para evoluir

## Suporte

Caso precise de ajustes no design, textos, dados de exemplo ou estrutura, basta solicitar.

---

**Maktub Go · Alfaiataria de Viagens**
Construído para se integrar perfeitamente ao seu site existente.

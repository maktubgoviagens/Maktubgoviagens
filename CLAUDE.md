# Regras permanentes do site Maktub Go

Estas regras valem para qualquer trabalho neste repositório. Em caso de dúvida, perguntar antes de agir.

## Marca e posicionamento

- A Maktub Go é uma alfaiataria de viagens premium. A tagline é sempre "Alfaiataria de Viagens", nunca "Agência de Viagens".
- A gestão de milhas é o produto principal e a porta de entrada do site. As viagens sob medida são o serviço complementar.
- O nome do produto é sempre "Gestão de Milhas Maktub Go". Nunca "Gestão de Milhas Concierge" nem "gestão concierge". "Concierge" só aparece como atributo do atendimento de viagem.
- Quem cuida do cliente é a equipe. Nunca "gestor dedicado", "seu gestor" ou "um gestor": usar "a equipe", "sua equipe" ou "nossa equipe".
- Não usar propriedade intelectual de terceiros (Disney, companhias aéreas).
- Nenhuma frase de exclusividade sem prova ("exclusivo", "único", "o melhor do mercado" e parecidas).
- Nenhuma comparação negativa com concorrentes ou com outros tipos de serviço.

## Gestão de milhas

- Milha nunca é apresentada como investimento, patrimônio ou dinheiro. A comparação com assessor de investimentos só pode aparecer como analogia de cuidado e organização.
- Nas páginas de venda, nada sobre senha, credenciais ou acesso às contas dos programas de fidelidade. Nunca afirmar que a Maktub acessa as contas, e nunca afirmar que não acessa. Usar "gerencia" ou "gerenciamos".
- O diferencial de segurança é o cofre digital: as informações confidenciais da gestão ficam em um cofre digital criptografado, com acesso restrito à equipe responsável pela carteira do cliente.
- Não publicar o preço da gestão de milhas. O valor só é passado pelo closer, depois do diagnóstico.
- Referência de perfil: gastos mensais a partir de R$ 20 mil, somando cartões e Pix. É uma referência, não um corte.
- Suporte da equipe em horário comercial. Nunca prometer atendimento 24 horas.
- Quem só precisa de uma passagem é atendido como passagem avulsa, pelo WhatsApp.
- Condições, sempre com estas palavras, em qualquer página ou no app:
  - Emissões: emissões ilimitadas para o cliente, com as milhas dele. O que está incluso é o serviço de emissão. Passagens, taxas dos programas e custos de terceiros são pagos à parte.
  - Primeira viagem: "Na primeira viagem em que o titular do contrato esteja viajando, o planejamento é incluso: se a viagem tiver taxa de planejamento, ela não é cobrada, e o roteiro é incluso sem limite de dias."
  - Viagens seguintes: "Nas viagens seguintes do titular, a taxa de planejamento segue a regra normal, quando houver, e o roteiro tem 40% de desconto sobre a diária."
  - A taxa de planejamento existe só em algumas viagens, conforme a complexidade (em geral internacionais e com vários destinos). Quando houver, é informada antes e devolvida integralmente em cashback quando a viagem é fechada com a Maktub. Nunca escrever que ela existe em toda viagem. O roteiro dia a dia tem investimento por dia (a diária do roteiro).

## Diagnóstico

- Todo botão da gestão diz "Quero meu diagnóstico" e leva para `/diagnostico/`.
- O formulário de diagnóstico é curto, com 3 campos obrigatórios: nome, WhatsApp e gasto mensal nos cartões. Os demais (e-mail, movimentação via Pix, programas, como conheceu e quem indicou) ficam recolhidos como opcionais.
- O mesmo formulário (`/diagnostico/formulario.js` e `formulario.css`) é usado em `/diagnostico/`, na home e na gestão. Ele grava na tabela `solicitacoes_acesso`.
- Eventos: `clique_diagnostico` nos botões e `generate_lead` (tipo `diagnostico_gestao`) só depois que o Supabase confirma a gravação.

## Textos

- Nunca usar travessão em nenhum texto.
- Textos de venda com escrita humana e calorosa, que não pareça IA.
- Usar "investimento" para o valor pago pelo cliente, nunca "cobramos".
- Nunca inventar dados (números, nomes, depoimentos, casos). Se faltar, perguntar.
- Histórias e depoimentos de viagem são de clientes da alfaiataria de viagens, nunca apresentados como resultado da gestão.

## Identidade visual

- Cores: verde #1B4332 (fundo em uso #193826), dourado #A88B4A, creme #EBE0C4.
- Não usar tons de verde fora da paleta.
- Títulos em Cormorant Garamond com itálico em dourado. Textos em Jost.
- Logo: usar sempre os arquivos oficiais da pasta `ativos/`. Nunca recriar a logo em código.
- O topo (cabeçalho e menu) de todas as páginas deve ser igual ao da página Gestão de Milhas.
- Fotos: só fotos reais que já estão no site (clientes ou equipe). Nada de banco de imagens.

## Código e publicação

- Nada é apagado do site: conteúdo que sai de uma página é movido para outra.
- `executiva-buenos-aires` e qualquer outro orçamento de cliente ficam fora de qualquer padronização: sem cabeçalho do site, sem GA4 e sem Clarity.
- Blocos com a classe `so-rascunho` ficam escondidos no site publicado. Conferir no código antes de afirmar que algo aparece.
- Toda mudança de texto ou visual: apresentar a proposta antes, aplicar em branch separada, mostrar prints antes e depois e só fazer merge e publicar com aprovação expressa.
- Mudança no Supabase: entregar o SQL antes. O código que depende dele só entra depois do "feito". Nunca apagar ou alterar registros existentes.

-- 002. Card do Comercial: dados da viagem digitados uma vez só
--
-- O que faz: cria na tabela de cards (atendimentos) uma coluna nova chamada "viagem".
-- Nela o app guarda origem, destino (cidade e código do aeroporto), tipo (ida e volta, só ida
-- ou multitrecho), os trechos do multitrecho, a quantidade de passageiros e a bagagem despachada.
-- As datas continuam nas colunas que já existem (data_viagem e data_volta), e o texto "trecho"
-- continua sendo gravado, montado sozinho, para listas, busca e cotação.
--
-- Não apaga, não altera e não lê nenhum registro. Todos os cards existentes ficam com a coluna vazia,
-- e o app continua lendo os dados antigos (trecho do card e respostas do diagnóstico) quando ela está vazia.
-- Pode rodar mais de uma vez sem erro ("if not exists").
--
-- Antes de rodar: faça o backup do banco.

alter table public.atendimentos add column if not exists viagem jsonb;

comment on column public.atendimentos.viagem is
  'Viagem do card: origem, destino (cidade e código), tipo (iv, ida, multi), trechos do multitrecho, passageiros e bagagem. As datas continuam em data_viagem e data_volta.';

-- Conferência depois de rodar (só leitura). Deve mostrar uma linha: viagem | jsonb
-- select column_name, data_type from information_schema.columns
--  where table_schema = 'public' and table_name = 'atendimentos' and column_name = 'viagem';

-- 001. Metas: ida e volta com fornecedores diferentes contam uma venda só
--
-- O que faz: substitui a função metas_progresso. A assinatura e o formato da resposta continuam iguais.
-- Muda só a contagem de "Quantidade de vendas" (qtd), nos três lugares (empresa, por vendedor e "eu").
-- Antes: cada linha de emissoes era uma venda.
-- Agora: as linhas que vieram dos blocos de um mesmo card, ligados pelo interruptor
-- "Ida e volta com fornecedores diferentes" (chave "grupo" no item do card), contam uma venda só.
-- Qualquer outra linha continua contando como antes: "+ Outra emissão", passagem + hotel e vendas antigas.
-- Valor vendido e lucro continuam somando todas as linhas.
--
-- Não cria tabela, não cria coluna, não apaga nem altera nenhum registro.

-- Conferência antes de aplicar (só leitura). Deve dar a mesma quantidade dos dois jeitos enquanto não houver card com blocos:
-- select count(*) antes,
--        count(distinct coalesce(g.chave, e.id::text)) depois
--   from public.emissoes e
--   left join lateral (
--     select a.id::text || ':' || (el->>'grupo') chave
--       from public.atendimentos a
--       cross join lateral jsonb_array_elements(case when jsonb_typeof(a.itens) = 'array' then a.itens else '[]'::jsonb end) el
--      where el->>'planilha_id' = e.id::text and coalesce(el->>'grupo', '') <> ''
--      limit 1) g on true
--  where date_trunc('month', e.data_negociacao) = date_trunc('month', current_date);

CREATE OR REPLACE FUNCTION public.metas_progresso(p_mes date)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  m date := date_trunc('month', p_mes)::date;
  e record; me record; emp json; pessoas json;
begin
  if not public.is_time() then raise exception 'Acesso restrito à equipe.'; end if;

  select coalesce(sum(lucro_bruto), 0) lucro, coalesce(sum(valor_receber), 0) vendas, count(distinct chave) qtd
    into e from (select x.id, x.vendedor_id, x.valor_receber, x.lucro_bruto, coalesce(g.chave, x.id::text) chave
          from public.emissoes x
          left join lateral (
            select a.id::text || ':' || (el->>'grupo') chave
              from public.atendimentos a
              cross join lateral jsonb_array_elements(case when jsonb_typeof(a.itens) = 'array' then a.itens else '[]'::jsonb end) el
             where el->>'planilha_id' = x.id::text and coalesce(el->>'grupo', '') <> ''
             limit 1) g on true
         where date_trunc('month', x.data_negociacao) = m) l;
  select * into me from public.metas where mes = m and user_id is null;

  if public.tem_acesso('metas') then
    select coalesce(json_agg(x order by x.nome), '[]'::json) into pessoas from (
      select q.user_id, q.nome, coalesce(v.qtd, 0) qtd, coalesce(v.vendas, 0) vendas, coalesce(v.lucro, 0) lucro,
             mt.qtd_meta, mt.vendas_meta, mt.lucro_meta1
      from public.equipe q
      left join (select vendedor_id, count(distinct chave) qtd, sum(valor_receber) vendas, sum(lucro_bruto) lucro
                 from (select x.id, x.vendedor_id, x.valor_receber, x.lucro_bruto, coalesce(g.chave, x.id::text) chave
          from public.emissoes x
          left join lateral (
            select a.id::text || ':' || (el->>'grupo') chave
              from public.atendimentos a
              cross join lateral jsonb_array_elements(case when jsonb_typeof(a.itens) = 'array' then a.itens else '[]'::jsonb end) el
             where el->>'planilha_id' = x.id::text and coalesce(el->>'grupo', '') <> ''
             limit 1) g on true
         where date_trunc('month', x.data_negociacao) = m) l group by vendedor_id) v on v.vendedor_id = q.user_id
      left join public.metas mt on mt.mes = m and mt.user_id = q.user_id
      where q.ativo) x;
    return json_build_object('admin', true, 'mes', m,
      'empresa', json_build_object('lucro', e.lucro, 'vendas', e.vendas, 'qtd', e.qtd,
                                   'lucro_meta1', me.lucro_meta1, 'lucro_meta2', me.lucro_meta2,
                                   'lucro_meta3', me.lucro_meta3, 'lucro_meta4', me.lucro_meta4,
                                   'vendas_meta', me.vendas_meta, 'qtd_meta', me.qtd_meta),
      'pessoas', pessoas);
  end if;

  emp := json_build_object(
    'meta1', case when me.lucro_meta1 > 0 then round(e.lucro / me.lucro_meta1 * 100) end,
    'meta2', case when me.lucro_meta2 > 0 then round(e.lucro / me.lucro_meta2 * 100) end,
    'meta3', case when me.lucro_meta3 > 0 then round(e.lucro / me.lucro_meta3 * 100) end,
    'meta4', case when me.lucro_meta4 > 0 then round(e.lucro / me.lucro_meta4 * 100) end,
    'vendas', case when me.vendas_meta > 0 then round(e.vendas / me.vendas_meta * 100) end,
    'qtd', case when me.qtd_meta > 0 then round(e.qtd::numeric / me.qtd_meta * 100) end);
  select coalesce(v.qtd, 0) qtd, coalesce(v.vendas, 0) vendas, mt.qtd_meta, mt.vendas_meta into e
  from (select 1) d
  left join (select count(distinct chave) qtd, sum(valor_receber) vendas from (select x.id, x.vendedor_id, x.valor_receber, x.lucro_bruto, coalesce(g.chave, x.id::text) chave
          from public.emissoes x
          left join lateral (
            select a.id::text || ':' || (el->>'grupo') chave
              from public.atendimentos a
              cross join lateral jsonb_array_elements(case when jsonb_typeof(a.itens) = 'array' then a.itens else '[]'::jsonb end) el
             where el->>'planilha_id' = x.id::text and coalesce(el->>'grupo', '') <> ''
             limit 1) g on true
         where date_trunc('month', x.data_negociacao) = m) l
             where vendedor_id = auth.uid()) v on true
  left join public.metas mt on mt.mes = m and mt.user_id = auth.uid();
  return json_build_object('admin', false, 'mes', m, 'empresa', emp,
    'eu', json_build_object('qtd', e.qtd, 'vendas', e.vendas, 'qtd_meta', e.qtd_meta, 'vendas_meta', e.vendas_meta));
end $function$;

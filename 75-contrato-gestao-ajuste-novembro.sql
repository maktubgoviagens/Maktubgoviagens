-- 75-contrato-gestao-ajuste-novembro.sql
-- Nova versão do modelo de contrato da Gestão (06/11/2026).
-- Não altera nem apaga nada: copia o modelo ativo mais recente, aplica os ajustes e grava como uma versão NOVA.
-- O app sempre usa a versão ativa mais recente, então os próximos contratos já saem com o texto novo.
-- Contratos já gerados continuam com a versão em que foram gerados.
-- Se algum trecho esperado não for encontrado, nada é gravado e aparece a mensagem dizendo qual.
--
-- Ajustes:
--   6.3  vira mandato (a Maktub executa em nome do titular, com aprovação dele)
--   6.8  nova: contas pessoais e intransferíveis; a Maktub não compra, não vende e não cede pontos
--   7.2  suporte 24h só para urgências da viagem
--   7.3  "patrimônio estimado" vira "valor de referência estimado"
--   8.1  montagem de rota vira o planejamento incluso (texto do CLAUDE.md)
--   8.2  ressalva da 8.1
--   10.1 "valores de patrimônio" vira "valores de referência"
--   Anexo I: linha do planejamento, linha do suporte e coluna de programas sem número de fidelidade

do $$
declare
  m contrato_modelos%rowtype;
  b jsonb;
  t text;
  novo jsonb := '[]'::jsonb;
  achou text[] := '{}';
  faltou text[];
  linhas jsonb;
  l jsonb;
  colfid int;

  t63 text := '6.3. O MEMBRO, titular das contas, constitui a CONTRATADA sua mandatária para realizar, em seu nome e por sua conta, as consultas, transferências e emissões necessárias à execução deste contrato, sempre mediante sua solicitação ou aprovação prévia e em benefício do MEMBRO e dos acompanhantes de suas viagens.';
  t68 text := '6.8. As contas de fidelidade permanecem pessoais e intransferíveis, sob a titularidade e a responsabilidade do MEMBRO. A CONTRATADA não compra, não vende e não cede os pontos e milhas do MEMBRO, e só os utiliza nas emissões que ele solicitar ou aprovar. O MEMBRO declara conhecer os regulamentos dos programas de que participa.';
  t72 text := '7.2. O suporte funciona em horário comercial, de segunda a sexta-feira, das 9h às 18h, pelos canais oficiais da CONTRATADA. Durante as viagens do MEMBRO, urgências relacionadas à viagem, como voo, hospedagem, locação e ingressos, são atendidas por ligação a qualquer hora, inclusive em fins de semana e feriados. O atendimento fora do horário comercial não abrange assuntos pessoais do MEMBRO.';
  t73 text := '7.3. O MEMBRO terá acesso ao painel online da CONTRATADA, com saldos, valor de referência estimado dos pontos e milhas, histórico de movimentações e relatório mensal, e aos canais de avisos de passagens e de promoções.';
  t81 text := '8.1. Na primeira viagem em que o MEMBRO, titular deste contrato, esteja viajando, o planejamento é incluso: se a viagem tiver taxa de planejamento, ela não é cobrada, e o roteiro é incluso sem limite de dias. Nas viagens seguintes do MEMBRO, a taxa de planejamento segue a regra normal, quando houver, e o roteiro tem 40% (quarenta por cento) de desconto sobre a diária.';
  t101 text := '10.1. A CONTRATADA não garante valor mínimo de economia ou de resultado. Os valores de referência dos pontos e milhas e de economia apresentados no painel e nos relatórios são estimativas, que variam conforme o resgate, e não representam saldo em dinheiro.';
  a_plan text := 'Primeira viagem do titular: planejamento incluso, sem taxa de planejamento e com roteiro sem limite de dias. Viagens seguintes: roteiro com 40% de desconto sobre a diária';
  a_sup text := 'Horário comercial, segunda a sexta, 9h às 18h; durante a viagem, urgências da viagem a qualquer hora';
  a_fid text := 'Programas de fidelidade de titularidade do MEMBRO, informados no onboarding e registrados no painel, com atualização ao longo do contrato.';
begin
  select * into m from contrato_modelos where tipo = 'gestao' and ativo order by criado_em desc limit 1;
  if m.id is null then raise exception 'Nenhum modelo de contrato da gestão ativo.'; end if;

  for b in select value from jsonb_array_elements(m.blocos) loop
    t := coalesce((select string_agg(x.r->>0, '' order by x.ord)
                   from jsonb_array_elements(case when jsonb_typeof(b->'r') = 'array' then b->'r' else '[]'::jsonb end) with ordinality x(r, ord)), '');
    t := btrim(t);

    if t ~ '^6\.8\.' then raise exception 'Este ajuste já foi aplicado (o modelo ativo já tem a cláusula 6.8). Nada foi gravado.'; end if;

    if t ~ '^6\.3\.' then b := jsonb_set(b, '{r}', jsonb_build_array(jsonb_build_array(t63, false))); achou := array_append(achou, '6.3'::text);
    elsif t ~ '^7\.2\.' then b := jsonb_set(b, '{r}', jsonb_build_array(jsonb_build_array(t72, false))); achou := array_append(achou, '7.2'::text);
    elsif t ~ '^7\.3\.' then b := jsonb_set(b, '{r}', jsonb_build_array(jsonb_build_array(t73, false))); achou := array_append(achou, '7.3'::text);
    elsif t ~ '^8\.1\.' then b := jsonb_set(b, '{r}', jsonb_build_array(jsonb_build_array(t81, false))); achou := array_append(achou, '8.1'::text);
    elsif t ~ '^8\.2\.\s*Roteiros' then
      b := jsonb_set(b, '{r}', jsonb_build_array(jsonb_build_array(regexp_replace(t, '^8\.2\.\s*Roteiros', '8.2. Ressalvado o disposto na Cláusula 8.1, roteiros'), false)));
      achou := array_append(achou, '8.2'::text);
    elsif t ~ '^10\.1\.' then b := jsonb_set(b, '{r}', jsonb_build_array(jsonb_build_array(t101, false))); achou := array_append(achou, '10.1'::text);
    end if;

    if jsonb_typeof(b->'linhas') = 'array' then
      linhas := '[]'::jsonb; colfid := null;
      for l in select value from jsonb_array_elements(b->'linhas') loop
        if l->>0 = 'Montagens de rota inclusas' then
          l := jsonb_build_array('Planejamento incluso', a_plan); achou := array_append(achou, 'anexo_planejamento'::text);
        elsif l->>0 = 'Suporte' then
          l := jsonb_set(l, '{1}', to_jsonb(a_sup)); achou := array_append(achou, 'anexo_suporte'::text);
        elsif colfid is not null then
          l := jsonb_set(l, array[colfid::text], to_jsonb(a_fid));
        else
          select e.ord - 1 into colfid from jsonb_array_elements_text(l) with ordinality e(v, ord)
            where e.v ilike 'Programas e n%fidelidade%' limit 1;
          if colfid is not null then
            l := jsonb_set(l, array[colfid::text], to_jsonb('Programas de fidelidade'::text)); achou := array_append(achou, 'anexo_programas'::text);
          end if;
        end if;
        linhas := linhas || jsonb_build_array(l);
      end loop;
      b := jsonb_set(b, '{linhas}', linhas);
    end if;

    novo := novo || jsonb_build_array(b);

    -- a 6.8 entra logo depois da 6.7, com o mesmo formato de bloco
    if t ~ '^6\.7\.' then
      novo := novo || jsonb_build_array(jsonb_set(b, '{r}', jsonb_build_array(jsonb_build_array(t68, false))));
      achou := array_append(achou, '6.7'::text);
    end if;
  end loop;

  faltou := array(select unnest(array['6.3','6.7','7.2','7.3','8.1','8.2','10.1','anexo_planejamento','anexo_suporte','anexo_programas'])
                  except select unnest(achou));
  if coalesce(array_length(faltou, 1), 0) > 0 then
    raise exception 'Nada foi gravado. Não encontrei no modelo: %', array_to_string(faltou, ', ');
  end if;

  insert into contrato_modelos (tipo, versao, blocos, ativo)
  values ('gestao', coalesce(m.versao, 'gestao') || ' + ajuste 06/11/2026', novo, true);

  raise notice 'Pronto: nova versão do contrato gravada (% ajustes).', array_length(achou, 1);
end $$;

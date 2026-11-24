-- 003 (desfazer). Volta as duas funções da página de cadastro da Gestão exatamente como estavam antes do 003.
-- Só rode se precisar voltar atrás. Não mexe em nenhum registro.

create or replace function public.cadastro_ver_gestao(p_token text)
 returns json
 language plpgsql
 stable security definer
 set search_path to 'public'
as $function$
declare l public.pessoas_links; p public.pessoas; x record;
begin
  select * into l from public.pessoas_links where token = p_token;
  if not found or l.expira_em < now() then return json_build_object('ok', false); end if;
  if l.tipo is distinct from 'gestao' then return json_build_object('ok', true, 'tipo', l.tipo); end if;
  select * into p from public.pessoas where id = l.pessoa_id;
  select * into x from public.contrato_dados_pessoa where pessoa_id = l.pessoa_id;
  return json_build_object('ok', true, 'tipo', 'gestao',
    'nome_completo', p.nome, 'email', p.email, 'celular', p.celular, 'nascimento', p.nascimento,
    'rg', x.rg, 'rg_orgao_uf', x.rg_orgao_uf, 'nacionalidade', x.nacionalidade, 'estado_civil', x.estado_civil,
    'profissao', x.profissao, 'endereco_completo', x.endereco_completo, 'cep', x.cep);
end $function$;

create or replace function public.cadastro_contrato_enviar(p_token text, p_dados jsonb)
 returns json
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  l public.pessoas_links;
  v_nome text := trim(regexp_replace(coalesce(p_dados->>'nome', ''), '\s+', ' ', 'g'));
  v_cep text := regexp_replace(coalesce(p_dados->>'cep', ''), '\D', '', 'g');
  v_cpf text := regexp_replace(coalesce(p_dados->>'cpf', ''), '\D', '', 'g');
  campo text;
begin
  select * into l from public.pessoas_links where token = p_token;
  if not found or l.expira_em < now() then raise exception 'Este link expirou. Peça um novo à Maktub.'; end if;
  if l.tipo is distinct from 'gestao' then raise exception 'Este link não é de cadastro da Gestão.'; end if;
  if array_length(string_to_array(v_nome, ' '), 1) < 2 then raise exception 'Informe o nome completo, com sobrenome.'; end if;
  if length(v_cpf) <> 11 then raise exception 'O CPF precisa ter 11 números.'; end if;
  if length(v_cep) <> 8 then raise exception 'O CEP precisa ter 8 números.'; end if;
  foreach campo in array array['nascimento', 'rg', 'rg_orgao_uf', 'nacionalidade', 'estado_civil', 'profissao', 'endereco_completo', 'celular', 'email'] loop
    if nullif(trim(coalesce(p_dados->>campo, '')), '') is null then raise exception 'Preencha todos os campos.'; end if;
  end loop;

  update public.contrato_dados_pessoa set
    rg = left(trim(p_dados->>'rg'), 30),
    rg_orgao_uf = left(trim(p_dados->>'rg_orgao_uf'), 40),
    nacionalidade = left(trim(p_dados->>'nacionalidade'), 60),
    estado_civil = left(trim(p_dados->>'estado_civil'), 40),
    profissao = left(trim(p_dados->>'profissao'), 80),
    endereco_completo = left(trim(p_dados->>'endereco_completo'), 300),
    cep = v_cep,
    atualizado_em = now()
  where pessoa_id = l.pessoa_id;
  if not found then
    insert into public.contrato_dados_pessoa (pessoa_id, rg, rg_orgao_uf, nacionalidade, estado_civil, profissao, endereco_completo, cep, atualizado_em)
    values (l.pessoa_id, left(trim(p_dados->>'rg'), 30), left(trim(p_dados->>'rg_orgao_uf'), 40), left(trim(p_dados->>'nacionalidade'), 60),
            left(trim(p_dados->>'estado_civil'), 40), left(trim(p_dados->>'profissao'), 80), left(trim(p_dados->>'endereco_completo'), 300), v_cep, now());
  end if;

  -- nome, CPF, nascimento, celular e e-mail vão para a ficha pelo mesmo caminho do cadastro de sempre
  perform public.cadastro_enviar(p_token, jsonb_build_object(
    'nome', v_nome, 'cpf', p_dados->>'cpf', 'nascimento', p_dados->>'nascimento', 'celular', p_dados->>'celular',
    'email', p_dados->>'email', 'nacionalidade', p_dados->>'nacionalidade', 'acompanhantes', '[]'::jsonb));

  begin
    perform public.avisar('cadastro', 'Dados do contrato recebidos: ' || v_nome,
      'O contrato da Gestão já pode ser gerado com um toque, sem digitar nada.', '/admin/app/#crm/' || l.pessoa_id, 'cadastro_gestao:' || l.id || ':' || now()::date);
  exception when others then null;
  end;
  return json_build_object('ok', true);
end $function$;

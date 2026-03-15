# Guia de Publicação: Maktub Go no GitHub Pages

Este guia contém o passo a passo para colocar seu site no ar permanentemente no endereço **www.maktubgo.com.br** usando o GitHub Pages.

## Parte 1: No seu GitHub

1.  Crie um novo repositório no seu GitHub chamado `maktubgo` (ou o nome que preferir).
2.  **Importante**: Deixe o repositório como **Public** (Público).
3.  Abra o terminal na pasta que eu te enviei e execute estes comandos:
    ```bash
    git init
    git add .
    git commit -m "Publicação inicial do site Maktub Go"
    git branch -M main
    git remote add origin https://github.com/SEU_USUARIO/maktubgo.git
    git push -u origin main
    ```
    *(Substitua `SEU_USUARIO` pelo seu nome de usuário no GitHub)*

4.  No GitHub, vá em **Settings** > **Pages**.
5.  Em **Build and deployment**, certifique-se de que a fonte está como **Deploy from a branch** e a branch é a `main`.
6.  Em **Custom domain**, digite `www.maktubgo.com.br` e clique em **Save**.
7.  Marque a opção **Enforce HTTPS** (pode levar alguns minutos para ficar disponível).

---

## Parte 2: No seu Painel de Domínio (ex: Registro.br)

Para que o seu domínio aponte para o GitHub, você precisa configurar os registros DNS. Adicione os seguintes registros do tipo **A** para o domínio raiz (`maktubgo.com.br`):

| Tipo | Nome | Valor (IP do GitHub) |
| :--- | :--- | :--- |
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |

E um registro do tipo **CNAME** para o subdomínio `www`:

| Tipo | Nome | Valor |
| :--- | :--- | :--- |
| CNAME | www | SEU_USUARIO.github.io |

---

**Pronto!** Após essas configurações, pode levar de alguns minutos a algumas horas para o site entrar no ar no endereço final.

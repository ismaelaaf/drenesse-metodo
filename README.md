# Landing Drenesse

Landing page React + Vite pronta para deploy no Vercel, com APIs serverless para consultar e gravar na Belle sem expor a chave no frontend.

## Rodar localmente

1. Instale as dependências com `pnpm install`.
2. Crie `.env.local` usando os nomes disponíveis em `.env.example`.
3. Inicie com `pnpm dev`.
4. Acesse `http://localhost:5173/`.

O plugin local do Vite carrega as variáveis apenas no processo do servidor. Elas não são adicionadas ao bundle React.

## Deploy no Vercel

1. Importe esta pasta como projeto.
2. Configure as variáveis protegidas da Belle e da Lever listadas em `.env.example`.
3. Use `pnpm build` como comando de build.
4. Publique a pasta `dist` gerada pelo Vite.

## Fluxo

- Coleta nome e WhatsApp, com validação de DDD e celular.
- Ao avançar para a segunda etapa, cria um card na etapa `Leads Landing Page` do painel `SDRs` na Lever Conversas.
- Impede uma nova utilização do benefício quando o WhatsApp já existe no cadastro Belle de qualquer unidade da campanha.
- Qualifica unidade, objetivo e rotina de trabalho.
- Consulta a data atual e os cinco dias seguintes na Belle para o serviço `56260425 - DRENAGEM MÉTODO DRENESSE`.
- Oferece e aceita agendamentos apenas em horários terminados em `:00` ou `:30`.
- Distingue horários disponíveis, consulta parcial e falha técnica.
- Tenta gravar uma sessão de 60 minutos em `/agenda/gravar` quando o visitante escolhe um horário.
- Quando não há vaga online, abre o WhatsApp com os dados e o período preenchidos para consulta de encaixe.

## Campanha

- Condição apresentada: de `R$ 159,90` por `R$ 98,70`.
- O site não recebe pagamento; a aplicação do valor promocional é confirmada pela equipe.
- A observação enviada à Belle inclui serviço, duração, preço da campanha, unidade, objetivo, rotina e UTMs.

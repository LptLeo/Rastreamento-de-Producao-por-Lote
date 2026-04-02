> **PROJETO** **08**

**Rastreamento** **de** **Produção** **por** **Lote**

> Escopo, Entidades, Telas, Cronograma e PRD Módulo 10 - Full Stack \|
> INDT
>
> **1.** **Contexto**

**O** **problema** **que** **este** **projeto** **resolve**

Rastreabilidade de produção não é apenas uma boa prática, é uma
exigência legal e contratual para a maioria das empresas do Polo
Industrial de Manaus que fornecem para montadoras e fabricantes globais.
Quando um defeito é detectado em campo, a empresa precisa ser capaz de
responder: em qual lote este produto foi fabricado, quais insumos foram
usados nesse lote, quem operou a linha naquele turno e quais lotes
precisam ser rastreados ou recalls precisam ser acionados.

Sem rastreabilidade, a empresa é forçada a fazer o recall de lotes
inteiros desnecessariamente, gerando custo e impacto de imagem muito
maiores do que o necessário. Com rastreabilidade por lote, é possível
isolar exatamente quais unidades estão afetadas, agir cirurgicamente e
demonstrar controle do processo para o cliente e para os órgãos
reguladores.

O Sistema de Rastreamento de Produção por Lote digitaliza esse processo:
registro de cada lote produzido com data, turno, operador, linha de
produção, produto e quantidade. Vinculação dos insumos utilizados no
lote com suas respectivas quantidades e lotes de origem. Resultado de
inspeção de qualidade do lote. Dashboard com produção do dia, taxa de
aprovação e lotes em aberto. Consulta de rastreabilidade que, dado um
número de lote, mostra toda a árvore de insumos e permite identificar
rapidamente lotes afetados por um problema de insumo.

**Contexto** **do** **módulo**

Este projeto faz parte do módulo 10 da trilha Full Stack do programa de
capacitação do INDT. Cada grupo de alunos constrói um sistema diferente,
todos ambientados no Polo Industrial de Manaus, usando a mesma stack
técnica: Angular 21 no frontend, Node.js com Express no backend e
PostgreSQL como banco de dados.

O projeto deve ser desenvolvido em 15 aulas de 4 horas cada,
distribuídas em 3 ou mais dias por semana ao longo de 5 semanas. Ao
final, o sistema é apresentado para gestores em uma banca de avaliação.

**Público-alvo** **do** **sistema**

> • **Operador** **de** **linha:** registra a abertura do lote no início
> do turno, registra os insumos utilizados e encerra o lote ao final com
> quantidade produzida.
>
> • **Inspetor** **de** **qualidade:** registra o resultado da inspeção
> do lote (aprovado, aprovado com restrição, reprovado) com descrição do
> desvio quando aplicável.
>
> • **Gestor** **de** **qualidade** **/** **produção:** consulta o
> dashboard de produção, acessa a rastreabilidade de um lote específico
> e utiliza a busca de impacto para identificar lotes afetados por um
> insumo suspeito.

**Escopo** **e** **limitações**

O sistema não integra sistemas MES, ERP ou sistemas de código de barras
e RFID. O número do lote é gerado automaticamente pelo sistema, não é
lido de etiqueta física. A rastreabilidade é de primeiro nível (insumos
diretos do lote), sem suporte a árvores de rastreabilidade

multi-nivel de fornecedores. O cálculo de custo por lote está fora do
escopo.

**Atenção:** solo ou dupla: entregar Login, Cadastro de lotes com
operador e linha, Resultado de inspeção e Dashboard de produção básico.
O vínculo de insumos ao lote e a consulta de rastreabilidade são
funcionalidades do trio.

> **2.** **Entidades** **do** **banco** **de** **dados**

O sistema e construido sobre quatro entidades. O produto e o que se
fabrica. O lote e a unidade de produção rastreável. O insumo_lote
vincula os insumos utilizados ao lote. A inspeção registra o resultado
de qualidade. Essa estrutura permite a consulta de rastreabilidade
completa: dado um lote, encontrar todos os insumos; dado um insumo
suspeito, encontrar todos os lotes que o utilizaram.

> **produto**

Representa o item fabricado na linha de produção. Um produto pode ter
vários lotes ao longo do tempo.

||
||
||
||
||
||
||
||

||
||
||

> **lote**

Representa uma produção específica: um conjunto de unidades fabricadas
em uma sessão contínua, com o mesmo operador, mesma linha e mesmos
insumos. O número do lote é gerado automaticamente pelo sistema no
momento da abertura.

||
||
||
||
||
||
||
||
||
||
||
||
||
||
||

> **insumo_lote**

Vincula os insumos utilizados a um lote específico. Esta entidade é a
chave da rastreabilidade: permite saber quais insumos foram usados em um
lote e, inversamente, quais lotes utilizaram um determinado insumo ou
lote de insumo.

||
||
||
||

||
||
||
||
||
||
||
||

> **inspecao_lote**

Registra o resultado da inspeção de qualidade do lote. Um lote só pode
ter uma inspeção. O resultado define o status final do lote.

||
||
||
||
||
||
||
||
||
||

**Trio:** a entidade insumo_lote e o que diferencia este projeto dos
demais. O vinculo de insumos ao lote e a consulta de rastreabilidade
reversa (quais lotes usaram o insumo X?) são a funcionalidade central de
impacto para gestores.

> **3.** **Telas** **da** **aplicação**

O sistema tem sete telas. A tela de rastreabilidade é a mais impactante
para gestores, e a que demonstra o valor real do sistema em um cenário
de recall ou auditoria. Prepare dados de demonstração convincentes para
a apresentação.

**Tela** **1:** **Login**

**Rota:** /login

Formulário reativo com e-mail e senha. Validação em tempo real.
Redireciona para o dashboard após autenticação.

**Tela** **2:** **Dashboard** **de** **produção**

**Rota:** /app/dashboard

Visão geral da produção. Quatro cards: lotes produzidos hoje, unidades
produzidas hoje, taxa de aprovação do mês (lotes aprovados / total
inspecionados \* 100) e lotes em aberto aguardando inspeção. Lista dos
últimos 10 lotes registrados com número, produto, status e operador.
Badge de status colorido: azul para em produção, amarelo para aguardando
inspeção, verde para aprovado, laranja para aprovado com restrição,
vermelho para reprovado.

**Telas** **3** **e** **4:** **Lotes** **de** **produção**

**Rotas:** /app/lotese /app/lotes/novo, /app/lotes/:id

A listagem exibe todos os lotes com busca por número, filtros por
produto, status e período. O formulário de abertura de lote registra
produto, data, turno, operador e quantidade produzida. O número do lote
é gerado automaticamente. A tela de detalhe exibe todos os dados do
lote, a lista de insumos vinculados e o resultado da inspeção quando
disponível. Permite encerrar o lote e transicionar para aguardando
inspeção.

**Tela** **5:** **Vinculo** **de** **insumos** **ao** **lote**
**(trio)**

**Rota:** /app/lotes/:id/insumos

Tela de gestão dos insumos utilizados em um lote. Lista os insumos já
vinculados com nome, código, lote do insumo, quantidade e unidade.
Formulário para adicionar novo insumo ao lote. Cada insumo pode ser
removido enquanto o lote ainda está em produção. Esta tela é o coração
da rastreabilidade: o vínculo lote + lote_insumo e o que permite a
consulta reversa.

**Tela** **6:** **Registro** **de** **inspecao**

**Rota:** /app/lotes/:id/inspecao

Formulário de inspeção de qualidade do lote. O inspetor vê os dados do
lote, define o resultado (aprovado, aprovado com restrições ou
reprovado), informa a quantidade reprovada quando aplicável e descreve o
desvio quando o resultado não for aprovado. Após salvar, o status do
lote é atualizado’ automaticamente com base no resultado.

**Tela** **7:** **Consulta** **de** **rastreabilidade** **(trio)**

**Rota:** /app/rastreabilidade

Esta é a tela mais poderosa do sistema. O gestor digita o número de um
lote ou o código de um insumo. Se digitar um número de lote: o sistema
exibe todos os dados do lote e todos os insumos utilizados com seus
lotes de origem. Se digitar um código ou lote de insumo: o sistema exibe
todos os lotes de produção que utilizam aquele insumo, permitindo
identificar o alcance de um recall em segundos.

**Solo/dupla:** implementar apenas a consulta por número de lote (exibe
dados + insumos vinculados). A consulta reversa por insumo e
funcionalidade de trio.

> **4.** **Cronograma** **por** **entregável**

Cinco fases com entregável, concreto e testável. O vínculo de insumos ao
lote (Fase 4) é a parte mais diferenciada deste projeto em relação aos
demais. Garantir que o modelo de dados suporte a consulta reversa desde
o inicio evita refatoração na fase de rastreabilidade.

||
||
||

||
||
||

||
||
||

||
||
||

||
||
||

||
||
||

> **5.** **PRD** **-** **Product** **Requirements** **Document**

Este PRD define os requisitos do sistema de forma que possa ser lido
tanto pelo time de desenvolvimento quanto pelos avaliadores do programa.

**Visao** **geral** **do** **produto**

**Nome** **do** **produto:** LotePIM - Sistema de Rastreamento de
Producao por Lote

**Versao:** 1.0.0 (MVP de modulo)

**Contexto:** Linha de producao industrial no Polo Industrial de Manaus

**Stack:** Angular 21 + Node.js 22 + PostgreSQL + Tailwind CSS

O LotePIM e um sistema web para registro e rastreamento de lotes de
producao industrial. Cada lote registra o produto fabricado, o operador,
o turno, os insumos utilizados e o resultado da inspecao de qualidade. A
funcionalidade central e a consulta de rastreabilidade: dado um lote,
exibe todos os insumos; dado um insumo suspeito, identifica todos os
lotes afetados. Transforma um processo de recall que levaria dias em uma
consulta de segundos.

**Personas**

> **Operador** **de** **Linha**

**Perfil:** abre o lote no inicio da producao, registra os insumos
utilizados e encerra ao final do turno.

**Objetivo** **principal:** registrar o lote rapidamente sem interromper
o ritmo de producao.

**Dor** **atual:** preenche formulario em papel que vai para uma pasta e
raramente e consultado. Nao tem como saber se o registro chegou onde
deveria.

> **Gestor** **de** **Qualidade**

**Perfil:** responsavel pela conformidade dos produtos e pelas respostas
a clientes e orgaos reguladores em casos de desvio ou recall.

**Objetivo** **principal:** ter rastreabilidade completa de qualquer
lote em segundos, sem depender de busca manual em arquivos fisicos.

**Dor** **atual:** uma reclamacao de campo pode levar dias para ser
investigada porque a rastreabilidade e feita em papel ou planilha
descentralizada.

**<u>Historias de usuario</u>**

||
||
||
||
||
||
||
||

||
||
||
||
||
||
||

**Requisitos** **funcionais**

||
||
||
||
||
||
||
||
||
||
||
||
||
||
||

||
||
||

**Requisitos** **nao** **funcionais**

||
||
||
||
||
||
||
||
||
||

**Critérios** **de** **aceite** **por** **historia** **de** **usuario**

||
||
||
||
||
||
||

||
||
||
||

**Ciclo** **de** **vida** **de** **um** **lote**

||
||
||
||
||
||
||
||

**Fora** **do** **escopo** **-** **versão** **1.0**

> • Integração com sistemas MES, ERP ou leitores de código de barras e
> RFID • Rastreabilidade multi-nivel (árvore de fornecedores dos
> insumos)
>
> • Cálculo de custo por lote ou rendimento de insumos
>
> • Gestão de ordens de produção ou plano mestre de produção •
> Notificações automáticas para clientes em caso de recall
>
> • Certificado de qualidade do lote em PDF

**<u>Desafios extras - pós-entrega</u>**

> • **Rastreabilidade** **reversa:** dado o código ou lote de um insumo,
> listar todos os lotes de produção que o utilizaram. Esta é a
> funcionalidade de recall.
>
> • **Histórico** **por** **produto:** tela com todos os lotes de um
> produto em ordem cronológica, com taxa de aprovação acumulada.
>
> • **Exportação** **de** **relatório** **de** **lote:** gerar um PDF
> com os dados completos do lote (dados, insumos, inspeção) para
> arquivamento ou envio ao cliente.

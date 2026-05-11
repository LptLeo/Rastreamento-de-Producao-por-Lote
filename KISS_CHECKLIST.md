## Checklist KISS para PRs

- Cada funcao deve ter uma responsabilidade clara.
- Evite `any` em contratos de API, payloads e estados de negocio.
- Controllers devem apenas orquestrar: validacao/parsing em DTO/schema.
- Prefira funcoes pequenas e nomes descritivos ao inves de comentarios longos.
- Remova duplicacao antes de adicionar novas regras.
- Se um fluxo estiver grande, extraia helper puro para calculo/transformacao.

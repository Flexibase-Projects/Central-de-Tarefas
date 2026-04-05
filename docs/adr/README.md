# ADRs (Architecture Decision Records)

Registre aqui decisões técnicas relevantes (formato livre ou numerado, ex. `0001-titulo.md`).

- `0002-workspace-profile-avatars-storage.md` — bucket público e upload só pelo backend para avatares de perfil por workspace.
- `0003-api-error-contract-and-observability.md` — códigos de erro estáveis, `requestId`, health/ready e rate limit em `/api/auth`.

Quando criar um ADR:

- Há trade-off claro entre alternativas ou reversão de decisão anterior.
- A decisão afeta limites do sistema, integrações, modelo de dados ou operação.

Contrato geral do pacote SDD e matriz mudança → documento: skill [sdd-guardian](https://github.com/JuanDalvit1/sdd-guardian).

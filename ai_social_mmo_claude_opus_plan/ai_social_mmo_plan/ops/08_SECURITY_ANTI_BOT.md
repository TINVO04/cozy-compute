# Security + Anti-Bot Plan

## Threats

1. Coin farming bots.
2. Multi-account farming.
3. API key sharing/resale.
4. Client tampering.
5. Replay of activity-completion calls.
6. Economy duplication bugs.
7. Admin key leakage.
8. Gateway abuse / prompt spam.
9. Compromised desktop client.
10. Malicious user-generated content.

## Server authority

The client may request:
- start activity;
- finish activity;
- buy item;
- move;
- redeem.

The server decides:
- whether it is valid;
- reward amount;
- inventory changes;
- balances;
- API quota.

## Anti-replay

Every rewardable action gets:
- server-issued activity id;
- short-lived nonce;
- completion proof/state;
- one-time completion constraint.

## Bot friction

Use multiple signals, not a single captcha:

- account age;
- verified email;
- session continuity;
- action interval entropy;
- route diversity;
- activity diversity;
- suspiciously perfect timing patterns;
- concurrent session count;
- repeated identical input sequences;
- abnormal redemption velocity.

Do not permanently ban on one weak signal. Use a trust score and manual/audit review path.

## API key abuse

A virtual key may be copied. Treat that as possible by design.

Mitigations:
- per-key RPM/TPM;
- budget cap;
- expiration;
- concurrent IP/session anomaly checks;
- one-click revoke;
- optional region/ASN anomaly flagging;
- automatic temporary suspension on severe abuse;
- usage page showing request history and quota consumption.

Do not promise that key sharing can be made impossible.

## Provider secret management

Preferred:
- environment variables;
- Docker secrets or host secret store;
- gateway secret references;
- encryption at rest if persisted by admin UI.

Never commit provider secrets to Git.

## Web security

- HTTPS only in production;
- secure cookies or short-lived token rotation;
- CSRF protection where cookie auth is used;
- CORS allowlist for the game domain;
- strict content security policy where compatible;
- rate limit authentication endpoints;
- password hashing using a current memory-hard algorithm if passwords are managed in-house.

## User-generated content

All chat, event names, player-published content and AI-generated assets need reporting/moderation hooks.

## Auditability

Every admin change to:
- model endpoints;
- quota price;
- reward pool;
- key policy;
- user suspension;
- redemptions pause/unpause
must be audited.

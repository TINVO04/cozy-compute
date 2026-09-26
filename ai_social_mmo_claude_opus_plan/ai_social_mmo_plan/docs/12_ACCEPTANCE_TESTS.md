# Acceptance Tests

## Player

- [ ] Register/login.
- [ ] Enter town.
- [ ] See other players.
- [ ] Move smoothly.
- [ ] Reconnect after socket interruption.
- [ ] Send chat.
- [ ] Mute/report another player.
- [ ] Fish and receive server-authoritative reward.
- [ ] Deliver an order.
- [ ] Join an event.
- [ ] Buy item.
- [ ] Equip item.
- [ ] Edit apartment.
- [ ] Visit another apartment.
- [ ] See balances.
- [ ] Become eligible for AI rewards.

## AI quota

- [ ] Admin creates compatible model deployment.
- [ ] Admin sets quota/reward rules.
- [ ] Player requests redemption.
- [ ] Coin is locked/burned exactly once.
- [ ] Virtual key is created.
- [ ] Key has only allowed models.
- [ ] Key has the expected budget.
- [ ] Key has expected rate limits.
- [ ] External OpenAI-compatible client can call the gateway.
- [ ] Disabled model is rejected.
- [ ] Budget exhaustion is enforced.
- [ ] Key revocation is enforced.
- [ ] Key rotation invalidates prior key as configured.
- [ ] Failed redemption rolls back Coin.
- [ ] Replayed redemption request does not duplicate quota.

## Admin

- [ ] Create/edit/disable model.
- [ ] Change upstream endpoint without exposing secret to clients.
- [ ] Change reward price.
- [ ] Change player cap.
- [ ] Pause all redemptions.
- [ ] Search ledger.
- [ ] Search key usage.
- [ ] View audit log.
- [ ] Suspend player key.

## UI quality gate

- [ ] No overlapping panels at 1280x720.
- [ ] No tiny unreadable body copy.
- [ ] All buttons have hover/pressed/disabled states.
- [ ] Loading states do not flash broken layouts.
- [ ] Errors explain how to recover.
- [ ] Irreversible actions require confirmation.
- [ ] Focus/keyboard states are usable in non-game UI.
- [ ] No broken image/icon placeholders in the release build.
- [ ] UI has one consistent spacing/radius/type system.

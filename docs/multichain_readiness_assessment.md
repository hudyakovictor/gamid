# SIGNAL ARENA — Multichain Readiness Assessment

Status: PLANNED
Scope: future platform adapters and portability assessment
Owner: Signal Arena project owner
Last reviewed: 2026-09-16
Supersedes: none
Required evidence: adapter compatibility, entitlement migration, security and platform acceptance before activation
Canonical dependencies: `full_game_spec.md`, `system_architecture.md`, `economy_monetization_referrals.md`

## Verdict

Архитектура должна поддерживать будущий выход за Telegram без копирования игры и backend. Сейчас это подготовка контрактов и границ, а не готовность к немедленному запуску всех платформ.

```text
Telegram Mini App: first launch target
Base: first future web/platform adapter
MiniPay/Celo: optional later distribution route
Solana Mobile: separate packaging and publishing route
```

Текущий статус:

- game domain and scoring are designed to be platform-neutral;
- identity linking is specified but not implemented in production;
- platform and payment adapters are contracts/plans, not live integrations;
- Telegram remains the only first-launch platform;
- wallets, on-chain assets, and chain-dependent progression remain disabled in the MVP.

## Что уже правильно заложено

### 1. Игровое ядро не зависит от блокчейна

Phaser-сцены, scenarios, scoring, progression, tournaments и Decision Trace могут быть общими для всех поверхностей.

Это главный архитектурный плюс. Не нужно делать отдельную копию игры под каждую сеть.

### 2. Платформа отделяется от платежей

Нельзя смешивать:

```text
Telegram login
Stars payment
TON wallet
```

в один класс. Должны существовать разные интерфейсы:

```ts
interface PlatformAdapter {
  getIdentity(): Promise<ExternalIdentity>;
  authenticate(): Promise<Session>;
  share(payload: SharePayload): Promise<void>;
  capabilities(): PlatformCapabilities;
}

interface PaymentProvider {
  createOrder(input: CreateOrderInput): Promise<OrderDraft>;
  confirm(input: ProviderEvent): Promise<PaymentResult>;
  refund(input: RefundInput): Promise<RefundResult>;
}

interface ChainAdapter {
  chainId: string;
  verifyAddress(address: string): boolean;
  verifyOwnership(message: string, signature: string): Promise<boolean>;
  capabilities(): ChainCapabilities;
}
```

### 3. Общая идентичность

Нужна единая модель:

```text
users
identities(user_id, platform, external_id)
wallets(user_id, chain, address)
```

Тогда один пользователь сможет:

```text
Telegram identity
+ Base identity
+ wallet identity
```

но связывание выполняется только по явному действию пользователя, authenticated session и challenge/signature or platform proof. `internalUserId` remains the canonical identity; Telegram IDs, Base accounts, wallet addresses, and other external subjects are linked identities, never substitutes for the internal user record. Wallet linking is disabled in the Telegram MVP.

## Base App

### Что переиспользуется

- Phaser client bundle.
- Game scenes.
- Decision Workspace.
- Scoring API.
- Shared backend.
- Profiles, tournaments, cosmetics and inventory.
- Localization.
- Analytics.

Base Mini Apps используют web app с manifest, domain association и платформенным SDK; manifest должен быть доступен по `/.well-known/farcaster.json`, а домен подтверждается подписью кошелька [web:200]. Base отдельно рекомендует короткий onboarding до трёх экранов, быструю загрузку и отображение профиля пользователя [web:201].

### Что меняется

```text
TelegramAdapter → BaseAdapter
Telegram Stars → Base payment/USDC provider
Telegram share → Base/Farcaster share
Telegram initData → Base account/identity
Telegram theme params → Base theme adapter
```

### Рекомендуемый Base слой

```text
packages/adapters/platform/base/
packages/adapters/payment/base/
apps/game-client/public/.well-known/farcaster.json
```

### Base-specific checklist

- manifest;
- account association;
- Base profile/avatar mapping;
- wallet/account provider;
- USDC payment adapter;
- Base-specific share/embed card;
- load-time budget до 3 секунд;
- отдельные feature flags;
- policy review.

Base launch не должен создавать вторую игру. Это тот же client bundle и тот же API с другим adapter layer.

## MiniPay / Celo

MiniPay подходит как отдельная EVM-поверхность с mobile-first WebView, автоматическим wallet detection и stablecoin payments. MiniPay использует `window.ethereum.isMiniPay`, а транзакции могут учитывать fee currency [web:205][web:210]. Для MiniPay существуют готовые scaffolds через Celo Composer и Next.js/Viem [web:204].

### Что переиспользуется

- backend domain;
- game client;
- profiles;
- tournament engine;
- catalog abstraction;
- analytics;
- CRM;
- localization.

### Что меняется

```text
MiniPayAdapter
CeloPaymentProvider
wallet detection
stablecoin checkout
feeCurrency support
MiniPay manifest/listing
```

### MiniPay checklist

- detect `window.ethereum.isMiniPay`;
- avoid manual wallet onboarding where provider supports auto-connect;
- support stablecoin payment flow;
- handle gas/fee currency;
- define Celo-specific refund strategy;
- submit listing metadata and screenshots;
- complete MiniPay readiness audit [web:212].

Stars нельзя автоматически перенести в MiniPay. Это отдельный payment provider, а не альтернативное отображение XTR.

## Solana Mobile

Solana Mobile — не просто web Mini App. Публикация проходит через dApp Store с Android release, App NFT/Release NFT и publisher review [web:208][web:211]. Поэтому переиспользование игрового ядра высокое, но packaging and distribution layer отличается сильнее.

### Что переиспользуется

- Phaser game client;
- API;
- accounts;
- content;
- scoring;
- tournaments;
- public profiles;
- cosmetics metadata.

### Что меняется

- Android wrapper or packaged app;
- Solana wallet adapter;
- SPL asset adapter;
- dApp Store release pipeline;
- app signing;
- publisher portal;
- Solana-specific policies.

### Solana Mobile checklist

- build signed APK/AAB;
- app icon and screenshots;
- privacy policy;
- wallet adapter;
- transaction confirmation;
- dApp Store App NFT and Release NFT;
- submission/review pipeline [web:208].

Не выбирать Solana Mobile первым вторым рынком, если нет доказанной аудитории или distribution hypothesis.

## Рекомендуемый приоритет платформ

| Приоритет | Платформа | Причина |
|---:|---|---|
| 1 | Telegram + TON | Главная аудитория и первый продукт |
| 2 | Base App | Максимальное переиспользование web/SDK слоя и crypto-native аудитория |
| 3 | MiniPay/Celo | Stablecoin-first аудитория, но другой distribution и payment flow |
| 4 | Standalone Web | Универсальная fallback-поверхность |
| 5 | Solana Mobile | Отдельный packaged distribution; делать только при наличии спроса |

## Не делать сейчас

- не писать Base, MiniPay и Solana реализации заранее;
- не создавать отдельные базы данных для сетей;
- не дублировать scoring;
- не делать копии Phaser-клиента;
- не смешивать wallet address с user id;
- не делать multi-chain token;
- не подключать мосты;
- не хранить игровые балансы on-chain;
- не связывать core progression с chain availability.

## Что сделать сейчас для готовности

### В домене

```text
User
Identity
Wallet
Platform
PaymentOrder
Entitlement
InventoryItem
ChainAsset
```

### В конфигурации

```text
PLATFORM=telegram
CHAIN=none|ton|base|celo|solana
PAYMENT_PROVIDER=telegram_stars|base_usdc|celo_stablecoin|solana
```

### В API

```text
POST /api/v1/auth/:platform
POST /api/v1/wallets/link
GET /api/v1/platform/capabilities
POST /api/v1/payments/:provider/order
POST /api/v1/payments/:provider/webhook
```

### В клиенте

```text
platform capabilities
payment capabilities
share capabilities
wallet capabilities
```

Не показывать кнопку кошелька, оплаты или профиля, если capability выключена.

## Общая экономика

Игроки из Telegram, Base и MiniPay смогут играть вместе после отдельной platform/security review, если:

```text
same API
same user domain
same scenario version
same scoring version
same matchmaking namespace
```

Но платежи и chain assets должны быть маркированы:

```text
platform
provider
chain
asset_type
```

## Migration rule

Новая платформа не получает отдельную базу, scoring engine, progression system, user table или копию Phaser client. Добавляются только:

```text
platform adapter
identity proof adapter
capability map
share/deep-link adapter
payment adapter when legally approved
optional wallet proof adapter
platform-specific deployment and policy checks
```

Переход принимается только после contract tests, identity-linking tests, privacy review, payment review where applicable, and a rollback plan. Процент переиспользования не используется как acceptance metric until a real adapter has passed integration tests.

## Главный вывод

Архитектура должна быть не «копия игры под каждый блокчейн», а:

```text
одна игра
+ один backend domain
+ разные platform adapters
+ разные payment providers
+ разные chain adapters
+ единая identity model
+ единая CRM
+ единая аналитика
```

Telegram/TON остаются первым запуском. Base — наиболее естественный следующий адаптер. MiniPay имеет смысл как stablecoin distribution route. Solana Mobile требует отдельного wrapper и publishing pipeline.

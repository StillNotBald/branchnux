# @leapnux/6nux-core

Shared core for the 6-NUX product family — schemas, file conventions, validators, ID generators.

**Status:** v0.4.0-alpha.1 — package skeleton. Full extraction from `@leapnux/branchnux` is planned for v0.4.0-beta.

**Audience:** Internal to LeapNuX `@leapnux/{rootnux,trunknux,branchnux,leafnux,fruitnux}` packages. End users typically don't import this directly — they install one of the NUX-suffixed packages.

**Contract stability:** Changes here are breaking changes for the entire 6-NUX family. Schema changes use versioned namespaces (`schemas/v1/`, `schemas/v2/`) so migrations are clean.

## Modules

```js
import { PATHS, SCHEMAS } from '@leapnux/6nux-core/conventions'
import { rxxSchema, adrSchema } from '@leapnux/6nux-core/schemas'
import { nextRxxId, nextAdrNumber } from '@leapnux/6nux-core/ids'
import { parseMarkdownFrontmatter, validateCrossLinks } from '@leapnux/6nux-core/utils'
import { validateRequirements, validateRTM } from '@leapnux/6nux-core/validators'
```

See [docs/6-NUX.md](https://github.com/StillNotBald/branchnux) (will move to leapnux/5nux on repo transfer) for the artifact taxonomy this core implements.

## License

Apache-2.0 (c) 2026 Chu Ling

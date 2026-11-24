# CI typecheck proof

Refs BIO-61. The `typecheck` job runs `npm ci` then `npm run typecheck`.

The scratch file was `src/ci-typecheck-scratch.ts`:

```ts
export const n: number = 'x';
```

It is exported so lint stays quiet. The only failure is the type error. The revert commit removes the file. No force-push.

## First green run

Commit `7fc0e85` (the workflow only). All jobs passed, including typecheck.

https://github.com/themeganerddddddd/LouisianaFrench/actions/runs/45320332012

## Failing typecheck run

Commit `9836c19` adds the scratch file. Lint, test, python, build, and pr-gates passed. The typecheck job failed.

https://github.com/themeganerddddddd/LouisianaFrench/actions/runs/45320589425

Job: https://github.com/themeganerddddddd/LouisianaFrench/actions/runs/45320589425/job/138197884890

```text
> louisiana-french-v5@1.0.0 typecheck
> tsc --noEmit
##[error]src/ci-typecheck-scratch.ts(1,14): error TS2322: Type 'string' is not assignable to type 'number'.
##[error]Process completed with exit code 2.
```

## Green run after the revert

Commit `8dbf331` reverts the scratch file. The CI run succeeded, including typecheck.

https://github.com/themeganerddddddd/LouisianaFrench/actions/runs/45320808124

Job: https://github.com/themeganerddddddd/LouisianaFrench/actions/runs/45320808124/job/138198602213

```text
> louisiana-french-v5@1.0.0 typecheck
> tsc --noEmit
```

The job then completed with no type error.

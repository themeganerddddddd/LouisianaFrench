import { accountDeps } from './adapter.ts'
import { handleDeleteAccount } from './handler.ts'

Deno.serve((request: Request) => handleDeleteAccount(request, accountDeps()))

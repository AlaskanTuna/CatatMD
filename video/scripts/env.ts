// Reads one key by name: from the environment, or else from the app's .env (APP_ENV_FILE, default the repository
// root's .env). Values are never printed or written to this workspace.
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ENV_FILE = process.env.APP_ENV_FILE ?? resolve(import.meta.dirname, '../../.env')

export function key(name: string): string {
  const set = process.env[name]
  if (set) return set
  const line = existsSync(ENV_FILE)
    ? readFileSync(ENV_FILE, 'utf8')
        .split('\n')
        .find((l) => new RegExp(`^\\s*(export\\s+)?${name}\\s*=`).test(l))
    : undefined
  const value = line
    ?.split('=')
    .slice(1)
    .join('=')
    .trim()
    .replace(/^['"]|['"]$/g, '')
  if (!value) throw new Error(`${name} is not set and not in ${ENV_FILE}`)
  return value
}

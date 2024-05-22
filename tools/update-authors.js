#!/usr/bin/env node

// Attribution:
//  This file is based on https://github.com/nodejs/node/blob/master/tools/update-authors.js.
//  It is licensed according to https://github.com/nodejs/node/blob/master/LICENSE

// Usage: tools/update-author.js [--dry]
// Passing --dry will redirect output to stdout rather than write to 'AUTHORS'.

import { spawn } from 'node:child_process'
import path from 'node:path'
import fs from 'node:fs'
import readline from 'node:readline'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

class CaseIndifferentMap {
  constructor () {
    this._map = new Map()
  }

  get (key) { return this._map.get(key.toLowerCase()) }
  set (key, value) { return this._map.set(key.toLowerCase(), value) }
}

const log = spawn(
  'git',
  // Inspect author name/email and body.
  ['log', '--reverse'],
  {
    stdio: ['inherit', 'pipe', 'inherit']
  })
const rl = readline.createInterface({ input: log.stdout })

let output
if (process.argv.includes('--dry')) { output = process.stdout } else { output = fs.createWriteStream('AUTHORS') }

output.write('# Authors ordered by first contribution.\n\n')

const mailmap = new CaseIndifferentMap()
{
  const lines = fs.readFileSync(path.resolve(__dirname, '../', '.mailmap'),
    { encoding: 'utf8' }).split('\n')
  for (let line of lines) {
    line = line.trim()
    if (line.startsWith('#') || line === '') continue

    // Replaced Name <original@example.com>
    const match1 = line.match(/^([^<]+)\s+(<[^>]+>)$/)
    if (match1) {
      mailmap.set(match1[2], { author: match1[1] })
      continue
    }
    // <replaced@example.com> <original@example.com>
    const match2 = line.match(/^<([^>]+)>\s+(<[^>]+>)$/)
    if (match2) {
      mailmap.set(match2[2], { email: match2[1] })
      continue
    }
    // Replaced Name <replaced@example.com> <original@example.com>
    const match3 = line.match(/^([^<]+)\s+(<[^>]+>)\s+(<[^>]+>)$/)
    if (match3) {
      mailmap.set(match3[3], {
        author: match3[1], email: match3[2]
      })
      continue
    }
    // Replaced Name <replaced@example.com> Original Name <original@example.com>
    const match4 = line.match(/^([^<]+)\s+(<[^>]+>)\s+([^<]+)\s+(<[^>]+>)$/)
    if (match4) {
      mailmap.set(match4[3] + '\0' + match4[4], {
        author: match4[1], email: match4[2]
      })
      continue
    }
    console.warn('Unknown .mailmap format:', line)
  }
}

const seen = new Set()

// Commits from which we do not want the author to pop up in the AUTHORS list,
// for example because the commit was done with a wrong git user account
const ignoreCommits = [
  '43d4551e7c19f51d30e71b35009437c7ec6491f0'
]
let currentCommit

// Support regular git author metadata, as well as `Author:` and
// `Co-authored-by:` in the message body. Both have been used in the past
// to indicate multiple authors per commit, with the latter standardized
// by GitHub now.
const authorRe =
  /(^Author:|^\s*Co-authored-by:)\s+(?<author>[^<]+)\s+(?<email><[^>]+>)/i

// Commit line regex. Example: "commit 123456"
const commitRe = /^commit (?<commit>.+)$/i

rl.on('line', (line) => {
  const commitMatch = line.match(commitRe)
  if (commitMatch) {
    currentCommit = commitMatch.groups.commit
    return
  }

  if (ignoreCommits.includes(currentCommit)) {
    return
  }

  const authorMatch = line.match(authorRe)
  if (!authorMatch) {
    return
  }

  const { author, email } = authorMatch.groups

  if (seen.has(email) ||
      /@chromium\.org/.test(email) ||
      /greenkeeper\[bot\]/.test(email) ||
      email === '<erik.corry@gmail.com>') {
    return
  }

  seen.add(email)
  output.write(`${author} ${email}\n`)
})

rl.on('close', () => {
  output.end('\n# Generated by tools/update-authors.js\n')
})

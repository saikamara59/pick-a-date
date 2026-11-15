import { expect, test } from 'vitest'
import { linkProblem } from './linkProblem'
import type { Draft } from '../types'
import { CATS, herPickInvite, hisPlan } from '../test/fixtures'

const { v: _v, ...rest } = herPickInvite
const herDraft = (over: Partial<Draft> = {}): Draft => ({ ...rest, kind: 'her-pick', categories: CATS.map((c) => ({ ...c, on: true })), ...over })
const hisDraft = (over: Partial<Draft> = {}): Draft => herDraft({ kind: 'his-plan', plan: hisPlan, ...over })

test('her-pick problems unchanged', () => {
  expect(herDraft()).toBeTruthy()
  expect(linkProblem(herDraft())).toBeNull()
  expect(linkProblem(herDraft({ from: ' ' }))).toBe('Add your name to get a link.')
  expect(linkProblem(herDraft({ reply: { kind: 'sms', value: '123' } }))).toBe('Add your full number so she can text you.')
  expect(linkProblem(herDraft({ reply: { kind: 'none', value: '' } }))).toBe('Add your email (or a number) so you hear back.')
  expect(linkProblem(herDraft({ to: '' }))).toBe('Add her name to get a link.')
  expect(linkProblem(herDraft({ areas: [] }))).toBe('Turn on at least one area.')
  expect(linkProblem(herDraft({ categories: CATS.map((c) => ({ ...c, on: true, options: c.options.slice(0, 1) })) }))).toBe('Turn on a question with 2+ options.')
})

test('his-plan needs a plan', () => {
  expect(linkProblem(hisDraft())).toBeNull()
  expect(linkProblem(hisDraft({ plan: undefined }))).toBe('Plan the date to get a link.')
})

test('his-plan needs a way to reach him', () => {
  expect(linkProblem(hisDraft({ notify: undefined, reply: { kind: 'none', value: '' } }))).toBe('Add your email (or a number) so you hear back.')
})

test('his-plan does not need 2+ options', () => {
  const one = CATS.map((c) => ({ ...c, on: true, options: c.kind === 'when' ? ['7 PM'] : c.options.slice(0, 1) }))
  expect(linkProblem(hisDraft({ categories: one }))).toBeNull()
})

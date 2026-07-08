/**
 * The FIXED declarative instruction set the extension puppet knows how to
 * execute. The server only ever emits actions from this set — never executable
 * JavaScript. This keeps us compliant with Chrome MV3 (no remotely-hosted code)
 * and makes the extension a safe, dumb interpreter.
 *
 * If the extension receives an action not in this set, it must ignore it.
 */

export const ALLOWED_ACTIONS = [
  'navigate', // go to a url                     { url }
  'click', // click an element                   { selector }
  'waitFor', // wait for element to appear        { selector, timeoutMs }
  'waitForGone', // wait for element to disappear { selector, timeoutMs }
  'type', // set an input's value                 { selector, valueRef }
  'setValue', // set value from a literal         { selector, value }
  'readAttr', // read attr/text into ctx          { selector, attr, saveAs }
  'callApi', // call a lovable endpoint           { endpointRef, method, bodyRef, saveAs }
  'injectPanel', // mount a UI panel              { panelRef }
  'removePanel', // unmount a UI panel            { panelRef }
  'toast', // show a message                      { message, level }
  'delay', // pause                               { ms }
  'done', // flow finished                        {}
  'abort', // stop with a reason                  { reason }
] as const

export type ActionType = (typeof ALLOWED_ACTIONS)[number]

export interface StepAction {
  step: number
  action: ActionType
  // Optional fields depending on the action (kept loose on purpose so flows are
  // easy to author and forwards-compatible):
  selector?: string
  url?: string
  timeoutMs?: number
  valueRef?: string
  value?: string
  attr?: string
  saveAs?: string
  endpointRef?: string
  method?: string
  bodyRef?: string
  panelRef?: string
  message?: string
  level?: 'info' | 'success' | 'warn' | 'error'
  ms?: number
  reason?: string
}

export function isAllowedAction(a: string): a is ActionType {
  return (ALLOWED_ACTIONS as readonly string[]).includes(a)
}

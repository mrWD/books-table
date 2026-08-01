import { create } from 'zustand'

interface Toast {
  id: number
  message: string
  /**
   * The toast's one action. Usually Undo, but the same slot carries the next step when
   * there is an obvious one — adding a book to the shelf offers to start it right there,
   * which is where people were looking for it.
   */
  undo?: () => void
  actionLabel?: string
}

interface ConfirmRequest {
  title: string
  message: string
  confirmLabel: string
  danger?: boolean
  resolve: (ok: boolean) => void
}

/**
 * A choice between named outcomes, as opposed to a yes/no confirm.
 *
 * It exists because a button that silently moves a book to another tab leaves the
 * person to work out where it went. Asking what happened, and then taking them there,
 * replaces two guesses with one answer.
 */
export interface ChoiceOption {
  value: string
  label: string
  hint?: string
  /** The expected answer, styled as the primary action. */
  primary?: boolean
}

interface ChoiceRequest {
  title: string
  message?: string
  options: ChoiceOption[]
  resolve: (value: string | null) => void
}

interface UiState {
  toast: Toast | null
  confirmReq: ConfirmRequest | null
  choiceReq: ChoiceRequest | null
  showToast: (message: string, undo?: () => void, actionLabel?: string) => void
  dismissToast: () => void
  askConfirm: (opts: Omit<ConfirmRequest, 'resolve'>) => Promise<boolean>
  answerConfirm: (ok: boolean) => void
  askChoice: (opts: Omit<ChoiceRequest, 'resolve'>) => Promise<string | null>
  answerChoice: (value: string | null) => void
}

let toastSeq = 0
let toastTimer: ReturnType<typeof setTimeout> | undefined

export const useUi = create<UiState>((set, get) => ({
  toast: null,
  confirmReq: null,
  choiceReq: null,

  showToast: (message, undo, actionLabel) => {
    if (toastTimer) clearTimeout(toastTimer)
    const id = ++toastSeq
    set({ toast: { id, message, undo, actionLabel } })
    toastTimer = setTimeout(() => {
      if (get().toast?.id === id) set({ toast: null })
    }, 4000)
  },

  dismissToast: () => set({ toast: null }),

  askConfirm: (opts) =>
    new Promise<boolean>((resolve) => {
      set({ confirmReq: { ...opts, resolve } })
    }),

  answerConfirm: (ok) => {
    const req = useUi.getState().confirmReq
    set({ confirmReq: null })
    req?.resolve(ok)
  },

  askChoice: (opts) =>
    new Promise<string | null>((resolve) => {
      set({ choiceReq: { ...opts, resolve } })
    }),

  answerChoice: (value) => {
    const req = useUi.getState().choiceReq
    set({ choiceReq: null })
    req?.resolve(value)
  },
}))

export function vibrate(ms = 10) {
  try {
    navigator.vibrate?.(ms)
  } catch {
    /* not supported */
  }
}

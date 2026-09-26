import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core'
import { isNativeApp } from 'tables-core'

/**
 * Tips through In-App Purchase: the iOS app's Support section.
 *
 * Outside the US storefront Apple accepts money for the developer only through In-App
 * Purchase (guideline 3.1.1), so the native shell sells three consumable tips — see
 * ios/App/App/TipJarBridge.swift — where the web build links to Buy Me a Coffee, Ko-fi and
 * PayPal. Android has no Google Play Billing yet and shows neither.
 */

export const TIP_IDS = [
  'com.mrwd.bookstable.tip.small',
  'com.mrwd.bookstable.tip.medium',
  'com.mrwd.bookstable.tip.large',
]

/** A tip on sale, priced by StoreKit in the buyer's own currency. */
export interface Tip {
  id: string
  title: string
  description: string
  price: string
}

export type TipOutcome = 'purchased' | 'cancelled' | 'pending' | 'failed'

interface TipJarPlugin {
  products(options: { ids: string[] }): Promise<{ products: Tip[] }>
  purchase(options: { id: string }): Promise<{ state: Exclude<TipOutcome, 'failed'> }>
  addListener(
    event: 'tipCompleted',
    listener: (data: { id: string }) => void,
  ): Promise<PluginListenerHandle>
}

const TipJar = registerPlugin<TipJarPlugin>('TipJar')

/** Only the iOS shell has StoreKit. */
export function tipsAvailable(): boolean {
  return isNativeApp() && Capacitor.getPlatform() === 'ios'
}

/** The tips on sale, cheapest first; empty while App Store Connect has none to sell. */
export async function loadTips(): Promise<Tip[]> {
  if (!tipsAvailable()) return []
  try {
    return (await TipJar.products({ ids: TIP_IDS })).products
  } catch {
    return []
  }
}

export async function buyTip(id: string): Promise<TipOutcome> {
  try {
    return (await TipJar.purchase({ id })).state
  } catch {
    return 'failed'
  }
}

/** A tip that completed away from the sheet — Ask to Buy approved later, for one. */
export function onTipCompleted(listener: () => void): () => void {
  if (!tipsAvailable()) return () => {}
  const handle = TipJar.addListener('tipCompleted', listener)
  return () => void handle.then((h) => h.remove())
}

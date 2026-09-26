import Capacitor
import StoreKit
import UIKit

/**
 * Tips through In-App Purchase.
 *
 * Outside the US storefront Apple lets an app take money for its developer only through
 * In-App Purchase (guideline 3.1.1 — Lingary's review of 2026-09-19 said so in as many
 * words), so the native app offers three consumable tips instead of the web build's
 * Buy Me a Coffee / Ko-fi / PayPal links. They unlock nothing, which is why nothing is
 * stored: there is no entitlement to keep or restore.
 *
 * StoreKit 2 does the work. It loads the products with prices already localised for the
 * buyer's storefront, shows the purchase sheet, and signs every transaction. Each one is
 * finished as soon as it arrives — an unfinished consumable would be offered again on
 * every launch.
 */
@objc(TipJarBridgePlugin)
public class TipJarBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "TipJarBridgePlugin"
    public let jsName = "TipJar"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "products", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
    ]

    private var updates: Task<Void, Never>?

    override public func load() {
        // A purchase can complete away from the sheet: Ask to Buy approved hours later, or a
        // sheet cut short when the app went away. StoreKit delivers those here.
        updates = Task { [weak self] in
            for await result in Transaction.updates {
                let transaction = result.unsafePayloadValue
                await transaction.finish()
                self?.notifyListeners("tipCompleted", data: ["id": transaction.productID])
            }
        }
    }

    deinit {
        updates?.cancel()
    }

    /// The tips on sale, cheapest first. An empty list means none is sold on this device.
    @objc func products(_ call: CAPPluginCall) {
        let ids = call.getArray("ids", String.self) ?? []
        Task {
            do {
                let products = try await Product.products(for: ids).sorted { $0.price < $1.price }
                call.resolve([
                    "products": products.map { product in
                        [
                            "id": product.id,
                            "title": product.displayName,
                            "description": product.description,
                            "price": product.displayPrice,
                        ]
                    },
                ])
            } catch {
                call.reject("products: \(error.localizedDescription)")
            }
        }
    }

    /// Resolves with `state`: purchased, cancelled, or pending (waiting for a parent's approval).
    @objc func purchase(_ call: CAPPluginCall) {
        guard let id = call.getString("id") else {
            call.reject("id is required")
            return
        }
        Task { @MainActor in
            do {
                guard let product = try await Product.products(for: [id]).first else {
                    call.reject("unknown product \(id)")
                    return
                }
                // The scene tells StoreKit which window to put the sheet over; without one
                // it guesses, and on iOS 18 it logs a warning for every purchase.
                let result: Product.PurchaseResult
                if #available(iOS 17.0, *),
                   let scene = self.bridge?.viewController?.view.window?.windowScene {
                    result = try await product.purchase(confirmIn: scene)
                } else {
                    result = try await product.purchase()
                }
                switch result {
                case .success(let verification):
                    // An unverified transaction is finished too: a tip grants nothing, so there
                    // is nothing to withhold, and leaving it open would replay it forever.
                    await verification.unsafePayloadValue.finish()
                    call.resolve(["state": "purchased"])
                case .userCancelled:
                    call.resolve(["state": "cancelled"])
                case .pending:
                    call.resolve(["state": "pending"])
                @unknown default:
                    call.resolve(["state": "cancelled"])
                }
            } catch {
                call.reject(error.localizedDescription)
            }
        }
    }
}

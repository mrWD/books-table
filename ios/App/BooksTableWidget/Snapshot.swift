import Foundation

/// What the app hands the widgets.
///
/// The widget runs in its own process and cannot read the app's container, so the two
/// meet in an App Group. The app writes this structure as JSON whenever the library
/// changes; the widgets only ever read it. Nothing here is fetched from the network —
/// the app has already done that, and a widget that phoned home would break the promise
/// that the library never leaves the device.
struct WidgetSnapshot: Codable {
    /// Books being read right now, most recently touched first.
    var reading: [Entry]
    /// The want-to-read shelf, oldest first — the ones waiting longest.
    var toRead: [Entry]
    /// When the app last wrote this, so a stale widget can say so rather than lie.
    var updatedAt: Date

    struct Entry: Codable, Identifiable {
        var id: String
        var title: String
        var author: String?
        /// Absent when the edition's length is unknown, which Open Library often leaves out.
        var page: Int?
        var pages: Int?
        var percent: Int?
        /// File name inside the App Group's caches, written by the app.
        var cover: String?
    }

    static let empty = WidgetSnapshot(reading: [], toRead: [], updatedAt: .distantPast)
}

enum SharedStore {
    /// Must match the App Group on both targets and `lib/widget.ts` in the web app.
    static let suite = "group.com.mrwd.bookstable"
    static let key = "widget-snapshot-v1"

    static func read() -> WidgetSnapshot {
        guard let defaults = UserDefaults(suiteName: suite),
              let raw = defaults.string(forKey: key),
              let data = raw.data(using: .utf8) else { return .empty }
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .millisecondsSince1970
        return (try? decoder.decode(WidgetSnapshot.self, from: data)) ?? .empty
    }

    /// Covers are files the app dropped in the group; the widget only reads.
    static func posterURL(_ name: String) -> URL? {
        guard let dir = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: suite)
        else { return nil }
        return dir.appendingPathComponent("posters").appendingPathComponent(name)
    }
}

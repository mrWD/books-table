import SwiftUI
import WidgetKit

/// Two widgets rather than one with a toggle: on the home screen a widget is chosen once
/// and then just sits there, so "where am I" and "what is waiting" are two different
/// things a person puts on the screen, not two modes of one thing.

private struct SnapshotEntry: TimelineEntry {
    let date: Date
    let snapshot: WidgetSnapshot
}

private struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> SnapshotEntry {
        SnapshotEntry(date: Date(), snapshot: .empty)
    }

    func getSnapshot(in context: Context, completion: @escaping (SnapshotEntry) -> Void) {
        completion(SnapshotEntry(date: Date(), snapshot: SharedStore.read()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<SnapshotEntry>) -> Void) {
        // One entry, refreshed in an hour. The app also reloads timelines the moment the
        // library changes, so this is only the floor for a phone that has not been
        // opened — not the mechanism people actually see.
        let entry = SnapshotEntry(date: Date(), snapshot: SharedStore.read())
        let next = Calendar.current.date(byAdding: .hour, value: 1, to: Date()) ?? Date()
        completion(Timeline(entries: [entry], policy: .after(next)))
    }
}

private struct Cover: View {
    let name: String?

    var body: some View {
        Group {
            if let name, let url = SharedStore.posterURL(name),
               let data = try? Data(contentsOf: url), let image = UIImage(data: data) {
                Image(uiImage: image).resizable().aspectRatio(contentMode: .fill)
            } else {
                // A grey block rather than an icon: at this size an icon reads as noise,
                // and the row still lines up while the app fills the cache in.
                Color.secondary.opacity(0.18)
            }
        }
        .frame(width: 36, height: 54)
        .clipShape(RoundedRectangle(cornerRadius: 5, style: .continuous))
    }
}

private struct Row: View {
    let entry: WidgetSnapshot.Entry
    let showsProgress: Bool

    var body: some View {
        HStack(spacing: 9) {
            Cover(name: entry.cover)
            VStack(alignment: .leading, spacing: 3) {
                Text(entry.title).font(.system(size: 13, weight: .semibold)).lineLimit(1)
                if let author = entry.author {
                    Text(author).font(.system(size: 11)).foregroundStyle(.secondary).lineLimit(1)
                }
                if showsProgress, let page = entry.page, let pages = entry.pages, pages > 0 {
                    // The bar carries the feeling, the numbers carry the fact; a widget
                    // has room for both only because everything else here is one line.
                    ProgressView(value: Double(page), total: Double(pages))
                        .progressViewStyle(.linear)
                        .tint(.primary)
                        .frame(height: 3)
                    Text("p. \(page) / \(pages)")
                        .font(.system(size: 10)).foregroundStyle(.secondary)
                }
            }
            Spacer(minLength: 0)
            if showsProgress, let percent = entry.percent {
                Text("\(percent)%").font(.system(size: 12, weight: .bold)).foregroundStyle(.secondary)
            }
        }
    }
}

private struct ListView: View {
    let title: String
    let entries: [WidgetSnapshot.Entry]
    let emptyText: String
    let showsProgress: Bool
    @Environment(\.widgetFamily) private var family

    private var limit: Int { family == .systemLarge ? 4 : 2 }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title.uppercased())
                .font(.system(size: 11, weight: .bold)).kerning(0.6)
                .foregroundStyle(.secondary)
            if entries.isEmpty {
                Text(emptyText).font(.system(size: 12)).foregroundStyle(.secondary)
                Spacer(minLength: 0)
            } else {
                ForEach(entries.prefix(limit)) { entry in
                    // Each row opens its own book rather than just the app: tapping a
                    // specific title and landing on a generic screen is a small betrayal
                    // of the tap.
                    Link(destination: URL(string: "bookstable://book/\(entry.id)")!) {
                        Row(entry: entry, showsProgress: showsProgress)
                    }
                }
                Spacer(minLength: 0)
            }
        }
        .padding(14)
    }
}

struct ReadingWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "BooksTableReading", provider: Provider()) { entry in
            ListView(
                title: "Reading",
                entries: entry.snapshot.reading,
                emptyText: "Nothing open. Start a book to see it here.",
                showsProgress: true
            )
            .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("Reading")
        .description("Where you are in the books you have open.")
        .supportedFamilies([.systemMedium, .systemLarge])
    }
}

struct ToReadWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "BooksTableToRead", provider: Provider()) { entry in
            ListView(
                title: "To read",
                entries: entry.snapshot.toRead,
                emptyText: "The shelf is empty.",
                showsProgress: false
            )
            .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("To read")
        .description("The books waiting on your shelf, longest first.")
        .supportedFamilies([.systemMedium, .systemLarge])
    }
}

@main
struct BooksTableWidgets: WidgetBundle {
    var body: some Widget {
        ReadingWidget()
        ToReadWidget()
    }
}

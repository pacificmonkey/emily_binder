//
//  Date+Extensions.swift
//  Emily's Missions
//
//  Date utilities for week bounds, formatting, and canonical dates
//

import Foundation

extension Date {
    // MARK: - Formatters (Cached)

    private static let isoFormatter: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()

    private static let dateOnlyFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.timeZone = .current
        return formatter
    }()

    private static let timeFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "HH:mm:ss"
        formatter.timeZone = .current
        return formatter
    }()

    private static let displayDateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .none
        return formatter
    }()

    private static let displayTimeFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "h:mm a"
        return formatter
    }()

    private static let weekdayFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "EEEE"
        return formatter
    }()

    private static let shortWeekdayFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "EEE"
        return formatter
    }()

    // MARK: - Canonical Date String

    /// Returns the canonical date string (YYYY-MM-DD) for database operations
    var canonicalDateString: String {
        Self.dateOnlyFormatter.string(from: self)
    }

    /// Returns ISO 8601 timestamp string
    var isoString: String {
        Self.isoFormatter.string(from: self)
    }

    /// Returns time string (HH:mm:ss)
    var timeString: String {
        Self.timeFormatter.string(from: self)
    }

    // MARK: - Display Formatting

    /// Human-readable date (e.g., "Feb 4, 2026")
    var displayDate: String {
        Self.displayDateFormatter.string(from: self)
    }

    /// Human-readable time (e.g., "3:30 PM")
    var displayTime: String {
        Self.displayTimeFormatter.string(from: self)
    }

    /// Full weekday name (e.g., "Tuesday")
    var weekdayName: String {
        Self.weekdayFormatter.string(from: self)
    }

    /// Short weekday name (e.g., "Tue")
    var shortWeekdayName: String {
        Self.shortWeekdayFormatter.string(from: self)
    }

    // MARK: - Week Operations

    /// Start of the week (Monday at midnight)
    var startOfWeek: Date {
        let calendar = Calendar.current
        var components = calendar.dateComponents([.yearForWeekOfYear, .weekOfYear], from: self)
        components.weekday = 2 // Monday
        return calendar.date(from: components) ?? self
    }

    /// End of the week (Sunday at 23:59:59)
    var endOfWeek: Date {
        let calendar = Calendar.current
        return calendar.date(byAdding: .day, value: 6, to: startOfWeek)?
            .endOfDay ?? self
    }

    /// Start of day (midnight)
    var startOfDay: Date {
        Calendar.current.startOfDay(for: self)
    }

    /// End of day (23:59:59)
    var endOfDay: Date {
        var components = DateComponents()
        components.day = 1
        components.second = -1
        return Calendar.current.date(byAdding: components, to: startOfDay) ?? self
    }

    /// Start of month
    var startOfMonth: Date {
        let calendar = Calendar.current
        let components = calendar.dateComponents([.year, .month], from: self)
        return calendar.date(from: components) ?? self
    }

    /// End of month
    var endOfMonth: Date {
        let calendar = Calendar.current
        var components = DateComponents()
        components.month = 1
        components.day = -1
        return calendar.date(byAdding: components, to: startOfMonth) ?? self
    }

    // MARK: - Week Key

    /// Returns the week key string (e.g., "2026-W06")
    var weekKey: String {
        let calendar = Calendar.current
        let year = calendar.component(.yearForWeekOfYear, from: self)
        let week = calendar.component(.weekOfYear, from: self)
        return String(format: "%d-W%02d", year, week)
    }

    // MARK: - Date Comparisons

    /// Check if date is today
    var isToday: Bool {
        Calendar.current.isDateInToday(self)
    }

    /// Check if date is yesterday
    var isYesterday: Bool {
        Calendar.current.isDateInYesterday(self)
    }

    /// Check if date is tomorrow
    var isTomorrow: Bool {
        Calendar.current.isDateInTomorrow(self)
    }

    /// Check if date is in the past (before today)
    var isPast: Bool {
        self < Date().startOfDay
    }

    /// Check if date is in the future (after today)
    var isFuture: Bool {
        self > Date().endOfDay
    }

    /// Check if date is in same week as another date
    func isInSameWeek(as date: Date) -> Bool {
        Calendar.current.isDate(self, equalTo: date, toGranularity: .weekOfYear)
    }

    /// Check if date is in same month as another date
    func isInSameMonth(as date: Date) -> Bool {
        Calendar.current.isDate(self, equalTo: date, toGranularity: .month)
    }

    // MARK: - Date Arithmetic

    /// Add days to date
    func adding(days: Int) -> Date {
        Calendar.current.date(byAdding: .day, value: days, to: self) ?? self
    }

    /// Add weeks to date
    func adding(weeks: Int) -> Date {
        Calendar.current.date(byAdding: .weekOfYear, value: weeks, to: self) ?? self
    }

    /// Add months to date
    func adding(months: Int) -> Date {
        Calendar.current.date(byAdding: .month, value: months, to: self) ?? self
    }

    /// Days between two dates
    func days(until date: Date) -> Int {
        Calendar.current.dateComponents([.day], from: self.startOfDay, to: date.startOfDay).day ?? 0
    }

    // MARK: - Weekday

    /// Weekday as 1-7 (Sunday = 1, Monday = 2, etc.)
    var weekday: Int {
        Calendar.current.component(.weekday, from: self)
    }

    /// Weekday as 0-6 (Monday = 0, Sunday = 6) - matches database convention
    var weekdayIndex: Int {
        let wd = weekday
        // Convert from Sunday=1 to Monday=0
        return wd == 1 ? 6 : wd - 2
    }

    // MARK: - Static Constructors

    /// Parse from canonical date string (YYYY-MM-DD)
    static func from(canonicalString: String) -> Date? {
        dateOnlyFormatter.date(from: canonicalString)
    }

    /// Parse from ISO 8601 string
    static func from(isoString: String) -> Date? {
        isoFormatter.date(from: isoString)
    }

    /// Date range for navigation (30 days past to 60 days future)
    static var navigationRange: ClosedRange<Date> {
        let today = Date()
        let start = today.adding(days: -30)
        let end = today.adding(days: 60)
        return start...end
    }
}

// MARK: - String Extensions for Date Parsing

extension String {
    /// Parse as canonical date (YYYY-MM-DD)
    var asDate: Date? {
        Date.from(canonicalString: self)
    }

    /// Parse as ISO 8601 timestamp
    var asISODate: Date? {
        Date.from(isoString: self)
    }
}

//
//  BudgetModels.swift
//  Emily's Missions
//
//  Budget-related models: Income, Expense, Transaction
//

import Foundation

// MARK: - BudgetExpenseCategory

struct BudgetExpenseCategory: Codable, Identifiable {
    let id: String
    var name: String
    var icon: String
    var vpValue: Int
    var sortOrder: Int
    var isActive: Bool
    let createdAt: String
    var updatedAt: String

    enum CodingKeys: String, CodingKey {
        case id
        case name
        case icon
        case vpValue = "vp_value"
        case sortOrder = "sort_order"
        case isActive = "is_active"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

// MARK: - BudgetIncomeSource

struct BudgetIncomeSource: Codable, Identifiable {
    let id: String
    let ownerUserId: String
    var name: String
    var amount: Double
    var frequency: String
    var allowedCategories: [String]?  // nil = unrestricted
    var isActive: Bool
    let createdAt: String
    var updatedAt: String

    enum CodingKeys: String, CodingKey {
        case id
        case ownerUserId = "owner_user_id"
        case name
        case amount
        case frequency
        case allowedCategories = "allowed_categories"
        case isActive = "is_active"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }

    var isRestricted: Bool {
        allowedCategories != nil && !(allowedCategories?.isEmpty ?? true)
    }

    var restrictionText: String {
        if let categories = allowedCategories, !categories.isEmpty {
            return categories.joined(separator: ", ")
        }
        return "All categories"
    }
}

// MARK: - BudgetExpense (Planned)

struct BudgetExpense: Codable, Identifiable {
    let id: String
    let ownerUserId: String
    var name: String
    var amount: Double
    var frequency: ExpenseFrequency
    var category: String?
    var dueDate: String?
    var isPaid: Bool
    var isActive: Bool
    let createdAt: String
    var updatedAt: String

    enum CodingKeys: String, CodingKey {
        case id
        case ownerUserId = "owner_user_id"
        case name
        case amount
        case frequency
        case category
        case dueDate = "due_date"
        case isPaid = "is_paid"
        case isActive = "is_active"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }

    var isOneTime: Bool {
        frequency == .oneTime
    }
}

// MARK: - BudgetActualExpense

struct BudgetActualExpense: Codable, Identifiable {
    let id: String
    let ownerUserId: String
    var name: String
    var amount: Double
    var category: String?
    var expenseDate: String
    var plannedExpenseId: String?
    var notes: String?
    let createdAt: String
    var updatedAt: String

    enum CodingKeys: String, CodingKey {
        case id
        case ownerUserId = "owner_user_id"
        case name
        case amount
        case category
        case expenseDate = "expense_date"
        case plannedExpenseId = "planned_expense_id"
        case notes
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }

    var formattedDate: String {
        // Convert YYYY-MM-DD to readable format
        let inputFormatter = DateFormatter()
        inputFormatter.dateFormat = "yyyy-MM-dd"
        guard let date = inputFormatter.date(from: expenseDate) else { return expenseDate }

        let outputFormatter = DateFormatter()
        outputFormatter.dateStyle = .medium
        return outputFormatter.string(from: date)
    }
}

// MARK: - BudgetSummary (View Model)

struct BudgetSummary {
    let totalMonthlyIncome: Double
    let totalMonthlyExpenses: Double
    let totalActualExpenses: Double
    let unpaidOneTimeExpenses: Int
    let remaining: Double

    // Category breakdown
    let generalFundAvailable: Double
    let restrictedFunds: [RestrictedFund]

    var isOverBudget: Bool {
        remaining < 0
    }

    var remainingText: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        return formatter.string(from: NSNumber(value: remaining)) ?? "$\(remaining)"
    }
}

struct RestrictedFund {
    let categoryName: String
    let totalAmount: Double
    let usedAmount: Double
    let expenses: [BudgetActualExpense]

    var availableAmount: Double {
        totalAmount - usedAmount
    }

    var isOverflow: Bool {
        usedAmount > totalAmount
    }
}

// MARK: - Create Inputs

struct CreateIncomeSourceInput: Encodable {
    let ownerUserId: String
    let name: String
    let amount: Double
    let frequency: String
    let allowedCategories: [String]?

    enum CodingKeys: String, CodingKey {
        case ownerUserId = "owner_user_id"
        case name
        case amount
        case frequency
        case allowedCategories = "allowed_categories"
    }
}

struct CreateExpenseInput: Encodable {
    let ownerUserId: String
    let name: String
    let amount: Double
    let frequency: ExpenseFrequency
    let category: String?
    let dueDate: String?

    enum CodingKeys: String, CodingKey {
        case ownerUserId = "owner_user_id"
        case name
        case amount
        case frequency
        case category
        case dueDate = "due_date"
    }
}

struct CreateActualExpenseInput: Encodable {
    let ownerUserId: String
    let name: String
    let amount: Double
    let category: String?
    let expenseDate: String
    let plannedExpenseId: String?
    let notes: String?

    enum CodingKeys: String, CodingKey {
        case ownerUserId = "owner_user_id"
        case name
        case amount
        case category
        case expenseDate = "expense_date"
        case plannedExpenseId = "planned_expense_id"
        case notes
    }
}

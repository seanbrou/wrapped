import ExpoModulesCore
import HealthKit

public final class WrappedHealthKitModule: Module {
  private let healthStore = HKHealthStore()
  private let calendar = Calendar(identifier: .gregorian)

  public func definition() -> ModuleDefinition {
    Name("WrappedHealthKit")

    Function("isAvailable") {
      HKHealthStore.isHealthDataAvailable()
    }

    AsyncFunction("requestAuthorization") { () async throws -> [String: Any] in
      let available = HKHealthStore.isHealthDataAvailable()
      let readTypes = self.readTypes()

      guard available else {
        return [
          "granted": false,
          "available": false,
          "readTypes": readTypes.compactMap { $0.identifier }
        ]
      }

      let granted = try await self.requestAuthorization(readTypes: readTypes)
      return [
        "granted": granted,
        "available": true,
        "readTypes": readTypes.compactMap { $0.identifier }
      ]
    }

    AsyncFunction("syncSummary") { (periodStart: String, periodEnd: String) async throws -> [String: Any] in
      guard HKHealthStore.isHealthDataAvailable() else {
        throw HealthKitBridgeError.unavailable
      }

      let startDate = try self.parseDay(periodStart, endOfDay: false)
      let endDate = try self.parseDay(periodEnd, endOfDay: true)
      let previousRange = self.previousRange(startDate: startDate, endDate: endDate)

      let dailySteps = try await self.dailyCumulativeValues(
        identifier: .stepCount,
        unit: .count(),
        startDate: startDate,
        endDate: endDate
      )
      let dailyExercise = try await self.dailyCumulativeValues(
        identifier: .appleExerciseTime,
        unit: .minute(),
        startDate: startDate,
        endDate: endDate
      )
      let dailyStandHours = try await self.dailyCumulativeValues(
        identifier: .appleStandTime,
        unit: .hour(),
        startDate: startDate,
        endDate: endDate
      )
      let dailyDistance = try await self.dailyCumulativeValues(
        identifier: .distanceWalkingRunning,
        unit: .meter(),
        startDate: startDate,
        endDate: endDate
      )
      let dailyCalories = try await self.dailyCumulativeValues(
        identifier: .activeEnergyBurned,
        unit: .kilocalorie(),
        startDate: startDate,
        endDate: endDate
      )
      let dailySleep = try await self.dailySleepHours(startDate: startDate, endDate: endDate)

      let previousDailySteps = try await self.dailyCumulativeValues(
        identifier: .stepCount,
        unit: .count(),
        startDate: previousRange.start,
        endDate: previousRange.end
      )
      let previousDailySleep = try await self.dailySleepHours(
        startDate: previousRange.start,
        endDate: previousRange.end
      )

      let totalSteps = Int(dailySteps.reduce(0) { $0 + $1.value }.rounded())
      let totalExerciseMinutes = Int(dailyExercise.reduce(0) { $0 + $1.value }.rounded())
      let totalStandHours = Int(dailyStandHours.reduce(0) { $0 + $1.value }.rounded())
      let totalDistanceKm = (dailyDistance.reduce(0) { $0 + $1.value } / 1000.0).rounded(toPlaces: 1)
      let totalCalories = Int(dailyCalories.reduce(0) { $0 + $1.value }.rounded())
      let totalSleepHours = dailySleep.reduce(0) { $0 + $1.value }.rounded(toPlaces: 1)

      let currentStepAverage = self.average(for: dailySteps).rounded(toPlaces: 0)
      let previousStepAverage = self.average(for: previousDailySteps).rounded(toPlaces: 0)
      let currentSleepAverage = self.average(for: dailySleep).rounded(toPlaces: 1)
      let previousSleepAverage = self.average(for: previousDailySleep).rounded(toPlaces: 1)

      let monthlySteps = self.monthlySeries(from: dailySteps, unitScale: 1.0)
      let bestDaySteps = Int(dailySteps.map(\.value).max() ?? 0)

      return [
        "top_items": [
          [
            "category": "highlights",
            "items": [
              ["name": "Steps", "count": totalSteps],
              ["name": "Exercise Minutes", "count": totalExerciseMinutes],
              ["name": "Sleep Hours", "count": Int(totalSleepHours.rounded())],
              ["name": "Distance KM", "count": Int(totalDistanceKm.rounded())]
            ]
          ]
        ],
        "totals": [
          "totalSteps": totalSteps,
          "exerciseMinutes": totalExerciseMinutes,
          "standHours": totalStandHours,
          "distanceKm": totalDistanceKm,
          "activeEnergyCalories": totalCalories,
          "sleepHours": totalSleepHours
        ],
        "streaks": [
          "bestDaySteps": bestDaySteps,
          "averageDailySteps": Int(currentStepAverage),
          "averageSleepHours": currentSleepAverage
        ],
        "comparisons": [
          [
            "label": "Daily steps",
            "current": currentStepAverage,
            "previous": previousStepAverage,
            "unit": "steps"
          ],
          [
            "label": "Sleep",
            "current": currentSleepAverage,
            "previous": previousSleepAverage,
            "unit": "hrs"
          ]
        ],
        "charts": [
          [
            "title": "Monthly Steps",
            "chartType": "area",
            "data": monthlySteps.data,
            "labels": monthlySteps.labels,
            "unit": "steps"
          ]
        ],
        "meta": [
          "onDevice": true,
          "source": "healthkit",
          "grantedTypes": self.readTypes().count,
          "sampleBased": false
        ]
      ]
    }

    AsyncFunction("revoke") {
      // HealthKit permissions are controlled by the system Settings app.
      // We keep revoke as a no-op so the JS layer can clear local caches consistently.
    }
  }

  private func readTypes() -> Set<HKObjectType> {
    var result = Set<HKObjectType>()
    let identifiers: [HKQuantityTypeIdentifier] = [
      .stepCount,
      .activeEnergyBurned,
      .appleExerciseTime,
      .appleStandTime,
      .distanceWalkingRunning
    ]

    for identifier in identifiers {
      if let type = HKObjectType.quantityType(forIdentifier: identifier) {
        result.insert(type)
      }
    }

    if let sleepType = HKObjectType.categoryType(forIdentifier: .sleepAnalysis) {
      result.insert(sleepType)
    }

    return result
  }

  private func requestAuthorization(readTypes: Set<HKObjectType>) async throws -> Bool {
    try await withCheckedThrowingContinuation { continuation in
      healthStore.requestAuthorization(toShare: [], read: readTypes) { granted, error in
        if let error {
          continuation.resume(throwing: error)
        } else {
          continuation.resume(returning: granted)
        }
      }
    }
  }

  private func parseDay(_ value: String, endOfDay: Bool) throws -> Date {
    let formatter = DateFormatter()
    formatter.calendar = calendar
    formatter.locale = Locale(identifier: "en_US_POSIX")
    formatter.timeZone = TimeZone(secondsFromGMT: 0)
    formatter.dateFormat = "yyyy-MM-dd"

    guard let parsed = formatter.date(from: value) else {
      throw HealthKitBridgeError.invalidDate(value)
    }

    if endOfDay, let dayEnd = calendar.date(byAdding: DateComponents(day: 1, second: -1), to: parsed) {
      return dayEnd
    }

    return parsed
  }

  private func previousRange(startDate: Date, endDate: Date) -> (start: Date, end: Date) {
    let duration = max(endDate.timeIntervalSince(startDate), 86_400)
    let previousEnd = startDate.addingTimeInterval(-1)
    let previousStart = previousEnd.addingTimeInterval(-duration)
    return (previousStart, previousEnd)
  }

  private func dailyCumulativeValues(
    identifier: HKQuantityTypeIdentifier,
    unit: HKUnit,
    startDate: Date,
    endDate: Date
  ) async throws -> [(date: Date, value: Double)] {
    guard let quantityType = HKObjectType.quantityType(forIdentifier: identifier) else {
      return []
    }

    let predicate = HKQuery.predicateForSamples(withStart: startDate, end: endDate, options: .strictStartDate)
    let anchorDate = calendar.startOfDay(for: startDate)
    let interval = DateComponents(day: 1)

    return try await withCheckedThrowingContinuation { continuation in
      let query = HKStatisticsCollectionQuery(
        quantityType: quantityType,
        quantitySamplePredicate: predicate,
        options: .cumulativeSum,
        anchorDate: anchorDate,
        intervalComponents: interval
      )

      query.initialResultsHandler = { _, collection, error in
        if let error {
          continuation.resume(throwing: error)
          return
        }

        guard let collection else {
          continuation.resume(returning: [])
          return
        }

        var values: [(date: Date, value: Double)] = []
        collection.enumerateStatistics(from: startDate, to: endDate) { statistics, _ in
          let amount = statistics.sumQuantity()?.doubleValue(for: unit) ?? 0
          values.append((statistics.startDate, amount))
        }
        continuation.resume(returning: values)
      }

      self.healthStore.execute(query)
    }
  }

  private func dailySleepHours(startDate: Date, endDate: Date) async throws -> [(date: Date, value: Double)] {
    guard let sleepType = HKObjectType.categoryType(forIdentifier: .sleepAnalysis) else {
      return []
    }

    let predicate = HKQuery.predicateForSamples(withStart: startDate, end: endDate, options: .strictStartDate)
    let sort = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)

    return try await withCheckedThrowingContinuation { continuation in
      let query = HKSampleQuery(
        sampleType: sleepType,
        predicate: predicate,
        limit: HKObjectQueryNoLimit,
        sortDescriptors: [sort]
      ) { _, samples, error in
        if let error {
          continuation.resume(throwing: error)
          return
        }

        var byDay: [Date: Double] = [:]
        let asleepBase = HKCategoryValueSleepAnalysis.asleep.rawValue

        for sample in (samples as? [HKCategorySample]) ?? [] {
          let value = sample.value
          var isAsleep = value == asleepBase
          if #available(iOS 16.0, *) {
            let asleepValues: Set<Int> = [
              HKCategoryValueSleepAnalysis.asleepCore.rawValue,
              HKCategoryValueSleepAnalysis.asleepDeep.rawValue,
              HKCategoryValueSleepAnalysis.asleepREM.rawValue,
              HKCategoryValueSleepAnalysis.asleepUnspecified.rawValue,
              asleepBase
            ]
            isAsleep = asleepValues.contains(value)
          }

          guard isAsleep else { continue }

          let key = self.calendar.startOfDay(for: sample.startDate)
          let duration = sample.endDate.timeIntervalSince(sample.startDate) / 3600.0
          byDay[key, default: 0] += duration
        }

        let sorted = byDay.keys.sorted().map { date in
          (date: date, value: (byDay[date] ?? 0).rounded(toPlaces: 2))
        }
        continuation.resume(returning: sorted)
      }

      self.healthStore.execute(query)
    }
  }

  private func average(for values: [(date: Date, value: Double)]) -> Double {
    guard !values.isEmpty else { return 0 }
    let total = values.reduce(0) { $0 + $1.value }
    return total / Double(values.count)
  }

  private func monthlySeries(
    from values: [(date: Date, value: Double)],
    unitScale: Double
  ) -> (labels: [String], data: [Double]) {
    var totalsByMonth: [String: Double] = [:]

    let formatter = DateFormatter()
    formatter.calendar = calendar
    formatter.locale = Locale(identifier: "en_US_POSIX")
    formatter.timeZone = TimeZone(secondsFromGMT: 0)
    formatter.dateFormat = "MMM"

    for entry in values {
      let components = calendar.dateComponents([.year, .month], from: entry.date)
      let key = "\(components.year ?? 0)-\(components.month ?? 0)"
      totalsByMonth[key, default: 0] += entry.value / unitScale
    }

    let orderedMonths = totalsByMonth.keys.sorted()
    let labels = orderedMonths.compactMap { key -> String? in
      let parts = key.split(separator: "-")
      guard parts.count == 2, let year = Int(parts[0]), let month = Int(parts[1]) else {
        return nil
      }
      let components = DateComponents(calendar: calendar, timeZone: TimeZone(secondsFromGMT: 0), year: year, month: month, day: 1)
      guard let date = calendar.date(from: components) else {
        return nil
      }
      return String(formatter.string(from: date).prefix(1))
    }

    let data = orderedMonths.map { key in
      (totalsByMonth[key] ?? 0).rounded(toPlaces: 1)
    }

    return (labels, data)
  }
}

private enum HealthKitBridgeError: LocalizedError {
  case unavailable
  case invalidDate(String)

  var errorDescription: String? {
    switch self {
    case .unavailable:
      return "HealthKit is unavailable on this device."
    case .invalidDate(let value):
      return "Invalid HealthKit date: \(value)"
    }
  }
}

private extension Double {
  func rounded(toPlaces places: Int) -> Double {
    let precision = pow(10.0, Double(places))
    return (self * precision).rounded() / precision
  }
}

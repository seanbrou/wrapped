package expo.modules.wrappedhealthkit

import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class WrappedHealthKitModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("WrappedHealthKit")

    Function("isAvailable") {
      false
    }

    AsyncFunction("requestAuthorization") { promise: Promise ->
      promise.resolve(
        mapOf(
          "granted" to false,
          "available" to false,
          "readTypes" to emptyList<String>()
        )
      )
    }

    AsyncFunction("syncSummary") { _: String, _: String, promise: Promise ->
      promise.reject("ERR_HEALTHKIT_UNAVAILABLE", "Apple Health is only available on iOS devices.", null)
    }

    AsyncFunction("revoke") { promise: Promise ->
      promise.resolve(null)
    }
  }
}

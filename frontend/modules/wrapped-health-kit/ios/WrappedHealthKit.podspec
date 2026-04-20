Pod::Spec.new do |s|
  s.name           = 'WrappedHealthKit'
  s.version        = '1.0.0'
  s.summary        = 'Local HealthKit bridge for Wrapped'
  s.description    = 'Expo module that reads HealthKit summaries on-device for Wrapped recap generation.'
  s.author         = 'OpenAI Codex'
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = {
    :ios => '15.1'
  }
  s.source         = { git: 'https://example.com/wrapped.git' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.frameworks = 'HealthKit'

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end

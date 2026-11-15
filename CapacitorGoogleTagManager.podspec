require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name = 'CapacitorGoogleTagManager'
  s.version = package['version']
  s.summary = package['description']
  s.license = package['license']
  s.homepage = package['repository']['url']
  s.author = package['author']
  s.source = { :git => package['repository']['url'], :tag => s.version.to_s }
  s.source_files = 'ios/Sources/**/*.{swift,h,m,c,cc,mm,cpp}'
  s.public_header_files = 'ios/Sources/GoogleTagManagerLinkage/include/*.h'
  s.ios.deployment_target = '15.0'
  s.dependency 'Capacitor'
  # Any 9.x from 9.1.0, as in Package.swift. An app pins another one in its Podfile: pod 'GoogleTagManager', '9.3.0'
  s.dependency 'GoogleTagManager', '~> 9.1'
  s.swift_version = '5.9'
  # The SDK's categories, as Package.swift's -ObjC; CocoaPods' own default already adds it for most apps.
  s.user_target_xcconfig = { 'OTHER_LDFLAGS' => '$(inherited) -ObjC' }
end

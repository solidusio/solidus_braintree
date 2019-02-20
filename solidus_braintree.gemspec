# coding: utf-8
lib = File.expand_path('../lib', __FILE__)
$LOAD_PATH.unshift(lib) unless $LOAD_PATH.include?(lib)
require 'solidus_braintree/version'

Gem::Specification.new do |spec|
  spec.name          = "solidus_braintree"
  spec.version       = SolidusBraintree::VERSION
  spec.authors       = ["Solidus Team"]
  spec.email         = ["contact@solidus.io"]

  spec.summary       = %q{Adds Solidus support for Braintree v.zero Gateway.}
  spec.description   = %q{Adds Solidus support for Braintree v.zero Gateway.}
  spec.homepage      = "https://solidus.io"
  spec.license       = "MIT"

  spec.files         = `git ls-files -z`.split("\x0").reject { |f| f.match(%r{^(test|spec|features)/}) }
  spec.bindir        = "exe"
  spec.executables   = spec.files.grep(%r{^exe/}) { |f| File.basename(f) }
  spec.require_paths = ["lib"]

  spec.add_dependency "solidus_api", [">= 1.0.0", "< 3"]
  spec.add_dependency "solidus_core", [">= 1.0.0", "< 3"]
  spec.add_dependency "solidus_support"
  spec.add_dependency "braintree", "~> 2.46"

  spec.add_development_dependency "bundler", "~> 1.10"
  spec.add_development_dependency "rake", "~> 10.0"
  spec.add_development_dependency 'factory_bot', '~> 4.4'
  spec.add_development_dependency 'rspec-rails'
  spec.add_development_dependency 'capybara', '~> 2.18'
  spec.add_development_dependency 'capybara-screenshot'
  spec.add_development_dependency 'poltergeist', '~> 1.9'
  spec.add_development_dependency 'ffaker'
  spec.add_development_dependency "rspec"
  spec.add_development_dependency "pry"
  spec.add_development_dependency "byebug"
  spec.add_development_dependency 'sqlite3', '~> 1.3.6'
  spec.add_development_dependency 'database_cleaner', '~> 1.2'
  spec.add_development_dependency "vcr", '~> 3.0'
  spec.add_development_dependency "webmock"
  spec.add_development_dependency 'simplecov'
end

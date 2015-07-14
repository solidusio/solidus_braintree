# coding: utf-8
lib = File.expand_path('../lib', __FILE__)
$LOAD_PATH.unshift(lib) unless $LOAD_PATH.include?(lib)
require 'solidus_braintree/version'

Gem::Specification.new do |spec|
  spec.name          = "solidus_braintree"
  spec.version       = SolidusBraintree::VERSION
  spec.authors       = ["Bonobos"]
  spec.email         = ["engineering@bonobos.com"]

  spec.summary       = %q{Adds Solidus support for Braintree v.zero Gateway.}
  spec.description   = %q{Adds Solidus support for Braintree v.zero Gateway.}
  spec.homepage      = "https://bonobos.com"
  spec.license       = "MIT"

  # Prevent pushing this gem to RubyGems.org by setting 'allowed_push_host', or
  # delete this section to allow pushing this gem to any host.
  if spec.respond_to?(:metadata)
    spec.metadata['allowed_push_host'] = "TODO: Set to 'http://mygemserver.com'"
  else
    raise "RubyGems 2.0 or newer is required to protect against public gem pushes."
  end

  spec.files         = `git ls-files -z`.split("\x0").reject { |f| f.match(%r{^(test|spec|features)/}) }
  spec.bindir        = "exe"
  spec.executables   = spec.files.grep(%r{^exe/}) { |f| File.basename(f) }
  spec.require_paths = ["lib"]

  spec.add_dependency "solidus_core", [">= 1.0.0pre", "< 2"]
  spec.add_dependency "braintree"

  spec.add_development_dependency "bundler", "~> 1.10"
  spec.add_development_dependency "rake", "~> 10.0"
  spec.add_development_dependency 'factory_girl', '~> 4.4'
  spec.add_development_dependency 'rspec-rails'
  spec.add_development_dependency 'ffaker'
  spec.add_development_dependency "rspec"
  spec.add_development_dependency "guard"
  spec.add_development_dependency "guard-rspec"
  spec.add_development_dependency "pry"
  spec.add_development_dependency "pry-byebug"
  spec.add_development_dependency 'sqlite3'
  spec.add_development_dependency 'database_cleaner', '~> 1.2.0'
  spec.add_development_dependency "vcr"
  spec.add_development_dependency "webmock"
end

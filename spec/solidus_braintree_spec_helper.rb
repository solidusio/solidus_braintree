# frozen_string_literal: true

# Configure Rails Environment
ENV["RAILS_ENV"] = "test"

# Run Coverage report
require "solidus_dev_support/rspec/coverage"

# Create the dummy app if it's still missing.
dummy_env = "#{__dir__}/dummy/config/environment.rb"
system "bin/rake extension:test_app" unless File.exist? dummy_env
require dummy_env

# Requires factories and other useful helpers defined in spree_core.
require "solidus_dev_support/rspec/feature_helper"

require "spree/core/version"
begin
  if Spree.solidus_gem_version >= Gem::Version.new("4.8.0")
    require "solidus_storefront_spec_helper"
  else
    require "solidus_starter_frontend_spec_helper"
  end
rescue LoadError => e
  puts "[WARN] #{e}"
end

require "solidus_braintree"
require "support/solidus_braintree/capybara"
require "support/solidus_braintree/factories"
require "support/solidus_braintree/gateway_helpers"
require "support/solidus_braintree/order_walkthrough"
require "support/solidus_braintree/vcr"

Braintree::Configuration.logger = Rails.logger

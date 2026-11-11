# frozen_string_literal: true

require "spree/core/version"
if Spree.solidus_gem_version >= Gem::Version.new("4.8.0")
  require "solidus_storefront_spec_helper"
else
  require "solidus_starter_frontend_spec_helper"
end

require "support/solidus_braintree/capybara"
require "support/solidus_braintree/factories"
require "support/solidus_braintree/gateway_helpers"
require "support/solidus_braintree/order_walkthrough"
require "support/solidus_braintree/vcr"

Braintree::Configuration.logger = Rails.logger

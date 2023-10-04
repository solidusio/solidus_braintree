require 'solidus_starter_frontend_spec_helper'

require 'support/solidus_braintree/capybara'
require 'support/solidus_braintree/factories'
require 'support/solidus_braintree/gateway_helpers'
require 'support/solidus_braintree/order_walkthrough'
require 'support/solidus_braintree/vcr'

Braintree::Configuration.logger = Rails.logger

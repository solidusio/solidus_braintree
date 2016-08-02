require 'simplecov'
SimpleCov.start do
  add_filter 'spec/dummy'
  add_group 'Controllers', 'app/controllers'
  add_group 'Helpers', 'app/helpers'
  add_group 'Mailers', 'app/mailers'
  add_group 'Models', 'app/models'
  add_group 'Views', 'app/views'
  add_group 'Libraries', 'lib'
end

$LOAD_PATH.unshift File.expand_path('../../lib', __FILE__)
ENV["RAILS_ENV"] = "test"

require 'solidus_braintree'

require_relative "dummy/config/environment"
require 'rspec/rails'
require 'database_cleaner'
require 'ffaker'
require 'vcr'
require 'webmock'
require 'pry'
require 'byebug'

Dir[Rails.root.join("spec/support/**/*.rb")].each {|f| require f}

require 'spree/testing_support/authorization_helpers'
require 'spree/testing_support/factories'
require 'spree/testing_support/order_walkthrough'
require 'spree/testing_support/preferences'
require 'spree/testing_support/controller_requests'
require 'spree/testing_support/url_helpers'

require 'capybara/rspec'
require 'capybara-screenshot/rspec'
require 'capybara/poltergeist'
Capybara.register_driver(:poltergeist) do |app|
  Capybara::Poltergeist::Driver.new app, timeout: 90
end
Capybara.javascript_driver = :poltergeist
Capybara.default_max_wait_time = 10

module SolidusGateway
  module Helpers
    module BraintreeGateway
      def create_braintree_payment_method
        gateway = Solidus::Gateway::BraintreeGateway.create!(
          name: 'Braintree Gateway',
          active: true
        )
        gateway.set_preference(:environment, 'sandbox')
        gateway.set_preference(:merchant_id, 'zbn5yzq9t7wmwx42')
        gateway.set_preference(:public_key,  'ym9djwqpkxbv3xzt')
        gateway.set_preference(:private_key, '4ghghkyp2yy6yqc8')
        gateway.save!
        gateway
      end
    end
  end
end

Braintree::Configuration.logger = Rails.logger

FactoryGirl.find_definitions

VCR.configure do |c|
  c.cassette_library_dir = "spec/cassettes"
  c.hook_into :webmock
  c.ignore_localhost = true
  c.configure_rspec_metadata!
end

RSpec.configure do |config|
  config.mock_with :rspec
  config.use_transactional_fixtures = false

  #config.filter_run focus: true
  #config.filter_run_excluding slow: true

  config.include FactoryGirl::Syntax::Methods
  config.include Spree::TestingSupport::Preferences
  config.include Spree::TestingSupport::ControllerRequests, type: :controller
  config.include Spree::TestingSupport::UrlHelpers, type: :controller
  config.include SolidusGateway::Helpers::BraintreeGateway

  config.before :suite do
    DatabaseCleaner.strategy = :transaction
    DatabaseCleaner.clean_with :truncation
  end

  config.before do |example|
    DatabaseCleaner.strategy = example.metadata[:js] ? :truncation : :transaction
    DatabaseCleaner.start
    reset_spree_preferences
  end

  config.after do
    DatabaseCleaner.clean
  end
end

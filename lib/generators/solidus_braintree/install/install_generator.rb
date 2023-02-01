# frozen_string_literal: true

module SolidusBraintree
  module Generators
    class InstallGenerator < Rails::Generators::Base
      class_option :auto_run_migrations, type: :boolean, default: false
      source_root File.expand_path('templates', __dir__)

      def setup_initializer
        legacy_initializer_pathname =
          Pathname.new(destination_root).join('config/initializers/solidus_paypal_braintree.rb')

        if legacy_initializer_pathname.exist?
          legacy_initializer_pathname.rename('config/initializers/solidus_braintree.rb')

          gsub_file 'config/initializers/solidus_braintree.rb',
            "SolidusPaypalBraintree.configure do |config|\n",
            "SolidusBraintree.configure do |config|\n"
        else
          template 'initializer.rb', 'config/initializers/solidus_braintree.rb'
        end
      end

      def setup_javascripts
        gsub_file 'vendor/assets/javascripts/spree/frontend/all.js',
          "//= require spree/frontend/solidus_paypal_braintree\n", ''

        append_file 'vendor/assets/javascripts/spree/frontend/all.js', "//= require spree/frontend/solidus_braintree\n"

        gsub_file 'vendor/assets/javascripts/spree/backend/all.js',
          "//= require spree/backend/solidus_paypal_braintree\n", ''

        append_file 'vendor/assets/javascripts/spree/backend/all.js', "//= require spree/backend/solidus_braintree\n"
      end

      def setup_stylesheets
        gsub_file 'vendor/assets/stylesheets/spree/frontend/all.css',
          " *= require spree/frontend/solidus_paypal_braintree\n", ''

        inject_into_file 'vendor/assets/stylesheets/spree/frontend/all.css',
          " *= require spree/frontend/solidus_braintree\n", before: %r{\*/}, verbose: true

        gsub_file 'vendor/assets/stylesheets/spree/backend/all.css',
          " *= require spree/backend/solidus_paypal_braintree\n", ''

        inject_into_file 'vendor/assets/stylesheets/spree/backend/all.css',
          " *= require spree/backend/solidus_braintree\n", before: %r{\*/}, verbose: true
      end

      def add_migrations
        rake 'railties:install:migrations FROM=solidus_braintree'
      end

      def mount_engine
        gsub_file 'config/routes.rb',
          "mount SolidusPaypalBraintree::Engine, at: '/solidus_paypal_braintree'\n", ''

        route "mount SolidusBraintree::Engine, at: '/solidus_braintree'"
      end

      def run_migrations
        run_migrations = options[:auto_run_migrations] ||
          ['', 'y', 'Y'].include?(ask('Would you like to run the migrations now? [Y/n]'))

        if run_migrations
          rake 'db:migrate'
        else
          puts 'Skipping bin/rails db:migrate, don\'t forget to run it!' # rubocop:disable Rails/Output
        end
      end
    end
  end
end

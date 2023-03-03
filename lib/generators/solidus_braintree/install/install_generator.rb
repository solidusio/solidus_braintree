# frozen_string_literal: true

require 'rails/generators/app_base'

module SolidusBraintree
  module Generators
    class InstallGenerator < Rails::Generators::AppBase
      argument :app_path, type: :string, default: Rails.root

      class_option :migrate, type: :boolean, default: true
      class_option :backend, type: :boolean, default: true
      class_option :frontend, type: :string, default: 'starter'

      # This is only used to run all-specs during development and CI,  regular installation limits
      # installed specs to frontend, which are the ones related to code copied to the target application.
      class_option :specs, type: :string, enum: %w[all frontend], default: 'frontend', hide: true

      source_root File.expand_path('templates', __dir__)

      def normalize_components_options
        @components = {
          backend: options[:backend],
          starter_frontend: options[:frontend] == 'starter',
          classic_frontend: options[:frontend] == 'classic',
        }
      end

      def add_test_gems
        gem_group :test do
          ['vcr', 'webmock'].each do |gem_name|
            gem gem_name unless Bundler.locked_gems.dependencies[gem_name]
          end
        end

        bundle_command 'install'
      end

      def setup_initializers
        legacy_initializer_pathname =
          Pathname.new(destination_root).join('config/initializers/solidus_paypal_braintree.rb')

        if legacy_initializer_pathname.exist?
          legacy_initializer_pathname.rename('config/initializers/solidus_braintree.rb')

          gsub_file 'config/initializers/solidus_braintree.rb',
            "SolidusPaypalBraintree.configure do |config|\n",
            "SolidusBraintree.configure do |config|\n"
        else
          directory 'config/initializers', 'config/initializers'
        end
      end

      def run_migrations
        rake 'railties:install:migrations FROM=solidus_braintree'
        run 'bin/rails db:migrate' if options[:migrate]
      end

      def mount_engine
        gsub_file 'config/routes.rb',
          "mount SolidusPaypalBraintree::Engine, at: '/solidus_paypal_braintree'\n", ''

        route "mount SolidusBraintree::Engine, at: '/solidus_braintree'"
      end

      def install_solidus_backend_support
        support_code_for(:backend) do
          gsub_file 'vendor/assets/javascripts/spree/backend/all.js',
            "//= require spree/backend/solidus_paypal_braintree\n", ''

          append_file 'vendor/assets/javascripts/spree/backend/all.js',
            "//= require spree/backend/solidus_braintree\n"

          gsub_file 'vendor/assets/stylesheets/spree/backend/all.css',
            " *= require spree/backend/solidus_paypal_braintree\n", ''

          inject_into_file 'vendor/assets/stylesheets/spree/backend/all.css',
            " *= require spree/backend/solidus_braintree\n", before: %r{\*/}, verbose: true
        end
      end

      def install_solidus_starter_frontend_support
        support_code_for(:starter_frontend) do
          directory 'app', 'app'

          inject_into_file 'vendor/assets/javascripts/spree/frontend/all.js',
            "//= require jquery3\n",
            before: '//= require rails-ujs',
            verbose: true

          gsub_file 'vendor/assets/javascripts/spree/frontend/all.js',
            "//= require spree/frontend/solidus_paypal_braintree\n", ''

          append_file 'app/assets/javascripts/solidus_starter_frontend.js',
            "//= require spree/frontend/solidus_braintree\n"

          gsub_file 'vendor/assets/stylesheets/spree/frontend/all.css',
            " *= require spree/frontend/solidus_paypal_braintree\n", ''

          inject_into_file 'app/assets/stylesheets/solidus_starter_frontend.css',
            " *= require spree/frontend/solidus_braintree\n", before: %r{\*/}, verbose: true

          inject_into_class 'app/controllers/checkouts_controller.rb',
            'CheckoutsController',
            "  helper SolidusBraintree::BraintreeCheckoutHelper\n\n",
            verbose: true

          inject_into_class 'app/controllers/carts_controller.rb',
            'CartsController',
            "  helper SolidusBraintree::BraintreeCheckoutHelper\n\n",
            verbose: true

          inject_into_file 'app/views/orders/_payment_info.html.erb',
            "        <li><%= render 'payments/braintree_payment_details', payment: payment %></li>\n",
            after: "<li><%= payment.payment_method.name %></li>\n",
            verbose: true

          spec_paths =
            case options[:specs]
            when 'all' then %w[spec]
            when 'frontend'
              %w[
                spec/solidus_braintree_helper.rb
                spec/system/frontend
                spec/support
                spec/fixtures
              ]
            end

          spec_paths.each do |path|
            if engine.root.join(path).directory?
              directory engine.root.join(path), path
            else
              template engine.root.join(path), path
            end
          end
        end
      end

      def alert_no_classic_frontend_support
        support_code_for(:classic_frontend) do
          message = <<~TEXT
            For solidus_frontend compatibility, please use the deprecated version 1.x.
            The new version of this extension only supports Solidus Starter Frontend.
            No frontend code has been copied to your application.
          TEXT
          say_status :error, set_color(message.tr("\n", ' '), :red), :red
        end
      end

      private

      def support_code_for(component_name, &block)
        if @components[component_name]
          say_status :install, "[#{engine.engine_name}] solidus_#{component_name}", :blue
          shell.indent(&block)
        else
          say_status :skip, "[#{engine.engine_name}] solidus_#{component_name}", :blue
        end
      end

      def engine
        SolidusBraintree::Engine
      end

      def bundle_command(command, env = {})
        # Make `bundle install` less verbose by skipping the "Using ..." messages
        super(command, env.reverse_merge('BUNDLE_SUPPRESS_INSTALL_USING_MESSAGES' => 'true'))
      ensure
        Bundler.reset_paths!
      end
    end
  end
end

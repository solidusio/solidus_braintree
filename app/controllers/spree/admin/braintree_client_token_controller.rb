module Spree
  module Admin
    class BraintreeClientTokenController < Spree::Admin::BaseController
      include SolidusBraintreeClientToken
      protect_from_forgery except: [:create]

      protected

      ##
      # In admin there currently isn't a way for the javascript to obtain
      # the user or order that is being worked on. Until then, any payment
      # created in Admin will be added to a new braintree customer.
      def customer_id
        nil
      end

      def model_class
        Solidus::Gateway::BraintreeGateway
      end
    end
  end
end

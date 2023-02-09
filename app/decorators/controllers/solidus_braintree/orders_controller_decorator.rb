# frozen_string_literal: true

module SolidusBraintree
  module OrdersControllerDecorator
    def self.prepended(base)
      base.helper ::SolidusBraintree::BraintreeCheckoutHelper
    end

    ::Spree::OrdersController.prepend(self)
  end
end

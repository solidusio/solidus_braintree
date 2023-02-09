# frozen_string_literal: true

module SolidusBraintree
  module OrdersControllerDecorator
    def self.prepended(base)
      base.helper ::SolidusBraintree::BraintreeCheckoutHelper
    end

    OrdersController.prepend(self)
  end
end

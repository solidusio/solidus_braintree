# frozen_string_literal: true

module SolidusBraintree
  module CheckoutControllerDecorator
    def self.prepended(base)
      base.helper ::SolidusBraintree::BraintreeCheckoutHelper
    end

    ::CheckoutsController.prepend(self)
  end
end

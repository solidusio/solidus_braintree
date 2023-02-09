# frozen_string_literal: true

module SolidusBraintree
  module CartsControllerDecorator
    def self.prepended(base)
      base.helper ::SolidusBraintree::BraintreeCheckoutHelper
    end

    CartsController.prepend(self)
  end
end

# frozen_string_literal: true

module SolidusBraintree
  module AdminPaymentsControllerPatch
    def self.prepended(base)
      base.helper ::SolidusBraintree::BraintreeAdminHelper
    end

    ::Spree::Admin::PaymentsController.prepend(self)
  end
end

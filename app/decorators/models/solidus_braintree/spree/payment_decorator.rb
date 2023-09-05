# frozen_string_literal: true

module PaymentDecorator
  def self.prepended(base)
    base.include SolidusBraintree::PaymentBraintreeNonceConcern
    base.include SolidusBraintree::InjectDeviceDataConcern
  end

  Spree::Payment.prepend(self)
end

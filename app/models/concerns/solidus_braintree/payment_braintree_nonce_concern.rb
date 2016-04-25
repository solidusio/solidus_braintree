module SolidusBraintree
  module PaymentBraintreeNonceConcern
    extend ActiveSupport::Concern
    included do
      attr_accessor :payment_method_nonce, :device_data
    end
  end
end

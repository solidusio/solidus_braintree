module SolidusBraintree
  module PaymentBraintreeNonceConcern
    extend ActiveSupport::Concern
    included do
      attr_accessor :payment_method_nonce
    end
  end
end

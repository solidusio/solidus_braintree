module PaymentBraintreeNonceConcern
  extend ActiveSupport::Concern
  included do
    attr_accessor :payment_method_nonce

    prepend(InstanceMethods)
  end

  module InstanceMethods
  end
end
